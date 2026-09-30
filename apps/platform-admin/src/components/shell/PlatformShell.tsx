'use client';

import { AppShell, DemoBadge, IconButton, MobileNavDrawer, Sidebar, Topbar, type SidebarItem } from '@agentos/ui-foundation/react';
import { t } from '@agentos/ui-foundation/i18n';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { useSession } from '../auth/SessionProvider';

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

export function PlatformShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname() || '/';
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = useMemo<readonly SidebarItem[]>(() => NAV_ITEMS.map((item) => ({
    href: item.href,
    label: item.label,
    active: item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
    badge: item.demo ? <span className="text-[10px] uppercase tracking-wide text-muted">Demo</span> : undefined,
  })), [pathname]);

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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="p-5">
        <a href="/" className="ui-focus-ring flex items-center gap-3 rounded-md text-ink" aria-label="AgentOS platform overview">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white" aria-hidden="true">A</span>
          <span><span className="block text-sm font-bold tracking-tight text-ink">AgentOS</span><span className="block text-[11px] text-muted">Platform operations</span></span>
        </a>
        <div className="mt-8 rounded-lg border border-line bg-surface-low p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Authority scope</p>
          <p className="mt-1 text-sm font-semibold text-ink">Current tenant only</p>
          <p className="mt-1 truncate font-mono text-xs text-muted" title={session?.membership.tenant_id}>{session?.membership.tenant_id ?? 'Sign in to identify'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><DemoBadge /></div>
        </div>
      </div>
      <div className="flex-1">
        <p className="px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Operations</p>
        <Sidebar items={navItems} />
        <p className="mt-2 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Not integrated</p>
        <ul className="mt-2 space-y-1 px-3">{UNAVAILABLE_ROWS.map((label) => <li key={label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted"><span>{label}</span><span className="text-[10px] uppercase tracking-wide">Unavailable</span></li>)}</ul>
      </div>
      <div className="border-t border-line p-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-deep" aria-hidden="true">{session.identity.display_name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{session.identity.display_name}</p><p className="truncate text-xs text-muted">{session.identity.email}</p></div><IconButton label={t('auth.sign_out')} variant="ghost" size="sm" onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? '…' : '↗'}</IconButton></div></div>
    </div>
  );

  return (
    <>
      <AppShell
        skipLinkLabel={t('common.skip_to_content')}
        sidebar={sidebar}
        topbar={<Topbar title={pageLabel(pathname)} onOpenMenu={() => setMenuOpen(true)} actions={<><DemoBadge /><span className="hidden text-xs font-medium text-muted sm:inline">Signed in</span></>} />}
      >
        <div className="app-content">{children}</div>
      </AppShell>
      <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} items={navItems} />
    </>
  );
}
