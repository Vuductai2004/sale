import { PageHeader, SectionCard, StatusBadge } from '../../components/ui/Primitives';

export const metadata = {
  title: 'Analytics | AgentOS Platform',
  description: 'Platform telemetry availability and scope.',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform operations" title="Analytics availability" description="The platform console does not have a cross-tenant time-series or billing aggregate contract." />
      <SectionCard title="Telemetry source" description="Current tenant runs may expose per-run observations in Operations.">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge label="No data" tone="no-data" /><span className="text-sm text-muted">No fleet KPI series or sparklines</span></div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">Per-run tokens, latency, and cost observations are not an aggregate subscription or MRR contract. Open Operations for an authorized run scope.</p>
      </SectionCard>
      <SectionCard title="Unavailable platform capabilities"><ul className="divide-y divide-line text-sm"><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Organizations table</span><StatusBadge label="Blocked" tone="blocked" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Billing and subscriptions</span><StatusBadge label="Not integrated" tone="not-integrated" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Fleet activity chart</span><StatusBadge label="No data" tone="no-data" /></li></ul></SectionCard>
    </div>
  );
}
