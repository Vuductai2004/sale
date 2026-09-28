import { describe, expect, it } from 'vitest';
import {
  clearDemoSessionsForTests,
  loginDemoPlatformAdmin,
  readDemoPlatformSession,
  proxyDemoPlatformApi,
  logoutDemoPlatformAdmin,
  type DemoEnvironment,
} from './demo-bff.server';

const ENV: DemoEnvironment = {
  APP_ENV: 'ci',
  DEMO_MODE: 'true',
  API_BASE_URL: 'http://api.test',
  DEMO_COOKIE_HMAC_KEY: 'platform-cookie-signing-key',
};
const ORIGIN = 'http://admin.test';
const TENANT_ID = '99999999-9999-4999-8999-999999999999';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function cookieHeader(response: Response): string {
  const raw = response.headers.get('set-cookie') ?? '';
  const session = raw.match(/agentos_platform_session=[^;,]*/)?.[0];
  const csrf = raw.match(/agentos_platform_csrf=[^;,]*/)?.[0];
  if (!session || !csrf) throw new Error('session cookies missing');
  return `${session}; ${csrf}`;
}

function csrfHeader(cookies: string): string {
  const match = cookies.match(/agentos_platform_csrf=([^;]+)/);
  if (!match?.[1]) throw new Error('csrf cookie missing');
  return decodeURIComponent(match[1]);
}

function createUpstreamFetch(calls: Request[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    calls.push(request);
    const path = new URL(request.url).pathname;
    if (path.endsWith('/demo/login')) {
      return jsonResponse({
        access_token: 'api-platform-token',
        expires_at: new Date(Date.now() + 1_800_000).toISOString(),
        role: 'platform_admin',
        tenant_id: TENANT_ID,
      });
    }
    if (path.endsWith('/demo/session')) {
      return jsonResponse({
        role: 'platform_admin',
        tenant_id: TENANT_ID,
        operator_id: 'platform-operator',
        permissions: ['run:read', 'telemetry:read'],
      });
    }
    if (path.endsWith('/demo/logout')) return jsonResponse({ ok: true });
    return jsonResponse({ ok: true, path }, 200);
  }) as typeof fetch;
}

async function login(calls: Request[] = []): Promise<{ cookies: string; response: Response }> {
  const response = await loginDemoPlatformAdmin(
    new Request(`${ORIGIN}/api/demo/session`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'platform_admin', password: 'operator-password' }),
    }),
    ENV,
    createUpstreamFetch(calls),
  );
  return { response, cookies: cookieHeader(response) };
}

describe('platform-admin demo BFF security boundary', () => {
  it('denies every non-platform role before contacting the API', async () => {
    const calls: Request[] = [];
    const response = await loginDemoPlatformAdmin(
      new Request(`${ORIGIN}/api/demo/session`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'tenant_operator', password: 'operator-password' }),
      }),
      ENV,
      createUpstreamFetch(calls),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'ROLE_FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });

  it('sets an HttpOnly SameSite=Lax session cookie and a readable CSRF cookie', async () => {
    const response = await loginDemoPlatformAdmin(
      new Request('https://admin.test/api/demo/session', {
        method: 'POST',
        headers: { origin: 'https://admin.test', 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'platform_admin', password: 'operator-password' }),
      }),
      ENV,
      createUpstreamFetch(),
    );
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toContain('agentos_platform_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('agentos_platform_csrf=');
    expect(setCookie).not.toMatch(/agentos_platform_csrf=[^;]+;[^\\n]*HttpOnly/);
  });

  it('rejects unauthenticated proxy reads and mutations', async () => {

    const fetchImpl = createUpstreamFetch();
    const read = await proxyDemoPlatformApi(new Request(`${ORIGIN}/api/v1/runs`), 'runs', ENV, fetchImpl);
    const write = await proxyDemoPlatformApi(
      new Request(`${ORIGIN}/api/v1/admin/autonomy/pause`, { method: 'POST', headers: { origin: ORIGIN } }),
      'admin/autonomy/pause',
      ENV,
      fetchImpl,
    );

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
  });
  it('rejects an unauthenticated session read without contacting the API', async () => {
    const calls: Request[] = [];
    const response = await readDemoPlatformSession(
      new Request(`${ORIGIN}/api/demo/session`),
      ENV,
      createUpstreamFetch(calls),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
    expect(calls).toHaveLength(0);
  });

  it('requires same-origin Origin and a matching CSRF cookie/header for mutations', async () => {
    const loggedIn = await login();
    const csrf = csrfHeader(loggedIn.cookies);
    const path = 'admin/autonomy/pause';

    const crossOrigin = await proxyDemoPlatformApi(
      new Request(`${ORIGIN}/api/v1/${path}`, { method: 'POST', headers: { cookie: loggedIn.cookies, origin: 'https://evil.test', 'x-csrf-token': csrf } }),
      path,
      ENV,
      createUpstreamFetch(),
    );
    const missingCsrf = await proxyDemoPlatformApi(
      new Request(`${ORIGIN}/api/v1/${path}`, { method: 'POST', headers: { cookie: loggedIn.cookies, origin: ORIGIN } }),
      path,
      ENV,
      createUpstreamFetch(),
    );

    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toEqual({ error: 'CROSS_ORIGIN' });
    expect(missingCsrf.status).toBe(403);
    expect(await missingCsrf.json()).toEqual({ error: 'CSRF_FAILED' });
  });

  it('keeps the API bearer server-side and strips browser authority overrides', async () => {
    const loginResult = await login();
    const csrf = csrfHeader(loginResult.cookies);
    const calls: Request[] = [];
    const response = await proxyDemoPlatformApi(
      new Request(`${ORIGIN}/api/v1/admin/autonomy/pause`, {
        method: 'POST',
        headers: {
          cookie: loginResult.cookies,
          origin: ORIGIN,
          'x-csrf-token': csrf,
          authorization: 'Bearer browser-token-must-not-forward',
          'x-tenant-id': 'attacker-tenant',
        },
      }),
      'admin/autonomy/pause',
      ENV,
      createUpstreamFetch(calls),
    );
    const upstream = calls.at(-1);

    expect(response.status).toBe(200);
    expect(upstream?.headers.get('authorization')).toBe('Bearer api-platform-token');
    expect(upstream?.headers.has('x-tenant-id')).toBe(false);
    expect((await response.text()).includes('api-platform-token')).toBe(false);
  });

  it('returns a sanitized verified session and never exposes the API token', async () => {
    const loginResult = await login();
    expect((await loginResult.response.text()).includes('api-platform-token')).toBe(false);
    const response = await readDemoPlatformSession(
      new Request(`${ORIGIN}/api/demo/session`, { headers: { cookie: loginResult.cookies } }),
      ENV,
      createUpstreamFetch(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      role: 'platform_admin',
      tenant_id: TENANT_ID,
      operator_id: 'platform-operator',
      permissions: ['run:read', 'telemetry:read'],
    });
    expect(body.access_token).toBeUndefined();
  });

  it('is unavailable outside DEMO_MODE local/ci', async () => {
    clearDemoSessionsForTests();
    const response = await readDemoPlatformSession(new Request(`${ORIGIN}/api/demo/session`), {
      APP_ENV: 'production',
      DEMO_MODE: 'true',
      API_BASE_URL: 'http://api.test',
      DEMO_COOKIE_HMAC_KEY: ENV.DEMO_COOKIE_HMAC_KEY,
    }, createUpstreamFetch());

    expect(response.status).toBe(404);
  });
  it('revokes the server session and forwards logout with the server bearer', async () => {
    const loginResult = await login();
    const calls: Request[] = [];
    const csrf = csrfHeader(loginResult.cookies);
    const response = await logoutDemoPlatformAdmin(
      new Request(`${ORIGIN}/api/demo/logout`, {
        method: 'POST',
        headers: { cookie: loginResult.cookies, origin: ORIGIN, 'x-csrf-token': csrf },
      }),
      ENV,
      createUpstreamFetch(calls),
    );

    const upstream = calls.at(-1);
    expect(response.status).toBe(200);
    expect(upstream?.url).toContain('/api/v1/demo/logout');
    expect(upstream?.headers.get('authorization')).toBe('Bearer api-platform-token');
  });
});
