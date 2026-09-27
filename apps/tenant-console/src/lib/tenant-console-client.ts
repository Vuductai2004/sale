import { HttpClient, type HttpClientConfig, type RequestOptions } from '@agentos/ui-foundation';
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalDetailResponse,
  ConversationResumeRequest,
  ConversationResumeResponse,
  ConversationTakeoverHeartbeatRequest,
  ConversationTakeoverHeartbeatResponse,
  ConversationTakeoverRequest,
  ConversationTakeoverResponse,
  CustomerTimelineParams,
  CustomerTimelineResponse,
  EventIngestionResponse,
  GetApprovalsParams,
  GetApprovalsResponse,
  GetKpiSnapshotParams,
  KpiSnapshotResponse,
  PlatformEventEnvelope,
  PostMessageRequest,
  StorefrontStreamRequest,
  TaskAcceptedResponse,
} from './types/tenant-console';

/** Tenant-console methods are limited to the KPI, approval, customer, takeover, and storefront contracts. */
export class TenantConsoleClient extends HttpClient {
  async getApprovals(
    params: GetApprovalsParams = { status: 'PENDING' },
    options?: RequestOptions | undefined,
  ): Promise<GetApprovalsResponse> {
    return this.request<GetApprovalsResponse>(
      '/approvals',
      { method: 'GET' },
      { status: params.status || 'PENDING', cursor: params.cursor, limit: params.limit },
      options,
    );
  }

  async getApproval(
    approvalId: string,
    options?: RequestOptions | undefined,
  ): Promise<ApprovalDetailResponse> {
    return this.request<ApprovalDetailResponse>(
      `/approvals/${encodeURIComponent(approvalId)}`,
      { method: 'GET' },
      undefined,
      options,
    );
  }

  async submitApprovalDecision(
    approvalId: string,
    body: ApprovalDecisionRequest,
    options?: RequestOptions | undefined,
  ): Promise<ApprovalDecisionResponse> {
    return this.request<ApprovalDecisionResponse>(
      `/approvals/${encodeURIComponent(approvalId)}/decision`,
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }

  async getCustomerTimeline(
    customerId: string,
    params?: CustomerTimelineParams | undefined,
    options?: RequestOptions | undefined,
  ): Promise<CustomerTimelineResponse> {
    return this.request<CustomerTimelineResponse>(
      `/customers/${encodeURIComponent(customerId)}/timeline`,
      { method: 'GET' },
      {
        cursor: params?.cursor,
        limit: params?.limit,
        from: params?.from,
        to: params?.to,
      },
      options,
    );
  }

  async getKpiSnapshot(
    params?: GetKpiSnapshotParams | undefined,
    options?: RequestOptions | undefined,
  ): Promise<KpiSnapshotResponse> {
    return this.request<KpiSnapshotResponse>(
      '/telemetry/kpi-snapshot',
      { method: 'GET' },
      {
        window: params?.window,
        timezone: params?.timezone,
        cursor: params?.cursor,
        limit: params?.limit,
      },
      options,
    );
  }

  getTelemetryStreamUrl(params?: {
    readonly metric?: string | undefined;
    readonly channel?: string | undefined;
    readonly cursor?: string | undefined;
  }): string {
    return this.url('/telemetry/stream', params);
  }

  async takeoverConversation(
    conversationId: string,
    body: ConversationTakeoverRequest,
    options?: RequestOptions | undefined,
  ): Promise<ConversationTakeoverResponse> {
    return this.request<ConversationTakeoverResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/takeover`,
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }

  async heartbeatTakeover(
    conversationId: string,
    body: ConversationTakeoverHeartbeatRequest,
    options?: RequestOptions | undefined,
  ): Promise<ConversationTakeoverHeartbeatResponse> {
    return this.request<ConversationTakeoverHeartbeatResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/takeover/heartbeat`,
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }

  async resumeConversation(
    conversationId: string,
    body: ConversationResumeRequest,
    options?: RequestOptions | undefined,
  ): Promise<ConversationResumeResponse> {
    return this.request<ConversationResumeResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/resume`,
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }

  async postConversationMessage(
    conversationId: string,
    body: PostMessageRequest,
    options?: RequestOptions | undefined,
  ): Promise<TaskAcceptedResponse> {
    return this.request<TaskAcceptedResponse>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }

  async postStorefrontStream(
    body: StorefrontStreamRequest,
    options?: RequestOptions | undefined,
  ): Promise<Response> {
    return this.requestRaw(
      '/storefront/stream',
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          ...options?.headers,
        },
      },
    );
  }

  async postStorefrontEvent(
    body: PlatformEventEnvelope & { readonly session_id?: string | undefined },
    options?: RequestOptions | undefined,
  ): Promise<EventIngestionResponse> {
    return this.request<EventIngestionResponse>(
      '/storefront/events',
      { method: 'POST', body: JSON.stringify(body) },
      undefined,
      options,
    );
  }
}

export const tenantConsoleClient = new TenantConsoleClient();

export function createTenantConsoleClient(config?: HttpClientConfig | undefined): TenantConsoleClient {
  return new TenantConsoleClient(config);
}
