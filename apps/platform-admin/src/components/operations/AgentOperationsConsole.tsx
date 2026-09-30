/**
 * Root client component for SCR-002: Agent Operations Console.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiError, type SharedUiState } from '@agentos/ui-foundation';
import { StatusBadge, PageHeader } from '@agentos/ui-foundation/react';
import type { Tone } from '@agentos/ui-foundation/status';
import { adminOperationsClient } from '../../lib/admin-operations-client';
import type { AgentRunProjection, GetRunsParams, RunFilters, TaskAcceptedResponse } from './types';
import { AgentDirectory } from './AgentDirectory';
import { RunFilterControls } from './RunFilterControls';
import { RunTable } from './RunTable';
import { RunInspectionDrawer } from './RunInspectionDrawer';
import { RetryRunModal } from './RetryRunModal';
function stateTone(state: SharedUiState): Tone {
  switch (state) {
    case 'loading': return 'info';
    case 'empty': return 'neutral';
    case 'permission_denied': return 'danger';
    case 'dependency_unavailable': return 'warning';
    case 'version_conflict': return 'warning';
    case 'fail_closed': return 'danger';
    case 'stale': return 'warning';
    case 'partial': return 'warning';
    default: return 'neutral';
  }
}
const DEFAULT_FILTERS: RunFilters = {
  agent_id: '',
  state: '',
  status: '',
  from: '',
  to: '',
  limit: 20,
};


export function AgentOperationsConsole() {
  const [runs, setRuns] = useState<readonly AgentRunProjection[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  const [uiState, setUiState] = useState<SharedUiState>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [selectedRun, setSelectedRun] = useState<AgentRunProjection | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState<AgentRunProjection | null>(null);
  const [retrySuccessNotice, setRetrySuccessNotice] = useState<string | null>(null);

  const fetchRuns = useCallback(
    async (cursor?: string) => {
      setUiState('loading');
      setStatusMessage(null);

      try {
        const queryParams: GetRunsParams = {
          limit: filters.limit,
          ...(cursor ? { cursor } : {}),
          ...(filters.agent_id.trim() ? { agent_id: filters.agent_id.trim() } : {}),
          ...(filters.state.trim() ? { state: filters.state.trim() } : {}),
          ...(filters.status.trim() ? { status: filters.status.trim() } : {}),
          ...(filters.from.trim() ? { from: filters.from.trim() } : {}),
          ...(filters.to.trim() ? { to: filters.to.trim() } : {}),
        };
        const res = await adminOperationsClient.getRuns(queryParams);

        const returnedRuns = res.items;
        setRuns(returnedRuns);
        setNextCursor(res.next_cursor);
        setTotalCount(res.total_count);
        setCurrentCursor(cursor);

        if (returnedRuns.length === 0) {
          setUiState('empty');
          setStatusMessage('No agent runs returned matching current filter parameters.');
        } else {
          setUiState('idle');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 403) {
            setUiState('permission_denied');
            setStatusMessage(`[${err.errorCode}] Permission Denied: ${err.message}`);
          } else if (err.status >= 502 && err.status <= 504) {
            setUiState('dependency_unavailable');
            setStatusMessage(`[${err.errorCode}] Upstream Gateway Unavailable: ${err.message}`);
          } else {
            setUiState('fail_closed');
            setStatusMessage(`[${err.errorCode}] System Error: ${err.message}`);
          }
        } else {
          setUiState('dependency_unavailable');
          setStatusMessage('Network connectivity error reaching /api/v1/runs');
        }
        setRuns([]);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => (currentCursor ? [...prev, currentCursor] : [...prev, '']));
    fetchRuns(nextCursor);
  };

  const handlePrevPage = () => {
    if (cursorStack.length === 0) return;
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    fetchRuns(prevCursor || undefined);
  };

  const handleFilterChange = (newFilters: RunFilters) => {
    setFilters(newFilters);
  };

  const handleSelectAgent = (agent_id: string) => {
    setFilters((prev) => ({ ...prev, agent_id }));
  };

  const handleRetrySuccess = (receipt: TaskAcceptedResponse) => {
    setRetrySuccessNotice(
      `Task accepted for re-dispatch (Task ID: ${receipt.task_id}, Version: ${receipt.task_version}, Status: ${receipt.status})`
    );
    fetchRuns(currentCursor);
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform operations" title="Operations hub" description="Tenant-scoped run inspection, cursor filters, and verified safe retry controls." actions={<StatusBadge label={`State: ${uiState.replaceAll('_', ' ')}`} tone={stateTone(uiState)} />} />

      {statusMessage && (
        <div role="status" className={`rounded p-3 text-xs font-mono border ${
          uiState === 'permission_denied' || uiState === 'fail_closed' ? 'bg-rose-950/60 border-rose-800 text-rose-300' :
          uiState === 'dependency_unavailable' ? 'bg-orange-950/60 border-orange-800 text-orange-300' :
          'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          {statusMessage}
        </div>
      )}

      {retrySuccessNotice && (
        <div role="status" className="flex items-center justify-between rounded bg-emerald-950/60 border border-emerald-800 p-3 text-xs text-emerald-300 font-mono">
          <span>{retrySuccessNotice}</span>
          <button type="button" onClick={() => setRetrySuccessNotice(null)} className="text-emerald-400 hover:text-emerald-200">&times;</button>
        </div>
      )}

      <AgentDirectory runs={runs} selectedAgentId={filters.agent_id} onSelectAgent={handleSelectAgent} />

      <RunFilterControls
        filters={filters}
        onChange={handleFilterChange}
        onApply={() => { setCursorStack([]); fetchRuns(); }}
        onReset={() => { setFilters(DEFAULT_FILTERS); setCursorStack([]); }}
        isLoading={uiState === 'loading'}
      />

      <RunTable
        runs={runs}
        isLoading={uiState === 'loading'}
        selectedRunId={selectedRun?.run_id ?? null}
        onSelectRun={(run) => { setSelectedRun(run); setIsDrawerOpen(true); }}
        onRetryRun={(run) => setRetryTarget(run)}
        nextCursor={nextCursor}
        cursorStackLength={cursorStack.length}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        totalCount={totalCount}
      />

      <RunInspectionDrawer
        run={selectedRun}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRetry={(run) => setRetryTarget(run)}
      />

      <RetryRunModal
        run={retryTarget}
        isOpen={Boolean(retryTarget)}
        onClose={() => setRetryTarget(null)}
        onSuccess={handleRetrySuccess}
      />
    </div>
  );
}
