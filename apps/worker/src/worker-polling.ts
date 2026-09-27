import type { DurableTaskRecord, DurableWorkflowRepository } from '@agentos/database';

import type { DomainRuntimeRegistry } from './runtime/domain-registry.js';

export interface WorkerPollerHandle {
  readonly isRunning: boolean;
  stop(): Promise<void>;
  pollOnce(): Promise<number>;
}

type WorkflowRepository = Pick<DurableWorkflowRepository,
  'claimNextQueuedTask' | 'getTask' | 'releaseTaskLease' | 'recordFailure' | 'transitionTask'>;

interface WorkerPollingOptions {
  readonly tenantIds: readonly string[];
  readonly registry: DomainRuntimeRegistry;
  readonly workflowRepository: WorkflowRepository;
  readonly workerId: string;
  readonly leaseDurationMs: number;
  readonly pollIntervalMs: number;
  readonly autoStartPolling: boolean;
  readonly onError?: ((tenant_id: string, error: unknown) => void) | undefined;
  readonly processTask: (input: {
    readonly taskRecord: DurableTaskRecord;
    readonly tenant_id: string;
  }) => Promise<void>;
}

export function createWorkerPoller(options: WorkerPollingOptions): WorkerPollerHandle {
  let running = false;
  let pollTimer: NodeJS.Timeout | null = null;
  let activePollCount = 0;

  const pollOnce = async (): Promise<number> => {
    if (options.tenantIds.length === 0 || options.registry.modules().length === 0) return 0;
    let claimedCount = 0;

    for (const tenant_id of options.tenantIds) {
      try {
        const claimResult = await options.workflowRepository.claimNextQueuedTask({
          tenant_id,
          lease_owner: options.workerId,
          lease_duration_ms: options.leaseDurationMs,
        });

        if (claimResult) {
          claimedCount++;
          await options.processTask({
            taskRecord: claimResult.task,
            tenant_id,
          });
        }
      } catch (error) {
        if (options.onError) options.onError(tenant_id, error);
        else process.stderr.write(`care worker tenant ${tenant_id} failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    return claimedCount;
  };

  const scheduleNext = () => {
    if (!running) return;
    pollTimer = setTimeout(() => {
      activePollCount++;
      void pollOnce().catch((error: unknown) => {
        process.stderr.write(`care worker poll failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }).finally(() => {
        activePollCount--;
        scheduleNext();
      });
    }, options.pollIntervalMs);
  };

  if (options.autoStartPolling && options.tenantIds.length > 0 && options.registry.modules().length > 0) {
    running = true;
    scheduleNext();
  }

  return {
    get isRunning() {
      return running;
    },
    async stop() {
      running = false;
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      // Wait for any in-flight poll to finish
      while (activePollCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
    pollOnce,
  };
}
