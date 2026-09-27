import type { AuthorityVerdict, TaskLifecycleState } from '@agentos/ui-foundation';

export type { AuthorityVerdict, TaskLifecycleState };

export type StepExecutionStatus =
  | 'pending'
  | 'executing'
  | 'success'
  | 'failed'
  | 'denied'
  | 'aborted';

export interface GetRunsParams {
  cursor?: string | undefined;
  limit?: number | undefined;
  agent_id?: string | undefined;
  state?: string | undefined;
  status?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface AgentRunStep {
  readonly step_index?: number | undefined;
  readonly step_number?: number | undefined;
  readonly skill: string;
  readonly tool: string;
  readonly authority: AuthorityVerdict | string;
  readonly approval?: string | null | undefined;
  readonly action?: string | undefined;
  readonly execution_status: StepExecutionStatus;
  readonly evidence?: string | null | undefined;
  readonly outcome?: string | null | undefined;
  readonly latency_ms: number;
  readonly cost?: number | undefined;
  readonly error?: string | null | undefined;
  readonly started_at?: string | undefined;
  readonly completed_at?: string | null | undefined;
}

export interface AgentRunProjection {
  readonly run_id: string;
  readonly tenant_id?: string | undefined;
  readonly agent_id?: string | undefined;
  readonly state: TaskLifecycleState;
  readonly task_version: number;
  readonly current_step?: number | undefined;
  readonly retry_count: number;
  readonly last_error_class?: 'RETRYABLE' | 'FATAL' | string | null | undefined;
  readonly steps?: readonly AgentRunStep[] | undefined;
  readonly latency_ms?: number | undefined;
  readonly cost?: number | undefined;
  readonly error?: string | null | undefined;
  readonly started_at?: string | undefined;
  readonly completed_at?: string | null | undefined;
  readonly correlation_id?: string | undefined;
  readonly trigger?: string | undefined;
  readonly skill?: string | undefined;
  readonly tool?: string | undefined;
  readonly authority?: AuthorityVerdict | undefined;
  readonly execution_status?: StepExecutionStatus | undefined;
  readonly token_usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_cost_twd: number;
  } | undefined;
}

export interface GetRunsResponse {
  readonly items: readonly AgentRunProjection[];
  readonly next_cursor: string | null;
  readonly total_count?: number | undefined;
}

export interface RunRetryRequest {
  readonly operator_id?: string | undefined;
  readonly reason?: string | undefined;
}

export interface TaskAcceptedResponse {
  readonly task_id: string;
  readonly conversation_id: string | null;
  readonly status: TaskLifecycleState;
  readonly task_version: number;
  readonly correlation_id: string;
}

export type TenantCapabilityStatus = 'CONFIGURED' | 'UNCONFIGURED';
export type ConnectorReadinessStatus = 'UNBOUND' | 'DISABLED' | 'BOUND';
export type AutonomyPolicyState = 'MINIMUM' | 'PROMOTED' | 'PAUSED' | 'DEMOTED';

export interface TenantCapabilitiesProjection {
  readonly status?: TenantCapabilityStatus | undefined;
  readonly configured?: readonly string[] | undefined;
  readonly unconfigured?: readonly string[] | undefined;
}

export interface ConnectorReadinessProjection {
  readonly status?: ConnectorReadinessStatus | undefined;
  readonly enabled?: ConnectorReadinessStatus | undefined;
}

export interface TenantAutonomyCandidateSkill {
  readonly skill_id?: string | undefined;
  readonly workflow?: AutonomyPolicyState | undefined;
}

export interface TenantAutonomyProjection {
  readonly candidate_skills?: readonly TenantAutonomyCandidateSkill[] | undefined;
  readonly summary?: {
    readonly status?: AutonomyPolicyState | undefined;
    readonly candidate_count?: number | undefined;
  } | undefined;
}

export interface TenantOwnerInputProjection {
  readonly key?: string | undefined;
  readonly status?: 'UNRESOLVED' | undefined;
}

export interface TenantWorkspaceResponse {
  readonly tenant_id?: string | undefined;
  readonly status?: string | undefined;
  readonly capabilities?: TenantCapabilitiesProjection | string | undefined;
  readonly connector_readiness?: ConnectorReadinessProjection | ConnectorReadinessStatus | undefined;
  readonly unresolved_owner_inputs?: readonly string[] | undefined;
  readonly owner_inputs?: readonly TenantOwnerInputProjection[] | undefined;
  readonly autonomy?: TenantAutonomyProjection | undefined;
  readonly kpi?: { readonly status?: 'UNAVAILABLE' | undefined } | undefined;
  readonly provider_health?: { readonly status?: 'UNAVAILABLE' | undefined } | undefined;
}

export interface AutonomyPolicyRecordProjection {
  readonly skill_id?: string | undefined;
  readonly state?: AutonomyPolicyState | undefined;
}

export interface AutonomyInspectionResponse {
  readonly tenant_id?: string | undefined;
  readonly paused?: boolean | undefined;
  readonly current?: readonly AutonomyPolicyRecordProjection[] | undefined;
  readonly history?: readonly AutonomyPolicyRecordProjection[] | undefined;
}

export interface AutonomyDemoteRequest {
  readonly skill_id: string;
  readonly reason: string;
}
