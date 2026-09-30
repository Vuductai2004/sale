'use client';

import { Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { can, type AuthSession } from '@agentos/ui-foundation/auth';
import { AuthRequestError, tenantConsoleClient } from '../../../lib/tenant-console-client';
type RunState = {
  readonly task_id?: string;
  readonly task_version?: number;
  readonly status?: string;
  readonly answer?: string;
  readonly sources?: readonly unknown[];
  readonly actions?: readonly unknown[];
  readonly evidence_reference?: string;
  readonly correlation_id?: string;
};
type Trace = {
  readonly run_id?: string;
  readonly lifecycle_state?: string;
  readonly stages?: readonly Record<string, unknown>[];
  readonly provider_calls?: readonly Record<string, unknown>[];
  readonly observed_counts?: { readonly stage_events?: number; readonly provider_calls?: number };
};
type ApiResult = Record<string, unknown>;

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

async function payloadOf(response: Response): Promise<ApiResult> {
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
  if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
    const csrf = readCsrf();
    if (csrf) headers.set('x-csrf-token', csrf);
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  return { response, payload: await payloadOf(response) };
}

function errorText(payload: ApiResult, fallback: string): string {
  const code = typeof payload.error === 'string' ? payload.error : '';
  if (code === 'INSUFFICIENT_AUTHORITY' || code === 'FORBIDDEN') return 'permission_denied: this role cannot read run traces.';
  if (typeof payload.message === 'string') return payload.message;
  return code || fallback;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function statusLabel(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'accepted': return 'ACCEPTED';
    case 'queued': return 'QUEUED';
    case 'running': return 'RUNNING';
    case 'waiting': return 'WAITING';
    case 'pending': return 'PENDING';
    case 'awaiting_approval':
    case 'pending_approval': return 'PENDING_APPROVAL';
    case 'awaiting_human':
    case 'paused_takeover': return 'AWAITING_HUMAN';
    case 'completed': return 'COMPLETED';
    case 'failed': return 'FAILED';
    case 'stopped': return 'STOPPED';
    case 'unavailable': return 'UNAVAILABLE';
    default: return 'UNAVAILABLE';
  }
}

function hasGroundedAnswer(run: RunState): boolean {
  const hasSources = Array.isArray(run.sources) && run.sources.length > 0;
  const hasEvidenceReference = typeof run.evidence_reference === 'string' && run.evidence_reference.trim().length > 0;
  return statusLabel(run.status) === 'COMPLETED'
    && typeof run.answer === 'string'
    && run.answer.trim().length > 0
    && (hasSources || hasEvidenceReference);
}

function runStatusLabel(run: RunState): string {
  return statusLabel(run.status) === 'COMPLETED' && !hasGroundedAnswer(run) ? 'UNAVAILABLE' : statusLabel(run.status);
}

function recordCountLabel(count: number | undefined, records: readonly unknown[] | undefined): string {
  if (typeof count === 'number' && Number.isFinite(count) && count >= 0) return `${count} records`;
  if (records) return `${records.length} records`;
  return 'Unavailable';
}

function TraceConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState(searchParams.get('run_id') || searchParams.get('runId') || '');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void tenantConsoleClient.getAuthSession()
      .then((current) => {
        if (cancelled) return;
        setSession(current);
        if (!can(current, 'run:read')) setError('permission_denied: this session cannot read run traces.');
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        if (reason instanceof AuthRequestError && reason.status === 401) {
          router.replace('/sign-in');
          return;
        }
        setError('Unable to read the authenticated session.');
      })
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function readRun(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const target = runId.trim();
    if (!target) {
      setError('Enter a durable R03 receipt or task ID to inspect observed evidence.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setRun(null);
    setTrace(null);
    try {
      const taskResult = await apiFetch(`/api/v1/tasks/${encodeURIComponent(target)}`);
      if (taskResult.response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!taskResult.response.ok) {
        setError(errorText(taskResult.payload, 'The requested run was not found for this tenant.'));
        return;
      }
      const task: RunState = taskResult.payload as RunState;
      setRun(task);
      const state = typeof task.status === 'string' ? task.status : '';
      if (['pending', 'accepted', 'queued', 'running', 'waiting', 'awaiting_approval', 'pending_approval', 'awaiting_human', 'paused_takeover', 'unavailable'].includes(state.toLowerCase())) return;

      const traceResult = await apiFetch(`/api/v1/runs/${encodeURIComponent(target)}/trace`);
      if (traceResult.response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!traceResult.response.ok) {
        // R03 is authoritative even when a stage projection is not available yet.
        setError(errorText(traceResult.payload, 'Run stages are not available for this run.'));
        return;
      }
      setTrace(traceResult.payload as Trace);
    } catch {
      setError('Unable to reach the run projection service.');
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      await tenantConsoleClient.signOut();
    } finally {
      router.replace('/sign-in');
    }
  }

  if (!isSessionLoading && session === null && error) {
    return (
      <div className="min-h-full px-4 py-10 text-slate-100">
        <section className="mx-auto max-w-xl rounded-xl border border-rose-800/80 bg-rose-950/30 p-6" role="alert">
          <p className="font-mono text-xs uppercase tracking-wider text-rose-300">Session unavailable</p>
          <h1 className="mt-2 text-xl font-semibold">Run trace cannot be loaded</h1>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button type="button" onClick={() => router.replace('/sign-in')} className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">Return to sign in</button>
        </section>
      </div>
    );
  }

  if (!isSessionLoading && session !== null && !can(session, 'run:read')) {
    return <div className="min-h-full px-4 py-10 text-slate-100"><section className="mx-auto max-w-xl rounded-xl border border-rose-800/80 bg-rose-950/30 p-6" role="alert"><p className="font-mono text-xs text-rose-300">403 · permission_denied</p><h1 className="mt-2 text-xl font-semibold">Trace access requires permission</h1><button type="button" onClick={() => void logout()} className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">Sign out</button></section></div>;
  }

  return (
    <div className="min-h-full px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Observability workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Run trace</h1><p className="mt-1 text-sm text-slate-400">Reads the durable R03 projection and redacted stage records only.</p></div><div className="flex flex-wrap gap-2"><a href="/" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Executive</a><a href="/demo/operations" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Operations</a><button type="button" onClick={() => void logout()} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Sign out</button></div></header>

        <form onSubmit={readRun} className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><label htmlFor="run-id" className="mb-2 block text-sm font-medium">Run ID</label><input id="run-id" value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="Paste a durable task/run ID" maxLength={128} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30" /></div><button type="submit" disabled={isLoading || isSessionLoading} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? 'Reading…' : 'Read trace'}</button></form>

        {error && <div role="alert" className="mt-5 rounded-lg border border-rose-800/80 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}

        {!run && !isLoading && !error && <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center"><h2 className="text-base font-semibold">No run selected</h2><p className="mt-2 text-sm text-slate-400">Enter a durable R03 run ID to inspect observed evidence.</p></div>}
        {run && <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5" aria-labelledby="run-summary-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="run-summary-heading" className="text-base font-semibold">Durable run projection</h2>
                <p className="mt-1 break-all text-xs font-mono text-slate-500">{run.task_id || runId}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${runStatusLabel(run) === 'PENDING_APPROVAL' ? 'border-amber-700 bg-amber-950/50 text-amber-200' : runStatusLabel(run) === 'AWAITING_HUMAN' ? 'border-orange-700 bg-orange-950/50 text-orange-200' : runStatusLabel(run) === 'UNAVAILABLE' ? 'border-rose-800 bg-rose-950/40 text-rose-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>{runStatusLabel(run)}</span>
            </div>
            <dl className="mt-5 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-slate-500">Lifecycle</dt><dd className="mt-1 font-mono text-slate-300">{runStatusLabel(run)}</dd></div>
              <div><dt className="text-slate-500">Task version</dt><dd className="mt-1 font-mono text-slate-300">{valueText(run.task_version)}</dd></div>
              <div><dt className="text-slate-500">Correlation</dt><dd className="mt-1 break-all font-mono text-slate-300">{valueText(run.correlation_id)}</dd></div>
              <div><dt className="text-slate-500">Evidence reference</dt><dd className="mt-1 break-all font-mono text-slate-300">{valueText(run.evidence_reference)}</dd></div>
            </dl>
            {hasGroundedAnswer(run) && <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Answer</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{run.answer}</p></div>}
            {hasGroundedAnswer(run) && <div className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sources returned by R03</h3><pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">{JSON.stringify(run.sources, null, 2)}</pre></div>}
            {statusLabel(run.status) === 'COMPLETED' && !hasGroundedAnswer(run) && <p role="status" className="mt-5 rounded-lg border border-rose-900/70 bg-rose-950/20 p-4 text-sm text-rose-200">Unavailable: R03 marked this run completed without returning a durable grounded answer and citation. No answer is shown.</p>}
          </section>

          {trace ? (
            <>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5" aria-labelledby="stages-heading">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 id="stages-heading" className="text-base font-semibold">Observed stages</h2><p className="mt-1 text-sm text-slate-400">Only stages returned by the tenant-scoped trace projection are shown.</p></div>
                  <span className="font-mono text-xs text-slate-500">{recordCountLabel(trace.observed_counts?.stage_events, trace.stages)}</span>
                </div>
                {trace.stages && trace.stages.length > 0 ? <ol className="mt-5 space-y-3">{trace.stages.map((stage, index) => <li key={`${valueText(stage.stage)}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm font-semibold text-sky-300">{valueText(stage.stage)}</span><span className="text-xs text-slate-500">step {valueText(stage.step_index)} · attempt {valueText(stage.attempt_ordinal)}</span></div><dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><div><dt className="inline">Entered: </dt><dd className="inline font-mono text-slate-400">{valueText(stage.entered_at)}</dd></div><div><dt className="inline">Evidence refs: </dt><dd className="inline font-mono text-slate-400">{valueText(stage.evidence_ref_count)}</dd></div></dl></li>)}</ol> : <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">No stage events were returned for this run.</p>}
              </section>
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5" aria-labelledby="provider-heading">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 id="provider-heading" className="text-base font-semibold">Provider calls</h2><p className="mt-1 text-sm text-slate-400">Token and latency fields are displayed only when returned by the projection.</p></div>
                  <span className="font-mono text-xs text-slate-500">{recordCountLabel(trace.observed_counts?.provider_calls, trace.provider_calls)}</span>
                </div>
                {trace.provider_calls && trace.provider_calls.length > 0 ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-xs"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="px-3 py-2 font-medium">Stage</th><th className="px-3 py-2 font-medium">Provider / model</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Latency</th><th className="px-3 py-2 font-medium">Tokens</th></tr></thead><tbody className="divide-y divide-slate-800">{trace.provider_calls.map((call, index) => <tr key={`${valueText(call.stage)}-${index}`}><td className="px-3 py-3 font-mono text-slate-300">{valueText(call.stage)}</td><td className="px-3 py-3 text-slate-400">{valueText(call.provider)} / {valueText(call.model)}</td><td className="px-3 py-3 text-slate-400">{valueText(call.status)}</td><td className="px-3 py-3 font-mono text-slate-400">{valueText(call.latency_ms)} ms</td><td className="px-3 py-3 font-mono text-slate-400">{valueText(call.prompt_tokens)} + {valueText(call.completion_tokens)}</td></tr>)}</tbody></table></div> : trace.provider_calls === undefined && trace.observed_counts?.provider_calls === undefined ? <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">Provider call records are unavailable for this run.</p> : <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">No provider call records were returned for this run.</p>}
              </section>
            </>
          ) : <section role="status" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-base font-semibold">Trace projection unavailable</h2><p className="mt-2 text-sm text-slate-400">R03 returned the durable run state, but stage evidence is not available yet. No evidence is fabricated.</p></section>}
        </div>}
      </div>
    </div>
  );
}

/**
 * The run-trace console reads its `run_id` from the query string. `useSearchParams` suspends during
 * static prerendering, so the console is wrapped in the boundary Next.js requires and the page
 * itself renders a stable fallback.
 */
export default function TracePage() {
  return (
    <Suspense fallback={<div className="min-h-full px-4 py-6 text-slate-100"><p className="text-sm text-slate-400">Loading run trace…</p></div>}>
      <TraceConsole />
    </Suspense>
  );
}
