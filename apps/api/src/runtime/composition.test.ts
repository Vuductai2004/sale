import { describe, expect, it } from 'vitest';

import type { RedisInjectedClient, TenantTransactionRunner } from '@agentos/database';

import { createGatewayComposition } from './composition.js';

const ENV = {
  SESSION_SECRET: 'test-session-secret-000000',
  PLATFORM_SECRET: 'test-platform-secret-00000',
};

const EMPTY_REDIS: RedisInjectedClient = {
  set: async () => null,
  get: async () => null,
  pttl: async () => -2,
  eval: async () => 0,
};
const EMPTY_DATABASE_RUNNER: TenantTransactionRunner = async () => {
  throw new Error('test database runner must not be called while checking composition bindings');
};

describe('createGatewayComposition', () => {
  it('binds durable intake and approval decisions without Redis', async () => {
    const composition = createGatewayComposition(ENV, { redis: EMPTY_REDIS });

    expect(composition.unbound).not.toContain('runs.reconcile');
    expect(composition.unbound).not.toContain('approvals.decide');
    expect(composition.unbound).not.toContain('runs.start');
    expect(composition.unbound).not.toContain('runs.read');
    expect(composition.unbound).not.toContain('runs.list');
    expect(composition.unbound).not.toContain('approvals.list');
    expect(composition.unbound).not.toContain('identity.resolveCustomer');
    expect(composition.unbound).not.toContain('takeover.acquire/renew/release/holder');

    expect(composition.runtime.runs.reconcile).toBeTypeOf('function');
    expect(composition.runtime.approvals.decide).toBeTypeOf('function');

    await composition.close();
  });

  it('binds P5 route ports only when a database runner is configured', async () => {
    const withoutDatabase = createGatewayComposition(ENV);
    expect(withoutDatabase.provisioning).toBeUndefined();
    expect(withoutDatabase.autonomyAdmin).toBeUndefined();
    await withoutDatabase.close();

    const withDatabase = createGatewayComposition(ENV, { databaseRunner: EMPTY_DATABASE_RUNNER });
    expect(withDatabase.provisioning?.createShell).toBeTypeOf('function');
    expect(withDatabase.provisioning?.getShell).toBeTypeOf('function');
    expect(withDatabase.autonomyAdmin?.inspect).toBeTypeOf('function');
    await withDatabase.close();
  });

  it('keeps takeover fail-closed when no Redis store is configured', async () => {
    const composition = createGatewayComposition(ENV);

    expect(composition.unbound).toContain('takeover.acquire/renew/release/holder');
    await expect(composition.runtime.takeover.holder('tenant-a', 'conversation-a')).rejects.toMatchObject({
      port: 'takeover.holder',
      name: 'UnboundPortError',
    });

    await composition.close();
  });
  it('reports an unbound provider without inventing an empty model or ledger counts', async () => {
    const composition = createGatewayComposition({
      ...ENV,
      APP_ENV: 'local',
      DEMO_MODE: 'true',
      DEMO_TENANT_OPERATOR_PASSWORD: 'tenant-password',
      DEMO_MARKETING_APPROVER_PASSWORD: 'marketing-password',
      DEMO_PLATFORM_ADMIN_PASSWORD: 'platform-password',
    });
    const snapshot = await composition.readiness.snapshot({ tenant_id: '99999999-9999-4999-8999-999999999999' });
    expect(snapshot.provider.configured).toBe(false);
    expect(snapshot.provider.models).toEqual([]);
    expect(snapshot.ledger).toEqual({ status: 'UNAVAILABLE', stage_event_count: null, provider_call_count: null });
    await composition.close();
  });
});
