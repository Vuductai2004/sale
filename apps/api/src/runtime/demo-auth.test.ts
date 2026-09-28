import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import type { GatewayRuntime } from '../gateway/ports.js';
import { registerDemoAuthRoutes } from '../routes/v1/demo-auth.js';
import { replyFailure } from '../gateway/http.js';
import {
  DEMO_SESSION_TTL_MS,
  DEMO_TENANT_ID,
  createDemoCredentialStore,
} from './demo-auth.js';
import { createGatewayComposition } from './composition.js';

const PASSWORDS = {
  tenantOperatorPassword: 'tenant-password-123',
  marketingApproverPassword: 'marketing-password-123',
  platformAdminPassword: 'platform-password-123',
} as const;

const SECRETS = {
  SESSION_SECRET: 'test-session-secret-000000',
  PLATFORM_SECRET: 'test-platform-secret-00000',
} as const;

const apps: FastifyInstance[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

function store(now: { value: number }) {
  return createDemoCredentialStore({ ...PASSWORDS, now: () => now.value });
}

async function authApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => replyFailure(reply, error, 'demo-auth-test'));
  registerDemoAuthRoutes(app, {
    demoAuth: store({ value: 0 }),
    runtime: {} as GatewayRuntime,
  });
  await app.ready();
  apps.push(app);
  return app;
}

describe('demo credential store', () => {
  it('issues role-scoped credentials with the exact demo tenant and permissions', () => {
    const now = { value: 0 };
    const demo = store(now);

    const tenant = demo.login('tenant_operator', PASSWORDS.tenantOperatorPassword);
    const approver = demo.login('marketing_approver', PASSWORDS.marketingApproverPassword);
    const platform = demo.login('platform_admin', PASSWORDS.platformAdminPassword);

    expect(tenant).toMatchObject({ role: 'tenant_operator', tenant_id: DEMO_TENANT_ID });
    expect(tenant?.permissions).toEqual([
      'campaign:draft',
      'conversation:takeover',
      'customer:read',
      'run:read',
      'telemetry:read',
    ]);
    expect(approver?.permissions).toEqual(['approval:read', 'approval:decide', 'run:read']);
    expect(platform?.permissions).toEqual([
      'platform:admin',
      'run:read',
      'run:retry',
      'run:reconcile',
      'telemetry:read',
    ]);
    expect(new Set([tenant?.access_token, approver?.access_token, platform?.access_token]).size).toBe(3);
    expect(tenant?.access_token).not.toContain(PASSWORDS.tenantOperatorPassword);
  });

  it('rejects invalid and cross-role passwords without issuing a token', () => {
    const demo = store({ value: 0 });

    expect(demo.login('tenant_operator', 'wrong-password')).toBeNull();
    expect(demo.login('marketing_approver', PASSWORDS.tenantOperatorPassword)).toBeNull();
    expect(demo.login('platform_admin', PASSWORDS.marketingApproverPassword)).toBeNull();
  });

  it('expires and revokes operator and widget credentials', () => {
    const now = { value: 0 };
    const demo = store(now);
    const session = demo.login('tenant_operator', PASSWORDS.tenantOperatorPassword);
    expect(session).not.toBeNull();
    if (session === null) return;

    const widget = demo.issueWidget('widget-session-1', 'http://localhost:3000');
    expect(widget.access_token).not.toBe(session.access_token);
    expect(demo.resolveWidgetSession(widget.access_token)).toMatchObject({
      tenant_id: DEMO_TENANT_ID,
      session_id: 'widget-session-1',
      origin: 'http://localhost:3000',
    });

    const expiring = demo.login('tenant_operator', PASSWORDS.tenantOperatorPassword);
    expect(expiring).not.toBeNull();
    if (expiring === null) return;

    expect(demo.revoke(session.access_token)).toBe(true);
    expect(demo.resolveDemoSession(session.access_token)).toBeNull();
    expect(demo.revoke(session.access_token)).toBe(false);

    now.value = DEMO_SESSION_TTL_MS;
    expect(demo.resolveDemoSession(expiring.access_token)).toBeNull();
    expect(demo.resolveWidgetSession(widget.access_token)).toBeNull();

  });
  it('fails closed for production DEMO_MODE and has no demo store when disabled', async () => {
    expect(() => createGatewayComposition({
      ...SECRETS,
      APP_ENV: 'production',
      DEMO_MODE: 'true',
    })).toThrow('DEMO_MODE requires APP_ENV=local or APP_ENV=ci');

    const composition = createGatewayComposition({
      ...SECRETS,
      APP_ENV: 'production',
      DEMO_MODE: 'false',
    });
    expect(composition.demoAuth).toBeUndefined();
    await composition.close();
  });
});

describe('demo auth routes', () => {
  it('does not expose password or token details on invalid login', async () => {
    const app = await authApp();
    const response = await app.inject({
      method: 'POST',
      url: '/demo/login',
      payload: { role: 'tenant_operator', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('wrong-password');
    expect(response.body).not.toContain('access_token');
  });

  it('returns a role session and revokes it at logout', async () => {
    const app = await authApp();
    const login = await app.inject({
      method: 'POST',
      url: '/demo/login',
      payload: { role: 'platform_admin', password: PASSWORDS.platformAdminPassword },
    });
    expect(login.statusCode).toBe(200);
    const issued = login.json() as { access_token: string; tenant_id: string; role: string };
    expect(issued).toMatchObject({ role: 'platform_admin', tenant_id: DEMO_TENANT_ID });

    const session = await app.inject({
      method: 'GET',
      url: '/demo/session',
      headers: { authorization: `Bearer ${issued.access_token}` },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      role: 'platform_admin',
      tenant_id: DEMO_TENANT_ID,
      operator_id: 'demo-platform-admin',
      permissions: ['platform:admin', 'run:read', 'run:retry', 'run:reconcile', 'telemetry:read'],
    });

    const logout = await app.inject({
      method: 'POST',
      url: '/demo/logout',
      headers: { authorization: `Bearer ${issued.access_token}` },
    });
    expect(logout.statusCode).toBe(200);

    const expired = await app.inject({
      method: 'GET',
      url: '/demo/session',
      headers: { authorization: `Bearer ${issued.access_token}` },
    });
    expect(expired.statusCode, expired.body).toBe(401);
  });
});