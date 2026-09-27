import type { CustomerEventTimeline } from '@agentos/database';
import type { SkillToolInvocation } from '@agentos/skills';
import type {
  SalesCustomer360Fact,
  SalesPriceFloorDecision,
} from './types.js';
import type {
  SalesRecommendationRevenueEvidence,
  SalesSkillToolPortOptions,
} from './tool-port.js';
import { SalesSkillToolError, computeQuoteToken, hasQuoteSigningSecret } from './quote-payment-guards.js';
import {
  categoryMatches,
  isActiveProduct,
  isValidIsoDate,
  productListPrice,
  productName,
  productSku,
  readCatalogFromSor,
  readInventoryFromSor,
  type InventoryRead,
} from './sor-readers.js';

interface SearchProductInput {
  readonly tenant_id: string;
  readonly query: string;
  readonly category_id?: string;
  readonly limit?: number;
}

interface CheckStockInput {
  readonly tenant_id: string;
  readonly sku_id: string;
}

interface RetrieveCustomerInput {
  readonly tenant_id: string;
  readonly customer_identifier: string;
}

interface RecommendProductInput {
  readonly tenant_id: string;
  readonly customer_id: string;
  readonly current_cart_skus: readonly string[];
  readonly recommendation_type?: string;
}

interface CheckPriceInput {
  readonly tenant_id: string;
  readonly sku_id: string;
  readonly customer_id: string;
  readonly requested_discount_percent?: number;
}

const INJECTION_MARKERS = /(?:--|\/\*|\*\/|;|<script\b|ignore\s+previous|system\s*:|assistant\s*:|developer\s*:)/i;
const RECOMMENDATION_TYPES = ['CROSS_SELL', 'UPSELL', 'SUBSTITUTE', 'BUNDLE', 'REPLENISHMENT'] as const;
const RECOMMENDATION_THRESHOLD = 0.65;


function eventText(event: CustomerEventTimeline['items'][number]): string {
  const payload = event.payload;
  const parts: string[] = [];
  for (const key of ['category', 'category_id', 'topic', 'product_category', 'sku']) {
    const value = payload[key];
    if (typeof value === 'string') parts.push(value);
  }
  const tags = payload.tags;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === 'string') parts.push(tag);
    }
  }
  return parts.join(' ').toLocaleLowerCase();
}

export async function handleSearchProduct(
  options: SalesSkillToolPortOptions,
  invocation: SkillToolInvocation<SearchProductInput>,
): Promise<Record<string, unknown>> {
  const { tenant_id } = invocation.context;
  const input = invocation.input;
  const query = input.query.trim().toLocaleLowerCase();
  const limit = input.limit ?? 5;

  if (
    input.tenant_id !== tenant_id
    || query.length === 0
    || INJECTION_MARKERS.test(input.query)
    || !Number.isSafeInteger(limit)
    || limit < 1
    || limit > 20
  ) {
    throw new SalesSkillToolError(
      'MALFORMED_QUERY',
      'Catalog search query or tenant scope is invalid',
    );
  }

  const catalog = await readCatalogFromSor(options, tenant_id);
  const matched = catalog.items
    .filter((product) => {
      if (
        !isActiveProduct(product)
        || product.tenant_id !== tenant_id
        || !categoryMatches(product, input.category_id)
      ) {
        return false;
      }
      const searchable = [
        productSku(product),
        productName(product),
        product.description,
        ...(product.categories ?? []),
        ...(product.tags ?? []),
      ]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLocaleLowerCase();
      return searchable.includes(query);
    })
    .sort((left, right) => (productSku(left) ?? '').localeCompare(productSku(right) ?? ''));

  const products: Array<Record<string, unknown>> = [];
  for (const product of matched.slice(0, limit)) {
    const product_id = product.product_id ?? product.id;
    const sku = productSku(product);
    const name = productName(product);
    const list_price = productListPrice(product);
    if (
      product_id === undefined
      || sku === undefined
      || name === undefined
      || list_price === undefined
      || list_price < 0
      || product.currency === undefined
      || product.currency.trim().length === 0
    ) {
      throw new SalesSkillToolError(
        'AUTHORITATIVE_SOURCE_UNAVAILABLE',
        'Authoritative catalog record is incomplete or invalid',
      );
    }

    const inventory = await readInventoryFromSor(options, tenant_id, sku);
    products.push({
      product_id,
      sku,
      name,
      list_price,
      currency: product.currency,
      in_stock: inventory.item.total_available_to_promise! > 0,
    });
  }

  return {
    products,
    total_found: matched.length,
  };
}

export async function handleCheckStock(
  options: SalesSkillToolPortOptions,
  invocation: SkillToolInvocation<CheckStockInput>,
): Promise<Record<string, unknown>> {
  const { tenant_id } = invocation.context;
  const input = invocation.input;
  if (input.tenant_id !== tenant_id || input.sku_id.trim().length === 0) {
    throw new SalesSkillToolError(
      'AUTHORITATIVE_SOURCE_UNAVAILABLE',
      'Inventory request tenant or SKU is invalid',
    );
  }

  const inventory = await readInventoryFromSor(options, tenant_id, input.sku_id);
  const available_quantity = inventory.item.total_available_to_promise!;
  return {
    sku_id: input.sku_id,
    available_quantity,
    in_stock: available_quantity > 0,
    checked_at: inventory.snapshot_at,
  };
}

export async function handleRetrieveCustomer(
  options: SalesSkillToolPortOptions,
  invocation: SkillToolInvocation<RetrieveCustomerInput>,
): Promise<Record<string, unknown>> {
  const { tenant_id, correlation_id } = invocation.context;
  const input = invocation.input;
  if (input.tenant_id !== tenant_id) {
    throw new SalesSkillToolError(
      'IDENTITY_UNVERIFIED',
      'Customer request tenant does not match the server-bound tenant',
    );
  }

  const customer = await options.context.verifiedCustomerFor(tenant_id, correlation_id);
  if (
    customer === null
    || customer.tenant_id !== tenant_id
    || customer.customer_id !== input.customer_identifier
  ) {
    throw new SalesSkillToolError(
      'IDENTITY_UNVERIFIED',
      'Customer identity is not bound to this verified session',
    );
  }

  const extCustomer = customer as SalesCustomer360Fact;
  let lastOrderDate: string | null = null;
  if (typeof extCustomer.last_order_date === 'string' && isValidIsoDate(extCustomer.last_order_date)) {
    lastOrderDate = extCustomer.last_order_date;
  } else {
    const evidence = extCustomer.purchase_evidence
      ?? extCustomer.purchases
      ?? extCustomer.verified_purchases
      ?? extCustomer.order_events;
    if (Array.isArray(evidence) && evidence.length > 0) {
      const sorted = [...evidence]
        .map((e) => e.order_date)
        .filter(isValidIsoDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      if (sorted.length > 0 && sorted[0] !== undefined) {
        lastOrderDate = sorted[0];
      }
    }
  }

  return {
    customer_id: customer.customer_id,
    total_orders: customer.order_count,
    lifetime_value: customer.total_spent,
    verified: true,
    rfm_segment: customer.rfm_segment_hypothesis,
    last_order_date: lastOrderDate,
  };
}

export async function handleRecommendProduct(
  options: SalesSkillToolPortOptions,
  invocation: SkillToolInvocation<RecommendProductInput>,
): Promise<Record<string, unknown>> {
  const { tenant_id, correlation_id } = invocation.context;
  const input = invocation.input;
  const recommendation_type = input.recommendation_type ?? 'CROSS_SELL';

  if (
    input.tenant_id !== tenant_id
    || !RECOMMENDATION_TYPES.includes(recommendation_type as (typeof RECOMMENDATION_TYPES)[number])
  ) {
    throw new SalesSkillToolError(
      'SCHEMA_VALIDATION_ERROR',
      'Recommendation tenant or type is invalid',
    );
  }

  const customer = await options.context.verifiedCustomerFor(tenant_id, correlation_id);
  if (
    customer === null
    || customer.tenant_id !== tenant_id
    || customer.customer_id !== input.customer_id
  ) {
    throw new SalesSkillToolError(
      'IDENTITY_UNVERIFIED',
      'Recommendation customer is not verified for this session',
    );
  }
  if (!customer.consent_marketing || customer.suppression_active) {
    throw new SalesSkillToolError(
      'CONSENT_REQUIRED',
      'Recommendation is unavailable without current marketing consent',
    );
  }

  const timeline = await options.context.verifiedTimelineFor(tenant_id, correlation_id);
  const eventIds = timeline?.items
    .map((event) => event.event_id)
    .filter((event_id) => event_id.trim().length > 0) ?? [];
  if (eventIds.length === 0) {
    throw new SalesSkillToolError(
      'EVIDENCE_REQUIRED',
      'Recommendation requires a verified Customer360 timeline event',
    );
  }

  if (options.revenue_evidence === undefined) {
    throw new SalesSkillToolError(
      'AUTHORITATIVE_SOURCE_UNAVAILABLE',
      'Owner-approved revenue evidence is unavailable; recommendation execution is refused',
    );
  }

  const catalog = await readCatalogFromSor(options, tenant_id);
  const cartSkus = new Set(input.current_cart_skus);
  const eventTextValue = timeline?.items.map(eventText).join(' ') ?? '';
  const candidates = catalog.items
    .filter((product) => {
      const sku = productSku(product);
      return (
        isActiveProduct(product)
        && product.tenant_id === tenant_id
        && sku !== undefined
        && !cartSkus.has(sku)
      );
    })
    .sort((left, right) => (productSku(left) ?? '').localeCompare(productSku(right) ?? ''));

  for (const product of candidates) {
    const sku = productSku(product);
    const name = productName(product);
    const list_price = productListPrice(product);
    const currency = typeof product.currency === 'string' ? product.currency.trim() : undefined;
    if (
      sku === undefined
      || name === undefined
      || name.trim().length === 0
      || list_price === undefined
      || list_price < 0
      || currency === undefined
      || currency.length === 0
    ) {
      continue;
    }

    let inventory: InventoryRead;
    try {
      inventory = await readInventoryFromSor(options, tenant_id, sku);
    } catch {
      continue;
    }
    if (inventory.item.total_available_to_promise! <= 0) continue;

    const productTerms = [
      sku,
      name,
      ...(product.categories ?? []),
      ...(product.tags ?? []),
    ].join(' ').toLocaleLowerCase();
    const categoryAffinity = eventTextValue.length > 0 && productTerms.length > 0 && eventTextValue
      .split(/\s+/)
      .some((term) => term.length > 1 && productTerms.includes(term));
    const confidence = Math.min(
      0.95,
      RECOMMENDATION_THRESHOLD + (categoryAffinity ? 0.15 : 0),
    );

    let revenue: SalesRecommendationRevenueEvidence;
    try {
      revenue = await options.revenue_evidence.read({
        tenant_id,
        customer_id: customer.customer_id,
        sku,
        recommendation_type,
        confidence,
        list_price,
        currency,
      });
    } catch {
      continue;
    }

    if (
      !Number.isFinite(revenue.conversion_probability)
      || revenue.conversion_probability < 0
      || revenue.conversion_probability > 1
      || !Number.isFinite(revenue.expected_revenue)
      || revenue.expected_revenue < 0
      || revenue.currency !== currency
      || revenue.model_id.trim().length === 0
      || revenue.provenance_reference.trim().length === 0
    ) {
      continue;
    }

    return {
      customer: customer.customer_id,
      product: { sku, name, price: list_price },
      reason: `Available product selected from verified Customer360 event ${eventIds[0]}.`,
      evidence: {
        verified_timeline_event_ids: eventIds,
        verified_model: revenue.model_id,
        historical_spend: customer.total_spent,
        ...(categoryAffinity ? { category_affinity: 'verified timeline overlap' } : {}),
      },
      eligibility: {
        stock_available: true,
        consent_verified: true,
        suppression_cleared: true,
      },
      confidence,
      expected_outcome: {
        conversion_probability: revenue.conversion_probability,
        expected_revenue: revenue.expected_revenue,
        currency: revenue.currency,
      },
    };
  }

  throw new SalesSkillToolError(
    'AUTHORITATIVE_SOURCE_UNAVAILABLE',
    'No candidate has complete authoritative inventory and revenue evidence',
  );
}

export async function handleCheckPrice(
  options: SalesSkillToolPortOptions,
  invocation: SkillToolInvocation<CheckPriceInput>,
): Promise<Record<string, unknown>> {
  const { tenant_id } = invocation.context;
  const input = invocation.input;

  if (input.tenant_id !== tenant_id) {
    throw new SalesSkillToolError(
      'IDENTITY_UNVERIFIED',
      'Check price request tenant does not match the server-bound tenant',
    );
  }

  const priceFloorPort = options.price_floor;
  if (!priceFloorPort) {
    throw new SalesSkillToolError(
      'AUTHORITATIVE_SOURCE_UNAVAILABLE',
      'API-001.PricingEngine port is not bound',
    );
  }

  let decision: SalesPriceFloorDecision;
  try {
    decision = await priceFloorPort.read({
      tenant_id: input.tenant_id,
      sku_id: input.sku_id,
    });
  } catch {
    throw new SalesSkillToolError(
      'AUTHORITATIVE_SOURCE_UNAVAILABLE',
      'API-001.PricingEngine read failed',
    );
  }

  if (!decision || typeof decision !== 'object') {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      'Authoritative floor decision is missing',
    );
  }

  if (decision.owner_approved !== true) {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      decision.reason ?? 'Floor decision is not owner-approved',
    );
  }

  if (
    typeof decision.floor_source !== 'string'
    || decision.floor_source.trim().length === 0
  ) {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      'Floor provenance is absent or empty',
    );
  }

  if (
    typeof decision.quote_ttl_seconds !== 'number'
    || !Number.isFinite(decision.quote_ttl_seconds)
    || decision.quote_ttl_seconds <= 0
  ) {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      'Quote TTL seconds is missing or non-positive',
    );
  }

  if (
    typeof decision.list_price !== 'number'
    || !Number.isFinite(decision.list_price)
    || decision.list_price < 0
    || typeof decision.p_floor !== 'number'
    || !Number.isFinite(decision.p_floor)
    || decision.p_floor < 0
    || decision.p_floor > decision.list_price
    || typeof decision.currency !== 'string'
    || decision.currency.trim().length === 0
  ) {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      'Pricing engine returned invalid list_price, p_floor, or currency',
    );
  }

  const clock = options.now ?? (() => new Date());
  const quote_expires_at = new Date(clock().getTime() + decision.quote_ttl_seconds * 1000).toISOString();

  let final_price = decision.list_price;
  let discount_allowed = true;

  if (
    typeof input.requested_discount_percent === 'number'
    && Number.isFinite(input.requested_discount_percent)
    && input.requested_discount_percent > 0
  ) {
    const discounted = Number((decision.list_price * (1 - input.requested_discount_percent / 100)).toFixed(2));
    if (discounted >= decision.p_floor) {
      final_price = discounted;
      discount_allowed = true;
    } else {
      final_price = decision.list_price;
      discount_allowed = false;
    }
  }

  if (!hasQuoteSigningSecret(options)) {
    throw new SalesSkillToolError(
      'P_FLOOR_UNAVAILABLE',
      'Quote signing secret is not bound',
    );
  }

  const quote_token = computeQuoteToken(options.quote_signing_secret!, {
    tenant_id,
    sku_id: input.sku_id,
    customer_id: input.customer_id,
    final_price,
    p_floor: decision.p_floor,
    currency: decision.currency,
    quote_expires_at,
  });
  return {
    sku_id: input.sku_id,
    list_price: decision.list_price,
    final_price,
    p_floor: decision.p_floor,
    discount_allowed,
    currency: decision.currency,
    quote_token,
    quote_expires_at,
  };
}
