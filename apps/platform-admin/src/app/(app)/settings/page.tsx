import { PageHeader, SectionHeader, StatusBadge } from '@agentos/ui-foundation/react';

export const metadata = {
  title: 'Settings | AgentOS Platform',
  description: 'Platform settings capability state.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform operations" title="Settings" description="No platform-wide settings contract is exposed by this current-tenant deployment." />
      <section className="ui-section-card">
        <SectionHeader title="Settings capability" />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge label="Not integrated" tone="neutral" /><span className="text-sm text-muted">No mutation controls rendered</span></div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">Provisioning, membership, billing, subscriptions, and fleet policy require a separately authorized cross-tenant authority model.</p>
        </div>
      </section>
    </div>
  );
}
