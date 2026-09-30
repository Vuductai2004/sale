'use client';

import { can, type AuthSession } from '@agentos/ui-foundation/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DemoBadge, StatusBadge } from '../ui/Primitives';

type PlatformSession = AuthSession;

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly demo?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Overview', description: 'Current tenant workspace' },
  { href: '/operations', label: 'Operations', description: 'Runs, inspection, retry' },
  { href: '/demo/readiness', label: 'Demo readiness', description: 'Scoped provider probes', demo: true },
  { href: '/analytics', label: 'Analytics', description: 'Telemetry availability' },
  { href: '/settings', label: 'Settings', description: 'Platform settings status' },
];

const UNAVAILABLE_ROWS = ['Organizations and fleet', 'Platform approvals', 'Billing and subscriptions'];

function pageLabel(pathname: string): string {
  if (pathname === '/') return 'Current tenant overview';
  if (pathname.startsWith('/operations')) return 'Operations hub';
  if (pathname.startsWith('/demo/readiness')) return 'Demo readiness';
  if (pathname.startsWith('/analytics')) return 'Analytics availability';
  if (pathname.startsWith('/settings')) return 'Settings availability';
  return 'Platform workspace';
}

function cookieToken(name: string): string {
  if (typeof document === 'undefined') return '';
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return '';
  }
}

function isValidPlatformSession(value: unknown): value is PlatformSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<PlatformSession>;
  return Boolean(
    candidate.identity && typeof candidate.identity.user_id === 'string' && candidate.identity.user_id.length > 0
    && candidate.membership && typeof candidate.membership.tenant_id === 'string' && candidate.membership.tenant_id.length > 0
    && Array.isArray(candidate.permissions) && typeof candidate.expires_at === 'string'
    && can(candidate as PlatformSession, 'platform:admin'),
  );
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

export function PlatformShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'signed_out'>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isValidPlatformSession(payload)) throw new Error('session unavailable');
        return payload;
      })
      .then((value) => {
        if (!active) return;
        setSession(value);
        setSessionState('ready');
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setSessionState('signed_out');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const visibleItems = useMemo(() => NAV_ITEMS, []);

  if (pathname === '/sign-in') return <>{children}</>;

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'x-csrf-token': cookieToken('agentos_platform_csrf') },
      });
    } finally {
      window.location.assign('/sign-in');
    }
  }

  return (
    <div className="app-shell" data-app="platform">
      <button type="button" aria-label="Close navigation" className={`fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm lg:hidden ${menuOpen ? 'block' : 'hidden'}`} onClick={() => setMenuOpen(false)} />
      <aside className="app-sidebar" data-open={menuOpen} aria-label="Platform navigation">
        <div className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 rounded-md text-ink focus-visible:outline-none" aria-label="AgentOS platform overview">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white" aria-hidden="true">A</span>
              <span><span className="block text-sm font-bold tracking-tight text-ink">AgentOS</span><span className="block text-[11px] text-muted">Platform operations</span></span>
            </Link>
            <button type="button" className="mobile-menu-button rounded-md p-2 text-muted" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><CloseIcon /></button>
          </div>

          <div className="mt-8 rounded-lg border border-line bg-surface-low p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Authority scope</p>
            <p className="mt-1 text-sm font-semibold text-ink">Current tenant only</p>
            <p className="mt-1 truncate font-mono text-xs text-muted" title={session?.membership.tenant_id}>{session?.membership.tenant_id ?? 'Sign in to identify'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">{session ? <DemoBadge /> : <StatusBadge label={sessionState === 'loading' ? 'Loading identity' : 'Not signed in'} tone={sessionState === 'loading' ? 'loading' : 'not-configured'} />}</div>
          </div>

          <nav className="mt-7 flex-1" aria-label="Platform sections">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Operations</p>
            <ul className="mt-2 space-y-1">{visibleItems.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return <li key={item.href}><Link href={item.href} aria-current={active ? 'page' : undefined} className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none ${active ? 'bg-brand-soft text-brand-deep' : 'text-ink-body hover:bg-surface-low hover:text-ink'}`}><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${active ? 'bg-brand' : 'bg-slate-300 group-hover:bg-brand'}`} aria-hidden="true" /><span className="min-w-0"><span className="block font-semibold">{item.label}{item.demo ? <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted">Demo</span> : null}</span><span className="mt-0.5 block truncate text-xs text-muted">{item.description}</span></span></Link></li>;
            })}</ul>

            <p className="mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Not integrated</p>
            <ul className="mt-2 space-y-1">{UNAVAILABLE_ROWS.map((label) => <li key={label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted"><span>{label}</span><span className="text-[10px] uppercase tracking-wide">Unavailable</span></li>)}</ul>
          </nav>

          <div className="border-t border-line pt-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-deep" aria-hidden="true">P</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">Platform administrator</p><p className="truncate text-xs text-muted">{session?.identity.user_id ?? 'Session-owned identity'}</p></div>{session ? <button type="button" className="rounded-md p-2 text-muted hover:bg-surface-low hover:text-ink focus-visible:outline-none" onClick={() => void logout()} disabled={loggingOut} aria-label="Sign out">{loggingOut ? '…' : '↗'}</button> : null}</div></div>
        </div>
      </aside>

      <div className="app-main"><header className="app-topbar" role="banner"><div className="flex min-w-0 items-center gap-3"><button type="button" className="mobile-menu-button rounded-md p-2 text-muted hover:bg-surface-low" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MenuIcon /></button><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{pageLabel(pathname)}</p><p className="hidden text-xs text-muted sm:block">Platform controls are bounded to the current tenant</p></div></div><div className="flex shrink-0 items-center gap-2 sm:gap-3">{session ? <DemoBadge /> : null}<span className="hidden text-xs font-medium text-muted sm:inline">{sessionState === 'ready' ? 'Signed in' : 'Session unavailable'}</span></div></header><main>{children}</main></div>
    </div>
  );
}
