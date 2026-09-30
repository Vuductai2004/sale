import { TenantWorkspace } from '../../components/operations/TenantWorkspace';
import { DemoBadge, MetricTile, PageHeader, SectionCard, StatusBadge } from '../../components/ui/Primitives';

export const metadata = {
  title: 'Platform Overview | AgentOS',
  description: 'Current-tenant readiness and bounded autonomy administration.',
};

export default function PlatformOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform operations" title="Current tenant overview" description="The platform administrator is bound to one tenant in this deployment. Fleet totals, all-company subscriptions, and cross-tenant health are not asserted." actions={<DemoBadge />} />
      <section aria-labelledby="platform-metrics-heading"><div className="mb-3"><h2 id="platform-metrics-heading" className="text-lg font-semibold text-ink">Scoped telemetry</h2><p className="mt-1 text-sm text-muted">No aggregate fleet or commercial authority contract is available.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricTile label="Organizations" value="Unavailable" detail="No cross-tenant list or count endpoint." status={<StatusBadge label="Blocked" tone="blocked" />} /><MetricTile label="Active AI agents" value="Not instrumented" detail="Run records do not prove an agent roster." status={<StatusBadge label="No data" tone="not-instrumented" />} /><MetricTile label="Waiting approval" value="Scoped only" detail="Platform demo role cannot aggregate tenant approvals." status={<StatusBadge label="Blocked" tone="blocked" />} /><MetricTile label="Needs attention" value="Unavailable" detail="No fleet attention feed or acknowledge route." status={<StatusBadge label="Not integrated" tone="not-integrated" />} /></div></section>
      <SectionCard title="Platform health sources" description="Liveness, dependency readiness, demo probes, and fleet health are separate concepts."><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-line p-3"><p className="text-sm font-semibold text-ink">API liveness</p><p className="mt-1 text-xs text-muted"><code>/health</code> is not an uptime SLA.</p><StatusBadge label="Not queried" tone="neutral" /></div><div className="rounded-lg border border-line p-3"><p className="text-sm font-semibold text-ink">Dependency readiness</p><p className="mt-1 text-xs text-muted"><code>/ready</code> reports configured probes.</p><StatusBadge label="Not queried" tone="neutral" /></div><div className="rounded-lg border border-line p-3"><p className="text-sm font-semibold text-ink">Demo probes</p><p className="mt-1 text-xs text-muted">Provider and connector bindings are shown in Demo readiness.</p><a href="/demo/readiness" className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-deep">Inspect readiness →</a></div></div></SectionCard>
      <TenantWorkspace />
    </div>
  );
}
