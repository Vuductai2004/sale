import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { correlationIdOf, replyFailure } from '../../gateway/http.js';
import type { GatewayRuntime } from '../../gateway/ports.js';
import { createCredentialStore } from '../../gateway/principal.js';
import { registerProvisioningRoutes } from './provisioning.js';

const COMPANY_TOKEN = 'company-provisioning-token';
const TENANT = 'tenant-company';

function buildHarness() {
  const createShell = vi.fn(async () => ({
    tenant_id: TENANT,
    status: 'PROVISIONED',
    capabilities: [],
    connectors: [],
    unresolved_owner_inputs: [],
    autonomy: null,
  }));
  const runtime = { ids: () => 'corr-provisioning-test' } as unknown as GatewayRuntime;
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => replyFailure(reply, error, correlationIdOf(request, runtime)));
  registerProvisioningRoutes(app, {
    provisioning: {
      createShell,
      getShell: vi.fn(async () => null),
    },
    credentials: createCredentialStore({
      operators: [{
        token: COMPANY_TOKEN,
        tenant_id: TENANT,
        operator_id: 'company-operator',
        scope: 'company',
        permissions: ['platform:admin'],
      }],
      sessions: [],
      widgets: [],
    }),
    runtime,
  });
  return { app, createShell };
}

describe('POST /provisioning/tenants', () => {
  it('refuses a company-scoped operator even when it holds platform:admin', async () => {
    const { app, createShell } = buildHarness();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/provisioning/tenants',
        headers: {
          authorization: `Bearer ${COMPANY_TOKEN}`,
          'idempotency-key': 'company-provisioning-key',
        },
        payload: { display_name: 'Should not provision' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ error_code: 'INSUFFICIENT_AUTHORITY' });
      expect(createShell).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
