'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { DemoBadge } from '../../../components/ui/Primitives';
type Role = 'tenant_operator' | 'marketing_approver';
type Session = { readonly role?: Role; readonly operator_id?: string };
type Approval = {
  readonly approval_id: string;
  readonly run_id: string;
  readonly title?: string;
  readonly reason?: string;
  readonly status?: string;
  readonly payload_sha256?: string;
  readonly payload?: Record<string, unknown>;
  readonly is_paused?: boolean;
  readonly created_at?: string;
};
type ApiResult = Record<string, unknown>;
function normalizeSession(payload: ApiResult): Session | null {
  const role = payload.role;
  if (role !== 'tenant_operator' && role !== 'marketing_approver') return null;
  const operatorId = payload.operator_id;
  return typeof operatorId === 'string' && operatorId.length > 0
    ? { role, operator_id: operatorId }
    : { role };
}

function readCsrf(): string | undefined {
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('agentos_tenant_csrf='));
  if (!entry) return undefined;
  const raw = entry.slice('agentos_tenant_csrf='.length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function jsonPayload(response: Response): Promise<ApiResult> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as ApiResult) : {};
  } catch {
    return {};
  }
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<{ response: Response; payload: ApiResult }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
    const csrf = readCsrf();
    if (csrf) headers.set('x-csrf-token', csrf);
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  return { response, payload: await jsonPayload(response) };
}

function describeError(payload: ApiResult, fallback: string): string {
  const code = typeof payload.error === 'string' ? payload.error : '';
  if (code === 'INSUFFICIENT_AUTHORITY' || code === 'FORBIDDEN') return 'permission_denied: this role cannot perform that operation.';
  if (typeof payload.message === 'string') return payload.message;
  return code || fallback;
}
function approvalStatusLabel(status: unknown, paused = false): string {
  const normalized = typeof status === 'string' ? status.toLowerCase() : '';
  if (paused || normalized === 'paused' || normalized === 'paused_takeover') return 'AWAITING_HUMAN';
  switch (normalized) {
    case 'accepted': return 'ACCEPTED';
    case 'queued': return 'QUEUED';
    case 'running': return 'RUNNING';
    case 'waiting': return 'WAITING';
    case 'pending':
    case 'awaiting_approval':
    case 'pending_approval': return 'PENDING_APPROVAL';
    case 'awaiting_human': return 'AWAITING_HUMAN';
    case 'completed': return 'COMPLETED';
    case 'failed': return 'FAILED';
    case 'stopped':
    case 'cancelled': return 'STOPPED';
    case 'unavailable': return 'UNAVAILABLE';
    default: return 'UNAVAILABLE';
  }
}

export default function CampaignsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [instruction, setInstruction] = useState('Create a reactivation campaign for customers who have not purchased in 90 days.');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalBusy, setApprovalBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    const { response, payload } = await apiFetch('/api/v1/approvals?status=PENDING&limit=100');
    if (response.status === 401) {
      router.replace('/sign-in');
      return;
    }
    if (!response.ok) {
      setError(describeError(payload, 'Unable to load pending approvals.'));
      return;
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    setApprovals(items.filter((item): item is Approval => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.approval_id === 'string' || typeof record.id === 'string';
    }).map((item) => {
      const record = item as Record<string, unknown>;
      const approval: Approval = {
        approval_id: String(record.approval_id ?? record.id),
        run_id: String(record.run_id ?? record.runId ?? ''),
        title: typeof record.title === 'string' ? record.title : 'Campaign approval',
        reason: typeof record.reason === 'string' ? record.reason : 'Approval required before campaign dispatch.',
        ...(typeof record.status === 'string' ? { status: record.status } : {}),
        ...(typeof record.payload_sha256 === 'string'
          ? { payload_sha256: record.payload_sha256 }
          : typeof record.payloadSha256 === 'string' ? { payload_sha256: record.payloadSha256 } : {}),
        ...(record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
          ? { payload: record.payload as Record<string, unknown> } : {}),
        ...(typeof record.is_paused === 'boolean' ? { is_paused: record.is_paused } : {}),
        ...(typeof record.created_at === 'string' ? { created_at: record.created_at } : {}),
      };
      return approval;
    }));
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { response, payload } = await apiFetch('/api/demo/session');
        if (response.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!response.ok) {
          setError(describeError(payload, 'Unable to read the operator session.'));
          return;
        }
        if (cancelled) return;
        const current = normalizeSession(payload);
        if (!current) {
          setError('The session response was invalid; sign in again.');
          return;
        }
        setSession(current);
        if (current.role === 'marketing_approver') await loadApprovals();
      } catch {
        if (!cancelled) setError('Unable to reach the API. Confirm the local demo services are running.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadApprovals, router]);

  async function handleDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { response, payload } = await apiFetch('/api/v1/campaigns/drafts', {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: `demo-campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          segment_id: 'inactive_90d',
          objective: 'winback',
          instruction: instruction.trim(),
          content_constraints: { channel: 'EMAIL_HTML', locale: 'vi-VN' },
        }),
      });
      if (response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!response.ok) {
        setError(describeError(payload, 'Campaign draft was not accepted.'));
        return;
      }
      const taskId = typeof payload.task_id === 'string' ? payload.task_id : typeof payload.run_id === 'string' ? payload.run_id : undefined;
      const draftStatus = approvalStatusLabel(payload.status ?? payload.lifecycle_state);
      const taskSuffix = taskId ? ` (${taskId})` : '';
      const statusContext = draftStatus === 'PENDING_APPROVAL' || draftStatus === 'AWAITING_HUMAN'
        ? ' It remains pending approval; no delivery was requested.'
        : ' No delivery outcome is shown.';
      setNotice(draftStatus === 'UNAVAILABLE'
        ? `Campaign draft submitted${taskSuffix}, but its durable draft status and approval state are unavailable. No delivery outcome is shown.`
        : `Campaign draft ${draftStatus.toLowerCase()}${taskSuffix}.${statusContext}`);
    } catch {
      setError('Unable to submit campaign draft.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDecision(
    approval: Approval,
    decision: 'APPROVE' | 'REJECT' | 'PAUSE' | 'CANCEL',
  ) {
    if (!approval.payload_sha256) {
      setError('The approval payload digest is unavailable; decision refused until the authoritative detail is loaded.');
      return;
    }
    setApprovalBusy(approval.approval_id);
    setError(null);
    setNotice(null);
    try {
      const { response, payload } = await apiFetch(`/api/v1/approvals/${encodeURIComponent(approval.approval_id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          reason:
            decision === 'APPROVE'
              ? 'Reviewed demo campaign draft and evidence.'
              : decision === 'REJECT'
              ? 'Campaign draft rejected by approver.'
              : decision === 'PAUSE'
              ? 'Campaign approval paused for further review.'
              : 'Campaign draft cancelled by approver.',
          expected_payload_sha256: approval.payload_sha256,
        }),
      });
      if (response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!response.ok) {
        setError(describeError(payload, 'Approval decision was not accepted.'));
        return;
      }
      const decisionStatus = approvalStatusLabel(payload.status);
      setNotice(decisionStatus === 'UNAVAILABLE'
        ? `Decision ${decision} submitted, but its durable queue status is unavailable. It is not shown as final.`
        : `Decision ${decision} ${decisionStatus.toLowerCase()}. The approval remains durable and will not be shown as final until the API reports it.`);
      await loadApprovals();
    } catch {
      setError('Unable to submit approval decision.');
    } finally {
      setApprovalBusy(null);
    }
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/demo/logout', { method: 'POST', body: '{}' });
    } finally {
      router.replace('/sign-in');
    }
  }

  return (
    <div className="min-h-full px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">NovaMart marketing</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-ink">Campaign drafts & approvals</h1><DemoBadge /></div><p className="mt-1 text-sm text-muted">Demo drafts stop at human approval; no synthetic send status is shown.</p></div>
          <div className="flex flex-wrap gap-2"><a href="/" className="ui-button ui-button--secondary">Company overview</a><a href="/takeover" className="ui-button ui-button--secondary">Customer care</a><button type="button" onClick={() => void handleLogout()} className="ui-button ui-button--quiet">Sign out</button></div>
        </header>

        {error && <div role="alert" className="mt-5 rounded-lg border border-rose-800/80 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-lg border border-emerald-800/80 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</div>}

        {isLoading ? <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading campaign workspace"><div className="h-28 animate-pulse rounded-xl bg-slate-900" /><div className="h-48 animate-pulse rounded-xl bg-slate-900" /></div> : session?.role === 'tenant_operator' ? (
          <section className="mt-8 max-w-2xl rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6" aria-labelledby="draft-heading">
            <div className="mb-5"><h2 id="draft-heading" className="text-base font-semibold">Create a campaign draft</h2><p className="mt-1 text-sm text-slate-400">The tenant operator can request a bounded reactivation draft. The API owns segmentation, consent, content, and approval evidence.</p></div>
            <form onSubmit={handleDraft} className="space-y-5">
              <div><label htmlFor="campaign-instruction" className="mb-2 block text-sm font-medium">Instruction</label><textarea id="campaign-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} required maxLength={2000} rows={5} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm leading-6 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30" /></div>
              <dl className="grid gap-3 text-xs sm:grid-cols-3"><div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><dt className="text-slate-500">Segment</dt><dd className="mt-1 font-mono text-slate-200">inactive_90d</dd></div><div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><dt className="text-slate-500">Channel</dt><dd className="mt-1 font-mono text-slate-200">EMAIL_HTML</dd></div><div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><dt className="text-slate-500">Locale</dt><dd className="mt-1 font-mono text-slate-200">vi-VN</dd></div></dl>
              <div className="flex justify-end"><button type="submit" disabled={isSubmitting || !instruction.trim()} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Submitting…' : 'Create draft'}</button></div>
            </form>
          </section>
        ) : session?.role === 'marketing_approver' ? (
          <section className="mt-8" aria-labelledby="approval-heading">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="approval-heading" className="text-base font-semibold">Pending approvals</h2><p className="mt-1 text-sm text-slate-400">Review the exact payload digest before queuing a decision.</p></div><button type="button" onClick={() => void loadApprovals()} className="self-start rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white sm:self-auto">Refresh</button></div>
            {approvals.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center"><p className="text-sm font-semibold">No pending approval</p><p className="mt-1 text-sm text-slate-400">The queue is empty; no campaign decision is fabricated.</p></div> : <div className="grid gap-4">{approvals.map((approval) => <article key={approval.approval_id} className="rounded-xl border border-amber-800/70 bg-slate-900/60 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-mono uppercase tracking-wider text-amber-300">{approvalStatusLabel(approval.status, approval.is_paused)}</p><h3 className="mt-1 text-base font-semibold">{approval.title || 'Marketing campaign approval'}</h3><p className="mt-1 text-sm text-slate-400">{approval.reason || 'AUTH-4 approval is required before dispatch.'}</p></div><span className="rounded-full border border-amber-700/80 bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-200">{approvalStatusLabel(approval.status, approval.is_paused).toLowerCase().replaceAll('_', ' ')}</span></div><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Approval ID</dt><dd className="mt-1 break-all font-mono text-slate-300">{approval.approval_id}</dd></div><div><dt className="text-slate-500">Run ID</dt><dd className="mt-1 break-all font-mono text-slate-300">{approval.run_id || 'Unavailable'}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Reviewed payload SHA-256</dt><dd className="mt-1 break-all font-mono text-slate-300">{approval.payload_sha256 || 'Unavailable'}</dd></div></dl>{approval.payload && <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">{JSON.stringify(approval.payload, null, 2)}</pre>}<div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void handleDecision(approval, 'APPROVE')} disabled={approvalBusy === approval.approval_id || !approval.payload_sha256} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">{approvalBusy === approval.approval_id ? 'Queuing…' : 'Approve'}</button><button type="button" onClick={() => void handleDecision(approval, 'REJECT')} disabled={approvalBusy === approval.approval_id || !approval.payload_sha256} className="rounded-lg border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50">Reject</button><button type="button" onClick={() => void handleDecision(approval, 'PAUSE')} disabled={approvalBusy === approval.approval_id || !approval.payload_sha256} className="rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50">Pause</button><button type="button" onClick={() => void handleDecision(approval, 'CANCEL')} disabled={approvalBusy === approval.approval_id || !approval.payload_sha256} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button></div></article>)}</div>}
          </section>
        ) : <section role="alert" className="mt-8 rounded-xl border border-rose-800/80 bg-rose-950/30 p-6"><p className="font-mono text-xs text-rose-300">permission_denied</p><h2 className="mt-2 text-lg font-semibold">No campaign role is available</h2><p className="mt-1 text-sm text-slate-300">Sign in with a tenant operator or marketing approver session.</p></section>}
      </div>
    </div>
  );
}
