import { describe, expect, it } from 'vitest';
import {
  createSalesErpPriceFloorPort,
  SalesAdvisorExecutionState,
} from './advisor-adapters.js';
import type { ErpReadPort } from './skills/types.js';

describe('SalesAdvisorExecutionState', () => {
  it('preserves candidate_sku when updating requirements', () => {
    const state = new SalesAdvisorExecutionState();
    const tenant_id = 'tenant-sales-1';
    const correlation_id = 'corr-101';

    state.recordCandidateSku(tenant_id, correlation_id, 'SKU-LAPTOP-X1');
    state.recordStock(tenant_id, correlation_id, 'SKU-LAPTOP-X1', 5);

    expect(state.candidateSkuFor(tenant_id, correlation_id)).toBe('SKU-LAPTOP-X1');
    expect(state.stockFor(tenant_id, correlation_id, 'SKU-LAPTOP-X1')).toBe(5);

    // Update requirements on same run
    state.setRequirements(tenant_id, correlation_id, {
      category: 'laptops',
      use_case: 'graphic_design',
    });

    // candidate_sku must not be wiped
    expect(state.candidateSkuFor(tenant_id, correlation_id)).toBe('SKU-LAPTOP-X1');
    expect(state.stockFor(tenant_id, correlation_id, 'SKU-LAPTOP-X1')).toBe(5);
    expect(state.requirementsFor(tenant_id, correlation_id)).toEqual({
      category: 'laptops',
      use_case: 'graphic_design',
    });
  });
});

describe('createSalesErpPriceFloorPort', () => {
  it('accepts ERP price records with sku alias as well as sku_id', async () => {
    const erpMock: ErpReadPort = {
      read: async () => ({
        tenant_id: 'tenant-1',
        resource: 'prices',
        key: 'SKU-001',
        value: {
          tenant_id: 'tenant-1',
          sku: 'SKU-001', // uses sku instead of sku_id
          owner_approved: true,
          list_price: 1000,
          p_floor: 850,
          currency: 'VND',
          floor_source: 'pricing_v1',
          quote_ttl_seconds: 600,
        },
      }),
    };

    const port = createSalesErpPriceFloorPort(erpMock)!;
    const decision = await port.read({ tenant_id: 'tenant-1', sku_id: 'SKU-001' });

    expect(decision).toEqual({
      ok: true,
      owner_approved: true,
      list_price: 1000,
      p_floor: 850,
      currency: 'VND',
      floor_source: 'pricing_v1',
      quote_ttl_seconds: 600,
    });
  });
});
