import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthSession } from '@agentos/ui-foundation/auth';

export const PLATFORM_SESSION_COOKIE = 'agentos_platform_session';
export const PLATFORM_CSRF_COOKIE = 'agentos_platform_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const SESSION_TTL_SECONDS = 30 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

export type AuthEnvironment = Record<string, string | undefined>;

export interface StoredAuthSession {
  readonly apiToken: string;
  readonly csrfToken: string;
  readonly identityId: string;
  readonly expiresAtMs: number;
  authSession: AuthSession;
}

interface SessionCookieParts {
  readonly id: string;
  readonly expiresAtSec: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __agentosPlatformAuthSessions: Map<string, StoredAuthSession> | undefined;
}

function sessionStore(): Map<string, StoredAuthSession> {
  globalThis.__agentosPlatformAuthSessions ??= new Map<string, StoredAuthSession>();
  return globalThis.__agentosPlatformAuthSessions;
}

export function clearSessionsForTests(): void {
  sessionStore().clear();
}

export function cookieHmacKey(env: AuthEnvironment = process.env): Buffer | null {
  const raw = env.PLATFORM_COOKIE_HMAC_KEY;
  if (!raw || Buffer.byteLength(raw, 'utf8') < 32) return null;
  return Buffer.from(raw, 'utf8');
}

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSessionCookie(sessionId: string, expiresAtSec: number, env: AuthEnvironment = process.env): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId) || !Number.isSafeInteger(expiresAtSec) || expiresAtSec <= 0) return null;
  const key = cookieHmacKey(env);
  if (!key) return null;
  const payload = `v1.${sessionId}.${expiresAtSec}`;
  const hmac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

export function verifySessionCookie(value: string, env: AuthEnvironment = process.env, nowSec = Math.floor(Date.now() / 1000)): SessionCookieParts | null {
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const [, id, rawExpiry, signature] = parts;
  if (typeof id !== 'string' || typeof rawExpiry !== 'string' || typeof signature !== 'string' || !/^\d+$/.test(rawExpiry)) return null;
  const expiresAtSec = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAtSec) || expiresAtSec <= nowSec) return null;
  const expected = signSessionCookie(id, expiresAtSec, env);
  if (!expected || !equalSecret(signature, expected.slice(expected.lastIndexOf('.') + 1))) return null;
  return { id, expiresAtSec };
}

export function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const item of raw.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function getSessionCookie(request: Request, env: AuthEnvironment = process.env): SessionCookieParts | null {
  const value = getCookie(request, PLATFORM_SESSION_COOKIE);
  return value ? verifySessionCookie(value, env) : null;
}

export function sweepExpiredSessions(nowMs = Date.now()): void {
  for (const [id, session] of sessionStore()) {
    if (session.expiresAtMs <= nowMs) sessionStore().delete(id);
  }
}

export function revokeSessionsForIdentity(identityId: string): StoredAuthSession[] {
  const revoked: StoredAuthSession[] = [];
  for (const [id, session] of sessionStore()) {
    if (session.identityId === identityId) {
      revoked.push(session);
      sessionStore().delete(id);
    }
  }
  return revoked;
}

export function createStoredSession(input: {
  readonly apiToken: string;
  readonly authSession: AuthSession;
  readonly csrfToken?: string;
  readonly nowMs?: number;
}, env: AuthEnvironment = process.env): { id: string; cookieValue: string; session: StoredAuthSession } | null {
  sweepExpiredSessions(input.nowMs);
  const nowMs = input.nowMs ?? Date.now();
  const requestedExpiry = Date.parse(input.authSession.expires_at);
  if (!Number.isFinite(requestedExpiry) || requestedExpiry <= nowMs) return null;
  const expiresAtMs = Math.min(requestedExpiry, nowMs + SESSION_TTL_MS);
  if (expiresAtMs <= nowMs || !cookieHmacKey(env)) return null;
  const id = randomBytes(32).toString('base64url');
  const expiresAtSec = Math.floor(expiresAtMs / 1000);
  const cookieValue = signSessionCookie(id, expiresAtSec, env);
  if (!cookieValue) return null;
  const session: StoredAuthSession = {
    apiToken: input.apiToken,
    csrfToken: input.csrfToken ?? randomBytes(32).toString('base64url'),
    identityId: input.authSession.identity.user_id,
    expiresAtMs,
    authSession: input.authSession,
  };
  sessionStore().set(id, session);
  return { id, cookieValue, session };
}

export function readStoredSession(request: Request, env: AuthEnvironment = process.env): { id: string; session: StoredAuthSession } | null {
  const parts = getSessionCookie(request, env);
  if (!parts) return null;
  const session = sessionStore().get(parts.id);
  if (!session || session.expiresAtMs <= Date.now() || Math.floor(session.expiresAtMs / 1000) !== parts.expiresAtSec) {
    sessionStore().delete(parts.id);
    return null;
  }
  return { id: parts.id, session };
}

export function deleteStoredSession(request: Request, env: AuthEnvironment = process.env): StoredAuthSession | null {
  const parts = getSessionCookie(request, env);
  if (!parts) return null;
  const session = sessionStore().get(parts.id) ?? null;
  sessionStore().delete(parts.id);
  return session;
}

function isSecureRequest(request: Request): boolean {
  try {
    if (new URL(request.url).protocol === 'https:') return true;
  } catch {
    // The framework supplies an absolute URL; keep the insecure default for malformed test requests.
  }
  return request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() === 'https';
}

function cookieString(name: string, value: string, request: Request, httpOnly: boolean, maxAge: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `Max-Age=${Math.max(0, Math.floor(maxAge))}`, 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (isSecureRequest(request)) parts.push('Secure');
  return parts.join('; ');
}

export function sessionCookieHeaders(request: Request, created: { cookieValue: string; session: StoredAuthSession }): string[] {
  const maxAge = Math.max(1, Math.ceil((created.session.expiresAtMs - Date.now()) / 1000));
  return [
    cookieString(PLATFORM_SESSION_COOKIE, created.cookieValue, request, true, maxAge),
    cookieString(PLATFORM_CSRF_COOKIE, created.session.csrfToken, request, false, maxAge),
  ];
}

export function clearSessionCookieHeaders(request: Request): string[] {
  return [
    cookieString(PLATFORM_SESSION_COOKIE, '', request, true, 0),
    cookieString(PLATFORM_CSRF_COOKIE, '', request, false, 0),
  ];
}

export function csrfCookieHeader(request: Request, token: string, maxAge = SESSION_TTL_SECONDS): string {
  return cookieString(PLATFORM_CSRF_COOKIE, token, request, false, maxAge);
}
export function expiredSessionCookieHeaders(request: Request): string[] {
  return [...clearSessionCookieHeaders(request), csrfCookieHeader(request, randomBytes(32).toString('base64url'))];
}

export function ensureCsrfCookie(request: Request, rotate = false): string {
  if (rotate) return randomBytes(32).toString('base64url');
  return getCookie(request, PLATFORM_CSRF_COOKIE) ?? randomBytes(32).toString('base64url');
}

function expectedOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (host && (proto === 'http' || proto === 'https')) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin !== 'null' && origin === expectedOrigin(request));
}

export function csrfValid(request: Request, session?: StoredAuthSession | null): boolean {
  const cookie = getCookie(request, PLATFORM_CSRF_COOKIE);
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header || !equalSecret(cookie, header)) return false;
  return session ? equalSecret(cookie, session.csrfToken) : true;
}

export function mutationProtection(request: Request, session?: StoredAuthSession | null): Response | null {
  if (!sameOrigin(request)) return jsonResponse({ error: 'CROSS_ORIGIN' }, 403);
  if (!csrfValid(request, session)) return jsonResponse({ error: 'CSRF_FAILED' }, 403);
  return null;
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  responseHeaders.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function sessionCookieHeadersForResult(request: Request, result: { readonly cookieValue: string; readonly csrfToken: string; readonly expiresAt: string }): string[] {
  const expiresAtMs = Date.parse(result.expiresAt);
  const maxAge = Number.isFinite(expiresAtMs) ? Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000)) : SESSION_TTL_SECONDS;
  return [
    cookieString(PLATFORM_SESSION_COOKIE, result.cookieValue, request, true, maxAge),
    cookieString(PLATFORM_CSRF_COOKIE, result.csrfToken, request, false, maxAge),
  ];
}

export function withSetCookies(response: Response, cookies: readonly string[]): Response {
  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
