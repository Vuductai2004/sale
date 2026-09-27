import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentOS Platform Admin',
  description: 'Tenant readiness, controlled autonomy, and operational run administration.',
};

const NAV_ITEMS = [
  { href: '/', label: 'Tenant Workspace', id: 'nav-workspace' },
  { href: '/operations', label: 'Operations', id: 'nav-operations' },
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100">
      <body className="min-h-screen flex flex-col bg-slate-950 font-sans antialiased selection:bg-sky-500 selection:text-white">
        <header
          role="banner"
          className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/75"
        >
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 rounded font-mono text-sm font-semibold tracking-wider text-slate-100 hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                aria-label="AgentOS Platform Admin Home"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" aria-hidden="true" />
                <span className="uppercase">AgentOS</span>
                <span className="text-xs text-slate-500">ADMIN</span>
              </Link>

              <nav role="navigation" aria-label="Main Navigation" className="hidden items-center gap-1 md:flex">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="rounded-md border border-transparent px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div
              role="status"
              aria-label="System operational status"
              className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-300"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              <span>OPERATIONAL</span>
            </div>
          </div>

          <nav
            role="navigation"
            aria-label="Mobile Navigation"
            className="flex gap-2 overflow-x-auto border-t border-slate-800/80 px-4 py-2 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={`mobile-${item.id}`}
                href={item.href}
                className="whitespace-nowrap rounded border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 hover:bg-slate-900 hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer role="contentinfo" className="border-t border-slate-800/80 bg-slate-950 py-3 text-center text-[11px] font-mono text-slate-600">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
            <span>AgentOS Platform Admin &bull; Fail-Closed Contract Verification</span>
            <span>API Gateway /api/v1</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
