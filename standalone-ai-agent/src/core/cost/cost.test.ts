import { describe, expect, it } from 'vitest';

import { TokenBudgetGuard } from './budget.js';
import { CostLedger } from './ledger.js';

const BASE_METADATA = {
  model: 'gpt-test',
  provider: 'provider-test',
  model_version: '2026-01',
  run_id: 'run-cost-1',
  tenant_id: 'tenant-cost-1',
  correlation_id: 'corr-cost-1',
  timestamp: '2026-09-27T00:00:00.000Z',
} as const;

describe('CostLedger', () => {
  it('marks cost unavailable and keeps the amount null when pricing is missing', () => {
    const ledger = new CostLedger();

    const row = ledger.record({
      ...BASE_METADATA,
      input_tokens: 100,
      output_tokens: 50,
      estimated_cost: 0,
    });

    expect(row.cost_status).toBe('UNAVAILABLE');
    expect(row.estimated_cost).toBeNull();
    expect(row.estimated_amount).toBeNull();
  });

  it('records a supplied provider price with its provenance', () => {
    const ledger = new CostLedger({
      pricing: {
        provider: BASE_METADATA.provider,
        model: BASE_METADATA.model,
        model_version: BASE_METADATA.model_version,
        currency: 'USD',
        input_cost_per_1k_tokens: 0.01,
        output_cost_per_1k_tokens: 0.02,
        provenance: 'provider-pricing:2026-01',
      },
    });

    const row = ledger.record({
      ...BASE_METADATA,
      input_tokens: 1_000,
      output_tokens: 500,
    });

    expect(row.cost_status).toBe('AVAILABLE');
    expect(row.estimated_cost).toBe(0.02);
    expect(row.currency).toBe('USD');
    expect(row.provenance).toBe('provider-pricing:2026-01');
  });
});

describe('TokenBudgetGuard', () => {
  it('parks an admission that exceeds the configured per-run budget', () => {
    const guard = new TokenBudgetGuard({
      per_run_token_budget: 5,
      on_exceed: 'PARK',
    });

    expect(guard.admit({ run_id: 'run-budget-1', input_tokens: 4 }).status).toBe('ALLOWED');
    const decision = guard.admit({ run_id: 'run-budget-1', input_tokens: 2 });

    expect(decision.status).toBe('PARKED');
    expect(decision.allowed).toBe(false);
    expect(decision.action).toBe('PARK');
    expect(guard.usedTokensForRun('run-budget-1')).toBe(4);
  });

  it('fails closed on a configured total budget instead of reporting success', () => {
    const guard = new TokenBudgetGuard({
      token_budget: 3,
      on_exceed: 'FAIL_CLOSED',
    });

    expect(guard.admit({ run_id: 'run-budget-2', output_tokens: 3 }).status).toBe('ALLOWED');
    const decision = guard.admit({ run_id: 'run-budget-2', output_tokens: 1 });

    expect(decision.status).toBe('FAILED');
    expect(decision.allowed).toBe(false);
    expect(decision.action).toBe('FAIL_CLOSED');
  });
});
