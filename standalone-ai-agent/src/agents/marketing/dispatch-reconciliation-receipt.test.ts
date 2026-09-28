/**
 * @file Marketing campaign dispatch seam: Provider Timeout, UNKNOWN Reservation & Reconciliation; Provider Receipt Verification, Settlement Proof & No Fabricated Evidence.
 *
 * One group of the original `dispatch.test.ts`; the sibling files hold the remaining groups
 * exactly once, and every assertion body is unchanged.
 */

import { describe, expect, it, vi } from 'vitest';
import { type ActionDraft, type ExecutionReceipt, type IAdapterDispatcher, type IEffectGuard, type IStatefulWorkflowEngine, type ReservationOutcome } from '@agentos/core-engine/contracts';
import { type CampaignApprovalBinding, type CampaignDispatchInput, type MarketingBrandAuditOutput, type MarketingConsentDecision, type MarketingEvidence, type MarketingInvocationContext, type MarketingRuntimePorts } from './contracts.js';
import { computeCampaignPayloadSha256, computeReviewedDigest, dispatchCampaign, claimCanonicalApproval, isConfirmedExecutionReceipt, reconcileCampaignDispatch } from './dispatch.js';
const TENANT = '11111111-1111-4111-8111-111111111111';
const RUN_ID = 'run-mkt-dispatch-test';
const CORRELATION_ID = 'corr-mkt-dispatch-test';
const CAMPAIGN_ID = 'CAMP-0115-01';
const CONTEXT: MarketingInvocationContext = {
  tenant_id: TENANT,
  run_id: RUN_ID,
  correlation_id: CORRELATION_ID,
  request_id: 'req-mkt-001',
  step_index: 1,
  action_revision: 1,
  caller_agent: 'MKT-05',
  granted_authority: 'AUTH-3',
};
function createMockPorts(overrides: Partial<MarketingRuntimePorts> = {}) {
  const appendAudit = vi.fn(async () => undefined);
  const appendEvidence = vi.fn(async (_evidence: readonly MarketingEvidence[]) => 'persisted-ev-1');
  const consentCheck = vi.fn(async (input: { tenant_id: string; customer_id: string; channel: string }): Promise<MarketingConsentDecision> => ({
    ...input,
    allowed: true,
    consent_timestamp: '2026-01-01T00:00:00.000Z',
    suppression_reason: null,
    source_uri: 'urn:agentos:consents',
    source_version: 'v1',
  }));

  let claimedAction: ActionDraft | null = null;
  const pauseForApproval = vi.fn(async () => ({ approval_id: 'appr-auto-1' }));
  const claimApprovalAndResume = vi.fn(async (
    params: Parameters<IStatefulWorkflowEngine['claimApprovalAndResume']>[0],
  ) => {
    claimedAction = params.authorized_action;
    return {
      claimed: true as const,
      approval_id: params.approval_id,
      operator_id: params.operator_id,
      decision: (params.decision === 'MODIFIED' ? 'MODIFIED' : 'APPROVED') as 'APPROVED' | 'MODIFIED',
    };
  });
  const getTask = vi.fn(async () =>
    claimedAction === null
      ? null
      : {
          task_version: 2,
          state: 'running' as const,
          correlation_id: CORRELATION_ID,
          state_payload: { pending_action: claimedAction },
        },
  );
  const workflowEngine: IStatefulWorkflowEngine = {
    createTask: vi.fn(async () => undefined),
    updateTaskProgress: vi.fn(async () => undefined),
    transitionTask: vi.fn(async () => undefined),
    getTask,
    pauseForApproval,
    claimApprovalAndResume,
    recordFailure: vi.fn(async () => ({ requeued: false })),
    queueHandoffEvidence: vi.fn(async () => ({ queued: true })),
    clearHandoffEvidence: vi.fn(async () => ({ cleared: true })),
  };

  const reserve = vi.fn(async (): Promise<ReservationOutcome> => ({ kind: 'RESERVED' }));
  const resolve = vi.fn(async () => undefined);
  const reconcileGuard = vi.fn(async () => ({ outcome: 'SUCCEEDED' as const }));
  const reopenForRetry = vi.fn(async () => true);

  const effectGuard: IEffectGuard = {
    computeEffectKey: vi.fn(() => 'ek-camp-0115-01'),
    computeRequestFingerprint: vi.fn(() => 'fingerprint-1'),
    reserve,
    resolve,
    reconcile: reconcileGuard,
    reopenForRetry,
  };

  const defaultReceipt: ExecutionReceipt = {
    execution_id: 'exec-api003-001',
    adapter_status: 'SUCCESS',
    provider_reference: 'PROV-REF-100',
    response_payload: { delivered: true },
    latency_ms: 120,
    token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
  };

  const dispatch = vi.fn(async (_action: ActionDraft) => defaultReceipt);
  const reconcileDispatcher = vi.fn(async (): Promise<{ outcome: 'SUCCEEDED' | 'FAILED' | 'INDETERMINATE'; receipt?: ExecutionReceipt }> => ({ outcome: 'SUCCEEDED', receipt: defaultReceipt }));

  const dispatcher: IAdapterDispatcher = {
    dispatch,
    reconcile: reconcileDispatcher,
  };

  const ports: MarketingRuntimePorts = {
    audit: { append: appendAudit },
    evidence: { append: appendEvidence },
    consent: { check: consentCheck },
    workflowEngine,
    effectGuard,
    dispatcher,
    now: () => new Date('2026-01-15T10:00:00.000Z'),
    newId: (() => {
      let id = 0;
      return () => `test-id-${++id}`;
    })(),
    ...overrides,
  };

  return {
    ports,
    appendAudit,
    appendEvidence,
    consentCheck,
    pauseForApproval,
    claimApprovalAndResume,
    reserve,
    resolve,
    dispatch,
    reconcileDispatcher,
    reopenForRetry,
  };
}
type MarketingInputOverrides = Omit<Partial<CampaignDispatchInput>, 'recipients'> & {
  recipients?: readonly string[] | null;
};
function makeValidInput(overrides: MarketingInputOverrides = {}): CampaignDispatchInput {
  const { recipients, ...rest } = overrides;
  const base = {
    tenant_id: TENANT,
    campaign_id: CAMPAIGN_ID,
    segment_id: 'SEG-atrisk-0115',
    channel: 'SMS' as const,
    approved_content_id: 'draft-content-01',
    ...rest,
  };
  return {
    ...base,
    ...(recipients === null
      ? {}
      : { recipients: recipients ?? ['cust-1', 'cust-2'] }),
  };
}
function makeValidBrandReview(overrides: Partial<MarketingBrandAuditOutput> = {}): MarketingBrandAuditOutput {
  return {
    compliant: true,
    violations: [],
    confidence_score: 0.98,
    ...overrides,
  };
}
const TEST_CLAIM = Object.freeze({
  approval_id: 'appr-SCR003-01',
  operator_id: 'op-compliance-leader-01',
});
interface ClaimApprovalOptions {
  readonly approval_id: string;
  readonly operator_id: string;
  readonly decision?: 'APPROVED' | 'MODIFIED';
  readonly effect_key?: string;
}
async function claimApprovedBinding(
  workflowEngine: IStatefulWorkflowEngine,
  input: CampaignDispatchInput,
  claimParams: ClaimApprovalOptions = TEST_CLAIM,
  context: MarketingInvocationContext = CONTEXT,
): Promise<CampaignApprovalBinding> {
  const effect_key = claimParams.effect_key ?? 'ek-camp-0115-01';
  const decision = claimParams.decision ?? 'APPROVED';
  const payload: Record<string, unknown> = {
    ...(input.payload ?? {}),
    tenant_id: input.tenant_id,
    campaign_id: input.campaign_id,
    segment_id: input.segment_id,
    channel: input.channel,
    approved_content_id: input.approved_content_id,
    recipients: input.recipients ?? (Array.isArray(input.payload?.recipients) ? input.payload.recipients : []),
    ...(input.offer_id !== undefined ? { offer_id: input.offer_id } : {}),
    ...(input.discount_amount !== undefined ? { discount_amount: input.discount_amount } : {}),
    ...(input.discount_percent !== undefined ? { discount_percent: input.discount_percent } : {}),
    ...(input.proposed_price !== undefined ? { proposed_price: input.proposed_price } : {}),
    ...(input.price_source !== undefined ? { price_source: input.price_source } : {}),
    ...(input.floor_source !== undefined ? { floor_source: input.floor_source } : {}),
    ...(input.promotion_provenance !== undefined ? { promotion_provenance: input.promotion_provenance } : {}),
  };
  const payload_sha256 = computeCampaignPayloadSha256(payload);
  const reviewed_digest = computeReviewedDigest({
    tenant_id: context.tenant_id,
    run_id: context.run_id,
    effect_key,
    payload_sha256,
  });
  const action: ActionDraft = {
    action_id: 'action-' + claimParams.approval_id,
    run_id: context.run_id,
    tenant_id: context.tenant_id,
    agent_id: 'MKT-05',
    skill_id: 'skill.mkt.dispatch_campaign',
    adapter_target: 'API-003.CommunicationConnector',
    step_index: context.step_index,
    mutating: true,
    price_bearing: typeof payload.proposed_price === 'number',
    request_id: context.request_id,
    action_revision: context.action_revision,
    effect_key,
    required_authority: 'AUTH-4',
    payload,
    approval_payload_digest: payload_sha256,
    approval_id: claimParams.approval_id,
  };
  return claimCanonicalApproval({
    workflow: workflowEngine,
    tenant_id: context.tenant_id,
    run_id: context.run_id,
    approval_id: claimParams.approval_id,
    effect_key,
    payload_sha256,
    reviewed_digest,
    decision,
    operator_id: claimParams.operator_id,
    authorized_action: action,
  });
}

describe('Marketing Campaign Dispatch Seam & Lifecycle', () => {
  describe('6. Provider Timeout, UNKNOWN Reservation & Reconciliation', () => {
    it('leaves reservation UNKNOWN on provider TIMEOUT and never blind retries', async () => {
      const { ports, dispatch, resolve, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-timeout-001',
        adapter_status: 'TIMEOUT',
        provider_reference: null,
        response_payload: {},
        latency_ms: 5001,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'DISPATCH_TIMEOUT',
      });

      // Crucial: resolve() must NOT be called with status: FAILED (leaves UNKNOWN/RESERVED for reconcile)
      expect(resolve).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
          reason: expect.stringContaining('left UNKNOWN for reconcile'),
        }),
      );
    });

    it('reconciles unsettled effect via reconcileCampaignDispatch when provider confirmed success', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      const confirmedReceipt: ExecutionReceipt = {
        execution_id: 'exec-recon-123',
        adapter_status: 'SUCCESS',
        provider_reference: 'CONFIRMED-REF',
        response_payload: { confirmed: true },
        latency_ms: 100,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      };

      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
        receipt: confirmedReceipt,
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('SUCCEEDED');
      expect(resolve).toHaveBeenCalledWith({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        status: 'SUCCEEDED',
        receipt: confirmedReceipt,
      });
    });

    it('leaves effect UNKNOWN when reconciliation is INDETERMINATE, never blind retrying', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'INDETERMINATE',
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not settle effect SUCCEEDED when reconciliation returns outcome SUCCEEDED without receipt, returning INDETERMINATE', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not settle effect SUCCEEDED when reconciliation returns outcome SUCCEEDED with receipt missing provider_reference, returning INDETERMINATE', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
        receipt: {
          execution_id: 'exec-no-ref-789',
          adapter_status: 'SUCCESS',
          provider_reference: null,
          response_payload: {},
          latency_ms: 10,
          token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
        },
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not settle effect SUCCEEDED when reconciliation returns outcome SUCCEEDED with empty provider_reference, returning INDETERMINATE', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
        receipt: {
          execution_id: 'exec-empty-ref-789',
          adapter_status: 'SUCCESS',
          provider_reference: '   ',
          response_payload: {},
          latency_ms: 10,
          token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
        },
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not settle effect SUCCEEDED when reconciliation returns outcome SUCCEEDED with non-SUCCESS adapter_status, returning INDETERMINATE', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
        receipt: {
          execution_id: 'exec-pending-789',
          adapter_status: 'TIMEOUT' as unknown as ExecutionReceipt['adapter_status'],
          provider_reference: 'REF-789',
          response_payload: {},
          latency_ms: 10,
          token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
        },
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not settle effect SUCCEEDED when reconciliation returns outcome SUCCEEDED with missing execution_id, returning INDETERMINATE', async () => {
      const { ports, resolve, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED',
        receipt: {
          execution_id: '',
          adapter_status: 'SUCCESS',
          provider_reference: 'REF-789',
          response_payload: {},
          latency_ms: 10,
          token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
        },
      });

      const reconResult = await reconcileCampaignDispatch({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
        ports,
      });

      expect(reconResult.outcome).toBe('INDETERMINATE');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('reopens the effect key for retry on confirmed reconciliation failure before re-dispatch', async () => {
      const { ports, dispatch, reconcileDispatcher, reopenForRetry } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({ outcome: 'FAILED' as const });

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
          reopenForRetry,
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, customPorts, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(reopenForRetry).toHaveBeenCalledWith({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(result.output.status).toBe('COMPLETED');
    });

    it('fails closed and refuses re-dispatch when reopenForRetry is unavailable on confirmed reconciliation failure', async () => {
      const { ports, dispatch, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({ outcome: 'FAILED' as const });

      const { reopenForRetry: _omitted, ...effectGuardWithoutReopen } = ports.effectGuard!;
      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...effectGuardWithoutReopen,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, customPorts, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'RECONCILIATION_REOPEN_FAILED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed and refuses re-dispatch when reopenForRetry returns false on confirmed reconciliation failure', async () => {
      const { ports, dispatch, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({ outcome: 'FAILED' as const });
      const failingReopen = vi.fn(async () => false);

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
          reopenForRetry: failingReopen,
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, customPorts, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'RECONCILIATION_REOPEN_FAILED',
      });

      expect(failingReopen).toHaveBeenCalledWith({
        tenant_id: TENANT,
        effect_key: 'ek-camp-0115-01',
      });
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('replays confirmed success without re-dispatching when reservation requires reconciliation and provider confirmed success', async () => {
      const { ports, dispatch, reconcileDispatcher, appendAudit } = createMockPorts();
      const confirmedReceipt: ExecutionReceipt = {
        execution_id: 'exec-recon-success-456',
        adapter_status: 'SUCCESS',
        provider_reference: 'CONFIRMED-REF-456',
        response_payload: { delivered: true },
        latency_ms: 50,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      };
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED' as const,
        receipt: confirmedReceipt,
      });

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, customPorts, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(result.output.replayed).toBe(true);
      expect(result.output.dispatch_id).toBe('exec-recon-success-456');
      expect(result.output.status).toBe('COMPLETED');
      expect(dispatch).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'SUCCEEDED',
          reason: expect.stringContaining('Reconciliation confirmed prior successful dispatch'),
        }),
      );
    });

    it('never dispatches again on indeterminate reconciliation outcome', async () => {
      const { ports, dispatch, reconcileDispatcher } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({ outcome: 'INDETERMINATE' as const });

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, customPorts, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'RECONCILE_INDETERMINATE',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with RECONCILE_INDETERMINATE and leaves reservation unsettled when reservation requires reconciliation and provider returns SUCCEEDED without receipt', async () => {
      const { ports, dispatch, resolve, reconcileDispatcher, appendEvidence } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED' as const,
      });

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, customPorts, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'RECONCILE_INDETERMINATE',
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(appendEvidence).not.toHaveBeenCalled();
    });

    it('fails closed with RECONCILE_INDETERMINATE and leaves reservation unsettled when reservation requires reconciliation and provider returns SUCCEEDED with missing provider_reference', async () => {
      const { ports, dispatch, resolve, reconcileDispatcher, appendEvidence } = createMockPorts();
      reconcileDispatcher.mockResolvedValueOnce({
        outcome: 'SUCCEEDED' as const,
        receipt: {
          execution_id: 'exec-recon-unconfirmed-456',
          adapter_status: 'SUCCESS',
          provider_reference: null,
          response_payload: {},
          latency_ms: 20,
          token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
        },
      });

      const customPorts: MarketingRuntimePorts = {
        ...ports,
        effectGuard: {
          ...ports.effectGuard!,
          reserve: vi.fn().mockResolvedValue({ kind: 'RECONCILE_REQUIRED' }),
        },
      };

      const input = makeValidInput();
      const binding = await claimApprovedBinding(customPorts.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, customPorts, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'RECONCILE_INDETERMINATE',
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(appendEvidence).not.toHaveBeenCalled();
    });
  });

  describe('6b. Provider Receipt Verification, Settlement Proof & No Fabricated Evidence', () => {
    it('fails closed with DISPATCH_UNKNOWN/RECEIPT_UNCONFIRMED when ExecutionReceipt status is SUCCESS but provider_reference is null, leaving effect unsettled without fabricated evidence', async () => {
      const { ports, dispatch, resolve, appendEvidence, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-no-ref-001',
        adapter_status: 'SUCCESS',
        provider_reference: null,
        response_payload: { delivered: true },
        latency_ms: 50,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'DISPATCH_UNKNOWN',
        message: expect.stringContaining('RECEIPT_UNCONFIRMED'),
      });

      // Crucial: resolve() must NOT be called with status: SUCCEEDED (leaves UNKNOWN for reconciliation)
      expect(resolve).not.toHaveBeenCalled();
      // Crucial: evidence.append must NOT be called (never fabricate provider evidence or 'v1' fallback)
      expect(appendEvidence).not.toHaveBeenCalled();
      // Crucial: audit.append must record DENIED outcome with UNKNOWN reconciliation notice
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
          reason: expect.stringContaining('UNKNOWN for reconciliation'),
        }),
      );
    });

    it('fails closed with DISPATCH_UNKNOWN when ExecutionReceipt status is SUCCESS but provider_reference is empty or whitespace string', async () => {
      const { ports, dispatch, resolve, appendEvidence, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-empty-ref-002',
        adapter_status: 'SUCCESS',
        provider_reference: '   ',
        response_payload: { delivered: true },
        latency_ms: 50,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'DISPATCH_UNKNOWN',
        message: expect.stringContaining('RECEIPT_UNCONFIRMED'),
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(appendEvidence).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
        }),
      );
    });

    it('fails closed with DISPATCH_UNKNOWN when ExecutionReceipt execution_id is missing or empty', async () => {
      const { ports, dispatch, resolve, appendEvidence, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: '',
        adapter_status: 'SUCCESS',
        provider_reference: 'PROV-REF-100',
        response_payload: { delivered: true },
        latency_ms: 50,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'DISPATCH_UNKNOWN',
        message: expect.stringContaining('RECEIPT_UNCONFIRMED'),
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(appendEvidence).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
        }),
      );
    });

    it('settles SUCCESS only with confirmed ExecutionReceipt and builds evidence strictly from provider data without v1 fallback', async () => {
      const { ports, dispatch, resolve, appendEvidence, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-confirmed-001',
        adapter_status: 'SUCCESS',
        provider_reference: 'PROV-TX-9988',
        response_payload: { delivered: true },
        latency_ms: 75,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(result.output.status).toBe('COMPLETED');
      expect(resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCEEDED',
        }),
      );
      expect(appendEvidence).toHaveBeenCalledTimes(1);
      const persistedEvidence = appendEvidence.mock.calls[0]![0]![0]!;
      expect(persistedEvidence.source_uri).toBe('api-003://communication/exec-confirmed-001');
      expect(persistedEvidence.source_version).toBe('PROV-TX-9988');
      expect(persistedEvidence.source_version).not.toBe('v1');
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'SUCCEEDED',
        }),
      );
    });

    it('builds evidence source_version from explicitly provider-supplied version when present in response payload', async () => {
      const { ports, dispatch, resolve, appendEvidence } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-confirmed-002',
        adapter_status: 'SUCCESS',
        provider_reference: 'PROV-TX-9989',
        response_payload: { version: '2026.09.26-provider' },
        latency_ms: 75,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(result.output.status).toBe('COMPLETED');
      expect(resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCEEDED',
        }),
      );
      expect(appendEvidence).toHaveBeenCalledTimes(1);
      const persistedEvidence = appendEvidence.mock.calls[0]![0]![0]!;
      expect(persistedEvidence.source_version).toBe('2026.09.26-provider');
      expect(persistedEvidence.source_version).not.toBe('v1');
    });

    it('fails closed when provider returns unexpected unconfirmed status without resolving SUCCEEDED', async () => {
      const { ports, dispatch, resolve, appendEvidence, appendAudit } = createMockPorts();
      dispatch.mockResolvedValueOnce({
        execution_id: 'exec-unconfirmed-003',
        adapter_status: 'PENDING' as unknown as ExecutionReceipt['adapter_status'],
        provider_reference: 'REF-123',
        response_payload: {},
        latency_ms: 50,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'DISPATCH_UNKNOWN',
        message: expect.stringContaining('RECEIPT_UNCONFIRMED'),
      });

      expect(resolve).not.toHaveBeenCalled();
      expect(appendEvidence).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
        }),
      );
    });

    it('isConfirmedExecutionReceipt strictly enforces valid ExecutionReceipt with adapter_status SUCCESS, non-empty provider_reference and non-empty execution_id', () => {
      expect(isConfirmedExecutionReceipt(null)).toBe(false);
      expect(isConfirmedExecutionReceipt(undefined)).toBe(false);
      expect(isConfirmedExecutionReceipt('invalid')).toBe(false);
      expect(isConfirmedExecutionReceipt({})).toBe(false);
      expect(
        isConfirmedExecutionReceipt({
          execution_id: 'exec-1',
          adapter_status: 'SUCCESS',
          provider_reference: null,
        }),
      ).toBe(false);
      expect(
        isConfirmedExecutionReceipt({
          execution_id: 'exec-1',
          adapter_status: 'SUCCESS',
          provider_reference: '   ',
        }),
      ).toBe(false);
      expect(
        isConfirmedExecutionReceipt({
          execution_id: '',
          adapter_status: 'SUCCESS',
          provider_reference: 'prov-ref-1',
        }),
      ).toBe(false);
      expect(
        isConfirmedExecutionReceipt({
          execution_id: 'exec-1',
          adapter_status: 'ERROR',
          provider_reference: 'prov-ref-1',
        }),
      ).toBe(false);
      expect(
        isConfirmedExecutionReceipt({
          execution_id: 'exec-1',
          adapter_status: 'SUCCESS',
          provider_reference: 'prov-ref-1',
        }),
      ).toBe(true);
    });
  });
});
