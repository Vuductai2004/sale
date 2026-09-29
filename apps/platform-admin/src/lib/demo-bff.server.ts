import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const PLATFORM_SESSION_COOKIE = 'agentos_platform_session';
export const PLATFORM_CSRF_COOKIE = 'agentos_platform_csrf';
export const PLATFORM_ROLE = 'platform_admin' as const;
export const DEMO_SESSION_TTL_SECONDS = 30 * 60;
const MAX_PROXY_BODY_BYTES = 1_048_576;
const ALLOWED_APP_ENVS: Record<string, true> = { local: true, ci: true };

type FetchLike = typeof fetch;

export type DemoEnvironment = Record<string, string | undefined>;

export interface PlatformSessionContext {
  readonly role: typeof PLATFORM_ROLE;
  readonly tenant_id: string;
  readonly operator_id: string;
  readonly permissions: readonly string[];
  readonly expires_at?: string;
}

interface StoredSession {
  readonly apiToken: string;
  readonly csrfToken: string;
  readonly tenantId: string;
  readonly expiresAtMs: number;
}

interface ApiLoginResponse {
  readonly access_token?: unknown;
  readonly expires_at?: unknown;
  readonly role?: unknown;
  readonly tenant_id?: unknown;
}

const sessions = new Map<string, StoredSession>();

export function clearDemoSessionsForTests(): void {
  sessions.clear();
}

export function demoModeEnabled(env: DemoEnvironment = process.env): boolean {
  return env.DEMO_MODE === 'true' && Boolean(ALLOWED_APP_ENVS[env.APP_ENV ?? '']);
}

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  responseHeaders.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function demoGateResponse(env: DemoEnvironment = process.env): Response | null {
  return demoModeEnabled(env) ? null : jsonResponse({ error: 'NOT_FOUND' }, 404);
}

function upstreamBaseUrl(env: DemoEnvironment): URL | null {
  const raw = env.API_BASE_URL ?? (Boolean(ALLOWED_APP_ENVS[env.APP_ENV ?? '']) ? env.NEXT_PUBLIC_API_URL : undefined);
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return null;
    }
    const pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = pathname.endsWith('/api/v1') ? pathname.slice(0, -'/api/v1'.length) || '/' : pathname || '/';
    return parsed;
  } catch {
    return null;
  }
}

export function apiUrl(path: string, env: DemoEnvironment = process.env): string | null {
  const base = upstreamBaseUrl(env);
  if (!base || !path.startsWith('/')) return null;
  const root = base.pathname === '/' ? '' : base.pathname;
  return `${base.origin}${root}/api/v1${path}`;
}

function isHttpsRequest(request: Request): boolean {
  if (new URL(request.url).protocol === 'https:') return true;
  return request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() === 'https';
}

function expectedOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost && forwardedProto && (forwardedProto === 'http' || forwardedProto === 'https')) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin !== 'null' && origin === expectedOrigin(request);
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function cookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const pair of raw.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function cookieSignature(sessionId: string, env: DemoEnvironment): string | null {
  const key = env.DEMO_COOKIE_HMAC_KEY;
  if (!key || key.length < 16) return null;
  return createHmac('sha256', key).update(sessionId).digest('hex');
}

function sessionCookieValue(sessionId: string, env: DemoEnvironment): string | null {
  const signature = cookieSignature(sessionId, env);
  return signature ? `${sessionId}.${signature}` : null;
}

function storedSession(request: Request, env: DemoEnvironment): { id: string; session: StoredSession } | null {
  const raw = cookieValue(request, PLATFORM_SESSION_COOKIE);
  if (!raw) return null;
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;
  const id = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = cookieSignature(id, env);
  if (!expected || !constantTimeEqual(signature, expected)) return null;

  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAtMs <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return { id, session };
}

function cookieString(name: string, value: string, options: { httpOnly: boolean; secure: boolean; maxAge: number }): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${options.maxAge}`,
    'SameSite=Lax',
  ];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

function clearCookieString(name: string, secure: boolean): string {
  return cookieString(name, '', { httpOnly: name === PLATFORM_SESSION_COOKIE, secure, maxAge: 0 });
}

export function sessionCookies(request: Request, sessionId: string, csrfToken: string, env: DemoEnvironment = process.env): string[] {
  const sessionValue = sessionCookieValue(sessionId, env);
  if (!sessionValue) throw new Error('DEMO_COOKIE_HMAC_KEY_REQUIRED');
  const secure = isHttpsRequest(request);
  return [
    cookieString(PLATFORM_SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure,
      maxAge: DEMO_SESSION_TTL_SECONDS,
    }),
    cookieString(PLATFORM_CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure,
      maxAge: DEMO_SESSION_TTL_SECONDS,
    }),
  ];
}

export function clearSessionCookies(request: Request): string[] {
  const secure = isHttpsRequest(request);
  return [clearCookieString(PLATFORM_SESSION_COOKIE, secure), clearCookieString(PLATFORM_CSRF_COOKIE, secure)];
}

function withSetCookies(response: Response, cookies: readonly string[]): Response {
  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function jsonWithCookies(body: unknown, status: number, cookies: readonly string[]): Response {
  return withSetCookies(jsonResponse(body, status), cookies);
}

function authHeaders(token: string): Headers {
  const headers = new Headers({ accept: 'application/json', authorization: `Bearer ${token}` });
  return headers;
}

async function responseJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await response.json();
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseApiSession(value: Record<string, unknown> | null): PlatformSessionContext | null {
  if (
    !value ||
    value.role !== PLATFORM_ROLE ||
    typeof value.tenant_id !== 'string' ||
    value.tenant_id.length === 0 ||
    typeof value.operator_id !== 'string' ||
    value.operator_id.length === 0
  ) return null;
  const permissions = value.permissions;
  if (!Array.isArray(permissions) || permissions.some((permission) => typeof permission !== 'string')) return null;
  return {
    role: PLATFORM_ROLE,
    tenant_id: value.tenant_id,
    operator_id: value.operator_id,
    permissions: permissions as string[],
    ...(typeof value.expires_at === 'string' ? { expires_at: value.expires_at } : {}),
  };
}

async function verifyApiSession(session: StoredSession, env: DemoEnvironment, fetchImpl: FetchLike): Promise<PlatformSessionContext | null> {
  const url = apiUrl('/demo/session', env);
  if (!url) return null;
  try {
    const response = await fetchImpl(url, { method: 'GET', headers: authHeaders(session.apiToken), cache: 'no-store' });
    if (!response.ok) return null;
    return parseApiSession(await responseJson(response));
  } catch {
    return null;
  }
}

function createSession(api: ApiLoginResponse, env: DemoEnvironment): { id: string; csrfToken: string; session: StoredSession } | null {
  if (
    typeof api.access_token !== 'string' || api.access_token.length === 0 ||
    api.role !== PLATFORM_ROLE || typeof api.tenant_id !== 'string' || api.tenant_id.length === 0
  ) return null;

  const id = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const parsedExpiry = typeof api.expires_at === 'string' ? Date.parse(api.expires_at) : Number.NaN;
  const expiresAtMs = Number.isFinite(parsedExpiry)
    ? Math.min(parsedExpiry, Date.now() + DEMO_SESSION_TTL_SECONDS * 1000)
    : Date.now() + DEMO_SESSION_TTL_SECONDS * 1000;
  if (expiresAtMs <= Date.now()) return null;

  const session: StoredSession = {
    apiToken: api.access_token,
    csrfToken,
    tenantId: api.tenant_id,
    expiresAtMs,
  };
  if (!cookieSignature(id, env)) return null;
  sessions.set(id, session);
  return { id, csrfToken, session };
}

async function requestJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.clone().json();
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function mutationProtection(
  request: Request,
  session: StoredSession | null,
  requireCsrf: boolean,
  requireOrigin = requireCsrf,
): Response | null {
  if (requireOrigin && !hasSameOrigin(request)) return jsonResponse({ error: 'CROSS_ORIGIN' }, 403);
  if (!requireCsrf) return null;
  if (!session) return jsonResponse({ error: 'UNAUTHENTICATED' }, 401);
  const header = request.headers.get('x-csrf-token');
  const cookie = cookieValue(request, PLATFORM_CSRF_COOKIE);
  if (!header || !cookie || !constantTimeEqual(header, cookie) || !constantTimeEqual(header, session.csrfToken)) {
    return jsonResponse({ error: 'CSRF_FAILED' }, 403);
  }
  return null;
}

export async function loginDemoPlatformAdmin(
  request: Request,
  env: DemoEnvironment = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const gate = demoGateResponse(env);
  if (gate) return gate;
  const protection = mutationProtection(request, null, false, true);
  if (protection) return protection;

  const body = await requestJson(request);
  if (!body) return jsonResponse({ error: 'INVALID_LOGIN' }, 400);
  if (body.role !== PLATFORM_ROLE) return jsonResponse({ error: 'ROLE_FORBIDDEN' }, 403);
  if (typeof body.password !== 'string' || body.password.length === 0 || body.password.length > 512) {
    return jsonResponse({ error: 'INVALID_LOGIN' }, 400);
  }
  const url = apiUrl('/demo/login', env);
  if (!url) return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 503);

  let upstream: Response;
  try {
    upstream = await fetchImpl(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ role: PLATFORM_ROLE, password: body.password }),
      cache: 'no-store',
    });
  } catch {
    return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 503);
  }
  if (!upstream.ok) return jsonResponse({ error: upstream.status === 401 || upstream.status === 403 ? 'AUTHENTICATION_FAILED' : 'DEMO_UNAVAILABLE' }, upstream.status === 401 || upstream.status === 403 ? 401 : 502);

  const api = await responseJson(upstream) as ApiLoginResponse | null;
  if (!api) return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 502);
  const created = createSession(api, env);
  if (!created) return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 502);

  const expiresAt = typeof api.expires_at === 'string' ? api.expires_at : new Date(created.session.expiresAtMs).toISOString();
  return jsonWithCookies({ role: PLATFORM_ROLE, tenant_id: created.session.tenantId, expires_at: expiresAt }, 200, sessionCookies(request, created.id, created.csrfToken, env));
}

export async function readDemoPlatformSession(
  request: Request,
  env: DemoEnvironment = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const gate = demoGateResponse(env);
  if (gate) return gate;
  const found = storedSession(request, env);
  if (!found) return jsonWithCookies({ error: 'UNAUTHENTICATED' }, 401, clearSessionCookies(request));
  const context = await verifyApiSession(found.session, env, fetchImpl);
  if (!context || context.role !== PLATFORM_ROLE || context.tenant_id !== found.session.tenantId) {
    sessions.delete(found.id);
    return jsonWithCookies({ error: 'UNAUTHENTICATED' }, 401, clearSessionCookies(request));
  }
  return jsonResponse(context, 200);
}

export async function logoutDemoPlatformAdmin(
  request: Request,
  env: DemoEnvironment = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const gate = demoGateResponse(env);
  if (gate) return gate;
  const found = storedSession(request, env);
  const protection = mutationProtection(request, found?.session ?? null, true);
  if (protection) return protection;
  if (!found) return jsonWithCookies({ error: 'UNAUTHENTICATED' }, 401, clearSessionCookies(request));

  const url = apiUrl('/demo/logout', env);
  if (url) {
    try {
      await fetchImpl(url, { method: 'POST', headers: authHeaders(found.session.apiToken), cache: 'no-store' });
    } catch {
      // The local credential is still revoked even if the upstream logout is unavailable.
    }
  }
  sessions.delete(found.id);
  return jsonWithCookies({ ok: true }, 200, clearSessionCookies(request));
}

function normalizeProxyPath(path: string): string | null {
  if (!path || path.includes('\\') || path.includes('..') || path.includes('//')) return null;
  const normalized = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized || null;
}

export function isAllowedProxyPath(method: string, rawPath: string): boolean {
  const path = normalizeProxyPath(rawPath);
  if (!path) return false;
  const upperMethod = method.toUpperCase();
  if (upperMethod === 'GET') {
    return path === 'runs'
      || path === 'demo/readiness'
      || path === 'admin/tenants/current'
      || path === 'admin/autonomy'
      || path === 'telemetry/kpi-snapshot'
      || /^runs\/[A-Za-z0-9._:-]+\/trace$/.test(path);
  }
  if (upperMethod === 'POST') {
    return path === 'admin/autonomy/pause' || path === 'admin/autonomy/resume' || path === 'admin/autonomy/demote' || /^operations\/runs\/[A-Za-z0-9._:-]+\/retry$/.test(path);
  }
  return false;
}

function forwardedHeaders(request: Request, token: string): Headers {
  const headers = new Headers({ accept: request.headers.get('accept') ?? 'application/json', authorization: `Bearer ${token}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);
  const correlationId = request.headers.get('x-correlation-id');
  if (correlationId) headers.set('x-correlation-id', correlationId);
  return headers;
}

function proxyResponse(upstream: Response): Response {
  const headers = new Headers();
  for (const name of ['content-type', 'cache-control', 'x-correlation-id', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}

export async function proxyDemoPlatformApi(
  request: Request,
  rawPath: string,
  env: DemoEnvironment = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const gate = demoGateResponse(env);
  if (gate) return gate;
  const method = request.method.toUpperCase();
  const path = normalizeProxyPath(rawPath);
  if (!path || !isAllowedProxyPath(method, path)) return jsonResponse({ error: 'NOT_FOUND' }, 404);

  const found = storedSession(request, env);
  if (!found) return jsonResponse({ error: 'UNAUTHENTICATED' }, 401);
  const protection = mutationProtection(request, found.session, method !== 'GET');
  if (protection) return protection;
  const context = await verifyApiSession(found.session, env, fetchImpl);
  if (!context || context.role !== PLATFORM_ROLE || context.tenant_id !== found.session.tenantId) {
    sessions.delete(found.id);
    return withSetCookies(jsonResponse({ error: 'UNAUTHENTICATED' }, 401), clearSessionCookies(request));
  }

  const url = apiUrl(`/${path}`, env);
  if (!url) return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 503);
  const target = new URL(url);
  target.search = new URL(request.url).search;
  const headers = forwardedHeaders(request, found.session.apiToken);
  const init: RequestInit = { method, headers, cache: 'no-store' };
  if (method !== 'GET' && method !== 'HEAD') {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BODY_BYTES) return jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_PROXY_BODY_BYTES) return jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(target.toString(), init);
  } catch {
    return jsonResponse({ error: 'DEMO_UNAVAILABLE' }, 502);
  }
  return proxyResponse(upstream);
}