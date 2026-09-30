'use client';

import { can, safeNext, type AuthSession } from '@agentos/ui-foundation/auth';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
type ViewState = 'loading' | 'ready' | 'disabled' | 'signed_in' | 'error' | 'permission';

function responseError(status: number, payload: unknown): string {
  const code = payload !== null && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
    ? payload.error
    : '';
  if (status === 404 || code === 'NOT_FOUND') return 'Sign-in is not available in this environment.';
  if (status === 403 || code === 'PERMISSION_DENIED') return 'This account is not permitted to sign in to platform operations.';
  if (status === 401 || code === 'AUTHENTICATION_FAILED') return 'The email or password was not accepted.';
  if (status === 429 || code === 'TOO_MANY_ATTEMPTS') return 'Too many attempts. Please wait and try again.';
  if (status >= 500) return 'The authentication service is unavailable.';
  return 'Sign-in could not be completed.';
}

async function jsonPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isPlatformSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<AuthSession>;
  return Boolean(candidate.identity && candidate.membership && Array.isArray(candidate.permissions) && typeof candidate.expires_at === 'string' && can(candidate as AuthSession, 'platform:admin'));
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const expired = searchParams.get('reason') === 'expired';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [message, setMessage] = useState<string | null>(expired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(async (response) => ({ response, payload: await jsonPayload(response) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (response.ok && isPlatformSession(payload)) {
          setViewState('signed_in');
          window.location.assign(next);
          return;
        }
        if (response.status === 404) {
          setViewState('disabled');
          setMessage(responseError(response.status, payload));
          return;
        }
        if (response.status === 403) {
          setViewState('permission');
          setMessage(responseError(response.status, payload));
          return;
        }
        if (response.status >= 500) {
          setViewState('error');
          setMessage(responseError(response.status, payload));
          return;
        }
        setViewState('ready');
      })
      .catch(() => {
        if (!active) return;
        setViewState('error');
        setMessage('The authentication service is unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password || submitting || viewState === 'disabled') return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'content-type': 'application/json', 'x-csrf-token': readCsrfToken() },
        body: JSON.stringify({ email, password }),
      });
      const payload = await jsonPayload(response);
      if (!response.ok) {
        setViewState(response.status === 404 ? 'disabled' : response.status === 403 ? 'permission' : 'error');
        setMessage(responseError(response.status, payload));
        return;
      }
      setPassword('');
      setViewState('signed_in');
      window.location.assign(next);
    } catch {
      setViewState('error');
      setMessage('The authentication service is unavailable.');
    } finally {
      setSubmitting(false);
    }
  };

  const unavailable = viewState === 'disabled';
  const loading = viewState === 'loading';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink sm:px-6">
      <section className="ui-section-card w-full max-w-md p-6 shadow-lg sm:p-8" aria-labelledby="sign-in-title">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          AgentOS Platform Admin
          <span className="ui-status ui-status--demo-only">Demo only</span>
        </div>
        <h1 id="sign-in-title" className="mt-6 text-2xl font-semibold tracking-tight text-ink">Sign in to platform operations</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Use your account credentials to access platform operations.</p>

        {loading ? <p role="status" className="ui-state ui-state--loading mt-6">Checking session…</p> : null}
        {message ? <p role="alert" className={`ui-state mt-6 ${unavailable ? 'ui-state--blocked' : 'ui-state--error'}`}>{message}</p> : null}

        {!unavailable ? (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="platform-email" className="text-sm font-medium text-ink">Email</label>
              <input id="platform-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required disabled={loading || submitting} className="ui-input mt-2" />
            </div>
            <div>
              <label htmlFor="platform-password" className="text-sm font-medium text-ink">Mật khẩu</label>
              <input id="platform-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loading || submitting} className="ui-input mt-2" />
            </div>
            <button type="submit" disabled={loading || submitting || !email.trim() || !password} className="ui-button ui-button--primary w-full">{submitting ? 'Signing in…' : 'Đăng nhập'}</button>
          </form>
        ) : null}

        <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">Credentials stay server-side. This view never stores or exposes API bearer tokens.</p>
      </section>
    </main>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" aria-busy="true" />}>
      <AuthPageContent />
    </Suspense>
  );
}

function readCsrfToken(): string {
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('agentos_platform_csrf='));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice('agentos_platform_csrf='.length));
  } catch {
    return '';
  }
}
