import Link from 'next/link';
import { TenantWorkspace } from '../components/operations/TenantWorkspace';
export const metadata = {
  title: 'Tenant Workspace | AgentOS Platform Admin',
  description: 'Server-backed tenant readiness and controlled autonomy administration.',
};

export default function TenantWorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-5 sm:px-6 lg:px-8">
        <Link
          href="/demo/readiness"
          className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Demo readiness
        </Link>
      </div>
      <TenantWorkspace />
    </main>
  );
}
