import { fail } from '../../gateway/http.js';
import type { AgentModule } from '../../gateway/contracts.js';

/**
 * Support takes precedence when a message also mentions a product: an existing order or complaint is
 * not a sales lead.
 */
const SUPPORT_INTENT =
  /\b(refund|return|exchange|warranty|complaint|tracking|delivery|delivered|cancel(?:led)? order|where is my order|my order|broken|damaged|not working|issue|problem)\b|đơn hàng|giao hàng|đổi trả|hoàn tiền|bảo hành|khiếu nại|hủy đơn|bị lỗi|không hoạt động|sự cố/iu;

/**
 * A generic shopping turn names an action, a product, a budget, or availability. The classifier
 * deliberately does not encode a tenant catalog or a currency: category and commercial details are
 * proposals for the Sales skill, never authority to act.
 */
const SALES_INTENT =
  /\b(recommend|suggest|looking for|in stock|available|availability|price|pricing|buy|purchase|shop|product|item|catalog|order(?:ing)?|size|color|laptop|notebook|computer|desktop|monitor|screen|keyboard|mouse|headphone|speaker|phone|smartphone|tablet|camera|printer|router|ssd|storage|drive|accessor(?:y|ies)|budget|under|below|less than|up to|maximum|at most|usd|eur|gbp|vnd|dollar|euro|pound)\b|tư vấn|gợi ý|còn hàng|giá|mua|sản phẩm|mặt hàng|danh mục|màu nào|kích cỡ|máy tính|điện thoại|màn hình|bàn phím|tai nghe|máy ảnh|ngân sách|triệu|đồng/iu;

const SALES_READ_INTENT =
  /\b(in stock|available|availability|stock|price|pricing|how much|spec(?:ification)?s?)\b/i;
const SALES_ADVISOR_INTENT =
  /\b(recommend|suggest|looking for|budget|under|below|less than|up to|maximum|at most)\b/i;

/**
 * Structured requirements are an advisor proposal only when the customer is asking for a
 * recommendation. Inventory, price, and specification questions remain direct Sales reads; the
 * worker must not turn a SKU lookup into an unrelated clarification message.
 */
export function shouldUseSalesAdvisor(message: string, requirements: SalesTurnRequirements | undefined): boolean {
  if (requirements === undefined) return false;
  return !SALES_READ_INTENT.test(message) || SALES_ADVISOR_INTENT.test(message);
}

const AGENT_MODULES: readonly AgentModule[] = Object.freeze(['marketing', 'sales', 'support', 'auto']);

/** Classifies only the destination module. LLM output never grants module authority. */
export function classifyTurnModule(message: string, requested: AgentModule | undefined): AgentModule {
  if (requested !== undefined && !AGENT_MODULES.includes(requested)) {
    fail('UNKNOWN_SKILL', 'the requested agent module is not supported');
  }
  if (requested !== undefined && requested !== 'auto') return requested;
  if (SUPPORT_INTENT.test(message)) return 'support';
  if (SALES_INTENT.test(message)) return 'sales';
  if (requested === undefined) return 'support';
  fail('UNKNOWN_SKILL', 'automatic routing could not determine a supported agent module');
}


export interface SalesBudget {
  readonly amount: number;
  /** A bounded ISO-4217-style code; source verification belongs to Sales connectors. */
  readonly currency: string;
}

export interface SalesProductEligibilityHint {
  /** A customer/model-proposed lookup hint, not proof of product identity or inventory. */
  readonly sku?: string;
  /** A customer/model-proposed category hint, not a catalog authority. */
  readonly category?: string;
}

/**
 * Structured Sales understanding is intentionally optional. Missing fields tell the Sales skill to
 * clarify; the gateway never rejects an otherwise valid Sales turn because a customer omitted a
 * preference.
 */
export interface SalesTurnRequirements {
  readonly category?: string;
  readonly budget?: SalesBudget;
  readonly use_case?: string;
  readonly product_eligibility?: SalesProductEligibilityHint;
}

function textHint(value: string, maxLength: number): string | undefined {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0 || trimmed.length > maxLength) return undefined;
  return trimmed.toLowerCase();
}

function categoryHint(normalized: string): string | undefined {
  const candidates: readonly [RegExp, string][] = [
    [/\b(laptop|notebook)\b/, 'laptops'],
    [/\b(phone|smartphone|mobile)\b/, 'phones'],
    [/\b(computer|desktop|pc)\b|may tinh/, 'computers'],
    [/\b(tablet)\b/, 'tablets'],
    [/\b(camera)\b|may anh/, 'cameras'],
    [/\b(monitor|screen)\b|man hinh/, 'monitors'],
    [/\b(printer)\b|may in/, 'printers'],
    [/\b(router)\b/, 'routers'],
    [/\b(headphone|earbuds|speaker)\b|tai nghe/, 'audio'],
    [/\b(keyboard|mouse)\b|ban phim/, 'peripherals'],
    [/\b(ssd|storage|drive)\b/, 'storage'],
  ];
  for (const [pattern, category] of candidates) {
    if (pattern.test(normalized)) return category;
  }
  return undefined;
}

function currencyHint(normalized: string): string | undefined {
  if (normalized.includes('$')) return 'USD';
  if (normalized.includes('€')) return 'EUR';
  if (normalized.includes('£')) return 'GBP';
  const match = normalized.match(
    /\b([a-z]{3})\b(?=\s*[0-9])|\b([a-z]{3})\b(?=\s*(?:under|below|for|to)\b)|\b[0-9][0-9.,]*\s*(?:million|m|billion|b|thousand|k|trieu|nghin)?\s*([a-z]{3})\b/i,
  );
  return (match?.[1] ?? match?.[2] ?? match?.[3])?.toUpperCase();
}

function budgetHint(normalized: string): SalesBudget | undefined {
  const currency = currencyHint(normalized);
  if (currency === undefined) return undefined;
  const match = normalized.match(
    /(?:under|below|less than|up to|maximum|at most|budget|duoi|ngan sach)\s*(?:[$€£]\s*)?(?:([0-9]+(?:[.,][0-9]+)?)\s*(million|m|billion|b|thousand|k|trieu|nghin)?|(?:[a-z]{3})\s*([0-9]+(?:[.,][0-9]+)?))/i,
  );
  if (match === null) return undefined;
  const raw = match[1] ?? match[3];
  if (raw === undefined) return undefined;
  const normalizedRaw = raw.includes(',') && raw.includes('.')
    ? raw.replace(/,/g, '')
    : /,\d{3}$/.test(raw)
      ? raw.replace(/,/g, '')
      : raw.replace(',', '.');
  const unit = match[2]?.toLowerCase();
  const multiplier =
    unit === 'million' || unit === 'm' || unit === 'trieu'
      ? 1_000_000
      : unit === 'billion' || unit === 'b'
        ? 1_000_000_000
        : unit === 'thousand' || unit === 'k' || unit === 'nghin'
          ? 1_000
          : 1;
  const amount = Number(normalizedRaw) * multiplier;
  if (!Number.isSafeInteger(amount) || amount <= 0) return undefined;
  return { amount, currency };
}

function useCaseHint(normalized: string): string | undefined {
  const match = normalized.match(
    /\b(?:for|to use for|dung cho|cho)\s+([^.!?;,]{1,160}?)(?=\s+(?:under|below|up to|budget)\b|[.!?;,]|$)/i,
  );
  return match === null ? undefined : textHint(match[1] ?? '', 160);
}

function skuHint(normalized: string): string | undefined {
  const match = normalized.match(/\b(?:sku|product\s*(?:code|id)|item\s*(?:code|id))\s*[:#-]?\s*([a-z0-9][a-z0-9._-]{0,127})\b/i);
  return match === null ? undefined : textHint(match[1] ?? '', 128);
}

/** Extracts bounded, non-authoritative commercial hints from the customer's message. */
export function salesRequirementsFor(message: string, proposal?: SalesTurnRequirements): SalesTurnRequirements | undefined {
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  const category = categoryHint(normalized);
  const budget = budgetHint(normalized);
  const use_case = useCaseHint(normalized);
  const sku = skuHint(normalized);

  // Provider hints are advisory only. In particular, never accept a provider-supplied amount:
  // amounts must remain traceable to the customer message and later verified by Sales sources.
  const proposedCategory = proposal?.category === undefined ? undefined : textHint(proposal.category, 64);
  const proposedUseCase = proposal?.use_case === undefined ? undefined : textHint(proposal.use_case, 160);
  const proposedSku = proposal?.product_eligibility?.sku === undefined
    ? undefined
    : textHint(proposal.product_eligibility.sku, 128);
  const proposedEligibilityCategory = proposal?.product_eligibility?.category === undefined
    ? undefined
    : textHint(proposal.product_eligibility.category, 64);
  const resolvedCategory = category ?? proposedCategory;
  const resolvedUseCase = use_case ?? proposedUseCase;
  const resolvedSku = sku ?? proposedSku;
  const resolvedEligibilityCategory = proposedEligibilityCategory;

  if (resolvedCategory === undefined && budget === undefined && resolvedUseCase === undefined && resolvedSku === undefined
    && resolvedEligibilityCategory === undefined) {
    return undefined;
  }

  const product_eligibility =
    resolvedSku === undefined && resolvedEligibilityCategory === undefined
      ? undefined
      : {
          ...(resolvedSku === undefined ? {} : { sku: resolvedSku }),
          ...(resolvedEligibilityCategory === undefined ? {} : { category: resolvedEligibilityCategory }),
        };
  return {
    ...(resolvedCategory === undefined ? {} : { category: resolvedCategory }),
    ...(budget === undefined ? {} : { budget }),
    ...(resolvedUseCase === undefined ? {} : { use_case: resolvedUseCase }),
    ...(product_eligibility === undefined ? {} : { product_eligibility }),
  };
}