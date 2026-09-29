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
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-xl sm:p-8" aria-labelledby="sign-in-title">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
          AgentOS Platform Admin
        </div>
        <h1 id="sign-in-title" className="mt-6 text-2xl font-semibold tracking-tight text-slate-100">Sign in to demo operations</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use the server-managed platform administrator credential to inspect redacted NovaMart readiness and run traces.</p>

        {loading ? <p role="status" className="mt-6 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">Checking demo availability…</p> : null}
        {message ? <p role="alert" className={`mt-6 rounded-md border p-3 text-sm ${unavailable ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-rose-900 bg-rose-950/40 text-rose-200'}`}>{message}</p> : null}

        {!unavailable ? (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="platform-password" className="text-sm font-medium text-slate-300">Platform admin password</label>
              <input id="platform-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={loading || submitting} className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50" />
            </div>
            <button type="submit" disabled={loading || submitting || password.length === 0} className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{submitting ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : null}

        <p className="mt-6 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">Demo credentials stay server-side. This view never stores or exposes API bearer tokens.</p>
      </section>
    </main>
  );
}
