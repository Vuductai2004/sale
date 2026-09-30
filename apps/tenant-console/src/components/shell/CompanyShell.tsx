'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { can, canAny, type AuthSession, type Permission } from '@agentos/ui-foundation/auth';
import { tenantConsoleClient } from '../../lib/tenant-console-client';
import { DemoBadge, StatusBadge } from '../ui/Primitives';

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly permission?: Permission;
  readonly permissions?: readonly Permission[];
  readonly demo?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Overview', description: 'Company snapshot' },
  { href: '/takeover', label: 'Customer care', description: 'Conversations and takeover', permission: 'conversation:takeover' },
  { href: '/approvals?tab=approvals', label: 'Approvals', description: 'Pending human decisions', permission: 'approval:read' },
  { href: '/demo/operations', label: 'Operations demo', description: 'Scoped run activity', permission: 'conversation:takeover', demo: true },
  { href: '/demo/campaigns', label: 'Marketing demo', description: 'Draft and approval handoff', permissions: ['campaign:draft', 'approval:read'], demo: true },
  { href: '/demo/storefront', label: 'Sales demo', description: 'Session-bound storefront', permission: 'customer:read', demo: true },
  { href: '/analytics', label: 'Analytics', description: 'Observed metrics only' },
  { href: '/settings', label: 'Settings', description: 'Tenant settings status' },
];

const CAPABILITY_ROWS = ['AI team roster', 'Knowledge management', 'Integrations'];

function isValidAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AuthSession>;
  const identity = candidate.identity;
  const membership = candidate.membership;
  return typeof candidate.expires_at === 'string'
    && Array.isArray(candidate.permissions)
    && candidate.permissions.every((permission) => typeof permission === 'string')
    && typeof identity === 'object' && identity !== null
    && typeof identity.user_id === 'string'
    && typeof identity.email === 'string'
    && typeof identity.display_name === 'string'
    && typeof membership === 'object' && membership !== null
    && typeof membership.tenant_id === 'string'
    && (membership.tenant_name === null || typeof membership.tenant_name === 'string')
    && typeof membership.scope === 'string';
}

function hasPermission(session: AuthSession | null, item: NavItem): boolean {
  if (item.permissions) return canAny(session, item.permissions);
  return item.permission === undefined || can(session, item.permission);
}

function pageLabel(pathname: string): string {
  if (pathname === '/') return 'Company overview';
  if (pathname.startsWith('/takeover')) return 'Customer care';
  if (pathname.startsWith('/approvals')) return 'Approvals and customers';
  if (pathname.startsWith('/demo/')) return 'Demonstration workspace';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Company workspace';
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

export function CompanyShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'signed_out'>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void tenantConsoleClient.getAuthSession()
      .then((value) => {
        if (!active) return;
        if (!isValidAuthSession(value)) throw new Error('Invalid auth session response');
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

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPermission(session, item)),
    [session],
  );

  if (pathname === '/sign-in') return <>{children}</>;

  async function logout() {
    setLoggingOut(true);
    try {
      await tenantConsoleClient.signOut();
    } finally {
      window.location.assign('/sign-in');
    }
  }

  return (
    <div className="app-shell" data-app="tenant">
      <button
        type="button"
        aria-label="Close navigation"
        className={`fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm lg:hidden ${menuOpen ? 'block' : 'hidden'}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className="app-sidebar" data-open={menuOpen} aria-label="Company navigation">
        <div className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 rounded-md text-ink focus-visible:outline-none" aria-label="AgentOS company overview">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white" aria-hidden="true">A</span>
              <span><span className="block text-sm font-bold tracking-tight text-ink">AgentOS</span><span className="block text-[11px] text-muted">Company workspace</span></span>
            </Link>
            <button type="button" className="mobile-menu-button rounded-md p-2 text-muted" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><CloseIcon /></button>
          </div>

          <div className="mt-8 rounded-lg border border-line bg-surface-low p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Current tenant</p>
            <p className="mt-1 truncate font-mono text-xs text-ink" title={session?.membership.tenant_id}>{session?.membership.tenant_name ?? session?.membership.tenant_id ?? 'Sign in to identify'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {session ? <DemoBadge /> : <StatusBadge label={sessionState === 'loading' ? 'Loading identity' : 'Not signed in'} tone={sessionState === 'loading' ? 'loading' : 'not-configured'} />}
            </div>
          </div>

          <nav className="mt-7 flex-1" aria-label="Company sections">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Workspace</p>
            <ul className="mt-2 space-y-1">
              {visibleItems.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href.split('?')[0] ?? item.href);
                return <li key={item.href}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined} className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none ${active ? 'bg-brand-soft text-brand-deep' : 'text-ink-body hover:bg-surface-low hover:text-ink'}`}>
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${active ? 'bg-brand' : 'bg-slate-300 group-hover:bg-brand'}`} aria-hidden="true" />
                    <span className="min-w-0"><span className="block font-semibold">{item.label}{item.demo ? <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted">Demo</span> : null}</span><span className="mt-0.5 block truncate text-xs text-muted">{item.description}</span></span>
                  </Link>
                </li>;
              })}
            </ul>

            <p className="mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Capabilities</p>
            <ul className="mt-2 space-y-1">
              {CAPABILITY_ROWS.map((label) => <li key={label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted"><span>{label}</span><span className="text-[10px] uppercase tracking-wide">Unavailable</span></li>)}
            </ul>
          </nav>

          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-deep" aria-hidden="true">{session?.identity.display_name.slice(0, 1).toUpperCase() ?? '?'}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{session?.identity.display_name ?? 'Workspace user'}</p><p className="truncate text-xs text-muted">{session?.identity.email ?? 'Session-owned identity'}</p></div>
              {session ? <button type="button" className="rounded-md p-2 text-muted hover:bg-surface-low hover:text-ink focus-visible:outline-none" onClick={() => void logout()} disabled={loggingOut} aria-label="Sign out">{loggingOut ? '…' : '↗'}</button> : null}
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar" role="banner">
          <div className="flex min-w-0 items-center gap-3"><button type="button" className="mobile-menu-button rounded-md p-2 text-muted hover:bg-surface-low" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MenuIcon /></button><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{pageLabel(pathname)}</p><p className="hidden text-xs text-muted sm:block">Scoped to the current tenant; no global search or alerts</p></div></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">{session ? <DemoBadge /> : null}<span className="hidden max-w-52 truncate text-xs font-medium text-muted sm:inline">{session?.identity.email ?? 'Session not loaded'}</span><span className="h-2 w-2 rounded-full bg-slate-300" title="No platform health claim" aria-label="Health not asserted" /></div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
