/**
 * @file Fail-closed readers for policy proposal payloads.
 *
 * Policy only inspects the explicitly governed members below. Everything else remains opaque to the
 * enforcement point, and present-but-unusable values are distinguished from absent values so no
 * default can silently weaken a refusal.
 */

import type { PolicyDenyCode, PolicyRuleId } from './types.js';

/** Read result of an optional payload member: absent, usable, or present-but-unusable. */
export type FieldRead<T> =
  | { readonly state: 'ABSENT' }
  | { readonly state: 'VALID'; readonly value: T }
  | { readonly state: 'INVALID' };

/** A terminal refusal shared by the payload and trusted-input rule helpers. */
export interface PolicyDenial {
  readonly kind: 'DENY';
  readonly ruleId: PolicyRuleId;
  readonly errorCode: PolicyDenyCode;
  readonly reason: string;
}

/** Payload member groups the PEP reads. Everything else in a payload stays opaque to it. */
export const TENANT_ASSERTION_FIELDS = Object.freeze(['tenant_id', 'tenantId']);
export const CUSTOMER_ASSERTION_FIELDS = Object.freeze([
  'customer_id',
  'customerId',
  'customer_or_entity_id',
]);
export const TARGET_AGENT_FIELDS = Object.freeze(['target_agent_id', 'targetAgentId']);
export const CATALOG_REFERENCE_FIELDS = Object.freeze(['catalog_ref_id', 'catalogRefId']);
export const EFFECTIVE_PRICE_FIELDS = Object.freeze(['effective_price', 'offered_price', 'proposed_price']);
export const EFFECT_KEY_FIELDS = Object.freeze(['effect_key', 'effectKey']);
export const RETRY_ATTEMPT_FIELDS = Object.freeze(['retry_attempt', 'attempt']);

/**
 * The autonomy limits of `TenantPolicyParameters`, each with the payload members it governs
 * (BR-007). A governed member that is present is bounded by its approved limit; an unapproved limit
 * routes the action to a human instead of being defaulted.
 */
export const AUTONOMY_LIMITS = Object.freeze([
  { parameter: 'maxAutonomousDiscountRate', fields: ['discount_rate'] },
  { parameter: 'maxAutonomousRefundAmount', fields: ['refund_amount', 'refund_amount_twd'] },
  { parameter: 'maxAutonomousAudienceSize', fields: ['audience_size'] },
  { parameter: 'maxAutonomousReminderCount', fields: ['reminder_count'] },
] as const);

/** Builds a terminal refusal. */
export function deny(
  ruleId: PolicyRuleId,
  errorCode: PolicyDenyCode,
  reason: string,
): PolicyDenial {
  return { kind: 'DENY', ruleId, errorCode, reason };
}

/**
 * Reads the first present member of a payload.
 *
 * @param payload - Proposal payload.
 * @param candidates - Member names to try, in order.
 * @returns `ABSENT` when no member is present (a member set to `undefined` is absent), otherwise the
 *   raw value.
 */
export function readMember(
  payload: Record<string, unknown>,
  candidates: readonly string[],
): FieldRead<unknown> {
  for (const name of candidates) {
    if (Object.hasOwn(payload, name)) {
      const value = payload[name];

      return value === undefined ? { state: 'ABSENT' } : { state: 'VALID', value };
    }
  }

  return { state: 'ABSENT' };
}

/** Reads a payload member that must be a non-empty string. */
export function readStringField(
  payload: Record<string, unknown>,
  candidates: readonly string[],
): FieldRead<string> {
  const member = readMember(payload, candidates);

  if (member.state !== 'VALID') {
    return member;
  }

  return typeof member.value === 'string' && member.value.trim().length > 0
    ? { state: 'VALID', value: member.value.trim() }
    : { state: 'INVALID' };
}

/** Reads a payload member that must be a finite number. */
export function readNumberField(
  payload: Record<string, unknown>,
  candidates: readonly string[],
): FieldRead<number> {
  const member = readMember(payload, candidates);

  if (member.state !== 'VALID') {
    return member;
  }

  return typeof member.value === 'number' && Number.isFinite(member.value)
    ? { state: 'VALID', value: member.value }
    : { state: 'INVALID' };
}

/**
 * Reads the first usable string member of a payload, or `null`.
 *
 * @param payload - Proposal payload.
 * @param candidates - Member names to try, in order.
 * @returns The trimmed value, or `null` when no member carries a usable string.
 */
export function stringValue(payload: Record<string, unknown>, candidates: readonly string[]): string | null {
  const read = readStringField(payload, candidates);

  return read.state === 'VALID' ? read.value : null;
}
