import { TenantWorkspace } from '../../../components/operations/TenantWorkspace';

export const metadata = {
  title: 'Tenant Workspace | AgentOS Command Center',
  description: 'Server-backed tenant readiness and controlled autonomy administration.',
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TenantWorkspace />
    </main>
  );
}
