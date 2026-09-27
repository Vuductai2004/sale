import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  SalesCartOutput,
  SalesPaymentPolicy,
  SalesPaymentPolicyQuery,
  SalesQuote,
  SalesQuoteQuery,
} from './types.js';
import type { SalesSkillToolPortOptions } from './tool-port.js';

export interface QuoteTokenPayload {
  readonly tenant_id: string;
  readonly sku_id: string;
  readonly customer_id: string;
  readonly final_price: number;
  readonly p_floor: number;
  readonly currency: string;
  readonly quote_expires_at: string;
}

export function buildCanonicalQuotePayload(payload: QuoteTokenPayload): string {
  return `${payload.tenant_id}:${payload.sku_id}:${payload.customer_id}:${payload.final_price}:${payload.p_floor}:${payload.currency}:${payload.quote_expires_at}`;
}

export function computeQuoteToken(secret: string, payload: QuoteTokenPayload): string {
  const canonical = buildCanonicalQuotePayload(payload);
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function hasQuoteSigningSecret(
  options: Pick<SalesSkillToolPortOptions, 'quote_signing_secret'>,
): boolean {
  return typeof options.quote_signing_secret === 'string' && options.quote_signing_secret.trim().length > 0;
}

export interface AuthoritativeQuoteResult {
  readonly total_amount: number;
  readonly currency: string;
  readonly cart_id?: string | undefined;
  readonly quote_token?: string | undefined;
  readonly quote_expires_at?: string | undefined;
  readonly sku_id?: string | undefined;
  readonly p_floor?: number | undefined;
  readonly final_price?: number | undefined;
  readonly customer_id?: string | undefined;
  readonly [key: string]: unknown;
}

export class SalesSkillToolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SalesSkillToolError';
    this.code = code;
  }
}

export function hasAuthoritativeQuotePort(
  options: Pick<SalesSkillToolPortOptions, 'quote' | 'cart' | 'price_floor' | 'order'>,
): boolean {
  if (options.quote !== undefined && options.quote !== null) return true;
  if (options.order !== undefined && options.order !== null) {
    if (typeof options.order.validateQuote === 'function' || typeof options.order.authorizeOrder === 'function') {
      return true;
    }
  }
  if (options.cart !== undefined && options.cart !== null) {
    if (options.cart.quote !== undefined && options.cart.quote !== null) return true;
    const cartFn =
      options.cart.getCart ??
      options.cart.readCart ??
      options.cart.getQuote ??
      options.cart.readQuote ??
      options.cart.read;
    if (typeof cartFn === 'function') return true;
  }
  if (options.price_floor !== undefined && options.price_floor !== null && typeof options.price_floor.readQuote === 'function') {
    return true;
  }
  return false;
}

export function hasPaymentPolicyPort(
  options: Pick<SalesSkillToolPortOptions, 'payment_policy' | 'order'>,
): boolean {
  if (options.payment_policy !== undefined && options.payment_policy !== null) return true;
  if (options.order !== undefined && options.order !== null) {
    if (options.order.payment_policy !== undefined && options.order.payment_policy !== null) return true;
    if (typeof options.order.readSupportedPaymentMethods === 'function') return true;
  }
  return false;
}

export async function readAuthoritativeQuote(
  options: SalesSkillToolPortOptions,
  query: SalesQuoteQuery,
): Promise<AuthoritativeQuoteResult> {
  if (options.order) {
    const fn = options.order.validateQuote ?? options.order.authorizeOrder;
    if (typeof fn === 'function') {
      try {
        const q = await fn.call(options.order, query);
        if (q) {
          const total = (q as SalesQuote).total_amount ?? (q as SalesCartOutput).subtotal;
          const currency = q.currency;
          if (typeof total === 'number' && typeof currency === 'string') {
            return { ...(q as Record<string, unknown>), total_amount: total, currency };
          }
        }
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Order preflight quote is missing total or currency');
      } catch (err) {
        if (err instanceof SalesSkillToolError) throw err;
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Order preflight quote read failed');
      }
    }
  }

  if (options.quote) {
    const fn = options.quote.readQuote ?? options.quote.getQuote ?? options.quote.read;
    if (typeof fn === 'function') {
      try {
        const q = await fn.call(options.quote, query);
        if (q) {
          const total = (q as SalesQuote).total_amount ?? (q as SalesCartOutput).subtotal;
          const currency = q.currency;
          if (typeof total === 'number' && typeof currency === 'string') {
            return { ...(q as Record<string, unknown>), total_amount: total, currency };
          }
        }
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Authoritative quote is missing total or currency');
      } catch (err) {
        if (err instanceof SalesSkillToolError) throw err;
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Authoritative quote read failed');
      }
    }
  }

  if (options.cart) {
    if (options.cart.quote) {
      const fn = options.cart.quote.readQuote ?? options.cart.quote.getQuote ?? options.cart.quote.read;
      if (typeof fn === 'function') {
        try {
          const q = await fn.call(options.cart.quote, query);
          if (q) {
            const total = (q as SalesQuote).total_amount ?? (q as SalesCartOutput).subtotal;
            const currency = q.currency;
            if (typeof total === 'number' && typeof currency === 'string') {
              return { ...(q as Record<string, unknown>), total_amount: total, currency };
            }
          }
          throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Authoritative cart quote is missing total or currency');
        } catch (err) {
          if (err instanceof SalesSkillToolError) throw err;
          throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Authoritative cart quote read failed');
        }
      }
    }
    const cartFn =
      options.cart.getCart ??
      options.cart.readCart ??
      options.cart.getQuote ??
      options.cart.readQuote ??
      options.cart.read;
    if (typeof cartFn === 'function') {
      try {
        const c = await cartFn.call(options.cart, query);
        if (c) {
          const total = (c as SalesQuote).total_amount ?? (c as SalesCartOutput).subtotal;
          const currency = c.currency;
          if (typeof total === 'number' && typeof currency === 'string') {
            return { ...(c as Record<string, unknown>), total_amount: total, currency };
          }
        }
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', `Authoritative quote for cart ${query.cart_id} was not found`);
      } catch (err) {
        if (err instanceof SalesSkillToolError) throw err;
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Authoritative cart read failed');
      }
    }
  }

  if (options.price_floor && typeof options.price_floor.readQuote === 'function') {
    try {
      const q = await options.price_floor.readQuote(query);
      if (q) {
        const total = q.total_amount ?? q.subtotal;
        const currency = q.currency;
        if (typeof total === 'number' && typeof currency === 'string') {
          return { ...(q as Record<string, unknown>), total_amount: total, currency };
        }
      }
      throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', `Authoritative price quote for cart ${query.cart_id} was not found`);
    } catch (err) {
      if (err instanceof SalesSkillToolError) throw err;
      throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Authoritative price quote read failed');
    }
  }

  throw new SalesSkillToolError(
    'AUTHORITATIVE_SOURCE_UNAVAILABLE',
    'No authoritative quote source is available for cart verification',
  );
}

export async function readSupportedPaymentMethods(
  options: SalesSkillToolPortOptions,
  query: SalesPaymentPolicyQuery,
): Promise<readonly string[]> {
  if (options.payment_policy) {
    const fn = options.payment_policy.readSupportedPaymentMethods ?? options.payment_policy.read;
    if (typeof fn === 'function') {
      try {
        const result = await fn.call(options.payment_policy, query);
        if (result) {
          if (Array.isArray(result)) {
            return result;
          }
          if (typeof result === 'object' && 'supported_payment_methods' in result && Array.isArray((result as SalesPaymentPolicy).supported_payment_methods)) {
            return (result as SalesPaymentPolicy).supported_payment_methods;
          }
        }
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Payment policy returned no supported payment methods');
      } catch (err) {
        if (err instanceof SalesSkillToolError) throw err;
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Failed to read payment policy');
      }
    }
  }

  if (options.order) {
    if (options.order.payment_policy) {
      const fn = options.order.payment_policy.readSupportedPaymentMethods ?? options.order.payment_policy.read;
      if (typeof fn === 'function') {
        try {
          const result = await fn.call(options.order.payment_policy, query);
          if (result) {
            if (Array.isArray(result)) {
              return result;
            }
            if (typeof result === 'object' && 'supported_payment_methods' in result && Array.isArray((result as SalesPaymentPolicy).supported_payment_methods)) {
              return (result as SalesPaymentPolicy).supported_payment_methods;
            }
          }
          throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Order payment policy returned no supported payment methods');
        } catch (err) {
          if (err instanceof SalesSkillToolError) throw err;
          throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Failed to read order payment policy');
        }
      }
    }
    if (typeof options.order.readSupportedPaymentMethods === 'function') {
      try {
        const result = await options.order.readSupportedPaymentMethods(query);
        if (Array.isArray(result)) {
          return result;
        }
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', 'Order supported payment methods query returned invalid result');
      } catch (err) {
        if (err instanceof SalesSkillToolError) throw err;
        throw new SalesSkillToolError('AUTHORITATIVE_SOURCE_UNAVAILABLE', err instanceof Error ? err.message : 'Failed to read supported payment methods');
      }
    }
  }

  throw new SalesSkillToolError(
    'AUTHORITATIVE_SOURCE_UNAVAILABLE',
    'No payment policy port is bound; tenant supported payment methods are unavailable',
  );
}
