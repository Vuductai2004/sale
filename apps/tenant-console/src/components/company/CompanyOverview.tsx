'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, type SharedUiState, type SourceStatus } from '@agentos/ui-foundation';
import { can, type AuthSession } from '@agentos/ui-foundation/auth';
import { DemoBadge, EmptyState, ErrorState, LoadingState, MetricCard, PageHeader, SectionHeader, StatusBadge } from '@agentos/ui-foundation/react';
import type { ApprovalQueueItem, KpiMetricItem } from '../../lib/types/tenant-console';
import { tenantConsoleClient } from '../../lib/tenant-console-client';

type MetricValue = KpiMetricItem<unknown>;
type OverviewState = 'loading' | 'ready' | 'signed_out' | 'error';
type ApprovalLoadState = 'loading' | 'ready' | 'permission_denied' | 'error';

type MetricCardDefinition = {
  readonly label: string;
  readonly aliases: readonly string[];
  readonly detail: string;
};

const METRIC_CARDS = [
  { label: 'Customers helped', aliases: ['customers_helped'], detail: 'No customer attribution is asserted without a measured source.' },
  { label: 'Sales assisted', aliases: ['sales_assisted'], detail: 'No assisted-sales total is inferred from run activity.' },
  { label: 'Revenue influenced', aliases: ['revenue_influenced'], detail: 'Revenue and currency remain unavailable without attribution evidence.' },
  { label: 'Items needing attention', aliases: ['approval_pending'], detail: 'Only the authorized pending subset is counted below.' },
] as const;



function sourceTone(status: SourceStatus): 'success' | 'warning' | 'neutral' | 'danger' {
  switch (status) {
    case 'LIVE': return 'success';
    case 'STALE': return 'warning';
    case 'UNAVAILABLE':
    case 'FAIL_CLOSED': return 'danger';
    default: return 'neutral';
  }
}

function normalizeMetrics(raw: readonly KpiMetricItem<unknown>[] | Record<string, unknown>): MetricValue[] {
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw).map(([key, value]) => {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return {
        metric: typeof record.metric === 'string' ? record.metric : key,
        value: 'value' in record ? record.value : null,
        source_status: typeof record.source_status === 'string' ? record.source_status as SourceStatus : 'NO_DATA',
        observed_at: typeof record.observed_at === 'string' ? record.observed_at : null,
        reason: typeof record.reason === 'string' ? record.reason : undefined,
      } satisfies MetricValue;
    }
    return { metric: key, value, source_status: 'NO_DATA', observed_at: null } satisfies MetricValue;
  });
}

function metricFor(definition: MetricCardDefinition, metrics: readonly MetricValue[]): MetricValue | undefined {
  return metrics.find((metric) => definition.aliases.includes(metric.metric ?? metric.name ?? ''));
}

function displayMetric(metric: MetricValue | undefined): string {
  if (!metric) return 'Not instrumented';
  if (metric.source_status === 'NO_DATA') return 'No data';
  if (metric.source_status === 'NOT_INSTRUMENTED') return 'Not instrumented';
  if (metric.source_status === 'UNAVAILABLE') return 'Unavailable';
  if (metric.source_status === 'FAIL_CLOSED') return 'Blocked';
  if (metric.value === null || metric.value === undefined) return 'No data';
  if (typeof metric.value === 'string' || typeof metric.value === 'number') return String(metric.value);
  return 'Observed';
}

function loadError(error: unknown): { readonly state: SharedUiState; readonly message: string; readonly correlationId: string | null } {
  if (error instanceof ApiError) {
    if (error.status === 401) return { state: 'permission_denied', message: 'Sign in to load tenant-scoped observations.', correlationId: error.correlationId || null };
    if (error.status === 403) return { state: 'permission_denied', message: 'This role cannot read the requested observation.', correlationId: error.correlationId || null };
    if (error.status === 409) return { state: 'version_conflict', message: error.message || 'The observation version changed; no optimistic data is shown.', correlationId: error.correlationId || null };
    if (error.status >= 500) return { state: 'dependency_unavailable', message: error.message || 'The observation source is unavailable.', correlationId: error.correlationId || null };
    return { state: 'fail_closed', message: error.message || 'The observation request failed closed.', correlationId: error.correlationId || null };
  }
  return { state: 'fail_closed', message: error instanceof Error ? error.message : 'The observation request failed closed.', correlationId: null };
}

function capabilityLabel(status: 'integrated' | 'demo-only' | 'blocked') {
  if (status === 'integrated') return <StatusBadge label="Integrated" tone="success" />;
  if (status === 'demo-only') return <StatusBadge label="Demo only" tone="demo" />;
  return <StatusBadge label="Blocked" tone="danger" />;
}

function capabilityLink(href: string, label: string, enabled: boolean) {
  return enabled
    ? <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-brand hover:text-brand-deep">{label} →</Link>
    : <span className="mt-4 inline-flex text-sm font-semibold text-muted">Unavailable</span>;
}

function overviewTone(state: SharedUiState): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (state) {
    case 'idle': return 'success';
    case 'partial':
    case 'stale': return 'warning';
    case 'permission_denied':
    case 'dependency_unavailable':
    case 'fail_closed': return 'danger';
    default: return 'neutral';
  }
}

export function CompanyOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const windowParam = searchParams.get('window') || '24h';
  const [overviewState, setOverviewState] = useState<OverviewState>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [metrics, setMetrics] = useState<MetricValue[]>([]);
  const [approvals, setApprovals] = useState<readonly ApprovalQueueItem[]>([]);
  const [approvalTotal, setApprovalTotal] = useState<number | null>(null);
  const [approvalState, setApprovalState] = useState<ApprovalLoadState>('loading');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [uiState, setUiState] = useState<SharedUiState>('loading');

  const loadOverview = useCallback(async () => {
    setOverviewState('loading');
    setUiState('loading');
    setErrorMessage(null);
    setCorrelationId(null);
    setApprovalError(null);
    setApprovalTotal(null);
    setObservedAt(null);
    try {
      const sessionResponse = await tenantConsoleClient.getAuthSession();
      if (!sessionResponse.membership.tenant_id) {
        setSession(null);
        setOverviewState('signed_out');
        setUiState('permission_denied');
        setErrorMessage('Sign in to view the current tenant workspace.');
        setMetrics([]);
        setApprovals([]);
        setApprovalState('permission_denied');
        return;
      }

      setSession(sessionResponse);
      const canReadApprovals = can(sessionResponse, 'approval:read');
      setApprovalState(canReadApprovals ? 'loading' : 'permission_denied');
      const [kpiOutcome, approvalOutcome] = await Promise.allSettled([
        tenantConsoleClient.getKpiSnapshot({ window: windowParam }),
        canReadApprovals ? tenantConsoleClient.getApprovals({ status: 'PENDING', limit: 20 }) : Promise.resolve(null),
      ]);

      if (approvalOutcome.status === 'fulfilled' && approvalOutcome.value) {
        setApprovals(approvalOutcome.value.items);
        setApprovalTotal(approvalOutcome.value.total_count ?? approvalOutcome.value.items.length);
        setApprovalState('ready');
      } else if (approvalOutcome.status === 'rejected') {
        const failure = loadError(approvalOutcome.reason);
        setApprovals([]);
        setApprovalTotal(null);
        setApprovalState(failure.state === 'permission_denied' ? 'permission_denied' : 'error');
        setApprovalError(failure.message);
      } else if (!canReadApprovals) {
        setApprovals([]);
        setApprovalState('permission_denied');
      }

      if (kpiOutcome.status === 'fulfilled') {
        const normalized = normalizeMetrics(kpiOutcome.value.metrics);
        setMetrics(normalized);
        setObservedAt(kpiOutcome.value.observed_at || null);
        const hasLive = normalized.some((metric) => metric.source_status === 'LIVE');
        const hasStale = normalized.some((metric) => metric.source_status === 'STALE');
        const hasUnavailable = normalized.some((metric) => metric.source_status === 'UNAVAILABLE');
        const hasFailClosed = normalized.some((metric) => metric.source_status === 'FAIL_CLOSED');
        setUiState(hasFailClosed ? 'fail_closed' : hasUnavailable ? 'dependency_unavailable' : hasStale ? 'stale' : hasLive ? (normalized.some((metric) => metric.source_status !== 'LIVE') ? 'partial' : 'idle') : 'empty');
        setOverviewState('ready');
      } else {
        const failure = loadError(kpiOutcome.reason);
        setOverviewState('error');
        setUiState(failure.state);
        setErrorMessage(failure.message);
        setCorrelationId(failure.correlationId);
        setMetrics([]);
      }
    } catch (error) {
      const failure = loadError(error);
      setOverviewState('error');
      setUiState(failure.state);
      setErrorMessage(failure.message);
      setCorrelationId(failure.correlationId);
      setMetrics([]);
      setApprovals([]);
      setApprovalTotal(null);
      setApprovalState('error');
      setApprovalError(failure.message);
      setObservedAt(null);
    }
  }, [windowParam]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const metricByCard = useMemo(() => METRIC_CARDS.map((definition) => ({ definition, metric: metricFor(definition, metrics) })), [metrics]);
  const canReadApprovals = can(session, 'approval:read');
  const attentionValue = !canReadApprovals ? 'Scoped only' : approvalState === 'ready' && approvalTotal !== null ? String(approvalTotal) : approvalState === 'permission_denied' ? 'Scoped only' : approvalState === 'error' ? 'Unavailable' : 'Loading';
  const attentionDetail = !canReadApprovals ? 'This session cannot read the approval queue.' : approvalState === 'ready' ? 'Authoritative pending total returned for this session.' : approvalState === 'permission_denied' ? 'The approval queue denied this session.' : approvalState === 'error' ? (approvalError ?? 'The approval queue is unavailable.') : 'Loading the authorized approval queue.';

  if (overviewState === 'loading') return <LoadingState label="Loading company observations" />;

  return (
    <div className="space-y-6" aria-label="Company overview">
      <PageHeader
        eyebrow="Company workspace"
        title={session ? `Good to see you, ${session.identity.display_name}` : 'Company overview'}
        description="A tenant-scoped view of observed work. Missing telemetry is shown as unavailable, never as a guessed number."
        actions={<div className="flex flex-wrap items-center gap-2"><select aria-label="Observation window" className="ui-input min-w-28" value={windowParam} onChange={(event) => router.replace(`/?window=${encodeURIComponent(event.target.value)}`)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><button type="button" className="ui-button ui-button--secondary" onClick={() => void loadOverview()}>Refresh</button></div>}
      />

      <div className="flex flex-wrap items-center gap-2" aria-label="Overview status"><StatusBadge label={uiState === 'empty' ? 'No data' : uiState.replaceAll('_', ' ')} tone={overviewTone(uiState)} />{session ? <DemoBadge /> : null}<span className="text-xs text-muted">{observedAt ? `Observed ${new Date(observedAt).toLocaleString()}` : 'Observed time unavailable'}</span></div>

      {overviewState === 'signed_out' ? <ErrorState message={`Tenant session unavailable: ${errorMessage ?? 'Sign in to continue.'}${correlationId ? ` Correlation ID: ${correlationId}.` : ''}`} /> : null}
      {overviewState === 'error' ? <ErrorState message={`Company observations unavailable: ${errorMessage ?? 'The current data source failed closed.'}${correlationId ? ` Correlation ID: ${correlationId}.` : ''}`} onRetry={() => void loadOverview()} /> : null}

      <section aria-labelledby="metric-heading"><div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="metric-heading" className="text-lg font-semibold text-ink">Daily summary</h2><p className="mt-1 text-sm text-muted">KPI source: <code>/telemetry/kpi-snapshot</code>. Trends and revenue estimates are omitted.</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricByCard.map(({ definition, metric }) => <MetricCard key={definition.label} label={definition.label} value={definition.label === 'Items needing attention' ? attentionValue : displayMetric(metric)} detail={definition.label === 'Items needing attention' ? attentionDetail : metric?.reason ?? definition.detail} status={<StatusBadge label={metric?.source_status ? metric.source_status.replaceAll('_', ' ') : 'Not instrumented'} tone={metric?.source_status ? sourceTone(metric.source_status) : 'neutral'} />} />)}</div></section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="ui-section-card">
          <SectionHeader title="Needs attention" description="Only pending records returned to the current role are listed." />
          <div className="p-5">
          {!canReadApprovals ? <EmptyState title="Approval queue not available to this role" description="Tenant operator sessions cannot read marketing approval records. Customer care attention remains scoped to the conversation workflow." status="NOT_INTEGRATED" /> : approvalState === 'error' ? <ErrorState message={`Approval queue unavailable: ${approvalError ?? 'The authorized approval source failed closed.'}`} /> : approvalState === 'permission_denied' ? <EmptyState title="Approval queue denied" description="The current session cannot read pending approval records." status="NOT_INTEGRATED" /> : approvals.length > 0 ? <ul className="divide-y divide-line">{approvals.map((approval) => <li key={approval.approval_id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{approval.title ?? approval.action_id}</p><p className="mt-1 truncate text-xs text-muted">{approval.reason} · {new Date(approval.created_at).toLocaleString()}</p></div><Link className="ui-button ui-button--secondary shrink-0" href="/approvals?tab=approvals">Review</Link></li>)}</ul> : <EmptyState title="No pending approvals" description="The authorized approval queue returned no pending records. No unified notification count is inferred." />}
        </div>
        </section>
        <section className="ui-section-card">
          <SectionHeader title="Recent activity" description="No global activity feed is available for this tenant workspace." />
          <div className="p-5"><EmptyState title="No global feed" description="Open a known customer timeline or run trace from an authorized workflow to inspect activity." /></div>
        </section>
      </div>

      <section className="ui-section-card">
        <SectionHeader title="AI team domains" description="These cards describe product areas, not an active-agent count or fleet roster." />
        <div className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-low p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Customer care</h3>{capabilityLabel(can(session, 'conversation:takeover') ? 'integrated' : 'blocked')}</div>
            <p className="mt-2 text-sm leading-6 text-muted">Conversation takeover and customer timelines are available only through server-scoped records.</p>
            {capabilityLink('/takeover', 'View care activity', can(session, 'conversation:takeover'))}
          </div>
          <div className="rounded-lg border border-line bg-surface-low p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Marketing</h3>{capabilityLabel(can(session, 'campaign:draft') || can(session, 'approval:read') ? 'demo-only' : 'blocked')}</div>
            <p className="mt-2 text-sm leading-6 text-muted">Campaign drafts stop at a human approval boundary in the demo route.</p>
            {capabilityLink('/demo/campaigns', 'Open demo journey', can(session, 'campaign:draft') || can(session, 'approval:read'))}
          </div>
          <div className="rounded-lg border border-line bg-surface-low p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Sales</h3>{capabilityLabel(can(session, 'customer:read') ? 'demo-only' : 'blocked')}</div>
            <p className="mt-2 text-sm leading-6 text-muted">The storefront is a session-bound demo projection, not a production revenue dashboard.</p>
            {capabilityLink('/demo/storefront', 'Open demo storefront', can(session, 'customer:read'))}
          </div>
        </div>
        </div>
      </section>

      <section className="ui-section-card">
        <SectionHeader title="Workspace boundaries" description="These are intentional non-interactive states, not missing buttons." />
        <div className="p-5"><div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg border border-line p-3"><p className="font-semibold text-ink">Tenant identity</p><p className="mt-1 text-muted">{session?.membership.tenant_id ?? 'Unavailable until sign-in'}</p></div><div className="rounded-lg border border-line p-3"><p className="font-semibold text-ink">Search and alerts</p><p className="mt-1 text-muted">Scoped loaded-row filtering only; no global endpoint.</p></div><div className="rounded-lg border border-line p-3"><p className="font-semibold text-ink">Summary action</p><p className="mt-1 text-muted">Not integrated because no summary-generation route is authorized.</p></div></div></div>
      </section>
    </div>
  );
}
