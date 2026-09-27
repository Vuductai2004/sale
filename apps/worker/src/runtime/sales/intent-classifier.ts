import type {
  AuthorityLevel,
  PlatformAgentId,
  SignalEnvelope,
} from '@agentos/core-engine/contracts';
import type { SkillEffectClass } from '@agentos/skills';

/** Minimal skill registry row interface required for policy extraction (implement/05 §3, §6.5). */
export interface SkillRegistryRowMetadata {
  readonly skill_id: string;
  readonly effect_class: SkillEffectClass;
  readonly guarded_dependency: string;
  readonly required_authority: AuthorityLevel;
  readonly timeout_ms: number;
  readonly allowed_agents?: readonly string[] | undefined;
  readonly enabled?: boolean | undefined;
  readonly mutating?: boolean | undefined;
  readonly idempotent?: boolean | undefined;
  readonly price_bearing?: boolean | undefined;
}

export interface SkillRegistryPort {
  get?(skill_id: string): SkillRegistryRowMetadata | null | undefined;
  resolve?(skill_id: string): SkillRegistryRowMetadata | null | undefined;
}

export type SkillRegistryResolver =
  | SkillRegistryPort
  | ((skill_id: string) => SkillRegistryRowMetadata | null | undefined)
  | Map<string, SkillRegistryRowMetadata>;

export type DependencyReachabilityPredicate =
  | readonly string[]
  | ((guardedDependency: string) => boolean);

export function lookupRegistryRow(
  registry: SkillRegistryResolver | undefined,
  skillId: string,
): SkillRegistryRowMetadata | null {
  if (!registry) return null;
  try {
    if (typeof registry === 'function') {
      return registry(skillId) ?? null;
    }
    if (registry instanceof Map) {
      return registry.get(skillId) ?? null;
    }
    if (typeof registry.get === 'function') {
      return registry.get(skillId) ?? null;
    }
    if (typeof registry.resolve === 'function') {
      return registry.resolve(skillId) ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function isDependencyResolvable(
  dependency: string | undefined,
  resolvableDependencies?: DependencyReachabilityPredicate,
): boolean {
  if (!dependency || typeof dependency !== 'string' || dependency.trim().length === 0) {
    return false;
  }
  if (resolvableDependencies) {
    if (typeof resolvableDependencies === 'function') {
      return resolvableDependencies(dependency);
    }
    if (Array.isArray(resolvableDependencies)) {
      return resolvableDependencies.includes(dependency);
    }
  }
  return true;
}

export function isRowExecutable(
  row: SkillRegistryRowMetadata | null | undefined,
  targetAgent: PlatformAgentId,
  resolvableDependencies?: DependencyReachabilityPredicate,
): row is SkillRegistryRowMetadata {
  if (!row) return false;
  if (row.enabled === false) return false;
  if (row.allowed_agents && !row.allowed_agents.includes(targetAgent)) {
    return false;
  }
  if (!isDependencyResolvable(row.guarded_dependency, resolvableDependencies)) {
    return false;
  }
  return true;
}

export function extractMessageContent(signal: SignalEnvelope): string {
  const p = signal.payload as Record<string, unknown> | null | undefined;
  if (!p || typeof p !== 'object') return '';
  if (typeof p.message === 'string') return p.message.trim();
  if (typeof p.content === 'string') return p.content.trim();
  if (typeof p.text === 'string') return p.text.trim();
  return '';
}

/**
 * Extracts SKU identifier from message text.
 * Matches:
 *  - SKU-XXXX, PROD-XXXX, ITEM-XXXX
 *  - sku #12345, sku: 12345
 */
export function extractSku(text: string): string | null {
  if (!text) return null;

  // 1. Prefixed canonical IDs: SKU-XXXX, PROD-XXXX, ITEM-XXXX
  const prefixMatch = text.match(/\b((?:SKU|PROD|ITEM)-[A-Za-z0-9_-]+)\b/i);
  if (prefixMatch && prefixMatch[1]) return prefixMatch[1].toUpperCase();

  // 2. Keyword followed by SKU code
  const kwMatch = text.match(/\b(?:sku|product|item)\s*(?:#|id|code|no\.?|num)?\s*[:#]?\s*([A-Za-z0-9_-]{3,})/i);
  if (kwMatch && kwMatch[1]) {
    const candidate = kwMatch[1].trim();
    if (!/^(status|details|update|info|is|the|my|available|stock|price|cost|costs|check|search|in|out|have|has|need|rate|rates|value|quote|quotation|discount|fee|fees)$/i.test(candidate)) {
      return candidate.toUpperCase();
    }
  }

  return null;
}

/** Cleans query text by stripping search-preamble phrases. */
export function cleanSearchQuery(text: string): string {
  if (!text) return '';
  const q = text
    .replace(/\b(?:search(?:\s+for)?|find|look(?:\s+for)?|looking(?:\s+for)?|show(?:\s+me)?|browse|catalog|list)\b/gi, '')
    .replace(/[?!.]+$/g, '')
    .trim();
  return q.length > 0 ? q : text.trim();
}

/** Identifies if text expresses a price inquiry (disabled in P2). */
export function isPriceInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(price|pricing|discount|cost|how much|quote|quotation|rate|fee|p_floor)\b/i.test(text);
}

/** Identifies if text expresses an inventory / stock check. */
export function isInventoryInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(stock|inventory|available|availability|in stock|out of stock|quantity)\b/i.test(text);
}

/** Identifies if text expresses a recommendation / cross-sell request. */
export function isRecommendInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(recommend|recommendation|recommendations|suggest|suggestion|suggestions|cross-sell|upsell|bundle|substitute|pair with|complementary)\b/i.test(text);
}

/** Identifies if text expresses a customer lookup / profile inquiry. */
export function isCustomerLookupInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(customer|profile|account|my account|purchase history|order history|loyalty|my details|user info|member info)\b/i.test(text);
}

/** Identifies if text expresses a product catalog search. */
export function isProductSearchInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(search|find|looking for|look for|catalog|browse|show me|products?)\b/i.test(text);
}

/** Identifies if text expresses a cart recovery inquiry. */
export function isCartRecoveryInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(abandoned[ -]?cart|cart[ -]?recovery|recover[ -]?cart|left in cart|items left in cart|resume my cart|forgot my cart)\b/i.test(text);
}

/** Identifies if text expresses a replenishment / reorder inquiry. */
export function isReplenishmentInquiry(text: string): boolean {
  if (!text) return false;
  return /\b(replenish|replenishment|reorder|repurchase|recurring order|refill|subscribe again|order again|buy again)\b/i.test(text);
}

export interface CartRecoveryData {
  readonly cartId?: string | undefined;
  readonly skus: readonly string[];
}

export function extractCartRecoveryData(signal: SignalEnvelope): CartRecoveryData | null {
  const payload = (signal.payload ?? {}) as Record<string, unknown>;
  const rawCartId = payload.cart_id ?? payload.cartId;
  const cartId = typeof rawCartId === 'string' && rawCartId.trim().length > 0 ? rawCartId.trim() : undefined;

  const rawSkus = payload.skus ?? payload.sku_list ?? payload.cart_skus ?? payload.items;
  const skus: string[] = [];
  if (Array.isArray(rawSkus)) {
    for (const item of rawSkus) {
      if (typeof item === 'string' && item.trim().length > 0) {
        skus.push(item.trim());
      } else if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>;
        const skuId = itemObj.sku_id ?? itemObj.sku;
        if (typeof skuId === 'string' && skuId.trim().length > 0) {
          skus.push(skuId.trim());
        }
      }
    }
  }

  const isCartAbandonedEvent =
    signal.event_type === 'cart.abandoned' ||
    signal.event_type === 'cart_abandoned' ||
    signal.event_type.endsWith('.cart.abandoned');

  if (isCartAbandonedEvent || (cartId && skus.length > 0)) {
    return { cartId, skus: Object.freeze(skus) };
  }
  return null;
}

export function isReplenishmentSignal(signal: SignalEnvelope, text: string): boolean {
  const payload = (signal.payload ?? {}) as Record<string, unknown>;
  const rawRef =
    payload.prior_purchase_reference ??
    payload.order_reference ??
    payload.prior_order_id ??
    payload.purchase_reference ??
    payload.last_purchase_reference ??
    payload.previous_order_id;
  const hasRef = typeof rawRef === 'string' && rawRef.trim().length > 0;
  const isReplenishmentEvent =
    signal.event_type === 'replenishment' ||
    signal.event_type === 'replenishment.cycle' ||
    signal.event_type === 'customer.repurchase' ||
    signal.event_type.includes('replenishment');
  const hasText = isReplenishmentInquiry(text);

  return hasRef || isReplenishmentEvent || hasText;
}
