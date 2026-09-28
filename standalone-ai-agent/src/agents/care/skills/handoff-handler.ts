import { computeRequestFingerprint } from '@agentos/core-engine';
import type { CareHandoffRepository, EnqueueCareHandoffInput } from '@agentos/database';
import type { SkillToolInvocation } from '@agentos/skills';

import { CareSkillToolError } from './errors.js';

/** Executes the durable care handoff binding while preserving enqueue/reconcile semantics. */
export async function handleHandoff<TOutput>(
  invocation: SkillToolInvocation<unknown>,
  handoffRepository: Pick<CareHandoffRepository, 'enqueue' | 'reconcile'>,
): Promise<TOutput> {
  const input = invocation.input as {
    readonly tenant_id: string;
    readonly session_id: string;
    readonly conversation_id: string;
    readonly customer_id?: string;
    readonly escalation_reason: string;
    readonly summary_context?: string;
  };
  const trustedTenantId = invocation.context.tenant_id;
  if (input.tenant_id !== trustedTenantId) {
    throw new CareSkillToolError(
      'TENANT_SCOPE_MISMATCH',
      'handoff payload tenant_id must match the orchestrator-bound tenant',
    );
  }

  const enqueueInput: EnqueueCareHandoffInput = {
    tenant_id: trustedTenantId,
    effect_key: invocation.context.effect_key,
    request_fingerprint: computeRequestFingerprint(invocation.input as Record<string, unknown>),
    run_id: invocation.context.run_id,
    session_id: input.session_id,
    conversation_id: input.conversation_id,
    ...(input.customer_id === undefined ? {} : { customer_id: input.customer_id }),
    escalation_reason: input.escalation_reason,
    ...(input.summary_context === undefined ? {} : { summary_context: input.summary_context }),
  };
  const reconcileHandoff = async () => {
    try {
      return await handoffRepository.reconcile({
        tenant_id: enqueueInput.tenant_id,
        effect_key: enqueueInput.effect_key,
        request_fingerprint: enqueueInput.request_fingerprint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const codeAndDetail = /^([A-Z][A-Z0-9_]+):\s*(.*)$/s.exec(message);
      if (
        codeAndDetail
        && codeAndDetail[1] !== undefined
        && codeAndDetail[1] !== 'HANDOFF_QUEUE_TIMEOUT'
        && (codeAndDetail[1].startsWith('HANDOFF_') || codeAndDetail[1] === 'IDEMPOTENCY_CONFLICT')
      ) {
        throw new CareSkillToolError(codeAndDetail[1], codeAndDetail[2] || codeAndDetail[1]);
      }
      throw new CareSkillToolError(
        'QUEUE_DOWN',
        'the handoff outcome could not be reconciled; no enqueue retry was attempted',
      );
    }
  };
  const recoverHandoff = async (): Promise<TOutput> => {
    const reconciled = await reconcileHandoff();
    if (reconciled.state === 'COMMITTED') return reconciled.output as TOutput;
    throw new CareSkillToolError(
      'QUEUE_DOWN',
      'no committed handoff receipt was found; no enqueue retry was attempted',
    );
  };
  const signal = invocation.context.signal;
  if (signal?.aborted) return recoverHandoff();

  const operation = handoffRepository.enqueue(enqueueInput).then(
    (result) => ({ kind: 'completed' as const, output: result.output }),
    (error: unknown) => ({ kind: 'failed' as const, error }),
  );
  let outcome: Awaited<typeof operation> | { readonly kind: 'aborted' };
  if (!signal) {
    outcome = await operation;
  } else {
    let onAbort!: () => void;
    const aborted = new Promise<{ readonly kind: 'aborted' }>((resolve) => {
      onAbort = () => resolve({ kind: 'aborted' });
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
    try {
      outcome = await Promise.race([operation, aborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }
  if (outcome.kind === 'aborted') return recoverHandoff();
  if (outcome.kind === 'completed') return outcome.output as TOutput;

  const message = outcome.error instanceof Error ? outcome.error.message : '';
  const codeAndDetail = /^([A-Z][A-Z0-9_]+):\s*(.*)$/s.exec(message);
  if (
    codeAndDetail
    && codeAndDetail[1] !== undefined
    && codeAndDetail[1] !== 'HANDOFF_QUEUE_TIMEOUT'
    && (codeAndDetail[1].startsWith('HANDOFF_') || codeAndDetail[1] === 'IDEMPOTENCY_CONFLICT')
  ) {
    throw new CareSkillToolError(codeAndDetail[1]!, codeAndDetail[2] || codeAndDetail[1]!);
  }
  return recoverHandoff();
}
