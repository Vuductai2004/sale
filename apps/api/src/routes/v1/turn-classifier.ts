import type { AgentModule } from '../../gateway/contracts.js';

/**
 * Support takes precedence when a message also mentions a product: an existing order or complaint is
 * not a sales lead.
 */
const SUPPORT_INTENT = /\b(refund|return|exchange|warranty|complaint|tracking|delivery|delivered|cancel(?:led)? order|where is my order|my order|broken|damaged|not working)\b|đơn hàng|giao hàng|đổi trả|hoàn tiền|bảo hành|khiếu nại|hủy đơn|bị lỗi|không hoạt động/iu;
/**
 * A shopping turn names what is being bought, what it may cost, or what it is for. Category nouns and
 * a budget phrase belong here because the demo's own prompt ("I need a laptop under 20 million VND
 * for graphic design") carries no verb from the older list, and a misrouted shopping turn would be
 * planned by Customer Care.
 */
const SALES_INTENT = /\b(recommend|suggest|looking for|in stock|available|price|pricing|buy|purchase|shop|product|size|color|laptop|notebook|computer|desktop|monitor|screen|keyboard|mouse|headphone|speaker|phone|smartphone|tablet|ssd|storage|drive|accessor(?:y|ies)|budget|under\s+[0-9]+|million|vnd|dong)\b|tư vấn|gợi ý|còn hàng|giá (?:bao nhiêu|của)|mua|sản phẩm|màu nào|kích cỡ|máy tính|điện thoại|màn hình|bàn phím|tai nghe|ngân sách|triệu|đồng/iu;

/** Only explicit sales intent routes to Sales; unknown intent remains with Customer Care. */
export function classifyTurnModule(message: string, requested: AgentModule | undefined): AgentModule {
  if (requested !== undefined && requested !== 'auto') return requested;
  if (SUPPORT_INTENT.test(message)) return 'support';
  return SALES_INTENT.test(message) ? 'sales' : 'support';
}


export interface SalesTurnRequirements {
  readonly category: string;
  readonly budget_vnd: number;
  readonly use_case: string;
}

/** Extracts bounded commercial requirements from the caller's words; absent values fail closed in Sales. */
export function salesRequirementsFor(message: string): SalesTurnRequirements | undefined {
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const category = /\b(laptop|notebook|computer)\b|may tinh/i.test(normalized) ? 'laptops'
    : /\b(phone|smartphone|mobile)\b|dien thoai/i.test(normalized) ? 'phones'
    : /\b(monitor|screen)\b|man hinh/i.test(normalized) ? 'monitors'
    : /\b(ssd|storage|drive)\b|o cung/i.test(normalized) ? 'storage'
    : undefined;
  const budgetMatch = normalized.match(
    /(?:under|below|budget|duoi|duoi muc|less than|tam|khoang|tam khoang|ngan sach|gia|toi da|up to|at most|maximum)\s*(?:vnd|₫|dong|d)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?!\d)|[0-9]+(?:[.,][0-9]+)?)\s*(m|million|trieu|tr|k|nghin)?/i,
  );
  const rawBudget = budgetMatch?.[1];
  const unit = budgetMatch?.[2]?.toLowerCase();
  let parsed: number | undefined;
  if (rawBudget !== undefined) {
    if (/^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(rawBudget)) {
      parsed = Number(rawBudget.replace(/[.,]/g, ''));
    } else {
      const num = Number(rawBudget.replace(',', '.'));
      parsed = unit === 'm' || unit === 'million' || unit === 'trieu' || unit === 'tr'
        ? Math.round(num * 1_000_000)
        : unit === 'k' || unit === 'nghin'
          ? Math.round(num * 1_000)
          : num;
    }
  }
  const use_case = /\b(graphic design|design|creator)\b|do hoa/i.test(normalized) ? 'graphic design'
    : /\b(gaming|game)\b|choi game/i.test(normalized) ? 'gaming'
    : /\b(office|work|business)\b|van phong|cong so|hoc tap|hoc sinh|sinh vien/i.test(normalized) ? 'office'
    : /\b(travel|portable|lightweight)\b|du lich|di chuyen|mong nhe/i.test(normalized) ? 'travel'
    : undefined;
  if (category === undefined || use_case === undefined || parsed === undefined || !Number.isSafeInteger(parsed) || parsed <= 0) return undefined;
  return { category, budget_vnd: parsed, use_case };
}