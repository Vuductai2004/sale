/**
 * @file Marketing campaign dispatch seam: Multi-Tenant Isolation; End-to-End CampaignLifecycle Seam; Integration with MarketingRuntime execute() and capabilities.
 *
 * One group of the original `dispatch.test.ts`; the sibling files hold the remaining groups
 * exactly once, and every assertion body is unchanged.
 */

import { describe, expect, it, vi } from 'vitest';
import { type ActionDraft, type ExecutionReceipt, type IAdapterDispatcher, type IEffectGuard, type IStatefulWorkflowEngine, type ReservationOutcome } from '@agentos/core-engine/contracts';
import { type CampaignApprovalBinding, type CampaignDispatchInput, type MarketingBrandAuditOutput, type MarketingConsentDecision, type MarketingSignalInput, type MarketingEvidence, type MarketingInvocationContext, type MarketingRuntimePorts, MarketingRuntimeError } from './contracts.js';
import { computeCampaignPayloadSha256, computeReviewedDigest, dispatchCampaign, claimCanonicalApproval } from './dispatch.js';
import { CampaignLifecycle, assertValidCampaignTransition, createCampaignLifecycle } from './lifecycle.js';
import { createMarketingRuntime } from './runtime.js';
const TENANT = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222';
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
function withoutWorkflow(ports: MarketingRuntimePorts): MarketingRuntimePorts {
  return Object.fromEntries(
    Object.entries(ports).filter(([key]) => key !== 'workflowEngine'),
  ) as MarketingRuntimePorts;
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
  describe('7. Multi-Tenant Isolation', () => {
    it('rejects dispatch when input tenant does not match context tenant', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({ tenant_id: OTHER_TENANT });

      await expect(
        dispatchCampaign(input, CONTEXT, ports),
      ).rejects.toMatchObject({
        code: 'TENANT_MISMATCH',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('scopes all port calls and effect reservations strictly to the verified tenant', async () => {
      const { ports, reserve, dispatch, consentCheck } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding });

      expect(reserve).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT }),
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT }),
        expect.anything(),
      );
      expect(consentCheck).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT }),
      );
    });
  });

  describe('10. End-to-End CampaignLifecycle Seam', () => {
    it('models the complete 8-stage lifecycle from Brief to Optimize', async () => {
      const { ports, dispatch, claimApprovalAndResume } = createMockPorts({
        research: {
          readMarketSignals: async (_input: MarketingSignalInput) => ({
            signals: [],
            trend_velocity: 'STABLE',
            analyzed_at: '2026-01-01T00:00:00.000Z',
            source_uri: 'research://signals',
            source_version: 'v1',
          }),
          segmentAudience: async () => [
            {
              tenant_id: TENANT,
              customer_id: 'cust-1',
              source_uri: 'c360://cust-1',
              source_version: 'v1',
              observed_at: '2026-01-01T00:00:00.000Z',
              match_reason: 'loyal',
            },
          ],
        },
        policy: {
          getApprovedAudienceLimit: async () => 1000,
        },
        content_generator: {
          generate: async () => ({
            draft_id: 'draft-camp-01',
            headline: 'Spring Fresh Styles',
            body_content: 'Discover our spring collection today.',
            cta_text: 'Shop Now',
            channel_payload: { channel_type: 'SMS' },
          }),
        },
        knowledge: {
          readApproved: async (_tenant, path) => ({
            path,
            version: 'v1',
            content: '---\nstatus: approved\n---\n- guaranteed results\n- miracle cure',
          }),
        },
        attribution: {
          collectEvidence: async (attrInput) => [
            {
              tenant_id: TENANT,
              campaign_id: attrInput.campaign_id,
              effect_key: attrInput.effect_key,
              correlation_id: attrInput.correlation_id,
              evidence_id: 'order-ev-1',
              evidence_uri: 'erp://orders/ORD-001',
              source_version: 'v1',
            },
          ],
        },
      });

      const lifecycle = createCampaignLifecycle(
        {
          tenant_id: TENANT,
          campaign_id: CAMPAIGN_ID,
          run_id: RUN_ID,
          correlation_id: CORRELATION_ID,
          expected_task_version: 1,
        },
        ports,
      );

      expect(lifecycle.state.current_stage).toBe('BRIEF');

      // Stage 1: BRIEF
      await lifecycle.stepBrief(
        {
          tenant_id: TENANT,
          market_region: 'TW',
          category_id: 'apparel',
          observation_window_days: 14,
        },
        CONTEXT,
      );
      expect(lifecycle.state.current_stage).toBe('AUDIENCE');

      // Stage 2: AUDIENCE
      const audience = await lifecycle.stepAudience(
        {
          tenant_id: TENANT,
          rfm_criteria: 'LOYAL',
          min_days_inactive: 10,
        },
        CONTEXT,
      );
      expect(audience).toHaveLength(1);
      expect(lifecycle.state.current_stage).toBe('CONTENT');

      // Stage 3: CONTENT
      const content = await lifecycle.stepContent(
        {
          tenant_id: TENANT,
          campaign_theme: 'Spring Collection Launch',
          channel: 'SMS_TEXT' as const,
          locale: 'en-US',
        },
        CONTEXT,
      );
      expect(content.draft_id).toBe('draft-camp-01');
      expect(lifecycle.state.current_stage).toBe('BRAND_REVIEW');

      // Stage 4: BRAND_REVIEW
      const brandReview = await lifecycle.stepBrandReview(CONTEXT);
      expect(brandReview.compliant).toBe(true);
      expect(lifecycle.state.current_stage).toBe('APPROVAL');

      // Stage 5: APPROVAL (AUTH-4 Pause -> Claim)
      const pauseRes = await lifecycle.stepApproval({ segment_id: 'SEG-loyal' }, CONTEXT);
      expect(pauseRes.paused).toBe(true);
      expect(pauseRes.approval_id).toBe('appr-auto-1');
      const realApprovalId = pauseRes.approval_id!;

      // Human operator approves at SCR-003 through the canonical workflow claim
      const claimRes = await lifecycle.stepApproval(
        {
          approval_id: realApprovalId,
          decision: 'APPROVED',
          operator_id: 'op-compliance-leader-01',
          segment_id: 'SEG-loyal',
        },
        CONTEXT,
      );
      expect(claimRes.paused).toBe(false);
      expect(claimRes.approval_id).toBe(realApprovalId);
      expect(claimRes.binding?.claimed).toBe(true);
      expect(claimRes.binding?.approval_id).toBe(realApprovalId);
      expect(claimRes.binding?.operator_id).toBe('op-compliance-leader-01');
      expect(claimApprovalAndResume).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: TENANT,
          run_id: RUN_ID,
          approval_id: realApprovalId,
          decision: 'APPROVED',
          operator_id: 'op-compliance-leader-01',
        }),
      );
      expect(lifecycle.state.current_stage).toBe('PUBLISH');

      // Stage 6: PUBLISH
      const dispatchOutput = await lifecycle.stepPublish(
        {
          segment_id: 'SEG-loyal',
          channel: 'SMS',
          approved_content_id: 'draft-camp-01',
        },
        CONTEXT,
      );
      expect(dispatchOutput.status).toBe('COMPLETED');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(lifecycle.state.current_stage).toBe('MONITOR');

      // Stage 7: MONITOR
      const monitorRes = await lifecycle.stepMonitor(CONTEXT);
      expect(monitorRes.monitored).toBe(true);
      expect(lifecycle.state.current_stage).toBe('OPTIMIZE');

      // Stage 8: OPTIMIZE (MKT-06 Attribution)
      const attrRes = await lifecycle.stepOptimize(
        {
          attribution_model: 'LAST_TOUCH',
          evidence_ids: ['order-ev-1'],
        },
        CONTEXT,
      );
      expect(attrRes.contract.status).toBe('READY_FOR_EVIDENCE');
      expect(attrRes.evidence).toHaveLength(1);
      expect(attrRes.evidence[0]?.classification).toBe('FACT');
    });

    it('rejects illegal stage skipping in campaign lifecycle', () => {
      expect(() => assertValidCampaignTransition('BRIEF', 'PUBLISH')).toThrow(
        MarketingRuntimeError,
      );
      expect(() => assertValidCampaignTransition('CONTENT', 'OPTIMIZE')).toThrow(
        MarketingRuntimeError,
      );
    });

    it('OPTIMIZE returns UNAVAILABLE when downstream order evidence is absent without inventing metrics', async () => {
      const { ports } = createMockPorts({
        attribution: { collectEvidence: async () => [] },
      });

      const lifecycle = createCampaignLifecycle(
        {
          tenant_id: TENANT,
          campaign_id: CAMPAIGN_ID,
          run_id: RUN_ID,
          correlation_id: CORRELATION_ID,
        },
        ports,
      );

      // Set stage to OPTIMIZE for unit test of attribution step
      lifecycle.setStageForTesting('OPTIMIZE');

      const attrRes = await lifecycle.stepOptimize(
        {
          attribution_model: 'LAST_TOUCH',
          evidence_ids: ['absent-order-1'],
        },
        CONTEXT,
      );

      expect(attrRes.contract.status).toBe('UNAVAILABLE');
      expect(attrRes.contract.reason).toBe('ATTRIBUTION_EVIDENCE_INCOMPLETE_OR_UNMATCHED');
      expect(attrRes.evidence).toEqual([]);
    });

    it('fails closed with TASK_VERSION_REQUIRED when expected_task_version is missing on workflow pause', async () => {
      const { ports, pauseForApproval } = createMockPorts();
      const input = makeValidInput();

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          // expected_task_version omitted!
        }),
      ).rejects.toMatchObject({
        code: 'TASK_VERSION_REQUIRED',
      });

      expect(pauseForApproval).not.toHaveBeenCalled();
    });

    it('rejects when workflow engine encounters a task version conflict', async () => {
      const { ports, pauseForApproval } = createMockPorts();
      pauseForApproval.mockRejectedValueOnce(new Error('TASK_VERSION_CONFLICT: stale version'));
      const input = makeValidInput();

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          expected_task_version: 5,
        }),
      ).rejects.toThrow(/TASK_VERSION_CONFLICT/);
    });
    it('stepApproval fails closed with P1B_APPROVAL_PORT_UNAVAILABLE when workflowEngine is missing on pause', async () => {
      const { ports } = createMockPorts();
      const lifecycle = createCampaignLifecycle(
        { tenant_id: TENANT, campaign_id: CAMPAIGN_ID, run_id: RUN_ID, correlation_id: CORRELATION_ID, expected_task_version: 1 },
        withoutWorkflow(ports),
      );
      lifecycle.setStageForTesting('APPROVAL');
      (lifecycle.state as Record<string, unknown>).content = { draft_id: 'draft-camp-01', channel_payload: { channel_type: 'SMS' } };

      await expect(lifecycle.stepApproval({}, CONTEXT)).rejects.toMatchObject({
        code: 'P1B_APPROVAL_PORT_UNAVAILABLE',
      });
    });

    it('stepApproval fails closed with APPROVAL_ID_REQUIRED when resuming without approval_id and unpaused', async () => {
      const { ports } = createMockPorts();
      const lifecycle = createCampaignLifecycle(
        { tenant_id: TENANT, campaign_id: CAMPAIGN_ID, run_id: RUN_ID, correlation_id: CORRELATION_ID, expected_task_version: 1 },
        ports,
      );
      lifecycle.setStageForTesting('APPROVAL');
      (lifecycle.state as Record<string, unknown>).content = { draft_id: 'draft-camp-01', channel_payload: { channel_type: 'SMS' } };

      await expect(
        lifecycle.stepApproval({ segment_id: 'SEG-loyal', decision: 'APPROVED', operator_id: 'op-compliance-leader-01' }, CONTEXT),
      ).rejects.toMatchObject({
        code: 'APPROVAL_ID_REQUIRED',
      });
    });

    it('stepApproval fails closed with OPERATOR_REQUIRED when operator_id is empty on resume', async () => {
      const { ports } = createMockPorts();
      const lifecycle = createCampaignLifecycle(
        { tenant_id: TENANT, campaign_id: CAMPAIGN_ID, run_id: RUN_ID, correlation_id: CORRELATION_ID, expected_task_version: 1 },
        ports,
      );
      lifecycle.setStageForTesting('APPROVAL');
      (lifecycle.state as Record<string, unknown>).content = { draft_id: 'draft-camp-01', channel_payload: { channel_type: 'SMS' } };

      await expect(
        lifecycle.stepApproval({ segment_id: 'SEG-loyal', approval_id: 'appr-auto-1', decision: 'APPROVED', operator_id: '  ' }, CONTEXT),
      ).rejects.toMatchObject({
        code: 'OPERATOR_REQUIRED',
      });
    });

    it('stepApproval fails closed with APPROVAL_NOT_RELEASED when workflow mock claimApprovalAndResume returns claimed: false', async () => {
      const { ports, claimApprovalAndResume } = createMockPorts();
      claimApprovalAndResume.mockResolvedValueOnce({ claimed: false as unknown as true, approval_id: 'appr-auto-1', operator_id: 'op-compliance-leader-01', decision: 'APPROVED' });

      const lifecycle = createCampaignLifecycle(
        { tenant_id: TENANT, campaign_id: CAMPAIGN_ID, run_id: RUN_ID, correlation_id: CORRELATION_ID, expected_task_version: 1 },
        ports,
      );
      lifecycle.setStageForTesting('APPROVAL');
      (lifecycle.state as Record<string, unknown>).content = { draft_id: 'draft-camp-01', channel_payload: { channel_type: 'SMS' } };

      await expect(
        lifecycle.stepApproval({ segment_id: 'SEG-loyal', approval_id: 'appr-auto-1', decision: 'APPROVED', operator_id: 'op-compliance-leader-01' }, CONTEXT),
      ).rejects.toMatchObject({
        code: 'APPROVAL_NOT_RELEASED',
      });
    });
  });

  describe('11. Integration with MarketingRuntime execute() and capabilities', () => {
    it('delegates execute(skill.mkt.dispatch_campaign) when ports.dispatcher is injected', async () => {
      const { ports, dispatch } = createMockPorts();
      const runtime = createMarketingRuntime({ ports, enableDispatch: true });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      // Use dispatchCampaign directly or via execute with options
      const res = await runtime.dispatchCampaign!(input, CONTEXT, { brandReview: makeValidBrandReview(), approvalBinding: binding });
      expect(res.output.status).toBe('COMPLETED');
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('creates lifecycle via runtime.createLifecycle() factory', () => {
      const { ports } = createMockPorts();
      const runtime = createMarketingRuntime({ ports });
      const lifecycle = runtime.createLifecycle!({
        tenant_id: TENANT,
        campaign_id: CAMPAIGN_ID,
        run_id: RUN_ID,
        correlation_id: CORRELATION_ID,
      });
      expect(lifecycle).toBeInstanceOf(CampaignLifecycle);
      expect(lifecycle.state.current_stage).toBe('BRIEF');
    });
  });
});
