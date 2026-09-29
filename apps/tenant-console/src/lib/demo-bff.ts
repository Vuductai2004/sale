import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const TENANT_SESSION_COOKIE = 'agentos_tenant_session';
export const TENANT_CSRF_COOKIE = 'agentos_tenant_csrf';
export const TENANT_CSRF_HEADER = 'x-csrf-token';
export const DEMO_SESSION_TTL_SECONDS = 30 * 60;
const DEMO_SESSION_TTL_MS = DEMO_SESSION_TTL_SECONDS * 1000;
const MAX_PROXY_BODY_BYTES = 1024 * 1024;

export const DEMO_TENANT_ID = '99999999-9999-4999-8999-999999999999';
export type DemoRole = 'tenant_operator' | 'marketing_approver';

export type DemoSession = {
  readonly apiToken: string;
  readonly role: DemoRole;
  readonly tenantId: string;
  readonly operatorId?: string;
  readonly expiresAt: string;
  csrfToken: string;
};

type SessionStore = Map<string, DemoSession>;

declare global {
  // Keep the in-process store stable across Next.js development module reloads.
  // The API token is never serialized into a cookie, response, or browser bundle.
  // eslint-disable-next-line no-var
  var __agentosTenantDemoSessions: SessionStore | undefined;
}

function sessionStore(): SessionStore {
  globalThis.__agentosTenantDemoSessions ??= new Map<string, DemoSession>();
  return globalThis.__agentosTenantDemoSessions;
}

export function resetDemoSessionsForTests(): void {
  sessionStore().clear();
}

export function isDemoEnabled(): boolean {
  return process.env.DEMO_MODE === 'true' && (process.env.APP_ENV === 'local' || process.env.APP_ENV === 'ci');
}

export function hasDemoCookieKey(): boolean {
  return Boolean(process.env.DEMO_COOKIE_HMAC_KEY?.trim());
}

export function apiBaseUrl(): string {
  const configured = process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) throw new Error('API_BASE_URL is not configured');

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('API_BASE_URL is invalid');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API_BASE_URL is invalid');
  }
  return configured.replace(/\/+$/, '');
}

export function apiV1Url(path: string): string {
  const base = apiBaseUrl();
  const suffix = path.replace(/^\/+/, '');
  return base.endsWith('/api/v1') ? `${base}/${suffix}` : `${base}/api/v1/${suffix}`;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function unavailableResponse(): Response {
  return jsonResponse({ error: 'DEMO_AUTH_UNAVAILABLE' }, 404);
}

export function configurationResponse(): Response {
  return jsonResponse({ error: 'DEMO_AUTH_MISCONFIGURED' }, 503);
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

function cookieValue(value: string): string {
  return encodeURIComponent(value);
}

function cookieAttributes(request: Request, maxAge: number, httpOnly: boolean): string {
  let secure = false;
  try {
    secure = new URL(request.url).protocol === 'https:';
  } catch {
    secure = false;
  }
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'https') secure = true;
  return [
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    'SameSite=Lax',
    httpOnly ? 'HttpOnly' : '',
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

export function appendSessionCookie(response: Response, request: Request, value: string, maxAge = DEMO_SESSION_TTL_SECONDS): void {
  response.headers.append(
    'set-cookie',
    `${TENANT_SESSION_COOKIE}=${cookieValue(value)}; ${cookieAttributes(request, maxAge, true)}`,
  );
}

export function appendCsrfCookie(response: Response, request: Request, value: string, maxAge = DEMO_SESSION_TTL_SECONDS): void {
  response.headers.append(
    'set-cookie',
    `${TENANT_CSRF_COOKIE}=${cookieValue(value)}; ${cookieAttributes(request, maxAge, false)}`,
  );
}

export function appendClearedCookies(response: Response, request: Request): void {
  appendSessionCookie(response, request, '', 0);
  appendCsrfCookie(response, request, '', 0);
}

function hmacKey(): Buffer {
  const configured = process.env.DEMO_COOKIE_HMAC_KEY?.trim();
  if (!configured) throw new Error('DEMO_COOKIE_HMAC_KEY is not configured');
  return Buffer.from(configured, 'utf8');
}

function signSessionId(id: string): string {
  return createHmac('sha256', hmacKey()).update(id).digest('base64url');
}

function equalSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function signedSessionValue(id: string): string {
  return `${id}.${signSessionId(id)}`;
}

function readSignedSessionId(request: Request): string | undefined {
  const value = getCookie(request, TENANT_SESSION_COOKIE);
  if (!value) return undefined;
  const separator = value.lastIndexOf('.');
  if (separator <= 0 || separator === value.length - 1) return undefined;
  const id = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  let expected: string;
  try {
    expected = signSessionId(id);
  } catch {
    return undefined;
  }
  return equalSecret(signature, expected) ? id : undefined;
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function expiresAtMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createDemoSession(input: {
  apiToken: string;
  role: DemoRole;
  tenantId: string;
  operatorId?: string;
  expiresAt: string;
  csrfToken?: string;
}): { cookieValue: string; session: DemoSession } {
  const backendExpiry = expiresAtMs(input.expiresAt);
  const cappedExpiry = Math.min(
    backendExpiry > Date.now() ? backendExpiry : Date.now() + DEMO_SESSION_TTL_MS,
    Date.now() + DEMO_SESSION_TTL_MS,
  );
  const session: DemoSession = {
    apiToken: input.apiToken,
    role: input.role,
    tenantId: input.tenantId,
    ...(input.operatorId ? { operatorId: input.operatorId } : {}),
    expiresAt: new Date(cappedExpiry).toISOString(),
    csrfToken: input.csrfToken || randomToken(24),
  };
  const id = randomToken(32);
  sessionStore().set(id, session);
  return { cookieValue: signedSessionValue(id), session };
}

export function getDemoSession(request: Request): DemoSession | undefined {
  const id = readSignedSessionId(request);
  if (!id) return undefined;
  const session = sessionStore().get(id);
  if (!session || expiresAtMs(session.expiresAt) <= Date.now()) {
    sessionStore().delete(id);
    return undefined;
  }
  return session;
}

export function deleteDemoSession(request: Request): void {
  const id = readSignedSessionId(request);
  if (id) sessionStore().delete(id);
}

export function rotateCsrfToken(session: DemoSession): string {
  session.csrfToken = randomToken(24);
  return session.csrfToken;
}

export function setSessionCookies(response: Response, request: Request, cookieValueForSession: string, session: DemoSession): void {
  const remainingSeconds = Math.max(1, Math.ceil((expiresAtMs(session.expiresAt) - Date.now()) / 1000));
  appendSessionCookie(response, request, cookieValueForSession, Math.min(DEMO_SESSION_TTL_SECONDS, remainingSeconds));
  appendCsrfCookie(response, request, session.csrfToken, Math.min(DEMO_SESSION_TTL_SECONDS, remainingSeconds));
}

export function ensureCsrfCookie(response: Response, request: Request, session?: DemoSession): string {
  const existing = getCookie(request, TENANT_CSRF_COOKIE);
  if (session) {
    if (existing && equalSecret(existing, session.csrfToken)) return existing;
    const rotated = rotateCsrfToken(session);
    appendCsrfCookie(response, request, rotated);
    return rotated;
  }
  if (existing) return existing;
  const generated = randomToken(24);
  appendCsrfCookie(response, request, generated);
  return generated;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let expected: string;
  try {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    expected = `${forwardedProto || url.protocol.slice(0, -1)}://${forwardedHost || url.host}`;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}

export function csrfValid(request: Request, session?: DemoSession): boolean {
  const cookie = getCookie(request, TENANT_CSRF_COOKIE);
  const header = request.headers.get(TENANT_CSRF_HEADER);
  if (!cookie || !header || !equalSecret(cookie, header)) return false;
  return session ? equalSecret(cookie, session.csrfToken) : true;
}

export function mutationGuard(request: Request, session?: DemoSession): Response | undefined {
  if (!sameOrigin(request)) return jsonResponse({ error: 'ORIGIN_MISMATCH' }, 403);
  if (!csrfValid(request, session)) return jsonResponse({ error: 'CSRF_INVALID' }, 403);
  return undefined;
}

export function unauthorizedResponse(): Response {
  return jsonResponse({ error: 'UNAUTHENTICATED' }, 401);
}

export function forbiddenResponse(): Response {
  return jsonResponse({ error: 'FORBIDDEN' }, 403);
}

export function isMutationMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function maxProxyBodyBytes(): number {
  return MAX_PROXY_BODY_BYTES;
}

export function safeSessionPayload(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const record = payload as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  if (typeof record.role === 'string') output.role = record.role;
  if (typeof record.tenant_id === 'string') output.tenant_id = record.tenant_id;
  if (typeof record.operator_id === 'string') output.operator_id = record.operator_id;
  if (Array.isArray(record.permissions) && record.permissions.every((item) => typeof item === 'string')) {
    output.permissions = record.permissions;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

export function backendErrorPayload(payload: unknown, fallback: string): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { error: fallback };
  const record = payload as Record<string, unknown>;
  const error = typeof record.error === 'object' && record.error !== null ? record.error as Record<string, unknown> : record;
  const code = typeof error.error_code === 'string' ? error.error_code : typeof error.code === 'string' ? error.code : fallback;
  const message = typeof error.message === 'string' ? error.message : fallback;
  return { error: code, message };
}

export function parseRole(value: unknown): DemoRole | undefined {
  return value === 'tenant_operator' || value === 'marketing_approver' ? value : undefined;
}

export function publicLoginPayload(session: DemoSession): Record<string, string> {
  return {
    role: session.role,
    tenant_id: session.tenantId,
    expires_at: session.expiresAt,
  };
}
