import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getSession, POST as postSession } from './session/route';
import { POST as postLogout } from './logout/route';
import { GET as proxyGet, POST as proxyPost } from '../v1/[...path]/route';
import {
  DEMO_TENANT_ID,
  resetDemoSessionsForTests,
} from '../../../lib/demo-bff';

const ORIGIN = 'http://localhost:3000';
const API_ORIGIN = 'http://localhost:4000';
const API_TOKEN = 'api-token-must-not-reach-browser';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function cookiePair(setCookie: string | null, name: string): string {
  const match = setCookie?.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
  if (!match?.[1]) throw new Error(`missing ${name} cookie`);
  return `${name}=${match[1]}`;
}

function request(url: string, init: RequestInit = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    ...init,
    headers: {
      Origin: ORIGIN,
      ...(init.headers ?? {}),
    },
  });
}

async function bootstrapCsrf(): Promise<string> {
  const response = await getSession(request('/api/demo/session'));
  expect(response.status).toBe(401);
  return cookiePair(response.headers.get('set-cookie'), 'agentos_tenant_csrf');
}

async function login(role: 'tenant_operator' | 'marketing_approver' = 'tenant_operator') {
  const csrf = await bootstrapCsrf();
  const response = await postSession(request('/api/demo/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrf,
      'X-CSRF-Token': csrf.split('=')[1]!,
    },
    body: JSON.stringify({ role, password: 'demo-password' }),
  }));
  expect(response.status).toBe(200);
  const setCookie = response.headers.get('set-cookie');
  return {
    response,
    sessionCookie: cookiePair(setCookie, 'agentos_tenant_session'),
    csrfCookie: cookiePair(setCookie, 'agentos_tenant_csrf'),
  };
}

beforeEach(() => {
  process.env.APP_ENV = 'local';
  process.env.DEMO_MODE = 'true';
  process.env.DEMO_COOKIE_HMAC_KEY = 'a-test-only-cookie-hmac-key-that-is-not-a-token';
  process.env.API_BASE_URL = API_ORIGIN;
  resetDemoSessionsForTests();
  vi.restoreAllMocks();
});

describe('tenant demo BFF authentication', () => {
  it('logs in through the API, keeps the API bearer server-side, and returns only safe session data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        access_token: API_TOKEN,
        expires_at: '2030-01-01T00:00:00.000Z',
        role: 'tenant_operator',
        tenant_id: DEMO_TENANT_ID,
      }),
    );

    const result = await login();
    const body = await result.response.text();
    expect(body).not.toContain(API_TOKEN);
    expect(result.sessionCookie).not.toContain(API_TOKEN);
    expect(result.csrfCookie).not.toContain(API_TOKEN);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/v1/demo/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ role: 'tenant_operator', password: 'demo-password' }),
      }),
    );
  });

  it('rejects roles outside the two tenant-console roles before calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const csrf = await bootstrapCsrf();
    const response = await postSession(request('/api/demo/session', {
      method: 'POST',
      headers: { Cookie: csrf, 'X-CSRF-Token': csrf.split('=')[1]! },
      body: JSON.stringify({ role: 'platform_admin', password: 'demo-password' }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects login from another origin and does not call the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const csrf = await bootstrapCsrf();
    const response = await postSession(new Request(`${ORIGIN}/api/demo/session`, {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        Cookie: csrf,
        'X-CSRF-Token': csrf.split('=')[1]!,
      },
      body: JSON.stringify({ role: 'tenant_operator', password: 'demo-password' }),
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'ORIGIN_MISMATCH' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires authentication and CSRF for API proxy mutations', async () => {
    const unauthenticated = await proxyPost(
      request('/api/v1/approvals/app-1/decision', { method: 'POST' }),
      { params: { path: ['approvals', 'app-1', 'decision'] } },
    );
    expect(unauthenticated.status).toBe(401);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      access_token: API_TOKEN,
      expires_at: '2030-01-01T00:00:00.000Z',
      role: 'tenant_operator',
      tenant_id: DEMO_TENANT_ID,
    }));
    const csrf = await bootstrapCsrf();
    const auth = await login();
    const missingCsrf = await proxyPost(
      request('/api/v1/approvals/app-1/decision', {
        method: 'POST',
        headers: { Cookie: auth.sessionCookie },
        body: '{}',
      }),
      { params: { path: ['approvals', 'app-1', 'decision'] } },
    );
    expect(missingCsrf.status).toBe(403);
    expect(await missingCsrf.json()).toEqual({ error: 'CSRF_INVALID' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    void csrf;
  });

  it('allows the tenant operator widget-session path but denies it to marketing approvers', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) as { role?: string } : {};
      return jsonResponse({
        access_token: API_TOKEN,
        expires_at: '2030-01-01T00:00:00.000Z',
        role: body.role,
        tenant_id: DEMO_TENANT_ID,
      });
    });
    const operator = await login('tenant_operator');
    const allowed = await proxyPost(
      request('/api/v1/demo/widget-session', {
        method: 'POST',
        headers: {
          Cookie: `${operator.sessionCookie}; ${operator.csrfCookie}`,
          'X-CSRF-Token': operator.csrfCookie.split('=')[1]!,
        },
        body: '{}',
      }),
      { params: { path: ['demo', 'widget-session'] } },
    );
    expect(allowed.status).not.toBe(403);

    resetDemoSessionsForTests();
    const approver = await login('marketing_approver');
    const denied = await proxyPost(
      request('/api/v1/demo/widget-session', {
        method: 'POST',
        headers: {
          Cookie: `${approver.sessionCookie}; ${approver.csrfCookie}`,
          'X-CSRF-Token': approver.csrfCookie.split('=')[1]!,
        },
        body: '{}',
      }),
      { params: { path: ['demo', 'widget-session'] } },
    );
    expect(denied.status).toBe(403);
  });

  it('requires same-origin CSRF for logout and clears cookies', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        access_token: API_TOKEN,
        expires_at: '2030-01-01T00:00:00.000Z',
        role: 'tenant_operator',
        tenant_id: DEMO_TENANT_ID,
      }))
      .mockResolvedValue(jsonResponse({ revoked: true }));
    const auth = await login();
    const response = await postLogout(request('/api/demo/logout', {
      method: 'POST',
      headers: {
        Cookie: `${auth.sessionCookie}; ${auth.csrfCookie}`,
        'X-CSRF-Token': auth.csrfCookie.split('=')[1]!,
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await response.text()).not.toContain(API_TOKEN);
  });
});

describe('tenant demo BFF session lookup', () => {
  it('forwards only the server-held bearer and projects safe API session data', async () => {
    const loginResult = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        access_token: API_TOKEN,
        expires_at: '2030-01-01T00:00:00.000Z',
        role: 'tenant_operator',
        tenant_id: DEMO_TENANT_ID,
      }),
    );
    const auth = await login();
    loginResult.mockResolvedValueOnce(jsonResponse({
      role: 'tenant_operator',
      tenant_id: DEMO_TENANT_ID,
      operator_id: 'operator-1',
      permissions: ['run:read'],
      access_token: API_TOKEN,
    }));

    const response = await getSession(request('/api/demo/session', {
      headers: { Cookie: `${auth.sessionCookie}; ${auth.csrfCookie}` },
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      role: 'tenant_operator',
      tenant_id: DEMO_TENANT_ID,
      operator_id: 'operator-1',
      permissions: ['run:read'],
    });
    expect(JSON.stringify(body)).not.toContain(API_TOKEN);
    expect(loginResult.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${API_TOKEN}` }),
    }));
  });

  it('does not proxy disallowed paths', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const response = await proxyGet(
      request('/api/v1/admin/credentials'),
      { params: { path: ['admin', 'credentials'] } },
    );
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
