import {
  apiV1Url,
  appendClearedCookies,
  backendErrorPayload,
  configurationResponse,
  createDemoSession,
  deleteDemoSession,
  ensureCsrfCookie,
  getDemoSession,
  hasDemoCookieKey,
  isDemoEnabled,
  jsonResponse,
  mutationGuard,
  parseRole,
  publicLoginPayload,
  safeSessionPayload,
  setSessionCookies,
  unavailableResponse,
  DEMO_TENANT_ID,
} from '../../../../lib/demo-bff';

const MAX_PASSWORD_LENGTH = 512;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

async function readBackendJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function backendHeaders(token?: string): HeadersInit {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(request: Request): Promise<Response> {
  if (!isDemoEnabled()) return unavailableResponse();
  if (!hasDemoCookieKey()) return configurationResponse();

  const session = getDemoSession(request);
  if (!session) {
    const response = jsonResponse({ error: 'UNAUTHENTICATED' }, 401);
    ensureCsrfCookie(response, request);
    return response;
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiV1Url('/demo/session'), {
      method: 'GET',
      headers: backendHeaders(session.apiToken),
      redirect: 'manual',
    });
  } catch {
    return jsonResponse({ error: 'API_UNAVAILABLE' }, 502);
  }

  const payload = await readBackendJson(upstream);
  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) {
      deleteDemoSession(request);
      const cleared = jsonResponse(backendErrorPayload(payload, 'UNAUTHENTICATED'), upstream.status);
      appendClearedCookies(cleared, request);
      return cleared;
    }
    return jsonResponse(backendErrorPayload(payload, 'SESSION_LOOKUP_FAILED'), upstream.status);
  }

  const safe = safeSessionPayload(payload);
  if (!safe || safe.tenant_id !== DEMO_TENANT_ID || !parseRole(safe.role)) {
    return jsonResponse({ error: 'INVALID_SESSION_RESPONSE' }, 502);
  }
  const response = jsonResponse(safe);
  ensureCsrfCookie(response, request, session);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  if (!isDemoEnabled()) return unavailableResponse();
  if (!hasDemoCookieKey()) return configurationResponse();

  const guard = mutationGuard(request);
  if (guard) return guard;

  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse({ error: 'INVALID_REQUEST' }, 400);
  }
  const record = body as Record<string, unknown>;
  const role = parseRole(record.role);
  const password = typeof record.password === 'string' ? record.password : undefined;
  if (!role || !password || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return jsonResponse({ error: 'INVALID_CREDENTIALS' }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiV1Url('/demo/login'), {
      method: 'POST',
      headers: { ...backendHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ role, password }),
      redirect: 'manual',
    });
  } catch {
    return jsonResponse({ error: 'API_UNAVAILABLE' }, 502);
  }

  const payload = await readBackendJson(upstream);
  if (!upstream.ok) return jsonResponse(backendErrorPayload(payload, 'LOGIN_FAILED'), upstream.status);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse({ error: 'INVALID_LOGIN_RESPONSE' }, 502);
  }

  const responsePayload = payload as Record<string, unknown>;
  const accessToken = typeof responsePayload.access_token === 'string' ? responsePayload.access_token : undefined;
  const tenantId = typeof responsePayload.tenant_id === 'string' ? responsePayload.tenant_id : undefined;
  const expiresAt = typeof responsePayload.expires_at === 'string' ? responsePayload.expires_at : undefined;
  const backendRole = parseRole(responsePayload.role);
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
  if (
    !accessToken ||
    tenantId !== DEMO_TENANT_ID ||
    !expiresAt ||
    !Number.isFinite(expiresMs) ||
    expiresMs <= Date.now() ||
    backendRole !== role
  ) {
    return jsonResponse({ error: 'INVALID_LOGIN_RESPONSE' }, 502);
  }

  const created = createDemoSession({
    apiToken: accessToken,
    role,
    tenantId,
    expiresAt,
  });
  const response = jsonResponse(publicLoginPayload(created.session), 200);
  setSessionCookies(response, request, created.cookieValue, created.session);
  return response;
}
