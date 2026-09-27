import { describe, expect, it } from 'vitest';

import { MemoryProvisioningStore } from './memory-store.js';
import { ProvisioningService } from './service.js';
import { ProvisioningConflictError } from './types.js';

describe('ProvisioningService', () => {
  it('replays an identical idempotent request without allocating another tenant', async () => {
    const store = new MemoryProvisioningStore();
    let nextId = 0;
    const service = new ProvisioningService({ store, idFactory: () => `tenant-${++nextId}` });

    const first = await service.createShell({ idempotency_key: 'onboarding-1', fingerprint: 'same' });
    const replay = await service.createShell({ idempotency_key: 'onboarding-1', fingerprint: 'same' });

    expect(replay.tenant_id).toBe(first.tenant_id);
    expect(nextId).toBe(1);
    expect(store.size).toBe(1);
  });

  it('rejects an idempotency key reused with a different fingerprint', async () => {
    const service = new ProvisioningService(new MemoryProvisioningStore());
    await service.createShell({ idempotency_key: 'onboarding-1', fingerprint: 'first' });

    await expect(
      service.createShell({ idempotency_key: 'onboarding-1', fingerprint: 'different' }),
    ).rejects.toBeInstanceOf(ProvisioningConflictError);
  });

  it('does not return another tenant during an isolated read', async () => {
    const store = new MemoryProvisioningStore();
    const service = new ProvisioningService(store);
    const first = await service.createShell();
    const second = await service.createShell();

    expect(await service.getShell(first.tenant_id)).toMatchObject({ tenant_id: first.tenant_id });
    expect(await service.getShell(first.tenant_id)).not.toMatchObject({ tenant_id: second.tenant_id });
  });

  it('rolls back staged tenant and evidence writes when a transaction step throws', async () => {
    const store = new MemoryProvisioningStore();
    const service = new ProvisioningService(store);
    const shell = await service.createShell();

    await expect(
      store.transaction({ idempotency_key: 'rollback', fingerprint: 'rollback' }, async (transaction) => {
        await transaction.putTenant({ ...shell, tenant_id: 'tenant-rollback' });
        throw new Error('step failed');
      }),
    ).rejects.toThrow('step failed');

    expect(await store.getTenant('tenant-rollback')).toBeNull();
    expect(await store.getEvidence('tenant-rollback')).toBeNull();
  });

  it('blocks mutating dispatch while the provisioned shell is unbound', async () => {
    const service = new ProvisioningService(new MemoryProvisioningStore());
    const shell = await service.createShell();

    const admission = await service.assertMutatingDispatchAllowed({
      tenant_id: shell.tenant_id,
      required_owner_inputs: ['FLOOR_POLICY'],
    });

    expect(admission.allowed).toBe(false);
    expect(admission.blocked).toBe(true);
    expect(admission.reasons).toContain('CONNECTORS_UNBOUND');
    expect(admission.reasons).toContain('OWNER_INPUT_UNRESOLVED');
  });
});
