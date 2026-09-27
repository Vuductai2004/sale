/**
 * @file Marketing campaign dispatch seam: Dispatch-Time Per-Recipient Consent Suppression; Empty Canonical Recipient List & Audience Boundary Enforcement; Blocking-Free Brand Review Enforcement.
 *
 * One group of the original `dispatch.test.ts`; the sibling files hold the remaining groups
 * exactly once, and every assertion body is unchanged.
 */

import { describe, expect, it, vi } from 'vitest';
import { type ActionDraft, type ExecutionReceipt, type IAdapterDispatcher, type IEffectGuard, type IStatefulWorkflowEngine, type ReservationOutcome } from '@agentos/core-engine/contracts';
import { type CampaignApprovalBinding, type CampaignDispatchInput, type MarketingBrandAuditOutput, type MarketingConsentDecision, type MarketingEvidence, type MarketingInvocationContext, type MarketingRuntimePorts, MarketingRuntimeError } from './contracts.js';
import { checkRecipientConsents, computeCampaignPayloadSha256, computeReviewedDigest, dispatchCampaign, claimCanonicalApproval } from './dispatch.js';
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
  describe('3. Dispatch-Time Per-Recipient Consent Suppression', () => {
    it('rechecks per-recipient consent at dispatch time, invalidates stale approval digest when recipients are suppressed, and dispatches under matching reapproval', async () => {
      const { ports, dispatch, reserve, consentCheck } = createMockPorts();

      consentCheck.mockImplementation(async (checkInput) => {
        if (checkInput.customer_id === 'cust-opted-in') {
          return {
            ...checkInput,
            allowed: true,
            consent_timestamp: '2026-01-01T00:00:00.000Z',
            suppression_reason: null,
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        if (checkInput.customer_id === 'cust-opted-out') {
          return {
            ...checkInput,
            allowed: false,
            consent_timestamp: null,
            suppression_reason: 'USER_OPTED_OUT',
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        // cust-missing: missing consent denied
        return {
          ...checkInput,
          allowed: false,
          consent_timestamp: null,
          suppression_reason: 'CONSENT_NOT_FOUND',
          source_uri: 'urn:agentos:consents',
          source_version: 'v1',
        };
      });

      const input = makeValidInput({
        recipients: ['cust-opted-in', 'cust-opted-out', 'cust-missing'],
      });
      const staleBinding = await claimApprovedBinding(ports.workflowEngine!, input);
      // (1) Attempting dispatch with the stale unsuppressed approval fails closed
      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: staleBinding,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });
      expect(dispatch).not.toHaveBeenCalled();
      expect(reserve).not.toHaveBeenCalled();

      // (2) When re-approved for the filtered audience, dispatch succeeds under matching filtered digest
      const filteredInput = makeValidInput({
        recipients: ['cust-opted-in'],
      });
      const reapprovedBinding = await claimApprovedBinding(ports.workflowEngine!, filteredInput);
      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: reapprovedBinding,
      });

      expect(result.output.recipient_count).toBe(1);
      expect(result.output.suppressed_count).toBe(2);
      expect(reserve).toHaveBeenCalledTimes(1);
      expect(reserve).toHaveBeenCalledWith(
        expect.objectContaining({
          request_fingerprint: reapprovedBinding.payload_sha256,
        }),
      );
      expect(dispatch).toHaveBeenCalledTimes(1);

      // Verify ActionDraft payload uses only consent-filtered recipients and matches reapproved digest
      const dispatchedDraft = dispatch.mock.calls[0]![0];
      expect(dispatchedDraft.payload.recipients).toEqual([
        'cust-opted-in',
      ]);
      expect(dispatchedDraft.payload.recipients).not.toContain('cust-opted-out');
      expect(dispatchedDraft.payload.recipients).not.toContain('cust-missing');
      expect(dispatchedDraft.approval_payload_digest).toBe(reapprovedBinding.payload_sha256);
    });

    it('rejects with CONSENT_SUPPRESSION_ALL_DENIED when all recipients lack verified consent', async () => {
      const { ports, dispatch, consentCheck } = createMockPorts();
      consentCheck.mockResolvedValue({
        tenant_id: TENANT,
        customer_id: 'cust-1',
        channel: 'SMS',
        allowed: false,
        consent_timestamp: null,
        suppression_reason: 'CONSENT_NOT_FOUND',
        source_uri: 'urn:agentos:consents',
        source_version: 'v1',
      });
      const input = makeValidInput({ recipients: ['cust-1', 'cust-2'] });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'CONSENT_SUPPRESSION_ALL_DENIED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed when consent port is unavailable', async () => {
      const result = await checkRecipientConsents(['cust-1', 'cust-2'], TENANT, 'SMS', undefined);
      expect(result.eligibleRecipients).toHaveLength(0);
      expect(result.suppressedRecipients).toHaveLength(2);
      expect(result.suppressedRecipients[0]?.reason).toBe('CONSENT_PORT_UNAVAILABLE');
    });

    it('rechecks consent for payload-only recipients, invalidating stale approval and requiring matching reapproval', async () => {
      const { ports, dispatch, consentCheck, reserve } = createMockPorts();

      consentCheck.mockImplementation(async (checkInput) => {
        if (checkInput.customer_id === 'cust-payload-opted-in') {
          return {
            ...checkInput,
            allowed: true,
            consent_timestamp: '2026-01-01T00:00:00.000Z',
            suppression_reason: null,
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        if (checkInput.customer_id === 'cust-payload-opted-out') {
          return {
            ...checkInput,
            allowed: false,
            consent_timestamp: null,
            suppression_reason: 'USER_OPTED_OUT',
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        // cust-payload-missing: missing consent denied
        return {
          ...checkInput,
          allowed: false,
          consent_timestamp: null,
          suppression_reason: 'CONSENT_NOT_FOUND',
          source_uri: 'urn:agentos:consents',
          source_version: 'v1',
        };
      });

      // Explicit input.recipients is absent / undefined; recipients are only in input.payload
      const input = makeValidInput({
        recipients: null,
        payload: {
          recipients: ['cust-payload-opted-in', 'cust-payload-opted-out', 'cust-payload-missing'],
        },
      });
      const staleBinding = await claimApprovedBinding(ports.workflowEngine!, input);
      // (1) Attempting dispatch with stale approval fails closed
      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: staleBinding,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_DIGEST_MISMATCH',
      });
      expect(dispatch).not.toHaveBeenCalled();
      expect(reserve).not.toHaveBeenCalled();

      // (2) When re-approved with filtered payload recipients, dispatch succeeds
      const filteredInput = makeValidInput({
        recipients: null,
        payload: {
          recipients: ['cust-payload-opted-in'],
        },
      });
      const reapprovedBinding = await claimApprovedBinding(ports.workflowEngine!, filteredInput);
      const result = await dispatchCampaign(input, CONTEXT, ports, {
        brandReview: makeValidBrandReview(),
        approvalBinding: reapprovedBinding,
      });

      // Every recipient in payload was checked for consent
      expect(consentCheck).toHaveBeenCalledTimes(6);
      expect(consentCheck).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT, customer_id: 'cust-payload-opted-in', channel: 'SMS' }),
      );
      expect(consentCheck).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT, customer_id: 'cust-payload-opted-out', channel: 'SMS' }),
      );
      expect(consentCheck).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: TENANT, customer_id: 'cust-payload-missing', channel: 'SMS' }),
      );

      // Output counts
      expect(result.output.recipient_count).toBe(1);
      expect(result.output.suppressed_count).toBe(2);

      // Effect reserved with re-approved fingerprint
      expect(reserve).toHaveBeenCalledTimes(1);
      expect(reserve).toHaveBeenCalledWith(
        expect.objectContaining({
          request_fingerprint: reapprovedBinding.payload_sha256,
        }),
      );

      // Provider was called once with only consent-filtered recipients
      expect(dispatch).toHaveBeenCalledTimes(1);
      const dispatchedDraft = dispatch.mock.calls[0]![0];
      expect(dispatchedDraft.payload.recipients).toEqual(['cust-payload-opted-in']);
      expect(dispatchedDraft.payload.recipients).not.toContain('cust-payload-opted-out');
      expect(dispatchedDraft.payload.recipients).not.toContain('cust-payload-missing');

      // Approval digest matches the filtered reapproval binding exactly
      expect(dispatchedDraft.approval_payload_digest).toBe(reapprovedBinding.payload_sha256);
    });

    it('rejects with CONSENT_SUPPRESSION_ALL_DENIED when all payload-only recipients lack consent', async () => {
      const { ports, dispatch, consentCheck, reserve } = createMockPorts();

      consentCheck.mockResolvedValue({
        tenant_id: TENANT,
        customer_id: 'cust-denied-only',
        channel: 'SMS',
        allowed: false,
        consent_timestamp: null,
        suppression_reason: 'CONSENT_NOT_FOUND',
        source_uri: 'urn:agentos:consents',
        source_version: 'v1',
      });

      const input = makeValidInput({
        recipients: null,
        payload: {
          recipients: ['cust-denied-only'],
        },
      });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);
      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'CONSENT_SUPPRESSION_ALL_DENIED',
      });

      expect(consentCheck).toHaveBeenCalledTimes(1);
      expect(reserve).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with explicit stale digest error and refuses reservation or dispatch when consent suppression alters audience under old approval', async () => {
      const { ports, dispatch, reserve, consentCheck } = createMockPorts();

      consentCheck.mockImplementation(async (checkInput) => {
        if (checkInput.customer_id === 'cust-allowed') {
          return {
            ...checkInput,
            allowed: true,
            consent_timestamp: '2026-01-01T00:00:00.000Z',
            suppression_reason: null,
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        return {
          ...checkInput,
          allowed: false,
          consent_timestamp: null,
          suppression_reason: 'REVOKED',
          source_uri: 'urn:agentos:consents',
          source_version: 'v1',
        };
      });

      const input = makeValidInput({
        recipients: ['cust-allowed', 'cust-suppressed'],
      });
      const staleBinding = await claimApprovedBinding(ports.workflowEngine!, input);
      let caughtError: unknown;
      try {
        await dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          approvalBinding: staleBinding,
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(MarketingRuntimeError);
      const mktErr = caughtError as MarketingRuntimeError;
      expect(mktErr.code).toBe('APPROVAL_DIGEST_MISMATCH');
      expect(mktErr.message).toMatch(/stale/i);
      expect(mktErr.message).toMatch(/re-review required/i);
      expect(reserve).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('pauses workflowEngine for re-approval with the filtered canonical payload when recipients are suppressed and no approval is provided', async () => {
      const { ports, pauseForApproval, consentCheck } = createMockPorts();

      consentCheck.mockImplementation(async (checkInput) => {
        if (checkInput.customer_id === 'cust-allowed') {
          return {
            ...checkInput,
            allowed: true,
            consent_timestamp: '2026-01-01T00:00:00.000Z',
            suppression_reason: null,
            source_uri: 'urn:agentos:consents',
            source_version: 'v1',
          };
        }
        return {
          ...checkInput,
          allowed: false,
          consent_timestamp: null,
          suppression_reason: 'CONSENT_NOT_FOUND',
          source_uri: 'urn:agentos:consents',
          source_version: 'v1',
        };
      });

      const input = makeValidInput({
        recipients: ['cust-allowed', 'cust-suppressed'],
      });

      const filteredPayload = {
        ...input,
        recipients: ['cust-allowed'],
      };
      const expectedFilteredSha = computeCampaignPayloadSha256(filteredPayload);
      const expectedFilteredDigest = computeReviewedDigest({
        tenant_id: CONTEXT.tenant_id,
        run_id: CONTEXT.run_id,
        effect_key: 'ek-camp-0115-01',
        payload_sha256: expectedFilteredSha,
      });

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          brandReview: makeValidBrandReview(),
          expected_task_version: 1,
        }),
      ).rejects.toMatchObject({
        code: 'APPROVAL_REQUIRED',
      });

      expect(pauseForApproval).toHaveBeenCalledTimes(1);
      expect(pauseForApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          checkpoint: expect.objectContaining({
            stage: 'APPROVAL',
            payload_sha256: expectedFilteredSha,
            reviewed_digest: expectedFilteredDigest,
          }),
          approval: expect.objectContaining({
            payload: expect.objectContaining({
              recipients: ['cust-allowed'],
            }),
          }),
        }),
      );
    });
  });

  describe('3b. Empty Canonical Recipient List & Audience Boundary Enforcement', () => {
    it('fails closed with AUDIENCE_REQUIRED when input.recipients is empty array, never invoking provider dispatcher', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({ recipients: [] });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'AUDIENCE_REQUIRED',
      });
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with AUDIENCE_REQUIRED when input has segment_id but no recipients and no payload recipients, never treating segment_id alone as consented audience', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({ recipients: null });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'AUDIENCE_REQUIRED',
      });
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with AUDIENCE_REQUIRED when input.payload carries empty recipients array, never invoking dispatcher', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput({ recipients: null, payload: { recipients: [] } });
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, { brandReview: makeValidBrandReview(), approvalBinding: binding }),
      ).rejects.toMatchObject({
        code: 'AUDIENCE_REQUIRED',
      });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('8. Blocking-Free Brand Review Enforcement', () => {
    it('rejects dispatch if brand review is not compliant', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const nonCompliantReview: MarketingBrandAuditOutput = {
        compliant: false,
        violations: [
          {
            rule_id: 'PROHIBITED_CLAIM',
            severity: 'HIGH',
            snippet: '100% cure',
            suggestion: 'remove claim',
          },
        ],
        confidence_score: 0.95,
      };

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          approvalBinding: binding,
          brandReview: nonCompliantReview,
        }),
      ).rejects.toMatchObject({
        code: 'BRAND_REVIEW_FAILED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('rejects dispatch if brand review contains BLOCKING violation', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      const blockingReview: MarketingBrandAuditOutput = {
        compliant: true, // even if marked compliant by mistake
        violations: [
          {
            rule_id: 'REGULATORY_BLOCK',
            severity: 'BLOCKING',
            snippet: 'guaranteed return',
            suggestion: 'illegal in region',
          },
        ],
        confidence_score: 0.99,
      };

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          approvalBinding: binding,
          brandReview: blockingReview,
        }),
      ).rejects.toMatchObject({
        code: 'BRAND_REVIEW_BLOCKING',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('fails closed with BRAND_REVIEW_REQUIRED when brand review is missing', async () => {
      const { ports, dispatch } = createMockPorts();
      const input = makeValidInput();
      const binding = await claimApprovedBinding(ports.workflowEngine!, input);

      await expect(
        dispatchCampaign(input, CONTEXT, ports, {
          approvalBinding: binding,
        }),
      ).rejects.toMatchObject({
        code: 'BRAND_REVIEW_REQUIRED',
      });

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
