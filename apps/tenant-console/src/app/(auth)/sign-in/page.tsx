'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type DemoRole = 'tenant_operator' | 'marketing_approver';


function csrfToken(): string | undefined {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('agentos_tenant_csrf='));
  if (!entry) return undefined;
  const raw = entry.slice('agentos_tenant_csrf='.length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function messageForError(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Sign-in failed. Check the role and password, then try again.';
  const record = value as Record<string, unknown>;
  const code = typeof record.error === 'string' ? record.error : '';
  if (code === 'DEMO_AUTH_UNAVAILABLE') return 'Demo sign-in is not available in this environment.';
  if (code === 'DEMO_AUTH_MISCONFIGURED') return 'Demo sign-in is not configured.';
  if (code === 'INVALID_CREDENTIALS' || code === 'LOGIN_FAILED') return 'The selected role or password was not accepted.';
  if (code === 'API_UNAVAILABLE') return 'The API is unavailable. Try again when it is running.';
  return typeof record.message === 'string' ? record.message : 'Sign-in failed. Please try again.';
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [role, setRole] = useState<DemoRole>('tenant_operator');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // The bootstrap response sets the readable CSRF cookie before any mutation.
        const response = await fetch('/api/demo/session', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        const payload = await readResponse(response);
        if (!cancelled && response.ok && (payload.role === 'tenant_operator' || payload.role === 'marketing_approver')) {
          router.replace(payload.role === 'marketing_approver' ? '/demo/campaigns' : '/demo/operations');
          return;
        }
      } catch {
        if (!cancelled) setError('Unable to reach the demo session service.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Keep the password only in this component state; it is never persisted or sent anywhere else.
      const bootstrap = await fetch('/api/demo/session', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (bootstrap.ok) {
        const existing = await readResponse(bootstrap);
        if (existing.role === 'tenant_operator' || existing.role === 'marketing_approver') {
          router.replace(existing.role === 'marketing_approver' ? '/demo/campaigns' : '/demo/operations');
          return;
        }
      }

      const token = csrfToken();
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'x-csrf-token': token } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ role, password }),
      });
      const payload = await readResponse(response);
      if (!response.ok) {
        setError(messageForError(payload));
        return;
      }
      setPassword('');
      router.replace(role === 'marketing_approver' ? '/demo/campaigns' : '/demo/operations');
    } catch {
      setError('Unable to reach the demo session service.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <section className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">NovaMart demo</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to the operator console</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Choose the role supplied by your local demo environment. Credentials stay server-side.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-rose-800/80 bg-rose-950/40 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={isLoading || isSubmitting} className="space-y-4">
              <legend className="text-sm font-medium text-slate-200">Role</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-lg border p-3 transition ${role === 'tenant_operator' ? 'border-sky-500 bg-sky-950/40' : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="role"
                    value="tenant_operator"
                    checked={role === 'tenant_operator'}
                    onChange={() => setRole('tenant_operator')}
                  />
                  <span className="block text-sm font-semibold">Tenant operator</span>
                  <span className="mt-1 block text-xs text-slate-400">Conversations, takeover, Customer 360</span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-3 transition ${role === 'marketing_approver' ? 'border-sky-500 bg-sky-950/40' : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="role"
                    value="marketing_approver"
                    checked={role === 'marketing_approver'}
                    onChange={() => setRole('marketing_approver')}
                  />
                  <span className="block text-sm font-semibold">Marketing approver</span>
                  <span className="mt-1 block text-xs text-slate-400">Review pending AUTH-4 campaign drafts</span>
                </label>
              </div>

              <div>
                <label htmlFor="demo-password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
                <input
                  id="demo-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  maxLength={512}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isLoading || isSubmitting || password.length === 0}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Checking session…' : isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
