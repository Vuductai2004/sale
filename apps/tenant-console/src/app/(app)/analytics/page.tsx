import { PageHeader, SectionHeader, StatusBadge } from '@agentos/ui-foundation/react';
import { RequirePermission } from '../../../components/auth/RequirePermission';

export const metadata = {
  title: 'Analytics | AgentOS',
  description: 'Tenant-scoped analytics availability and source state.',
};

export default function AnalyticsPage() {
  return (
    <RequirePermission permission="telemetry:read">
      <div className="space-y-6">
        <PageHeader eyebrow="Company workspace" title="Analytics" description="Observed tenant metrics only. No synthetic charts, trend lines, or revenue estimates are rendered." />
        <section className="ui-section-card">
          <SectionHeader title="Telemetry source" description="The KPI contract is present, but the current source may return no metrics for the selected window." />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3"><StatusBadge code="NO_DATA" label="No data" /><span className="text-sm text-muted">GET /telemetry/kpi-snapshot · source window required</span></div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">A chart will appear only when the server returns timestamped, tenant-scoped observations. Missing values are not converted to zero.</p>
          </div>
        </section>
        <section className="ui-section-card">
          <SectionHeader title="Unavailable capabilities" />
          <div className="p-5">
            <ul className="divide-y divide-line text-sm"><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Global activity feed</span><StatusBadge code="NOT_INTEGRATED" label="Not integrated" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Cross-tenant comparison</span><StatusBadge tone="danger" label="Blocked" /></li><li className="flex items-center justify-between gap-4 py-3"><span className="text-ink">Attribution and billing totals</span><StatusBadge code="NO_DATA" label="No data" /></li></ul>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
