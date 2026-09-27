import { HttpClient, type RequestOptions } from '@agentos/ui-foundation';
import type {
  AutonomyDemoteRequest,
  AutonomyInspectionResponse,
  GetRunsParams,
  GetRunsResponse,
  RunRetryRequest,
  TaskAcceptedResponse,
  TenantWorkspaceResponse,
} from './types/admin-and-runs';

/** P5 tenant-admin route paths. The gateway supplies the /api/v1 prefix. */
export const TENANT_ADMIN_PATHS = Object.freeze({
  currentTenant: '/admin/tenants/current',
  autonomy: '/admin/autonomy',
  pause: '/admin/autonomy/pause',
  resume: '/admin/autonomy/resume',
  demote: '/admin/autonomy/demote',
} as const);

/** Browser-safe transport for platform-admin P5 and operations routes only. */
export class AdminOperationsClient extends HttpClient {
  async getRuns(
    params?: GetRunsParams,
    options?: RequestOptions,
  ): Promise<GetRunsResponse> {
    const query = {
      cursor: params?.cursor,
      limit: params?.limit,
      agent_id: params?.agent_id,
      state: params?.state,
      status: params?.status,
      from: params?.from,
      to: params?.to,
    };
    return this.request<GetRunsResponse>('/runs', { method: 'GET' }, query, options);
  }

  async retryRun(
    runId: string,
    body: RunRetryRequest = {},
    options?: RequestOptions,
  ): Promise<TaskAcceptedResponse> {
    return this.request<TaskAcceptedResponse>(
      `/operations/runs/${encodeURIComponent(runId)}/retry`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      undefined,
      options,
    );
  }

  async getCurrentTenant(options?: RequestOptions): Promise<TenantWorkspaceResponse> {
    return this.request<TenantWorkspaceResponse>(
      TENANT_ADMIN_PATHS.currentTenant,
      { method: 'GET' },
      undefined,
      options,
    );
  }

  async getAutonomy(options?: RequestOptions): Promise<AutonomyInspectionResponse> {
    return this.request<AutonomyInspectionResponse>(
      TENANT_ADMIN_PATHS.autonomy,
      { method: 'GET' },
      undefined,
      options,
    );
  }

  async pauseAutonomy(options?: RequestOptions): Promise<unknown> {
    return this.request<unknown>(TENANT_ADMIN_PATHS.pause, { method: 'POST' }, undefined, options);
  }

  async resumeAutonomy(options?: RequestOptions): Promise<unknown> {
    return this.request<unknown>(TENANT_ADMIN_PATHS.resume, { method: 'POST' }, undefined, options);
  }

  async demoteAutonomy(
    body: AutonomyDemoteRequest,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.request<unknown>(
      TENANT_ADMIN_PATHS.demote,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      undefined,
      options,
    );
  }
}

export const adminOperationsClient = new AdminOperationsClient();
