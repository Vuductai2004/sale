'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNext } from '@agentos/ui-foundation/auth';
import { AuthRequestError, tenantConsoleClient } from '../../../lib/tenant-console-client';

function messageForError(value: unknown): string {
  if (value instanceof AuthRequestError && value.status === 429) return 'Quá nhiều lần thử. Vui lòng thử lại sau.';
  return 'Email hoặc mật khẩu không đúng.';
}


function AuthPageContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const expired = searchParams.get('reason') === 'expired';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await tenantConsoleClient.signIn(email.trim(), password);
      setPassword('');
      window.location.replace(next);
    } catch (reason: unknown) {
      setError(messageForError(reason));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <section className="ui-section-card w-full p-6 shadow-lg sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Đăng nhập</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Sử dụng email và mật khẩu tài khoản của bạn.</p>
            {expired && <p role="status" className="mt-3 text-sm text-amber-700">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>}
          </div>

          {error && (
            <div role="alert" className="ui-state ui-state--error mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={320}
                  className="ui-input"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  maxLength={512}
                  className="ui-input"
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isSubmitting || email.trim().length === 0 || password.length === 0}
              className="ui-button ui-button--primary w-full"
            >
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </section>
      </div>
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
