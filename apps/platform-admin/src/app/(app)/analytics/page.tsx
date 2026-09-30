import { PageHeader, SectionHeader, StatusBadge } from '@agentos/ui-foundation/react';

export const metadata = {
  title: 'Analytics | AgentOS Platform',
  description: 'Platform telemetry availability and scope.',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform operations" title="Analytics availability" description="The platform console does not have a cross-tenant time-series or billing aggregate contract." />
      <section className="ui-section-card">
        <SectionHeader title="Telemetry source" description="Current tenant runs may expose per-run observations in Operations." />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge label="No data" tone="neutral" /><span className="text-sm text-muted">No fleet KPI series or sparklines</span></div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">Per-run tokens, latency, and cost observations are not an aggregate subscription or MRR contract. Open Operations for an authorized run scope.</p>
        </div>
      </section>
      <section className="ui-section-card">
        <SectionHeader title="Unavailable platform capabilities" />
        <ul className="divide-y divide-line p-5 text-sm"><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Organizations table</span><StatusBadge label="Blocked" tone="danger" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Billing and subscriptions</span><StatusBadge label="Not integrated" tone="neutral" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Fleet activity chart</span><StatusBadge label="No data" tone="neutral" /></li></ul>
      </section>
    </div>
  );
}
