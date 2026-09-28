/**
 * Marketing campaign dispatch validation helpers.
 *
 * Internal helpers extracted from the dispatch façade; behavior and error
 * semantics intentionally remain unchanged.
 */

import {
  type MarketingAuthoritativeValidation,
  type MarketingBrandAuditOutput,
  type MarketingConsentPort,
  MarketingRuntimeError,
} from './contracts.js';

export interface RecipientConsentResult {
  readonly eligibleRecipients: readonly string[];
  readonly suppressedRecipients: readonly {
    readonly customer_id: string;
    readonly reason: string;
  }[];
}

/**
 * Dispatch-time per-recipient consent and suppression recheck (BR-004, NFR-008).
 * Missing consent is denied (fail closed).
 */
export async function checkRecipientConsents(
  recipients: readonly string[],
  tenant_id: string,
  channel: string,
  consentPort?: MarketingConsentPort,
): Promise<RecipientConsentResult> {
  const eligible: string[] = [];
  const suppressed: { customer_id: string; reason: string }[] = [];

  for (const customer_id of recipients) {
    if (!consentPort) {
      // Missing consent port -> missing consent denied (fail-closed)
      suppressed.push({
        customer_id,
        reason: 'CONSENT_PORT_UNAVAILABLE',
      });
      continue;
    }

    try {
      const decision = await consentPort.check({
        tenant_id,
        customer_id,
        channel,
      });

      if (decision.allowed && !decision.suppression_reason) {
        eligible.push(customer_id);
      } else {
        suppressed.push({
          customer_id,
          reason: decision.suppression_reason ?? 'CONSENT_DENIED',
        });
      }
    } catch {
      // Any check failure -> fail-closed, missing consent denied
      suppressed.push({
        customer_id,
        reason: 'CONSENT_CHECK_ERROR',
      });
    }
  }

  return {
    eligibleRecipients: Object.freeze(eligible),
    suppressedRecipients: Object.freeze(suppressed),
  };
}

/**
 * Validates authoritative claim, price, and promotion inputs (BR-001..003).
 * Refuses price-bearing dispatches with missing or breached floor price.
 */
export function validateAuthoritativeInputs(
  input: unknown,
  authoritativeValidation?: MarketingAuthoritativeValidation,
): void {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new MarketingRuntimeError(
      'SCHEMA_VALIDATION_ERROR',
      'Input must be an object',
    );
  }
  const record = input as Record<string, unknown>;
  const rawPayload = record.payload;
  const payload =
    typeof rawPayload === 'object' && rawPayload !== null && !Array.isArray(rawPayload)
      ? (rawPayload as Record<string, unknown>)
      : undefined;

  // Conflict detection if both top-level and payload specify the field
  const topPrice = record.proposed_price;
  const payloadPrice = payload?.proposed_price;
  if (topPrice !== undefined && payloadPrice !== undefined && topPrice !== payloadPrice) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload proposed_price '${String(payloadPrice)}' conflicts with input proposed_price '${String(topPrice)}'`,
    );
  }
  const rawPrice = topPrice !== undefined ? topPrice : payloadPrice;

  const topDiscountPercent = record.discount_percent;
  const payloadDiscountPercent = payload?.discount_percent;
  if (topDiscountPercent !== undefined && payloadDiscountPercent !== undefined && topDiscountPercent !== payloadDiscountPercent) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload discount_percent '${String(payloadDiscountPercent)}' conflicts with input discount_percent '${String(topDiscountPercent)}'`,
    );
  }
  const rawDiscountPercent = topDiscountPercent !== undefined ? topDiscountPercent : payloadDiscountPercent;

  const topDiscountAmount = record.discount_amount;
  const payloadDiscountAmount = payload?.discount_amount;
  if (topDiscountAmount !== undefined && payloadDiscountAmount !== undefined && topDiscountAmount !== payloadDiscountAmount) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload discount_amount '${String(payloadDiscountAmount)}' conflicts with input discount_amount '${String(topDiscountAmount)}'`,
    );
  }
  const rawDiscountAmount = topDiscountAmount !== undefined ? topDiscountAmount : payloadDiscountAmount;

  const topOfferId = record.offer_id;
  const payloadOfferId = payload?.offer_id;
  if (topOfferId !== undefined && payloadOfferId !== undefined && topOfferId !== payloadOfferId) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload offer_id '${String(payloadOfferId)}' conflicts with input offer_id '${String(topOfferId)}'`,
    );
  }
  const rawOfferId = topOfferId !== undefined ? topOfferId : payloadOfferId;

  // Sourcing & Provenance conflict detection
  const topPriceSource = record.price_source as string | undefined;
  const payloadPriceSource = payload?.price_source as string | undefined;
  if (topPriceSource !== undefined && payloadPriceSource !== undefined && topPriceSource !== payloadPriceSource) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload price_source '${String(payloadPriceSource)}' conflicts with input price_source '${String(topPriceSource)}'`,
    );
  }
  const rawPriceSource = topPriceSource !== undefined ? topPriceSource : payloadPriceSource;

  const topFloorSource = record.floor_source as string | undefined;
  const payloadFloorSource = payload?.floor_source as string | undefined;
  if (topFloorSource !== undefined && payloadFloorSource !== undefined && topFloorSource !== payloadFloorSource) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload floor_source '${String(payloadFloorSource)}' conflicts with input floor_source '${String(topFloorSource)}'`,
    );
  }
  const rawFloorSource = topFloorSource !== undefined ? topFloorSource : payloadFloorSource;

  const topPromoProvenance = (record.promotion_provenance ?? record.promotion_source) as string | undefined;
  const payloadPromoProvenance = (payload?.promotion_provenance ?? payload?.promotion_source) as string | undefined;
  if (topPromoProvenance !== undefined && payloadPromoProvenance !== undefined && topPromoProvenance !== payloadPromoProvenance) {
    throw new MarketingRuntimeError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Payload promotion provenance '${String(payloadPromoProvenance)}' conflicts with input promotion provenance '${String(topPromoProvenance)}'`,
    );
  }
  const rawPromoProvenance = topPromoProvenance !== undefined ? topPromoProvenance : payloadPromoProvenance;

  const promotionClaimPresent =
    rawDiscountPercent !== undefined || rawDiscountAmount !== undefined || rawOfferId !== undefined;
  if (promotionClaimPresent) {
    const authPromo = authoritativeValidation?.promotion_provenance ?? authoritativeValidation?.promotion_source;
    if (!authPromo || typeof authPromo !== 'string' || authPromo.trim() === '') {
      throw new MarketingRuntimeError(
        'PROMOTION_PROVENANCE_REQUIRED',
        'Promotion/offer claims require authoritative promotion provenance; missing provenance fails closed',
      );
    }
    if (!rawPromoProvenance || rawPromoProvenance !== authPromo) {
      throw new MarketingRuntimeError(
        'PROMOTION_PROVENANCE_MISMATCH',
        'Promotion/offer provenance does not match the authoritative source',
      );
    }
  }

  // Price-bearing verification
  if (rawPrice !== undefined) {
    if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice)) {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'Proposed price must be a valid number',
      );
    }
    if (authoritativeValidation?.floor_price === undefined) {
      throw new MarketingRuntimeError(
        'P_FLOOR_UNAVAILABLE',
        'Authoritative floor price is unavailable; price-bearing campaign cannot be dispatched',
      );
    }
    if (rawPrice < authoritativeValidation.floor_price) {
      throw new MarketingRuntimeError(
        'ERR_FLOOR_PRICE_VIOLATION',
        `Proposed price ${rawPrice} is below authoritative floor ${authoritativeValidation.floor_price}`,
      );
    }
    if (
      authoritativeValidation.floor_source !== undefined &&
      (typeof authoritativeValidation.floor_source !== 'string' ||
        authoritativeValidation.floor_source.trim() === '')
    ) {
      throw new MarketingRuntimeError(
        'FLOOR_SOURCE_REQUIRED',
        'Supplied floor_price requires non-empty floor_source; never default floor_source to ERP',
      );
    }
    if (authoritativeValidation.authoritative_price === undefined) {
      throw new MarketingRuntimeError(
        'PRICE_PROVENANCE_REQUIRED',
        'Price-bearing dispatch requires an authoritative price and real price_source; floor_price is only an internal guard',
      );
    }
    if (rawPrice !== authoritativeValidation.authoritative_price) {
      throw new MarketingRuntimeError(
        'PRICE_MISMATCH',
        `Proposed price ${rawPrice} does not match authoritative price ${authoritativeValidation.authoritative_price}`,
      );
    }
    const effectivePriceSource = authoritativeValidation.price_source ?? rawPriceSource;
    if (!effectivePriceSource || typeof effectivePriceSource !== 'string' || effectivePriceSource.trim() === '') {
      throw new MarketingRuntimeError(
        'PRICE_PROVENANCE_REQUIRED',
        'Authoritative price requires non-empty real price_source',
      );
    }
  }

  if (rawPriceSource !== undefined) {
    if (typeof rawPriceSource !== 'string' || rawPriceSource.trim() === '') {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'price_source must be a non-empty string',
      );
    }
    if (
      authoritativeValidation?.price_source !== undefined &&
      rawPriceSource !== authoritativeValidation.price_source
    ) {
      throw new MarketingRuntimeError(
        'PRICE_PROVENANCE_MISMATCH',
        `price_source '${rawPriceSource}' does not match authoritative price_source '${authoritativeValidation.price_source}'`,
      );
    }
  }

  if (rawFloorSource !== undefined) {
    if (typeof rawFloorSource !== 'string' || rawFloorSource.trim() === '') {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'floor_source must be a non-empty string',
      );
    }
    if (
      authoritativeValidation?.floor_source !== undefined &&
      rawFloorSource !== authoritativeValidation.floor_source
    ) {
      throw new MarketingRuntimeError(
        'FLOOR_PROVENANCE_MISMATCH',
        `floor_source '${rawFloorSource}' does not match authoritative floor_source '${authoritativeValidation.floor_source}'`,
      );
    }
  }

  if (rawPromoProvenance !== undefined) {
    if (typeof rawPromoProvenance !== 'string' || rawPromoProvenance.trim() === '') {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'promotion_provenance must be a non-empty string',
      );
    }
    const authPromo = authoritativeValidation?.promotion_provenance ?? authoritativeValidation?.promotion_source;
    if (authPromo !== undefined && rawPromoProvenance !== authPromo) {
      throw new MarketingRuntimeError(
        'PROMOTION_PROVENANCE_MISMATCH',
        `promotion_provenance '${rawPromoProvenance}' does not match authoritative promotion provenance '${authPromo}'`,
      );
    }
  }

  if (authoritativeValidation?.floor_price !== undefined &&
      (typeof authoritativeValidation.floor_source !== 'string' || authoritativeValidation.floor_source.trim() === '')) {
    throw new MarketingRuntimeError(
      'FLOOR_SOURCE_REQUIRED',
      'A supplied floor_price requires non-empty floor_source; never default floor_source to ERP',
    );
  }
  if (authoritativeValidation?.floor_source !== undefined &&
      (typeof authoritativeValidation.floor_source !== 'string' || authoritativeValidation.floor_source.trim() === '')) {
    throw new MarketingRuntimeError(
      'FLOOR_SOURCE_REQUIRED',
      'floor_source must be a non-empty string',
    );
  }

  if (authoritativeValidation?.price_source !== undefined) {
    if (typeof authoritativeValidation.price_source !== 'string' || authoritativeValidation.price_source.trim() === '') {
      throw new MarketingRuntimeError(
        'PRICE_PROVENANCE_REQUIRED',
        'price_source must be a non-empty string',
      );
    }
  }

  if (authoritativeValidation?.promotion_provenance !== undefined) {
    if (typeof authoritativeValidation.promotion_provenance !== 'string' || authoritativeValidation.promotion_provenance.trim() === '') {
      throw new MarketingRuntimeError(
        'PROMOTION_PROVENANCE_REQUIRED',
        'promotion_provenance must be a non-empty string',
      );
    }
  }

  if (authoritativeValidation?.promotion_source !== undefined) {
    if (typeof authoritativeValidation.promotion_source !== 'string' || authoritativeValidation.promotion_source.trim() === '') {
      throw new MarketingRuntimeError(
        'PROMOTION_PROVENANCE_REQUIRED',
        'promotion_source must be a non-empty string',
      );
    }
  }

  // Promotional discount validation (percent)
  if (rawDiscountPercent !== undefined) {
    if (typeof rawDiscountPercent !== 'number' || !Number.isFinite(rawDiscountPercent)) {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'Discount percent must be a valid number',
      );
    }
    if (authoritativeValidation?.max_discount_percent === undefined) {
      throw new MarketingRuntimeError(
        'AUTHORITATIVE_SOURCE_UNAVAILABLE',
        'Authoritative promotion validation is unavailable; promotional discount percent cannot be evaluated',
      );
    }
    if (rawDiscountPercent > authoritativeValidation.max_discount_percent || rawDiscountPercent < 0) {
      throw new MarketingRuntimeError(
        'DISCOUNT_LIMIT_EXCEEDED',
        `Discount percent ${rawDiscountPercent}% exceeds authoritative limit ${authoritativeValidation.max_discount_percent}%`,
      );
    }
  }

  // Promotional discount validation (amount)
  if (rawDiscountAmount !== undefined) {
    if (typeof rawDiscountAmount !== 'number' || !Number.isFinite(rawDiscountAmount)) {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'Discount amount must be a valid number',
      );
    }
    if (authoritativeValidation?.max_discount_amount === undefined) {
      throw new MarketingRuntimeError(
        'AUTHORITATIVE_SOURCE_UNAVAILABLE',
        'Authoritative promotion validation is unavailable; promotional discount amount cannot be evaluated',
      );
    }
    if (rawDiscountAmount > authoritativeValidation.max_discount_amount || rawDiscountAmount < 0) {
      throw new MarketingRuntimeError(
        'DISCOUNT_LIMIT_EXCEEDED',
        `Discount amount ${rawDiscountAmount} exceeds authoritative limit ${authoritativeValidation.max_discount_amount}`,
      );
    }
  }

  // Offer claim validation
  if (rawOfferId !== undefined) {
    if (typeof rawOfferId !== 'string' || rawOfferId.trim() === '') {
      throw new MarketingRuntimeError(
        'SCHEMA_VALIDATION_ERROR',
        'Offer id must be a non-empty string',
      );
    }
    if (!authoritativeValidation) {
      throw new MarketingRuntimeError(
        'AUTHORITATIVE_SOURCE_UNAVAILABLE',
        'Authoritative validation is unavailable; offer claim cannot be evaluated',
      );
    }
    if (
      authoritativeValidation.approved_claims !== undefined &&
      !authoritativeValidation.approved_claims.includes(rawOfferId)
    ) {
      throw new MarketingRuntimeError(
        'ERR_UNAPPROVED_CLAIM',
        `Offer '${rawOfferId}' is not in authoritative approved claims`,
      );
    }
  }
}


/**
 * Requires a blocking-free MKT-04 brand decision (BR-002, BR-009).
 */
export function assertBrandReviewBlockingFree(
  brandReview?: MarketingBrandAuditOutput,
): void {
  if (!brandReview) {
    throw new MarketingRuntimeError(
      'BRAND_REVIEW_REQUIRED',
      'A present brand review is required; campaign cannot be dispatched without brand compliance audit',
    );
  }
  if (!brandReview.compliant) {
    throw new MarketingRuntimeError(
      'BRAND_REVIEW_FAILED',
      'Brand compliance audit did not pass; cannot dispatch unapproved content',
    );
  }
  const blockingViolation = brandReview.violations.find((v) => v.severity === 'BLOCKING');
  if (blockingViolation) {
    throw new MarketingRuntimeError(
      'BRAND_REVIEW_BLOCKING',
      `Brand audit contains blocking violation: ${blockingViolation.rule_id} (${blockingViolation.snippet})`,
    );
  }
}
