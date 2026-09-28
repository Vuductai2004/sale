import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@agentos/skills';
import type { TenantTransactionRunner } from '@agentos/database';

import { createMarketingAudienceReader } from './audience-adapter.js';

const TENANT = '99999999-9999-4999-8999-999999999999';
const OTHER_TENANT = '11111111-1111-4111-8111-111111111111';
const GENERATED_AT = new Date('2026-09-28T00:00:00.000Z');

interface QueryCall {
  readonly sql: string;
  readonly params: readonly unknown[];
}

function context(tenant_id = TENANT): ExecutionContext {
  return { tenant_id } as ExecutionContext;
}

function readerReturning(rows: ReadonlyArray<{ readonly customer_id: string }>) {
  const calls: QueryCall[] = [];
  const runInTenantTransaction: TenantTransactionRunner = async (tenant_id, work) => {
    calls.push({ sql: 'BOUND_TENANT', params: [tenant_id] });
    return work({
      query: async (sql: string, params: readonly unknown[]) => {
        calls.push({ sql, params });
        return { rows: [...rows], rowCount: rows.length };
      },
    } as never);
  };
  const readAudience = createMarketingAudienceReader({
    runInTenantTransaction,
    now: () => GENERATED_AT,
  });
  return { readAudience, calls };
}

describe('createMarketingAudienceReader', () => {
  it('scopes the audience query to the server-bound tenant, opt-out exclusions and the requested cap', async () => {
    const { readAudience, calls } = readerReturning([{ customer_id: 'customer-1' }]);

    const audience = await readAudience(
      { tenant_id: TENANT, rfm_criteria: 'HIBERNATING', min_days_inactive: 90, max_segment_size: 100 },
      context(),
    );

    expect(calls[0]).toEqual({ sql: 'BOUND_TENANT', params: [TENANT] });
    const query = calls[1]!;
    expect(query.params).toEqual([TENANT, 90, 'marketing_messaging', 'email', 100]);
    expect(query.sql).toContain('NOT EXISTS');
    expect(query.sql).toContain('is_granted = FALSE');
    expect(audience).toEqual({
      segment_id: 'inactive_90d',
      matched_customer_count: 1,
      customer_ids: ['customer-1'],
      generated_at: GENERATED_AT.toISOString(),
    });
  });

  it('defaults the segment size to the demo cap when the caller supplies no size', async () => {
    const { readAudience, calls } = readerReturning([]);

    await readAudience({ tenant_id: TENANT, rfm_criteria: 'HIBERNATING', min_days_inactive: 30 }, context());

    expect(calls[1]!.params[4]).toBe(100);
  });

  it('refuses a caller-asserted tenant or malformed criteria without touching the database', async () => {
    const { readAudience, calls } = readerReturning([]);

    await expect(
      readAudience({ tenant_id: TENANT, rfm_criteria: 'HIBERNATING', min_days_inactive: 90 }, context(OTHER_TENANT)),
    ).rejects.toThrow('TENANT_CONTEXT_MISMATCH');
    await expect(
      readAudience({ tenant_id: TENANT, rfm_criteria: 'HIBERNATING', min_days_inactive: -1 }, context()),
    ).rejects.toThrow('INVALID_SEGMENT_CRITERIA');
    expect(calls).toEqual([]);
  });
});
