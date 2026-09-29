/**
 * @file Marketing audience reader over the tenant's own Customer360 rows.
 *
 * The reactivation audience is a server-side query, never an audience asserted by a caller or a
 * model: a customer is included only when their recorded last paid purchase is older than the
 * requested inactivity window, and excluded when they have an explicit marketing opt-out for the
 * demo's email channel. The size is capped by the caller-supplied (demo-policy) segment size.
 */

import type { ExecutionContext } from '@agentos/skills';
import { assertTenantContext, withTenantContext, type TenantTransactionRunner } from '@agentos/database';
import type { InputMktSegmentAudience, OutputMktSegmentAudience } from './skills/types.js';

const DEMO_AUDIENCE_CHANNEL = 'email';
const MARKETING_CONSENT_TYPE = 'marketing_messaging';

export interface MarketingAudienceReaderOptions {
  /** Injected tenant transaction runner; defaults to the canonical RLS-scoped runner. */
  readonly runInTenantTransaction?: TenantTransactionRunner;
  /** Injected clock for the deterministic `generated_at` stamp. */
  readonly now?: () => Date;
}

interface AudienceRow {
  readonly customer_id: string;
}

/**
 * Builds the `PostgreSQL.Customer360Store` audience reader used by `skill.mkt.segment_audience`.
 *
 * @param options Injected transaction runner and clock.
 * @returns A reader that refuses a mismatched tenant/context pair before touching the database.
 */
export function createMarketingAudienceReader(options: MarketingAudienceReaderOptions = {}) {
  const runInTenantTransaction = options.runInTenantTransaction ?? withTenantContext;
  const now = options.now ?? (() => new Date());

  return async function readAudience(
    input: InputMktSegmentAudience,
    context: ExecutionContext,
  ): Promise<OutputMktSegmentAudience> {
    const tenant_id = input.tenant_id;
    if (tenant_id !== context.tenant_id) {
      throw new Error('TENANT_CONTEXT_MISMATCH: audience input tenant does not match the execution context');
    }
    assertTenantContext(tenant_id);

    const minDaysInactive = input.min_days_inactive;
    if (!Number.isSafeInteger(minDaysInactive) || minDaysInactive < 0) {
      throw new Error('INVALID_SEGMENT_CRITERIA: min_days_inactive must be a non-negative integer');
    }
    const requestedSize = input.max_segment_size ?? 100;
    if (!Number.isSafeInteger(requestedSize) || requestedSize < 1) {
      throw new Error('INVALID_SEGMENT_CRITERIA: max_segment_size must be a positive integer');
    }

    const rows = await runInTenantTransaction(tenant_id, async (client) => {
      const result = await client.query<AudienceRow>(
        `SELECT c.id::text AS customer_id
           FROM agentos.customers c
          WHERE c.tenant_id = $1
            AND c.metadata->>'last_paid_purchase_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            AND (c.metadata->>'last_paid_purchase_at')::timestamptz
                <= CURRENT_TIMESTAMP - make_interval(days => $2::int)
            AND NOT EXISTS (
                  SELECT 1
                    FROM agentos.consents k
                   WHERE k.tenant_id = c.tenant_id
                     AND k.customer_id = c.id
                     AND k.consent_type = $3
                     AND k.channel = $4
                     AND k.is_granted = FALSE
                )
          ORDER BY (c.metadata->>'last_paid_purchase_at')::timestamptz ASC, c.id ASC
          LIMIT $5::int`,
        [tenant_id, minDaysInactive, MARKETING_CONSENT_TYPE, DEMO_AUDIENCE_CHANNEL, requestedSize],
      );
      return result.rows;
    });

    const customer_ids = rows.map((row) => row.customer_id);
    return {
      segment_id: `inactive_${String(minDaysInactive)}d`,
      matched_customer_count: customer_ids.length,
      customer_ids,
      generated_at: now().toISOString(),
    };
  };
}
