import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GatewayRuntime } from '../../gateway/ports.js';
import { correlationIdOf, replyFailure } from '../../gateway/http.js';
import { registerDemoWidgetRoutes } from './demo-widget.js';
import {
  DEMO_TENANT_ID,
  createDemoCredentialStore,
} from '../../runtime/demo-auth.js';

const ORIGIN = 'https://demo.example.test';
const PASSWORDS = {
  tenantOperatorPassword: 'tenant-password-123',
  marketingApproverPassword: 'marketing-password-123',
  platformAdminPassword: 'platform-password-123',
} as const;

const apps: FastifyInstance[] = [];
const originalEnv = {
  APP_ENV: process.env.APP_ENV,
  DEMO_MODE: process.env.DEMO_MODE,
  DEMO_WIDGET_ORIGINS: process.env.DEMO_WIDGET_ORIGINS,
};

function restoreEnv(key: keyof typeof originalEnv): void {
  const value = originalEnv[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function buildHarness() {
  const demoAuth = createDemoCredentialStore(PASSWORDS);
  const operator = demoAuth.login('tenant_operator', PASSWORDS.tenantOperatorPassword);
  const approver = demoAuth.login('marketing_approver', PASSWORDS.marketingApproverPassword);
  if (operator === null || approver === null) throw new Error('demo test operator credentials did not issue');

  const runtime = { ids: () => 'demo-widget-test-correlation' } as unknown as GatewayRuntime;
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => replyFailure(reply, error, correlationIdOf(request, runtime)));
  registerDemoWidgetRoutes(app, { demoAuth, runtime });
  apps.push(app);
  return { app, demoAuth, operator, approver };
}

beforeEach(() => {
  process.env.APP_ENV = 'local';
  process.env.DEMO_MODE = 'true';
  process.env.DEMO_WIDGET_ORIGINS = ORIGIN;
});

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  restoreEnv('APP_ENV');
  restoreEnv('DEMO_MODE');
  restoreEnv('DEMO_WIDGET_ORIGINS');
});

describe('POST /demo/widget-session', () => {
  it('mints the sanctioned verified C06 session in the canonical tenant', async () => {
    const { app, demoAuth, operator } = buildHarness();
    const response = await app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${operator.access_token}`, origin: ORIGIN },
      payload: { persona: 'C06' },
    });

    expect(response.statusCode).toBe(201);
    const issued = response.json() as { access_token: string; session_id: string };
    expect(issued.session_id).toBe('sess-novamart-c06');
    expect(demoAuth.resolveWidgetSession(issued.access_token)).toMatchObject({
      tenant_id: DEMO_TENANT_ID,
      session_id: 'sess-novamart-c06',
      origin: ORIGIN,
    });
  });

  it('keeps C05, C06, and anonymous sessions distinct', async () => {
    const { app, operator } = buildHarness();
    const mint = (persona: string) => app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${operator.access_token}`, origin: ORIGIN },
      payload: { persona },
    });

    const [c05, c06, anonymous] = await Promise.all([mint('C05'), mint('C06'), mint('anonymous')]);
    expect(c05.statusCode).toBe(201);
    expect(c06.statusCode).toBe(201);
    expect(anonymous.statusCode).toBe(201);
    expect(c05.json().session_id).toBe('sess-novamart-c05');
    expect(c06.json().session_id).toBe('sess-novamart-c06');
    expect(c05.json().session_id).not.toBe(c06.json().session_id);
    expect(c05.json().session_id).not.toBe(anonymous.json().session_id);
  });

  it('rejects arbitrary customer claims and non-tenant operator roles', async () => {
    const { app, operator, approver } = buildHarness();
    const claimedCustomer = await app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${operator.access_token}`, origin: ORIGIN },
      payload: { persona: 'C06', customer_id: '99000000-0000-4000-8000-000000000005' },
    });
    expect(claimedCustomer.statusCode).toBe(400);
    expect(claimedCustomer.body).not.toContain('99000000-0000-4000-8000-000000000005');

    const unauthorizedRole = await app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${approver.access_token}`, origin: ORIGIN },
      payload: { persona: 'C06' },
    });
    expect(unauthorizedRole.statusCode).toBe(403);
    expect(unauthorizedRole.body).not.toContain('sess-novamart-c06');
  });

  it('refuses production even when a demo credential store is directly wired', async () => {
    const { app, operator } = buildHarness();
    process.env.APP_ENV = 'production';

    const response = await app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${operator.access_token}`, origin: ORIGIN },
      payload: { persona: 'C06' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error_code).toBe('CAPABILITY_NOT_ENABLED');
    expect(response.body).not.toContain('access_token');
  });

  it('requires an exact approved origin', async () => {
    const { app, operator } = buildHarness();
    const response = await app.inject({
      method: 'POST',
      url: '/demo/widget-session',
      headers: { authorization: `Bearer ${operator.access_token}`, origin: 'https://demo.example.test.evil' },
      payload: { persona: 'C06' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('sess-novamart-c06');
  });
});
