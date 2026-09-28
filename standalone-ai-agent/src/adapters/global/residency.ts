/**
 * ADPT-GL-003 tenant residency boundary.
 * Jurisdiction, region and provider mappings remain [UNCONFIRMED][ASM-001].
 * Regions are owner-supplied; this module has no Frankfurt, US-East or Singapore default.
 */

import type { ActionDraft, ExecutionReceipt } from '@agentos/core-engine/contracts';

import type { ConnectorRegistry, RegisteredConnector } from '../base/registry.js';

export const GLOBAL_RESIDENCY_CONNECTOR_ID = 'ADPT-GL-003';

export interface TenantResidencyBinding {
  readonly tenant_id: string;
  readonly region: string;
  readonly configured_at: string;
}

export interface ResidencyBindingStore {
  find(tenant_id: string): Promise<TenantResidencyBinding | null> | TenantResidencyBinding | null;
  save(binding: TenantResidencyBinding): Promise<void> | void;
}

export interface ResidencyOperation {
  readonly tenant_id: string;
  readonly region: string | null;
  readonly requires_residency: boolean;
}

export class ResidencyRefusalError extends Error {
  constructor(
    readonly refusal_code: 'TENANT_UNSCOPED' | 'RESIDENCY_UNRESOLVED' | 'RESIDENCY_BOUNDARY_VIOLATION' | 'REQUEST_INVALID',
    detail: string,
  ) {
    super(`RESIDENCY_${refusal_code}: ${detail}`);
    this.name = 'ResidencyRefusalError';
  }
}

function assertTenant(tenant_id: string): void {
  if (tenant_id.trim().length === 0) throw new ResidencyRefusalError('TENANT_UNSCOPED', 'authenticated tenant is required');
}

/** A boundary is an explicit owner decision, never a provider or adapter default. */
export class GlobalResidencyAdapter {
  constructor(private readonly bindings: ResidencyBindingStore) {}

  async bind(input: TenantResidencyBinding): Promise<void> {
    assertTenant(input.tenant_id);
    if (input.region.trim().length === 0) throw new ResidencyRefusalError('RESIDENCY_UNRESOLVED', 'owner-supplied region is required');
    await this.bindings.save(input);
  }

  async assertWithinBoundary(input: ResidencyOperation): Promise<TenantResidencyBinding> {
    assertTenant(input.tenant_id);
    if (!input.requires_residency) {
      const existing = await this.bindings.find(input.tenant_id);
      if (existing !== null) return existing;
      throw new ResidencyRefusalError('RESIDENCY_UNRESOLVED', 'tenant residency is not configured');
    }
    if (input.region === null || input.region.trim().length === 0) {
      throw new ResidencyRefusalError('RESIDENCY_UNRESOLVED', 'operation requires an owner-supplied region');
    }
    const binding = await this.bindings.find(input.tenant_id);
    if (binding === null || binding.region.trim().length === 0) {
      throw new ResidencyRefusalError('RESIDENCY_UNRESOLVED', 'tenant residency is not configured');
    }
    if (binding.region !== input.region) {
      throw new ResidencyRefusalError('RESIDENCY_BOUNDARY_VIOLATION', 'operation region crosses tenant boundary');
    }
    return binding;
  }
}

export function createGlobalResidencyConnector(input: {
  readonly adapter: GlobalResidencyAdapter;
}): RegisteredConnector {
  return {
    descriptor: {
      connector_id: GLOBAL_RESIDENCY_CONNECTOR_ID,
      kind: 'SYSTEM_OF_RECORD',
      provider: 'Owner-configured residency boundary [UNCONFIRMED][ASM-001]',
      read_resources: [],
    },
    dispatch: async (action: ActionDraft): Promise<ExecutionReceipt> => {
      const payload = action.payload as Partial<ResidencyOperation>;
      if (payload.tenant_id !== action.tenant_id || typeof payload.region !== 'string') {
        throw new ResidencyRefusalError('REQUEST_INVALID', 'dispatch requires authenticated tenant and explicit region');
      }
      await input.adapter.assertWithinBoundary({
        tenant_id: action.tenant_id,
        region: payload.region,
        requires_residency: payload.requires_residency === true,
      });
      throw new ResidencyRefusalError('REQUEST_INVALID', 'residency guard is not an external effect');
    },
  };
}

export function registerGlobalResidencyConnector(
  registry: ConnectorRegistry,
  input: { readonly adapter: GlobalResidencyAdapter },
): RegisteredConnector {
  const connector = createGlobalResidencyConnector(input);
  registry.register(connector);
  return connector;
}
