'use client';

import { useEffect, useState, type FormEvent } from 'react';

const ROLE = 'platform_admin';

type ViewState = 'loading' | 'ready' | 'disabled' | 'signed_in' | 'error' | 'permission';

function responseError(status: number, payload: unknown): string {
  let code = '';
  if (payload !== null && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') code = payload.error;
  if (status === 404 || code === 'NOT_FOUND') return 'Demo mode is not available in this environment.';
  if (status === 403 || code === 'ROLE_FORBIDDEN' || code === 'PERMISSION_DENIED') return 'This account is not permitted to sign in as a platform administrator.';
  if (status === 401 || code === 'AUTHENTICATION_FAILED') return 'The password was not accepted.';
  if (status >= 500) return 'The demo authentication service is unavailable.';
  return 'Sign-in could not be completed.';
}

async function jsonPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function AuthPage() {
  const [password, setPassword] = useState('');
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/demo/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => ({ response, payload: await jsonPayload(response) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (response.ok && payload !== null && typeof payload === 'object' && 'role' in payload && payload.role === ROLE) {
          setViewState('signed_in');
          window.location.assign('/demo/readiness');
          return;
        }
        if (response.status === 404) {
          setViewState('disabled');
          setMessage('Demo mode is not available in this environment.');
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
        setMessage('The demo authentication service is unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length === 0 || submitting || viewState === 'disabled') return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: ROLE, password }),
      });
      const payload = await jsonPayload(response);
      if (!response.ok) {
        setViewState(response.status === 404 ? 'disabled' : response.status === 403 ? 'permission' : 'error');
        setMessage(responseError(response.status, payload));
        return;
      }
      setViewState('signed_in');
      window.location.assign('/demo/readiness');
    } catch {
      setViewState('error');
      setMessage('The demo authentication service is unavailable.');
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
        <h1 id="sign-in-title" className="mt-6 text-2xl font-semibold tracking-tight text-ink">Sign in to demo operations</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Use the server-managed platform administrator credential to inspect redacted NovaMart readiness and run traces.</p>

        {loading ? <p role="status" className="ui-state ui-state--loading mt-6">Checking demo availability…</p> : null}
        {message ? <p role="alert" className={`ui-state mt-6 ${unavailable ? 'ui-state--blocked' : 'ui-state--error'}`}>{message}</p> : null}

        {!unavailable ? (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="platform-password" className="text-sm font-medium text-ink">Platform admin password</label>
              <input id="platform-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={loading || submitting} className="ui-input mt-2" />
            </div>
            <button type="submit" disabled={loading || submitting || password.length === 0} className="ui-button ui-button--primary w-full">{submitting ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : null}

        <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">Demo credentials stay server-side. This view never stores or exposes API bearer tokens.</p>
      </section>
    </main>
  );
}
