/**
 * @file Marketing campaign dispatch seam: AUTH-5 Prohibited Action Hard Deny & Canonical Grant Boundary; Duplicate Replay & Idempotency; Authoritative Claim, Price & Promotion Validation.
 *
 * One group of the original `dispatch.test.ts`; the sibling files hold the remaining groups
 * exactly once, and every assertion body is unchanged.
 */

import { describe, expect, it, vi } from 'vitest';
import { type ActionDraft, type ExecutionReceipt, type IAdapterDispatcher, type IEffectGuard, type IStatefulWorkflowEngine, type ReservationOutcome } from '@agentos/core-engine/contracts';
import { type CampaignApprovalBinding, type CampaignDispatchInput, type MarketingAuthoritativeValidation, type MarketingBrandAuditOutput, type MarketingConsentDecision, type MarketingEvidence, type MarketingInvocationContext, type MarketingRuntimePorts, MarketingRuntimeError } from './contracts.js';
import { computeCampaignPayloadSha256, computeReviewedDigest, dispatchCampaign, claimCanonicalApproval, validateAuthoritativeInputs } from './dispatch.js';
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
  describe('4. AUTH-5 Prohibited Action Hard Deny & Canonical Grant Boundary', () => {
    it('strictly rejects AUTH-5 before any queueing or provider dispatch via explicit verdict/input seam', async () => {
      const { ports, pauseForApproval, dispatch, appendAudit } = createMockPorts();
      const input = makeValidInput({ authority_verdict: 'AUTH-5' });

      await expect(
        dispatchCampaign(input, CONTEXT, ports),
      ).rejects.toMatchObject({
        code: 'AUTH_5_PROHIBITED',
      });

      expect(pauseForApproval).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
          reason: expect.stringContaining('AUTH-5 is strictly prohibited'),
        }),
      );
    });

    it('strictly rejects AUTH-5 passed via options.authorityVerdict', async () => {
      const { ports, pauseForApproval, dispatch, appendAudit } = createMockPorts();
      const input = makeValidInput();

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { authorityVerdict: 'AUTH-5' }),
      ).rejects.toMatchObject({
        code: 'AUTH_5_PROHIBITED',
      });

      expect(pauseForApproval).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(appendAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'DENIED',
          reason: expect.stringContaining('AUTH-5 is strictly prohibited'),
        }),
      );
    });

    it('rejects non-assignable authority grant (AUTH-4 / AUTH-5) at canonical grant boundary without widening grant type', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();

      const auth4Context: MarketingInvocationContext = {
        ...CONTEXT,
        granted_authority: 'AUTH-4' as unknown as MarketingInvocationContext['granted_authority'],
      };

      await expect(
        dispatchCampaign(input, auth4Context, ports, { brandReview: makeValidBrandReview() }),
      ).rejects.toMatchObject({
        code: 'INVALID_CLEARANCE',
      });

      const auth5Context: MarketingInvocationContext = {
        ...CONTEXT,
        granted_authority: 'AUTH-5' as unknown as MarketingInvocationContext['granted_authority'],
      };

      await expect(
        dispatchCampaign(input, auth5Context, ports, { brandReview: makeValidBrandReview() }),
      ).rejects.toMatchObject({
        code: 'INVALID_CLEARANCE',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('5. Duplicate Replay & Idempotency', () => {
    it('returns canonical replay receipt without another provider dispatch on duplicate replay', async () => {
      const { ports, reserve, dispatch } = createMockPorts();
      const existingReceipt: ExecutionReceipt = {
        execution_id: 'exec-replay-999',
        adapter_status: 'SUCCESS',
        provider_reference: 'PROVIDER-CACHED-999',
        response_payload: { cached: true },
        latency_ms: 10,
        token_usage: { prompt: 0, completion: 0, total_cost_usd: 0 },
      };

      reserve.mockResolvedValueOnce({
        kind: 'REPLAY',
        receipt: existingReceipt,
      });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: binding,
      });

      expect(result.output.replayed).toBe(true);
      expect(result.output.dispatch_id).toBe('exec-replay-999');
      expect(result.output.status).toBe('COMPLETED');
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('rejects with IDEMPOTENCY_CONFLICT when effect key was reserved with different payload', async () => {
      const { ports, reserve, dispatch } = createMockPorts();
      reserve.mockResolvedValueOnce({ kind: 'CONFLICT' });

      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'IDEMPOTENCY_CONFLICT',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('9. Authoritative Claim, Price & Promotion Validation', () => {
    it('rejects price-bearing campaign if authoritative floor price is unavailable', () => {
      const input = makeValidInput({ proposed_price: 150 });
      expect(() => validateAuthoritativeInputs(input, undefined)).toThrow(
        MarketingRuntimeError,
      );
      expect(() => validateAuthoritativeInputs(input, undefined)).toThrow(
        /P_FLOOR_UNAVAILABLE/,
      );
    });

    it('rejects price-bearing campaign if proposed price is below authoritative floor', () => {
      const input = makeValidInput({ proposed_price: 80 });
      const authValidation: MarketingAuthoritativeValidation = {
        floor_price: 100,
        floor_source: 'ERP_PRICING_CATALOG',
      };
      expect(() => validateAuthoritativeInputs(input, authValidation)).toThrow(
        MarketingRuntimeError,
      );
      expect(() => validateAuthoritativeInputs(input, authValidation)).toThrow(
        /ERR_FLOOR_PRICE_VIOLATION/,
      );
    });

    it('rejects promotional discount exceeding authoritative limit', () => {
      const input = makeValidInput({
        discount_percent: 50,
        promotion_provenance: 'PROMO_REGISTRY_2026',
      });
      const authValidation: MarketingAuthoritativeValidation = {
        max_discount_percent: 30,
        promotion_provenance: 'PROMO_REGISTRY_2026',
      };
      expect(() => validateAuthoritativeInputs(input, authValidation)).toThrow(
        /DISCOUNT_LIMIT_EXCEEDED/,
      );
    });

    it('fails closed when promotional claims lack authoritative provenance or exceed approved claims', () => {
      const inputPercent = makeValidInput({ discount_percent: 15 });
      expect(() => validateAuthoritativeInputs(inputPercent, undefined)).toThrow(
        /PROMOTION_PROVENANCE_REQUIRED/,
      );

      const inputAmount = makeValidInput({ discount_amount: 100 });
      expect(() => validateAuthoritativeInputs(inputAmount, undefined)).toThrow(
        /PROMOTION_PROVENANCE_REQUIRED/,
      );

      const inputOffer = makeValidInput({
        offer_id: 'unapproved-offer',
        promotion_provenance: 'PROMO_REGISTRY_2026',
      });
      expect(() =>
        validateAuthoritativeInputs(inputOffer, {
          approved_claims: ['approved-offer'],
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/ERR_UNAPPROVED_CLAIM/);
    });

    it('rejects payload-only price-bearing campaign if authoritative floor price is unavailable', () => {
      const input = makeValidInput({ payload: { proposed_price: 150 } });
      expect(() => validateAuthoritativeInputs(input, undefined)).toThrow(
        MarketingRuntimeError,
      );
      expect(() => validateAuthoritativeInputs(input, undefined)).toThrow(
        /P_FLOOR_UNAVAILABLE/,
      );
    });

    it('rejects payload-only price-bearing campaign if proposed price is below authoritative floor', () => {
      const input = makeValidInput({ payload: { proposed_price: 80 } });
      const authValidation: MarketingAuthoritativeValidation = {
        floor_price: 100,
        floor_source: 'ERP_PRICING_CATALOG',
      };
      expect(() => validateAuthoritativeInputs(input, authValidation)).toThrow(
        MarketingRuntimeError,
      );
      expect(() => validateAuthoritativeInputs(input, authValidation)).toThrow(
        /ERR_FLOOR_PRICE_VIOLATION/,
      );
    });

    it('rejects payload-only promotional discount exceeding authoritative limit', () => {
      const inputPercent = makeValidInput({
        payload: { discount_percent: 50, promotion_provenance: 'PROMO_REGISTRY_2026' },
      });
      expect(() =>
        validateAuthoritativeInputs(inputPercent, {
          max_discount_percent: 30,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/DISCOUNT_LIMIT_EXCEEDED/);

      const inputAmount = makeValidInput({
        payload: { discount_amount: 500, promotion_provenance: 'PROMO_REGISTRY_2026' },
      });
      expect(() =>
        validateAuthoritativeInputs(inputAmount, {
          max_discount_amount: 200,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/DISCOUNT_LIMIT_EXCEEDED/);
    });

    it('fails closed when payload-only promotional claims lack provenance or exceed approved claims', () => {
      const inputPercent = makeValidInput({ payload: { discount_percent: 15 } });
      expect(() => validateAuthoritativeInputs(inputPercent, undefined)).toThrow(
        /PROMOTION_PROVENANCE_REQUIRED/,
      );

      const inputAmount = makeValidInput({ payload: { discount_amount: 100 } });
      expect(() => validateAuthoritativeInputs(inputAmount, undefined)).toThrow(
        /PROMOTION_PROVENANCE_REQUIRED/,
      );

      const inputOffer = makeValidInput({
        payload: { offer_id: 'unapproved-offer', promotion_provenance: 'PROMO_REGISTRY_2026' },
      });
      expect(() =>
        validateAuthoritativeInputs(inputOffer, {
          approved_claims: ['approved-offer'],
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/ERR_UNAPPROVED_CLAIM/);

      expect(() => validateAuthoritativeInputs(inputOffer, undefined)).toThrow(
        /PROMOTION_PROVENANCE_REQUIRED/,
      );
    });

    it('fails closed with SCHEMA_VALIDATION_ERROR on payload-only claim fields with malformed types', () => {
      const invalidPrice = makeValidInput({
        payload: { proposed_price: 'one-hundred' as unknown as number },
      });
      expect(() =>
        validateAuthoritativeInputs(invalidPrice, { floor_price: 50 }),
      ).toThrow(/SCHEMA_VALIDATION_ERROR/);

      const invalidPercent = makeValidInput({
        payload: {
          discount_percent: 'twenty-percent' as unknown as number,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        },
      });
      expect(() =>
        validateAuthoritativeInputs(invalidPercent, {
          max_discount_percent: 50,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/SCHEMA_VALIDATION_ERROR/);

      const invalidAmount = makeValidInput({
        payload: {
          discount_amount: true as unknown as number,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        },
      });
      expect(() =>
        validateAuthoritativeInputs(invalidAmount, {
          max_discount_amount: 50,
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/SCHEMA_VALIDATION_ERROR/);

      const invalidOffer = makeValidInput({
        payload: { offer_id: 12345 as unknown as string, promotion_provenance: 'PROMO_REGISTRY_2026' },
      });
      expect(() =>
        validateAuthoritativeInputs(invalidOffer, {
          approved_claims: ['12345'],
          promotion_provenance: 'PROMO_REGISTRY_2026',
        }),
      ).toThrow(/SCHEMA_VALIDATION_ERROR/);
    });

    it('detects conflict between typed input fields and payload claim fields', () => {
      const conflictingPrice = makeValidInput({
        proposed_price: 150,
        payload: { proposed_price: 120 },
      });
      expect(() =>
        validateAuthoritativeInputs(conflictingPrice, { floor_price: 100 }),
      ).toThrow(/APPROVAL_PAYLOAD_MISMATCH/);

      const conflictingPercent = makeValidInput({
        discount_percent: 10,
        payload: { discount_percent: 20 },
      });
      expect(() =>
        validateAuthoritativeInputs(conflictingPercent, { max_discount_percent: 30 }),
      ).toThrow(/APPROVAL_PAYLOAD_MISMATCH/);
    });

    it('validates canonicalPayload record directly when all authoritative requirements are met', () => {
      const payloadOnlyInput = makeValidInput({
        payload: {
          proposed_price: 150,
          price_source: 'ERP_PRICING_CATALOG',
          floor_source: 'ERP_PRICING_CATALOG',
          promotion_source: 'PROMO_REGISTRY_2026',
          discount_percent: 15,
          discount_amount: 50,
          offer_id: 'approved-offer',
        },
      });
      const authValidation: MarketingAuthoritativeValidation = {
        floor_price: 100,
        floor_source: 'ERP_PRICING_CATALOG',
        authoritative_price: 150,
        price_source: 'ERP_PRICING_CATALOG',
        promotion_source: 'PROMO_REGISTRY_2026',
        approved_claims: ['approved-offer'],
        max_discount_percent: 20,
        max_discount_amount: 100,
      };

      expect(() =>
        validateAuthoritativeInputs(payloadOnlyInput, authValidation),
      ).not.toThrow();
    });

    it('dispatchCampaign fails closed before approval or dispatch on payload-only price without floor price', async () => {
      const { ports, dispatch, pauseForApproval } = createMockPorts();
      const input = makeValidInput({ payload: { proposed_price: 150 } });

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
        }),
      ).rejects.toMatchObject({
        code: 'P_FLOOR_UNAVAILABLE',
      });

      expect(dispatch).not.toHaveBeenCalled();
      expect(pauseForApproval).not.toHaveBeenCalled();
    });

    it('dispatchCampaign fails closed before approval or dispatch on payload-only price below floor', async () => {
      const { ports, dispatch, pauseForApproval } = createMockPorts();
      const input = makeValidInput({ payload: { proposed_price: 75 } });

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          authoritativeValidation: { floor_price: 100, floor_source: 'ERP_PRICING_CATALOG' },
        }),
      ).rejects.toMatchObject({
        code: 'ERR_FLOOR_PRICE_VIOLATION',
      });

      expect(dispatch).not.toHaveBeenCalled();
      expect(pauseForApproval).not.toHaveBeenCalled();
    });

    it('dispatchCampaign fails closed on payload-only promotion claims with absent or breached authoritative limits', async () => {
      const { ports, dispatch, pauseForApproval } = createMockPorts();

      const promotion_provenance = 'PROMO_REGISTRY_2026';

      // Missing authoritative promotion provenance
      await expect(
        dispatchCampaign(makeValidInput({ payload: { discount_percent: 25 } }), CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
        }),
      ).rejects.toMatchObject({ code: 'PROMOTION_PROVENANCE_REQUIRED' });

      // Breached discount_percent limit
      await expect(
        dispatchCampaign(
          makeValidInput({ payload: { discount_percent: 50, promotion_provenance } }),
          CONTEXT,
          ports,
          {
            brandReview: makeValidBrandReview(),
            authoritativeValidation: { max_discount_percent: 20, promotion_provenance },
          },
        ),
      ).rejects.toMatchObject({ code: 'DISCOUNT_LIMIT_EXCEEDED' });

      // Missing authoritative promotion provenance for discount amount
      await expect(
        dispatchCampaign(makeValidInput({ payload: { discount_amount: 100 } }), CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
        }),
      ).rejects.toMatchObject({ code: 'PROMOTION_PROVENANCE_REQUIRED' });

      // Breached discount_amount limit
      await expect(
        dispatchCampaign(
          makeValidInput({ payload: { discount_amount: 300, promotion_provenance } }),
          CONTEXT,
          ports,
          {
            brandReview: makeValidBrandReview(),
            authoritativeValidation: { max_discount_amount: 150, promotion_provenance },
          },
        ),
      ).rejects.toMatchObject({ code: 'DISCOUNT_LIMIT_EXCEEDED' });

      // Unapproved offer_id
      await expect(
        dispatchCampaign(
          makeValidInput({ payload: { offer_id: 'fake-offer', promotion_provenance } }),
          CONTEXT,
          ports,
          {
            brandReview: makeValidBrandReview(),
            authoritativeValidation: { approved_claims: ['valid-offer'], promotion_provenance },
          },
        ),
      ).rejects.toMatchObject({ code: 'ERR_UNAPPROVED_CLAIM' });

      // Missing authoritative promotion provenance for offer
      await expect(
        dispatchCampaign(makeValidInput({ payload: { offer_id: 'any-offer' } }), CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
        }),
      ).rejects.toMatchObject({ code: 'PROMOTION_PROVENANCE_REQUIRED' });

      expect(dispatch).not.toHaveBeenCalled();
      expect(pauseForApproval).not.toHaveBeenCalled();
    });

    it('dispatchCampaign succeeds and preserves one exact canonical payload and reviewed digest for valid payload-only claims', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({
        payload: {
          proposed_price: 150,
          price_source: 'ERP_PRICING_CATALOG',
          floor_source: 'ERP_PRICING_CATALOG',
          promotion_source: 'PROMO_REGISTRY_2026',
          offer_id: 'promo-special-2026',
          discount_percent: 15,
          discount_amount: 50,
          custom_tracking: 'mkt-campaign-tag',
        },
      });
      const authValidation: MarketingAuthoritativeValidation = {
        floor_price: 100,
        floor_source: 'ERP_PRICING_CATALOG',
        authoritative_price: 150,
        price_source: 'ERP_PRICING_CATALOG',
        promotion_source: 'PROMO_REGISTRY_2026',
        approved_claims: ['promo-special-2026'],
        max_discount_percent: 20,
        max_discount_amount: 100,
      };
      const approvalBinding = await claimApprovedBinding(ports.workflowEngine!, input);

      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding,
        authoritativeValidation: authValidation,
      });

      expect(result.output.status).toBe('COMPLETED');
      expect(dispatch).toHaveBeenCalledTimes(1);
      const dispatchedDraft = dispatch.mock.calls[0]![0];
      expect(dispatchedDraft.price_bearing).toBe(true);
      expect(dispatchedDraft.proposed_price).toBe(150);
      expect(dispatchedDraft.computed_price_floor).toBe(100);
      expect(dispatchedDraft.floor_source).toBe('ERP_PRICING_CATALOG');
      expect(dispatchedDraft.payload).toMatchObject({
        proposed_price: 150,
        offer_id: 'promo-special-2026',
        discount_percent: 15,
        discount_amount: 50,
        custom_tracking: 'mkt-campaign-tag',
      });
      expect(dispatchedDraft.approval_payload_digest).toBe(approvalBinding.payload_sha256);
    });

    it('fails closed with FLOOR_SOURCE_REQUIRED when floor_price is supplied with empty floor_source', () => {
      const input = makeValidInput({ proposed_price: 100 });
      expect(() =>
        validateAuthoritativeInputs(input, { floor_price: 50, floor_source: '  ' }),
      ).toThrow(/FLOOR_SOURCE_REQUIRED/);
    });

    it('fails closed with PRICE_PROVENANCE_REQUIRED when authoritative_price is present without price_source', () => {
      const input = makeValidInput({ proposed_price: 100 });
      expect(() =>
        validateAuthoritativeInputs(input, {
          floor_price: 50,
          floor_source: 'ERP_PRICING_CATALOG',
          authoritative_price: 100,
          price_source: '  ',
        }),
      ).toThrow(/PRICE_PROVENANCE_REQUIRED/);
    });

    it('fails closed with PRICE_PROVENANCE_MISMATCH when price_source conflicts with authoritative price_source', () => {
      const input = makeValidInput({
        proposed_price: 100,
        price_source: 'LOCAL_SCRATCHPAD',
      });
      expect(() =>
        validateAuthoritativeInputs(input, {
          floor_price: 50,
          floor_source: 'ERP_PRICING_CATALOG',
          authoritative_price: 100,
          price_source: 'ERP_PRICING_CATALOG',
        }),
      ).toThrow(/PRICE_PROVENANCE_MISMATCH/);
    });

    it('fails closed with FLOOR_PROVENANCE_MISMATCH when floor_source conflicts with authoritative floor_source', () => {
      const input = makeValidInput({ floor_source: 'LOCAL_SCRATCHPAD' });
      expect(() =>
        validateAuthoritativeInputs(input, { floor_source: 'ERP_PRICING_CATALOG' }),
      ).toThrow(/FLOOR_PROVENANCE_MISMATCH/);
    });

    it('fails closed with PROMOTION_PROVENANCE_MISMATCH when promotion_provenance conflicts with authoritative promotion source', () => {
      const input = makeValidInput({ promotion_provenance: 'LOCAL_SCRATCHPAD' });
      expect(() =>
        validateAuthoritativeInputs(input, { promotion_source: 'PROMO_REGISTRY_2026' }),
      ).toThrow(/PROMOTION_PROVENANCE_MISMATCH/);
    });

    it('fails closed with PROMOTION_PROVENANCE_REQUIRED when authoritative promotion_source is empty', () => {
      expect(() =>
        validateAuthoritativeInputs({}, { promotion_source: '  ' }),
      ).toThrow(/PROMOTION_PROVENANCE_REQUIRED/);
    });
  });
});
