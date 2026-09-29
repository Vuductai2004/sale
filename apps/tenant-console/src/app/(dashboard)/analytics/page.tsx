import { PageHeader, SectionCard, StatusBadge } from '../../../components/ui/Primitives';

export const metadata = {
  title: 'Analytics | AgentOS',
  description: 'Tenant-scoped analytics availability and source state.',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Company workspace" title="Analytics" description="Observed tenant metrics only. No synthetic charts, trend lines, or revenue estimates are rendered." />
      <SectionCard title="Telemetry source" description="The KPI contract is present, but the current source may return no metrics for the selected window.">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge label="No data" tone="no-data" /><span className="text-sm text-muted">GET /telemetry/kpi-snapshot · source window required</span></div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">A chart will appear only when the server returns timestamped, tenant-scoped observations. Missing values are not converted to zero.</p>
      </SectionCard>
      <SectionCard title="Unavailable capabilities">
        <ul className="divide-y divide-line text-sm"><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Global activity feed</span><StatusBadge label="Not integrated" tone="not-integrated" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Cross-tenant comparison</span><StatusBadge label="Blocked" tone="blocked" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Attribution and billing totals</span><StatusBadge label="No data" tone="no-data" /></li></ul>
      </SectionCard>
    </div>
  );
}
