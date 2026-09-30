import { PageHeader, SectionCard, StatusBadge } from '../../../components/ui/Primitives';

export const metadata = {
  title: 'Settings | AgentOS',
  description: 'Tenant settings capability state.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Company workspace" title="Settings" description="This surface reports tenant settings availability without redirecting into platform authority." />
      <SectionCard title="Tenant settings" description="No tenant-facing settings contract is currently exposed through the BFF.">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge label="Not integrated" tone="not-integrated" /><span className="text-sm text-muted">Read-only capability state</span></div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">Workspace identity, connector mutation, knowledge management, and membership switching remain server-owned capabilities. No editable controls are shown.</p>
      </SectionCard>
    </div>
  );
}
