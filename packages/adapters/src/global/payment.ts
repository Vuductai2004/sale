/**
 * ADPT-GL-002 payment contract seam.
 * Provider and settlement details remain [UNCONFIRMED][ASM-001]; this module is mock-only and
 * never executes a live charge or promotes payment, refund, or order actions.
 */


import type { ConnectorRegistry, RegisteredConnector } from '../base/registry.js';

export const GLOBAL_PAYMENT_CONNECTOR_ID = 'ADPT-GL-002';

export type PaymentOperation = 'AUTHORIZE' | 'CAPTURE' | 'REFUND';

export interface PaymentRequest {
  readonly tenant_id: string;
  readonly provider_id: string;
  readonly operation: PaymentOperation;
  readonly effect_key: string;
  readonly idempotency_key: string;
  readonly amount_minor: number;
  readonly currency: string;
  readonly payment_method_ref: string;
}

export type PaymentOutcome =
  | {
      readonly outcome: 'SUCCEEDED';
      readonly provider_reference: string;
      readonly response_payload: Record<string, unknown>;
      readonly requires_reconciliation: false;
    }
  | {
      readonly outcome: 'FAILED' | 'UNKNOWN';
      readonly provider_reference: string | null;
      readonly response_payload: Record<string, unknown>;
      readonly requires_reconciliation: boolean;
    };

export type MockPaymentResponse =
  | {
      readonly outcome: 'SUCCEEDED';
      readonly provider_reference: string;
      readonly response_payload?: Record<string, unknown>;
    }
  | {
      readonly outcome: 'FAILED' | 'TIMEOUT' | 'UNKNOWN';
      readonly provider_reference?: string | null;
      readonly response_payload?: Record<string, unknown>;
    };

export interface MockPaymentProvider {
  readonly provider_id: string;
  readonly mode: 'MOCK_ONLY';
  execute(request: PaymentRequest): Promise<MockPaymentResponse>;
  reconcile?(input: {
    readonly tenant_id: string;
    readonly effect_key: string;
    readonly provider_reference?: string | null;
  }): Promise<PaymentOutcome>;
}

export interface PaymentIdempotencyStore {
  begin(input: {
    readonly tenant_id: string;
    readonly idempotency_key: string;
    readonly effect_key: string;
  }): Promise<{ readonly state: 'NEW' | 'REPLAY' | 'CONFLICT'; readonly outcome?: PaymentOutcome }> | {
    readonly state: 'NEW' | 'REPLAY' | 'CONFLICT';
    readonly outcome?: PaymentOutcome;
  };
  complete(input: {
    readonly tenant_id: string;
    readonly idempotency_key: string;
    readonly effect_key: string;
    readonly outcome: PaymentOutcome;
  }): Promise<void> | void;
}

export class PaymentRefusalError extends Error {
  constructor(
    readonly refusal_code:
      | 'TENANT_UNSCOPED'
      | 'PROVIDER_UNBOUND'
      | 'REQUEST_INVALID'
      | 'LIVE_EXECUTION_DISABLED'
      | 'IDEMPOTENCY_CONFLICT'
      | 'UNKNOWN_OUTCOME'
      | 'RECONCILIATION_UNAVAILABLE',
    detail: string,
  ) {
    super(`PAYMENT_${refusal_code}: ${detail}`);
    this.name = 'PaymentRefusalError';
  }
}

export class PaymentProviderRegistry {
  private readonly providers = new Map<string, MockPaymentProvider>();

  register(provider: MockPaymentProvider): void {
    if (provider.mode !== 'MOCK_ONLY' || provider.provider_id.trim().length === 0 || this.providers.has(provider.provider_id)) {
      throw new PaymentRefusalError('PROVIDER_UNBOUND', 'only one explicitly registered mock provider is accepted');
    }
    this.providers.set(provider.provider_id, provider);
  }

  resolve(provider_id: string): MockPaymentProvider {
    const provider = this.providers.get(provider_id);
    if (provider === undefined) throw new PaymentRefusalError('PROVIDER_UNBOUND', 'payment provider is not registered');
    return provider;
  }
}

function validateRequest(request: PaymentRequest): void {
  if (request.tenant_id.trim().length === 0) throw new PaymentRefusalError('TENANT_UNSCOPED', 'tenant is required');
  if (request.provider_id.trim().length === 0 || request.effect_key.trim().length === 0 || request.idempotency_key.trim().length === 0
    || request.currency.trim().length === 0 || request.payment_method_ref.trim().length === 0
    || !Number.isSafeInteger(request.amount_minor) || request.amount_minor <= 0) {
    throw new PaymentRefusalError('REQUEST_INVALID', 'payment identity and positive amount are required');
  }
}

/** Payment requests are explicit but never autonomously promotable by this adapter. */
export class GlobalPaymentAdapter {
  readonly promotable = false;

  constructor(
    private readonly deps: {
      readonly providers: PaymentProviderRegistry;
      readonly idempotency: PaymentIdempotencyStore;
    },
  ) {}

  async execute(request: PaymentRequest): Promise<PaymentOutcome> {
    validateRequest(request);
    const prior = await this.deps.idempotency.begin({
      tenant_id: request.tenant_id,
      idempotency_key: request.idempotency_key,
      effect_key: request.effect_key,
    });
    if (prior.state === 'CONFLICT') throw new PaymentRefusalError('IDEMPOTENCY_CONFLICT', 'idempotency key conflict');
    if (prior.state === 'REPLAY') {
      return prior.outcome ?? {
        outcome: 'UNKNOWN',
        provider_reference: null,
        response_payload: {},
        requires_reconciliation: true,
      };
    }

    const provider = this.deps.providers.resolve(request.provider_id);
    let response: MockPaymentResponse | { readonly outcome: 'UNKNOWN' };
    try {
      response = await provider.execute(request);
    } catch {
      response = { outcome: 'UNKNOWN' };
    }
    let outcome: PaymentOutcome;
    if (response.outcome === 'SUCCEEDED') {
      if (response.provider_reference.length === 0) {
        throw new PaymentRefusalError('UNKNOWN_OUTCOME', 'payment success lacks provider proof');
      }
      outcome = {
        outcome: 'SUCCEEDED',
        provider_reference: response.provider_reference,
        response_payload: response.response_payload ?? {},
        requires_reconciliation: false,
      };
    } else {
      const provider_reference = 'provider_reference' in response ? response.provider_reference ?? null : null;
      const response_payload = 'response_payload' in response ? response.response_payload ?? {} : {};
      outcome = {
        outcome: response.outcome === 'FAILED' ? 'FAILED' : 'UNKNOWN',
        provider_reference,
        response_payload,
        requires_reconciliation: response.outcome !== 'FAILED',
      };
    }
    await this.deps.idempotency.complete({
      tenant_id: request.tenant_id,
      idempotency_key: request.idempotency_key,
      effect_key: request.effect_key,
      outcome,
    });
    return outcome;
  }

  async reconcile(input: {
    readonly provider_id: string;
    readonly tenant_id: string;
    readonly effect_key: string;
    readonly provider_reference?: string | null;
  }): Promise<PaymentOutcome> {
    const provider = this.deps.providers.resolve(input.provider_id);
    if (provider.reconcile === undefined) {
      throw new PaymentRefusalError('RECONCILIATION_UNAVAILABLE', 'provider has no reconciliation contract');
    }
    const result = await provider.reconcile(input);
    if (result.outcome === 'SUCCEEDED' && result.provider_reference.length === 0) {
      throw new PaymentRefusalError('UNKNOWN_OUTCOME', 'reconciliation success lacks provider proof');
    }
    return result;
  }
}


export function createGlobalPaymentConnector(_input: { readonly adapter: GlobalPaymentAdapter }): RegisteredConnector {
  return {
    descriptor: {
      connector_id: GLOBAL_PAYMENT_CONNECTOR_ID,
      kind: 'SYSTEM_OF_RECORD',
      provider: 'Mock payment provider [UNCONFIRMED][ASM-001]',
      read_resources: [],
    },
    // Registry dispatch is intentionally disabled: this adapter only exposes an injected contract seam.
    dispatch: async (_action) => {
      throw new PaymentRefusalError('LIVE_EXECUTION_DISABLED', 'payment actions are contract-only and not live-dispatched');
    },
    reconcile: async (input) => {
      if (input.adapter_target !== GLOBAL_PAYMENT_CONNECTOR_ID) {
        throw new PaymentRefusalError('REQUEST_INVALID', 'payment reconciliation requires explicit adapter');
      }
      return { outcome: 'INDETERMINATE' as const };
    },
  };
}

export function registerGlobalPaymentConnector(
  registry: ConnectorRegistry,
  input: { readonly adapter: GlobalPaymentAdapter },
): RegisteredConnector {
  const connector = createGlobalPaymentConnector(input);
  registry.register(connector);
  return connector;
}

/** Every payment, order and refund operation stays outside controlled-autonomy promotion. */
export function isPaymentOperationPromotable(_operation: PaymentOperation): false {
  return false;
}
