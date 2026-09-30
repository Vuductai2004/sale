'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '@agentos/ui-foundation';
import { Button, Modal } from '@agentos/ui-foundation/react';
import { adminOperationsClient } from '../../lib/admin-operations-client';
import type {
  AutonomyInspectionResponse,
  AutonomyPolicyState,
  TenantAutonomyProjection,
  TenantCapabilitiesProjection,
  TenantWorkspaceResponse,
} from '../../lib/types/admin-and-runs';

const UNAVAILABLE = 'UNAVAILABLE';
const UNRESOLVED = 'UNRESOLVED';
const CONNECTOR_STATES = ['UNBOUND', 'DISABLED', 'BOUND'] as const;
const AUTONOMY_STATES = ['MINIMUM', 'PROMOTED', 'PAUSED', 'DEMOTED'] as const;

type ConnectorState = (typeof CONNECTOR_STATES)[number];
type PolicyRow = { readonly skillId: string; readonly state: string };

type ActionName = 'pause' | 'resume' | 'demote';
type PendingAction = {
  readonly name: ActionName;
  readonly operation: () => Promise<unknown>;
  readonly success: string;
  readonly title: string;
  readonly detail: string;
};
function displayText(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : UNAVAILABLE;
}

function connectorState(value: unknown): ConnectorState | null {
  return typeof value === 'string' && CONNECTOR_STATES.includes(value as ConnectorState)
    ? (value as ConnectorState)
    : null;
}

function autonomyState(value: unknown): AutonomyPolicyState | null {
  return typeof value === 'string' && AUTONOMY_STATES.includes(value as AutonomyPolicyState)
    ? (value as AutonomyPolicyState)
    : null;
}

function capabilityView(value: TenantWorkspaceResponse['capabilities']): {
  readonly status: string;
  readonly configured: readonly string[];
  readonly unconfigured: readonly string[];
} {
  if (typeof value === 'string') {
    return {
      status: value === 'CONFIGURED' || value === 'UNCONFIGURED' ? value : UNAVAILABLE,
      configured: [],
      unconfigured: [],
    };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { status: UNAVAILABLE, configured: [], unconfigured: [] };
  }

  const projection = value as TenantCapabilitiesProjection;
  const status = projection.status === 'CONFIGURED' || projection.status === 'UNCONFIGURED'
    ? projection.status
    : UNAVAILABLE;
  const configured = Array.isArray(projection.configured)
    ? projection.configured.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const unconfigured = Array.isArray(projection.unconfigured)
    ? projection.unconfigured.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return { status, configured, unconfigured };
}

function connectorView(value: TenantWorkspaceResponse['connector_readiness']): {
  readonly status: string;
  readonly enabled: string;
} {
  if (typeof value === 'string') {
    return { status: connectorState(value) ?? UNAVAILABLE, enabled: UNAVAILABLE };
  }

  const projection = value;
  return {
    status: connectorState(projection?.status) ?? UNAVAILABLE,
    enabled: connectorState(projection?.enabled) ?? UNAVAILABLE,
  };
}

function ownerInputKeys(tenant: TenantWorkspaceResponse | null): readonly string[] {
  if (Array.isArray(tenant?.unresolved_owner_inputs)) {
    const unresolved = tenant.unresolved_owner_inputs.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (unresolved.length > 0) return unresolved;
  }

  if (Array.isArray(tenant?.owner_inputs)) {
    return tenant.owner_inputs.flatMap((item) =>
      item.status === UNRESOLVED && typeof item.key === 'string' && item.key.trim().length > 0
        ? [item.key]
        : [],
    );
  }

  return [];
}

function policyRows(
  tenantAutonomy: TenantAutonomyProjection | undefined,
  inspection: AutonomyInspectionResponse | null,
): readonly PolicyRow[] {
  const rows: PolicyRow[] = [];
  const seen = new Set<string>();
  const current = inspection?.current ?? [];
  const currentBySkill = new Map(
    current
      .filter((record) => typeof record.skill_id === 'string' && record.skill_id.trim().length > 0)
      .map((record) => [record.skill_id as string, record]),
  );

  for (const candidate of tenantAutonomy?.candidate_skills ?? []) {
    const skillId = typeof candidate.skill_id === 'string' && candidate.skill_id.trim().length > 0
      ? candidate.skill_id
      : UNAVAILABLE;
    if (skillId !== UNAVAILABLE) seen.add(skillId);
    const state = autonomyState(currentBySkill.get(skillId)?.state) ?? autonomyState(candidate.workflow) ?? UNAVAILABLE;
    rows.push({ skillId, state });
  }

  for (const record of current) {
    const skillId = typeof record.skill_id === 'string' && record.skill_id.trim().length > 0
      ? record.skill_id
      : UNAVAILABLE;
    if (skillId !== UNAVAILABLE && seen.has(skillId)) continue;
    if (skillId !== UNAVAILABLE) seen.add(skillId);
    rows.push({ skillId, state: autonomyState(record.state) ?? UNAVAILABLE });
  }

  return rows;
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.message.trim().length > 0) return error.message;
  return 'Tenant workspace data is unavailable.';
}

function PanelSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function TenantWorkspace() {
  const [tenant, setTenant] = useState<TenantWorkspaceResponse | null>(null);
  const [inspection, setInspection] = useState<AutonomyInspectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionName | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [demoteSkillId, setDemoteSkillId] = useState('');
  const [demoteReason, setDemoteReason] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setTenant(null);
    setInspection(null);
    setNotice(null);
    try {
      const [tenantResult, autonomyResult] = await Promise.allSettled([
        adminOperationsClient.getCurrentTenant(),
        adminOperationsClient.getAutonomy(),
      ]);

      if (tenantResult.status === 'fulfilled') setTenant(tenantResult.value);
      if (autonomyResult.status === 'fulfilled') setInspection(autonomyResult.value);

      if (tenantResult.status === 'rejected') throw tenantResult.reason;
      if (autonomyResult.status === 'rejected') throw autonomyResult.reason;
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(errorText(error));
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace().catch(() => undefined);
  }, [loadWorkspace]);

  const capabilities = useMemo(() => capabilityView(tenant?.capabilities), [tenant?.capabilities]);
  const connectors = useMemo(() => connectorView(tenant?.connector_readiness), [tenant?.connector_readiness]);
  const unresolvedInputs = useMemo(() => ownerInputKeys(tenant), [tenant]);
  const policies = useMemo(() => policyRows(tenant?.autonomy, inspection), [inspection, tenant?.autonomy]);
  const isPaused = inspection?.paused === true;

  const runAction = async (name: ActionName, operation: () => Promise<unknown>, success: string) => {
    setAction(name);
    setErrorMessage(null);
    setNotice(null);
    try {
      await operation();
      await loadWorkspace();
      setNotice(success);
    } catch (error) {
      setErrorMessage(errorText(error));
    } finally {
      setAction(null);
    }
  };

  const requestAction = (next: PendingAction) => {
    setPendingAction(next);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const current = pendingAction;
    setPendingAction(null);
    void runAction(current.name, current.operation, current.success);
  };

  const submitDemotion = () => {
    const skillId = demoteSkillId.trim();
    const reason = demoteReason.trim();
    if (skillId.length === 0 || reason.length === 0) return;
    requestAction({
      name: 'demote',
      operation: () => adminOperationsClient.demoteAutonomy({ skill_id: skillId, reason }),
      success: 'Demotion applied; server state reloaded.',
      title: 'Confirm autonomy demotion',
      detail: `Demote ${skillId} with the recorded reason “${reason}”? This changes server-owned autonomy state.`,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sky-400">P5 / Tenant Administration</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">Tenant workspace</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Server-backed readiness and controlled autonomy state. Missing fields remain unavailable.
          </p>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          <div>Tenant: {displayText(tenant?.tenant_id)}</div>
          <div>Workspace: {displayText(tenant?.status)}</div>
        </div>
      </header>

      {loading && tenant === null && inspection === null ? (
        <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-400">
          Loading server state…
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelSection title="Capabilities">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Configuration</dt>
              <dd className="mt-1 font-mono text-slate-200">{capabilities.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Configured</dt>
              <dd className="mt-1 text-slate-200">
                {capabilities.configured.length > 0 ? capabilities.configured.join(', ') : UNAVAILABLE}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Unconfigured</dt>
              <dd className="mt-1 text-slate-200">
                {capabilities.unconfigured.length > 0 ? capabilities.unconfigured.join(', ') : UNAVAILABLE}
              </dd>
            </div>
          </dl>
        </PanelSection>

        <PanelSection title="Connector readiness">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Binding</dt>
              <dd className="mt-1 font-mono text-slate-200">{connectors.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Enablement</dt>
              <dd className="mt-1 font-mono text-slate-200">{connectors.enabled}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">Readiness vocabulary is limited to UNBOUND, DISABLED, and BOUND.</p>
        </PanelSection>

        <PanelSection title="Autonomy policy">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Tenant pause state:{' '}
              <span className="font-mono text-slate-200">
                {inspection?.paused === true ? 'PAUSED' : inspection?.paused === false ? 'NOT PAUSED' : UNAVAILABLE}
              </span>
            </p>
            <button
              type="button"
              disabled={loading || inspection === null || action !== null}
              onClick={() => requestAction({
                name: isPaused ? 'resume' : 'pause',
                operation: isPaused ? () => adminOperationsClient.resumeAutonomy() : () => adminOperationsClient.pauseAutonomy(),
                success: `${isPaused ? 'Resume' : 'Pause'} applied; server state reloaded.`,
                title: `Confirm ${isPaused ? 'autonomy resume' : 'autonomy pause'}`,
                detail: `This will ${isPaused ? 'resume' : 'pause'} autonomy for the current tenant. The server response is authoritative.`,
              })}
              className="rounded-md border border-sky-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sky-200 transition hover:bg-sky-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'pause' || action === 'resume' ? 'Updating…' : isPaused ? 'Resume autonomy' : 'Pause autonomy'}
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Skill</th>
                  <th scope="col" className="px-3 py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {policies.length > 0 ? policies.map((policy, index) => (
                  <tr key={`${policy.skillId}-${index}`}>
                    <td className="px-3 py-2 font-mono text-slate-300">{policy.skillId}</td>
                    <td className="px-3 py-2 font-mono text-slate-200">{policy.state}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 font-mono text-slate-500">{UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Demote a skill</h3>
            <p className="mt-1 text-xs text-slate-500">Demotion accepts a skill id and operator reason only; server policy fields remain server-owned.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="demote-skill-id" className="text-xs text-slate-500">Skill id</label>
                <input
                  id="demote-skill-id"
                  value={demoteSkillId}
                  onChange={(event) => setDemoteSkillId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="skill id"
                />
              </div>
              <div>
                <label htmlFor="demote-reason" className="text-xs text-slate-500">Reason</label>
                <input
                  id="demote-reason"
                  value={demoteReason}
                  onChange={(event) => setDemoteReason(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="operator reason"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={loading || action !== null || demoteSkillId.trim().length === 0 || demoteReason.trim().length === 0}
              onClick={submitDemotion}
              className="mt-3 rounded-md border border-amber-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'demote' ? 'Demoting…' : 'Demote skill'}
            </button>
          </div>
        </PanelSection>

        <PanelSection title="Unresolved owner inputs">
          {unresolvedInputs.length > 0 ? (
            <ul className="space-y-2 text-sm" role="list">
              {unresolvedInputs.map((input) => (
                <li key={input} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                  <span className="font-mono text-slate-300">{input}</span>
                  <span className="font-mono text-amber-300">{UNRESOLVED}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-sm text-slate-500">{UNAVAILABLE}</p>
          )}
        </PanelSection>
      </div>
      <Modal
        open={pendingAction !== null}
        title={pendingAction?.title ?? 'Confirm autonomy change'}
        description={pendingAction?.detail ?? ''}
        onClose={() => setPendingAction(null)}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={action !== null}>Cancel</Button>
            <Button onClick={confirmPendingAction} loading={action !== null}>Apply change</Button>
          </>
        )}
      >
        <span className="sr-only">Confirm autonomy change</span>
      </Modal>
    </div>
  );
}
