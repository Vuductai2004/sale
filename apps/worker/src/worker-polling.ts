import type { DurableTaskRecord, DurableWorkflowRepository } from '@agentos/database';

import type { DomainRuntimeRegistry } from './runtime/domain-registry.js';

export interface WorkerPollerHandle {
  readonly isRunning: boolean;
  stop(): Promise<void>;
  pollOnce(): Promise<number>;
}

type TimerHandle = NodeJS.Timeout;
type SetTimeoutFn = (handler: () => void, timeout: number) => TimerHandle;
type ClearTimeoutFn = (handle: TimerHandle) => void;

type WorkflowRepository = Pick<DurableWorkflowRepository,
  'claimNextQueuedTask' | 'getTask' | 'renewTaskLease' | 'releaseTaskLease' | 'recordFailure' | 'transitionTask'>;

export interface WorkerPollingOptions {
  readonly tenantIds: readonly string[];
  readonly registry: DomainRuntimeRegistry;
  readonly workflowRepository: WorkflowRepository;
  readonly workerId: string;
  readonly leaseDurationMs: number;
  readonly pollIntervalMs: number;
  readonly autoStartPolling: boolean;
  readonly now?: () => Date;
  readonly setTimeout?: SetTimeoutFn;
  readonly clearTimeout?: ClearTimeoutFn;
  readonly onError?: ((tenant_id: string, error: unknown) => void) | undefined;
  readonly processTask: (input: {
    readonly taskRecord: DurableTaskRecord;
    readonly tenant_id: string;
    readonly signal: AbortSignal;
  }) => Promise<void>;
}
export function createWorkerPoller(options: WorkerPollingOptions): WorkerPollerHandle {
  let running = false;
  let pollTimer: TimerHandle | null = null;
  let activePollCount = 0;
  const scheduleTimer = options.setTimeout ?? ((handler, timeout) => setTimeout(handler, timeout));
  const cancelTimer = options.clearTimeout ?? ((handle) => clearTimeout(handle));
  const now = options.now ?? (() => new Date());

  const processClaimedTask = async (tenant_id: string, taskRecord: DurableTaskRecord): Promise<void> => {
    const controller = new AbortController();
    let heartbeatTimer: TimerHandle | null = null;
    let settled = false;
    let rejectLeaseLost: (reason: unknown) => void = () => undefined;
    const leaseLost = new Promise<never>((_, reject) => {
      rejectLeaseLost = reject;
    });

    const stopHeartbeat = () => {
      settled = true;
      if (heartbeatTimer !== null) {
        cancelTimer(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const failLease = (error: unknown) => {
      if (settled) return;
      stopHeartbeat();
      const reason = error instanceof Error
        ? error
        : new Error(`TASK_LEASE_NOT_HELD: execution lease renewal failed (${String(error)})`);
      controller.abort(reason);
      rejectLeaseLost(reason);
    };

    const heartbeat = async (): Promise<void> => {
      if (settled || controller.signal.aborted) return;
      try {
        const current = await options.workflowRepository.getTask(tenant_id, taskRecord.run_id);
        const parked = current?.state === 'waiting' || current?.state === 'awaiting_human';
        if (
          current === null
          || (current.state !== 'running' && !parked)
          || current.lease_owner !== options.workerId
        ) {
          throw new Error('TASK_LEASE_NOT_HELD: execution lease is no longer owned by this worker');
        }
        const currentExpiry = current.lease_expires_at === null ? Number.NaN : Date.parse(current.lease_expires_at);
        if (!Number.isFinite(currentExpiry) || currentExpiry <= now().getTime()) {
          throw new Error('TASK_LEASE_EXPIRED: execution lease is absent or expired');
        }
        const renewed = await options.workflowRepository.renewTaskLease({
          tenant_id,
          run_id: taskRecord.run_id,
          lease_owner: options.workerId,
          task_version: current.task_version,
          lease_duration_ms: options.leaseDurationMs,
        });
        const expiresAt = renewed.lease_expires_at === null ? Number.NaN : Date.parse(renewed.lease_expires_at);
        if (
          renewed.lease_owner !== options.workerId
          || !Number.isFinite(expiresAt)
          || expiresAt <= now().getTime()
        ) {
          throw new Error('TASK_LEASE_NOT_HELD: lease renewal did not return a live lease owned by this worker');
        }
      } catch (error) {
        failLease(error);
        return;
      }
      if (!settled) {
        heartbeatTimer = scheduleTimer(() => {
          void heartbeat();
        }, options.leaseDurationMs / 3);
      }
    };

    heartbeatTimer = scheduleTimer(() => {
      void heartbeat();
    }, options.leaseDurationMs / 3);

    try {
      const taskPromise = options.processTask({
        taskRecord,
        tenant_id,
        signal: controller.signal,
      });
      taskPromise.catch(() => undefined);
      await Promise.race([taskPromise, leaseLost]);
    } finally {
      stopHeartbeat();
    }
  };

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
          await processClaimedTask(tenant_id, claimResult.task);
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
    pollTimer = scheduleTimer(() => {
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
      if (pollTimer !== null) {
        cancelTimer(pollTimer);
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
