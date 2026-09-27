import type {
  CostLedgerOptions,
  CostRecord,
  CostRecordInput,
  PricingLookup,
  PricingSource,
  ProviderPricing,
} from './types.js';
import type { ExecutionReceipt } from '../contracts/types.js';

/**
 * Append-only in-memory cost ledger for composition and tests.
 *
 * The ledger never treats `ExecutionReceipt.token_usage.total_cost_usd` as an
 * authoritative amount: existing adapters use zero as a placeholder. A cost
 * is available only when an explicit provider pricing entry resolves (or an
 * explicit estimate is supplied alongside one) and that entry has provenance.
 */
export class CostLedger {
  private readonly pricing: PricingSource | undefined;
  private readonly now: () => string;
  private readonly rows: CostRecord[] = [];

  public constructor(options?: CostLedgerOptions);
  public constructor(pricing?: PricingSource);
  public constructor(optionsOrPricing?: CostLedgerOptions | PricingSource) {
    if (optionsOrPricing === undefined) {
      this.pricing = undefined;
      this.now = defaultNow;
    } else if (isLedgerOptions(optionsOrPricing)) {
      this.pricing = optionsOrPricing.pricing;
      this.now = optionsOrPricing.now ?? defaultNow;
    } else {
      this.pricing = optionsOrPricing;
      this.now = defaultNow;
    }
  }

  /** Append one record and return the immutable value stored by this binding. */
  public record(input: CostRecordInput): CostRecord {
    const row = buildCostRecord(input, this.pricing, this.now);
    this.rows.push(row);
    return row;
  }

  /** Record an execution receipt while keeping provider/model metadata separate. */
  public recordReceipt(receipt: ExecutionReceipt, metadata: Omit<CostRecordInput, 'receipt'> = {}): CostRecord {
    return this.record({ ...metadata, receipt });
  }

  /** Alias for callers that use append-only terminology. */
  public append(input: CostRecordInput): CostRecord {
    return this.record(input);
  }

  /** Return a snapshot; callers cannot mutate the ledger's backing array. */
  public entries(): readonly CostRecord[] {
    return this.rows.slice();
  }

  public forRun(runId: string): readonly CostRecord[] {
    return this.rows.filter((row) => row.run_id === runId);
  }
}

/** Test/composition name matching the other core-engine in-memory bindings. */
export class MemoryCostLedger extends CostLedger {}

function buildCostRecord(input: CostRecordInput, source: PricingSource | undefined, now: () => string): CostRecord {
  const receiptUsage = input.receipt?.token_usage;
  const inputTokens = normalizeTokens(input.input_tokens ?? receiptUsage?.prompt);
  const outputTokens = normalizeTokens(input.output_tokens ?? receiptUsage?.completion);
  const cachedTokens = normalizeTokens(input.cached_tokens);
  const model = input.model ?? null;
  const provider = input.provider ?? null;
  const modelVersion = input.model_version ?? null;
  const pricing = model !== null && provider !== null
    ? resolvePricing(source, provider, model, modelVersion)
    : null;
  const amount = pricing === null
    ? null
    : calculateAmount(input, pricing, inputTokens, outputTokens, cachedTokens);
  const available = pricing !== null && amount !== null;

  const row: CostRecord = {
    model,
    provider,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
    estimated_cost: available ? amount : null,
    estimated_amount: available ? amount : null,
    currency: pricing?.currency ?? input.currency ?? null,
    provenance: pricing?.provenance ?? input.provenance ?? null,
    cost_status: available ? 'AVAILABLE' : 'UNAVAILABLE',
    run_id: input.run_id ?? null,
    tenant_id: input.tenant_id ?? null,
    correlation_id: input.correlation_id ?? null,
    timestamp: input.timestamp ?? now(),
    model_version: modelVersion,
  };
  return row;
}

function calculateAmount(
  input: CostRecordInput,
  pricing: ProviderPricing,
  inputTokens: number | null,
  outputTokens: number | null,
  cachedTokens: number | null,
): number | null {
  if (!isUsablePricing(pricing)) {
    return null;
  }

  if (input.estimated_cost !== undefined) {
    return normalizeAmount(input.estimated_cost);
  }

  const inputRate = ratePerToken(pricing, 'input');
  const outputRate = ratePerToken(pricing, 'output');
  const cachedRate = ratePerToken(pricing, 'cached');
  const inputCost = tokenCost(inputTokens, inputRate);
  const outputCost = tokenCost(outputTokens, outputRate);
  const cachedCost = tokenCost(cachedTokens, cachedRate);
  if ((inputTokens !== null && inputTokens > 0 && inputCost === null)
    || (outputTokens !== null && outputTokens > 0 && outputCost === null)
    || (cachedTokens !== null && cachedTokens > 0 && cachedCost === null)) {
    return null;
  }

  const costs = [inputCost, outputCost, cachedCost];
  let amount: number | undefined;
  for (const cost of costs) {
    if (cost !== null) {
      amount = amount === undefined ? cost : amount + cost;
    }
  }
  return amount !== undefined && Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function tokenCost(tokens: number | null, rate: number | null): number | null {
  if (tokens === null) {
    return null;
  }
  if (tokens === 0) {
    return 0;
  }
  if (rate === null) {
    return null;
  }
  const amount = tokens * rate;
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function resolvePricing(
  source: PricingSource | undefined,
  provider: string,
  model: string,
  modelVersion: string | null,
): ProviderPricing | null {
  if (source === undefined) {
    return null;
  }

  const query = modelVersion === null
    ? { provider, model }
    : { provider, model, model_version: modelVersion };
  let pricing: ProviderPricing | null | undefined;
  if (typeof source === 'function') {
    pricing = source(query);
  } else if (isPricingLookup(source)) {
    pricing = source.getPricing(query);
  } else if (isPricingList(source)) {
    const matches = source.filter((candidate) => candidate.provider === provider && candidate.model === model);
    pricing = modelVersion === null
      ? matches.find((candidate) => candidate.model_version === undefined) ?? matches[0]
      : matches.find((candidate) => candidate.model_version === modelVersion)
        ?? matches.find((candidate) => candidate.model_version === undefined);
  } else {
    pricing = source.provider === provider && source.model === model
      && (source.model_version === undefined || modelVersion === null || source.model_version === modelVersion)
      ? source
      : null;
  }
  return pricing ?? null;
}

function isUsablePricing(pricing: ProviderPricing): boolean {
  return pricing.currency.trim().length > 0
    && pricing.provenance.trim().length > 0
    && hasValidRate(pricing.input_cost_per_token, pricing.input_cost_per_1k_tokens)
    || pricing.currency.trim().length > 0
      && pricing.provenance.trim().length > 0
      && hasValidRate(pricing.output_cost_per_token, pricing.output_cost_per_1k_tokens)
    || pricing.currency.trim().length > 0
      && pricing.provenance.trim().length > 0
      && hasValidRate(pricing.cached_cost_per_token, pricing.cached_cost_per_1k_tokens);
}

function ratePerToken(pricing: ProviderPricing, kind: 'input' | 'output' | 'cached'): number | null {
  const perToken = pricing[`${kind}_cost_per_token`];
  const perThousand = pricing[`${kind}_cost_per_1k_tokens`];
  if (perToken !== undefined) {
    return hasValidRate(perToken) ? perToken : null;
  }
  if (perThousand !== undefined) {
    return hasValidRate(perThousand) ? perThousand / 1000 : null;
  }
  return null;
}

function hasValidRate(perToken?: number, perThousand?: number): boolean {
  const rate = perToken ?? perThousand;
  return rate !== undefined && Number.isFinite(rate) && rate >= 0;
}

function normalizeTokens(value: number | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('COST_TOKEN_COUNT_INVALID');
  }
  return value;
}

function normalizeAmount(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function isPricingList(value: PricingSource): value is readonly ProviderPricing[] {
  return Array.isArray(value);
}

function isPricingLookup(value: PricingSource): value is PricingLookup {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'getPricing' in value;
}

function isLedgerOptions(value: CostLedgerOptions | PricingSource): value is CostLedgerOptions {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && ('pricing' in value || 'now' in value);
}

function defaultNow(): string {
  return new Date().toISOString();
}
