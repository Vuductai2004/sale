import type {
  BudgetConfig,
  BudgetDecision,
  BudgetUsage,
} from './types.js';

/**
 * In-memory admission guard for token budgets.
 *
 * Limits are optional by design. With no configured limit, the guard reports an
 * explicit ALLOWED/NO_BUDGET_CONFIGURED decision; it does not invent a limit or
 * infer a monetary threshold. A rejected admission never advances usage.
 */
export class TokenBudgetGuard {
  private readonly tokenBudget: number | null;
  private readonly perRunTokenBudget: number | null;
  private readonly onExceed: 'FAIL_CLOSED' | 'PARK';
  private readonly useCache: boolean;
  private usedTokens = 0;
  private readonly runUsage = new Map<string, number>();

  public constructor(config: BudgetConfig = {}) {
    this.tokenBudget = normalizeLimit(config.token_budget, 'TOKEN_BUDGET_INVALID');
    this.perRunTokenBudget = normalizeLimit(config.per_run_token_budget, 'PER_RUN_TOKEN_BUDGET_INVALID');
    this.onExceed = config.on_exceed ?? 'FAIL_CLOSED';
    this.useCache = config.use_cache ?? false;
  }

  /** Evaluate without reserving tokens. */
  public check(usage: BudgetUsage): BudgetDecision {
    const requestedTokens = countTokens(usage, this.useCache);
    const runTokens = this.runUsage.get(usage.run_id) ?? 0;
    const tokenBudgetExceeded = this.tokenBudget !== null
      && this.usedTokens + requestedTokens > this.tokenBudget;
    const runBudgetExceeded = this.perRunTokenBudget !== null
      && runTokens + requestedTokens > this.perRunTokenBudget;
    const exceeds = tokenBudgetExceeded || runBudgetExceeded;
    const configured = this.tokenBudget !== null || this.perRunTokenBudget !== null;

    if (!exceeds) {
      return {
        status: 'ALLOWED',
        action: 'ALLOW',
        allowed: true,
        reason: configured ? 'WITHIN_BUDGET' : 'NO_BUDGET_CONFIGURED',
        requested_tokens: requestedTokens,
        total_tokens: this.usedTokens + requestedTokens,
        run_tokens: runTokens + requestedTokens,
        token_budget: this.tokenBudget,
        per_run_token_budget: this.perRunTokenBudget,
        run_id: usage.run_id,
      };
    }

    const parked = this.onExceed === 'PARK';
    return {
      status: parked ? 'PARKED' : 'FAILED',
      action: parked ? 'PARK' : 'FAIL_CLOSED',
      allowed: false,
      reason: 'TOKEN_BUDGET_EXCEEDED',
      requested_tokens: requestedTokens,
      total_tokens: this.usedTokens + requestedTokens,
      run_tokens: runTokens + requestedTokens,
      token_budget: this.tokenBudget,
      per_run_token_budget: this.perRunTokenBudget,
      run_id: usage.run_id,
    };
  }

  /** Evaluate and reserve usage only when the decision permits execution. */
  public admit(usage: BudgetUsage): BudgetDecision {
    const decision = this.check(usage);
    if (decision.allowed) {
      this.usedTokens = decision.total_tokens;
      this.runUsage.set(usage.run_id, decision.run_tokens);
    }
    return decision;
  }

  /** Alias for integrations that call admission a reservation/consume operation. */
  public consume(usage: BudgetUsage): BudgetDecision {
    return this.admit(usage);
  }

  public get totalUsedTokens(): number {
    return this.usedTokens;
  }

  public usedTokensForRun(runId: string): number {
    return this.runUsage.get(runId) ?? 0;
  }
}

/** Short name for callers that do not need to distinguish token budget units. */
export class BudgetGuard extends TokenBudgetGuard {}

function countTokens(usage: BudgetUsage, useCache: boolean): number {
  const input = normalizeUsage(usage.input_tokens, 'INPUT_TOKENS_INVALID');
  const output = normalizeUsage(usage.output_tokens, 'OUTPUT_TOKENS_INVALID');
  const cached = normalizeUsage(usage.cached_tokens, 'CACHED_TOKENS_INVALID');
  const total = input + output + (useCache ? cached : 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error('TOKEN_USAGE_OVERFLOW');
  }
  return total;
}

function normalizeUsage(value: number | undefined, errorCode: string): number {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(errorCode);
  }
  return value;
}

function normalizeLimit(value: number | undefined, errorCode: string): number | null {
  if (value === undefined) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(errorCode);
  }
  return value;
}
