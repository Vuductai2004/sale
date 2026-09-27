/**
 * @file Marketing campaign dispatch seam: Approval Gating (AUTH-4 / SCR-003); Digest Mismatch & Payload Change Invalidation.
 *
 * One group of the original `dispatch.test.ts`; the sibling files hold the remaining groups
 * exactly once, and every assertion body is unchanged.
 */

import { describe, expect, it, vi } from 'vitest';
import { type ActionDraft, type ExecutionReceipt, type IAdapterDispatcher, type IEffectGuard, type IStatefulWorkflowEngine, type ReservationOutcome } from '@agentos/core-engine/contracts';
import { type CampaignApprovalBinding, type CampaignDispatchInput, type MarketingBrandAuditOutput, type MarketingConsentDecision, type MarketingEvidence, type MarketingInvocationContext, type MarketingRuntimePorts, MarketingRuntimeError } from './contracts.js';
import { computeCampaignPayloadSha256, computeReviewedDigest, dispatchCampaign, claimCanonicalApproval, verifyApprovalDigestBinding } from './dispatch.js';
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
  describe('1. Approval Gating (AUTH-4 / SCR-003)', () => {
    it('refuses any provider call before shared AUTH-4 release and pauses for approval in workflowEngine', async () => {
      const { ports, pauseForApproval, dispatch } = createMockPorts();
      const input = makeValidInput();

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), expected_task_version: 1 }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_REQUIRED',
      });

      expect(pauseForApproval).toHaveBeenCalledTimes(1);
      expect(pauseForApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: TENANT,
          run_id: RUN_ID,
          expected_task_version: 1,
          checkpoint: expect.objectContaining({ stage: 'APPROVAL' }),
        }),
      );
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with P1B_APPROVAL_PORT_UNAVAILABLE when workflowEngine is missing on approval pause', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();

      await expect(
        dispatchCampaign(input, CONTEXT, withoutWorkflow(ports), {
          brandReview: makeValidBrandReview(),
          expected_task_version: 1,
        }),
      ).rejects.toMatchObject({
        code: 'P1B_APPROVAL_PORT_UNAVAILABLE',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('refuses provider call if approval decision is REJECTED or not claimed', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const rejectedBinding: CampaignApprovalBinding = {
        ...binding,
        decision: 'REJECTED' as unknown as 'APPROVED',
        claimed: false as unknown as true,
      };

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: rejectedBinding }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_NOT_RELEASED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with APPROVAL_NOT_RELEASED on caller-only APPROVED when claimApprovalAndResume returns false', async () => {
      const { ports, dispatch, claimApprovalAndResume } = createMockPorts();
      claimApprovalAndResume.mockResolvedValueOnce({ claimed: false as unknown as true, approval_id: 'appr-caller-only', operator_id: 'op-caller-only', decision: 'APPROVED' });

      const input = makeValidInput();
      const callerOnlyPayload: Record<string, unknown> = {
        tenant_id: input.tenant_id,
        campaign_id: input.campaign_id,
        segment_id: input.segment_id,
        channel: input.channel,
        approved_content_id: input.approved_content_id,
        recipients: input.recipients ?? [],
      };
      const callerOnlyPayloadSha256 = computeCampaignPayloadSha256(callerOnlyPayload);
      // Caller-only fabricated binding without workflow claim release
      const unconfirmedBinding = {
        approval_id: 'appr-caller-only',
        tenant_id: CONTEXT.tenant_id,
        run_id: CONTEXT.run_id,
        effect_key: 'ek-camp-0115-01',
        payload_sha256: callerOnlyPayloadSha256,
        reviewed_digest: computeReviewedDigest({
          tenant_id: CONTEXT.tenant_id,
          run_id: CONTEXT.run_id,
          effect_key: 'ek-camp-0115-01',
          payload_sha256: callerOnlyPayloadSha256,
        }),
        decision: 'APPROVED' as const,
        operator_id: 'op-caller-only',
        claimed: false as unknown as true,
      };

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: unconfirmedBinding,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_NOT_RELEASED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with APPROVAL_NOT_RELEASED when approval binding lacks valid approval_id', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const invalidBinding = {
        ...binding,
        approval_id: '',
      } as unknown as CampaignApprovalBinding;

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: invalidBinding,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_NOT_RELEASED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with APPROVAL_NOT_RELEASED when approval binding lacks valid operator_id', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const invalidBinding = {
        ...binding,
        operator_id: '',
      } as unknown as CampaignApprovalBinding;

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: invalidBinding,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_NOT_RELEASED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('proceeds with provider call when approval is claimed and APPROVED', async () => {
      const { ports, dispatch, resolve } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(result.output.status).toBe('COMPLETED');
      expect(result.output.recipient_count).toBe(2);
      expect(resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: TENANT,
          status: 'SUCCEEDED',
        }),
      );
    });
  });

  describe('2. Digest Mismatch & Payload Change Invalidation', () => {
    it('rejects with APPROVAL_DIGEST_MISMATCH when payload content is modified after review', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({
        discount_percent: 10,
        promotion_provenance: 'PROMO_REGISTRY_2026',
      });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);
      // Malicious or accidental modification: discount changed to 20 after approval!
      const alteredInput = makeValidInput({
        discount_percent: 20,
        promotion_provenance: 'PROMO_REGISTRY_2026',
      });

      await expect(
        dispatchCampaign(alteredInput, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
          authoritativeValidation: {
            max_discount_percent: 20,
            promotion_provenance: 'PROMO_REGISTRY_2026',
          },
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('rejects with APPROVAL_DIGEST_MISMATCH on tenant, run_id, or effect_key binding mismatch', async () => {
      const { ports } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);
      const payload_sha256 = binding.payload_sha256;

      expect(() =>
        verifyApprovalDigestBinding(
          { ...binding, run_id: 'foreign-run-id' },
          { tenant_id: TENANT, run_id: RUN_ID, effect_key: 'ek-camp-0115-01', payload_sha256 },
        ),
      ).toThrow(MarketingRuntimeError);

      expect(() =>
        verifyApprovalDigestBinding(
          { ...binding, effect_key: 'different-effect-key' },
          { tenant_id: TENANT, run_id: RUN_ID, effect_key: 'ek-camp-0115-01', payload_sha256 },
        ),
      ).toThrow(MarketingRuntimeError);
    });

    it('rejects with APPROVAL_PAYLOAD_MISMATCH if input.payload has conflicting channel, content, or recipients', async () => {
      const { ports } = createMockPorts();
      const inputWithChannelConflict = makeValidInput({
        channel: 'SMS',
        payload: { channel: 'EMAIL' },
      });
      await expect(
        dispatchCampaign(inputWithChannelConflict, CONTEXT, ports, { brandReview: makeValidBrandReview() }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_PAYLOAD_MISMATCH',
      });

      const inputWithContentConflict = makeValidInput({
        approved_content_id: 'content-A',
        payload: { approved_content_id: 'content-B' },
      });
      await expect(
        dispatchCampaign(inputWithContentConflict, CONTEXT, ports, { brandReview: makeValidBrandReview() }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_PAYLOAD_MISMATCH',
      });

      const inputWithRecipientConflict = makeValidInput({
        recipients: ['cust-1'],
        payload: { recipients: ['cust-2'] },
      });
      await expect(
        dispatchCampaign(inputWithRecipientConflict, CONTEXT, ports, { brandReview: makeValidBrandReview() }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_PAYLOAD_MISMATCH',
      });
    });

    it('invalidates digest if channel, content, or audience changes after approval', async () => {
      const { ports } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);
      // Changed channel
      await expect(
        dispatchCampaign(
          { ...input, channel: 'EMAIL' },
          CONTEXT,
          ports,
          { brandReview: makeValidBrandReview(), approvalBinding: binding },
        ),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });

      // Changed content
      await expect(
        dispatchCampaign(
          { ...input, approved_content_id: 'different-draft-id' },
          CONTEXT,
          ports,
          { brandReview: makeValidBrandReview(), approvalBinding: binding },
        ),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });

      // Changed recipients/audience
      await expect(
        dispatchCampaign(
          { ...input, recipients: ['cust-different'] },
          CONTEXT,
          ports,
          { brandReview: makeValidBrandReview(), approvalBinding: binding },
        ),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });
    });
  });
});
