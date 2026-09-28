/**
 * Marketing campaign approval and digest helpers.
 *
 * Internal helpers extracted from the dispatch façade; behavior and approval
 * provenance semantics intentionally remain unchanged.
 */

import {
  sha256CanonicalJson,
} from '@agentos/core-engine';
import type {
  ActionDraft,
} from '@agentos/core-engine/contracts';
import {
  type CampaignApprovalBinding,
  type MarketingInvocationContext,
  type MarketingRuntimePorts,
  MarketingRuntimeError,
} from './contracts.js';

/** Canonical computation of payload SHA-256 using RFC 8785 canonical JSON. */
export function computeCampaignPayloadSha256(payload: Record<string, unknown>): string {
  return sha256CanonicalJson(payload);
}

/**
 * Binds the exact reviewed payload digest to tenant_id + run_id + effect_key + payload_sha256.
 * Any difference in tenant, run, effect, or payload invalidates the digest.
 */
export function computeReviewedDigest(params: {
  readonly tenant_id: string;
  readonly run_id: string;
  readonly effect_key: string;
  readonly payload_sha256: string;
}): string {
  return `${params.tenant_id}:${params.run_id}:${params.effect_key}:${params.payload_sha256}`;
}

/**
 * Verifies the reviewed approval payload digest binding.
 * Throws APPROVAL_DIGEST_MISMATCH on any tenant, run, effect, or payload difference.
 */
export function verifyApprovalDigestBinding(
  binding: CampaignApprovalBinding,
  expected: {
    readonly tenant_id: string;
    readonly run_id: string;
    readonly effect_key: string;
    readonly payload_sha256: string;
  },
): void {
  if (binding.tenant_id !== expected.tenant_id) {
    throw new MarketingRuntimeError(
      'APPROVAL_DIGEST_MISMATCH',
      `Approval tenant mismatch: expected ${expected.tenant_id}, got ${binding.tenant_id}`,
    );
  }
  if (binding.run_id !== expected.run_id) {
    throw new MarketingRuntimeError(
      'APPROVAL_DIGEST_MISMATCH',
      `Approval run_id mismatch: expected ${expected.run_id}, got ${binding.run_id}`,
    );
  }
  if (binding.effect_key !== expected.effect_key) {
    throw new MarketingRuntimeError(
      'APPROVAL_DIGEST_MISMATCH',
      `Approval effect_key mismatch: expected ${expected.effect_key}, got ${binding.effect_key}`,
    );
  }
  if (binding.payload_sha256 !== expected.payload_sha256) {
    throw new MarketingRuntimeError(
      'APPROVAL_DIGEST_MISMATCH',
      `Payload digest mismatch: expected ${expected.payload_sha256}, got ${binding.payload_sha256}. Payload was altered after review.`,
    );
  }
  const expectedDigest = computeReviewedDigest(expected);
  if (binding.reviewed_digest !== expectedDigest) {
    throw new MarketingRuntimeError(
      'APPROVAL_DIGEST_MISMATCH',
      `Reviewed digest mismatch: expected ${expectedDigest}, got ${binding.reviewed_digest}`,
    );
  }
}

const CANONICAL_APPROVAL_BINDINGS = new WeakSet<object>();

export async function claimCanonicalApproval(params: {
  readonly workflow: NonNullable<MarketingRuntimePorts['workflowEngine']>;
  readonly tenant_id: string;
  readonly run_id: string;
  readonly approval_id: string;
  readonly effect_key: string;
  readonly payload_sha256: string;
  readonly reviewed_digest: string;
  readonly decision: 'APPROVED' | 'MODIFIED';
  readonly operator_id: string;
  readonly review_comment?: string | null;
  readonly authorized_action: ActionDraft;
  readonly expected_task_version?: number;
}): Promise<CampaignApprovalBinding> {
  if (params.approval_id.trim().length === 0) {
    throw new MarketingRuntimeError('APPROVAL_ID_REQUIRED', 'Canonical approval_id is required for AUTH-4 claim');
  }
  if (params.operator_id.trim().length === 0) {
    throw new MarketingRuntimeError('OPERATOR_REQUIRED', 'Authenticated operator_id is required for AUTH-4 claim');
  }
  const result = await params.workflow.claimApprovalAndResume({
    tenant_id: params.tenant_id,
    run_id: params.run_id,
    approval_id: params.approval_id,
    effect_key: params.effect_key,
    expected_payload_sha256: params.payload_sha256,
    authorized_action: params.authorized_action,
    decision: params.decision,
    operator_id: params.operator_id,
    review_comment: params.review_comment ?? null,
    ...(params.expected_task_version === undefined ? {} : { expected_task_version: params.expected_task_version }),
  });
  if (!result || result.claimed !== true) {
    throw new MarketingRuntimeError('APPROVAL_NOT_RELEASED', 'Canonical P1B approval claim was not accepted');
  }
  const binding: CampaignApprovalBinding = {
    approval_id: params.approval_id,
    tenant_id: params.tenant_id,
    run_id: params.run_id,
    effect_key: params.effect_key,
    payload_sha256: params.payload_sha256,
    reviewed_digest: params.reviewed_digest,
    decision: params.decision,
    operator_id: params.operator_id,
    review_comment: params.review_comment ?? null,
    claimed: true,
  };
  CANONICAL_APPROVAL_BINDINGS.add(binding);
  return binding;
}

export async function assertDurableApprovalClaim(params: {
  readonly ports: MarketingRuntimePorts;
  readonly context: MarketingInvocationContext;
  readonly binding: CampaignApprovalBinding;
  readonly payload_sha256: string;
}): Promise<void> {
  const workflow = params.ports.workflowEngine;
  if (!workflow) {
    throw new MarketingRuntimeError(
      'P1B_APPROVAL_PORT_UNAVAILABLE',
      'Canonical workflow/approval port is unavailable; AUTH-4 dispatch is blocked',
    );
  }
  const task = await workflow.getTask(params.context.tenant_id, params.context.run_id);
  if (!task || task.state !== 'running') {
    throw new MarketingRuntimeError(
      'APPROVAL_NOT_RELEASED',
      'Canonical P1B approval claim did not resume the durable task; provider dispatch is blocked',
    );
  }
  const statePayload = task.state_payload;
  if (statePayload === null || typeof statePayload !== 'object' || Array.isArray(statePayload)) {
    throw new MarketingRuntimeError(
      'APPROVAL_NOT_RELEASED',
      'Canonical P1B durable task has no post-claim checkpoint; provider dispatch is blocked',
    );
  }
  const pendingAction = (statePayload as Record<string, unknown>).pending_action;
  if (pendingAction === null || typeof pendingAction !== 'object' || Array.isArray(pendingAction)) {
    throw new MarketingRuntimeError(
      'APPROVAL_NOT_RELEASED',
      'Canonical P1B durable task has no claimed pending action; provider dispatch is blocked',
    );
  }
  const action = pendingAction as Record<string, unknown>;
  const actionPayload = action.payload;
  if (actionPayload === null || typeof actionPayload !== 'object' || Array.isArray(actionPayload)) {
    throw new MarketingRuntimeError(
      'APPROVAL_NOT_RELEASED',
      'Canonical P1B claimed action has no payload; provider dispatch is blocked',
    );
  }
  const actionPayloadSha256 = computeCampaignPayloadSha256(actionPayload as Record<string, unknown>);
  if (
    action.effect_key !== params.binding.effect_key ||
    action.approval_payload_digest !== params.payload_sha256 ||
    actionPayloadSha256 !== params.payload_sha256
  ) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      'Canonical P1B claimed action does not match the reviewed Marketing payload; provider dispatch is blocked',
    );
  }
  if (!CANONICAL_APPROVAL_BINDINGS.has(params.binding)) {
    throw new MarketingRuntimeError(
      'APPROVAL_NOT_RELEASED',
      'CampaignApprovalBinding lacks local provenance from a successful canonical P1B claim; provider dispatch is blocked',
    );
  }
}
