import { TenantWorkspace } from '../components/operations/TenantWorkspace';

export const metadata = {
  title: 'Tenant Workspace | AgentOS Platform Admin',
  description: 'Server-backed tenant readiness and controlled autonomy administration.',
};

export default function TenantWorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TenantWorkspace />
    </main>
  );
}
