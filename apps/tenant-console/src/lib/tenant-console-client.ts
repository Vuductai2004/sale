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

const CSRF_COOKIE = 'agentos_tenant_csrf';
const CSRF_HEADER = 'x-csrf-token';
const DISALLOWED_BROWSER_HEADERS = ['authorization', 'x-tenant-id', 'x-operator-id'];

type DemoRole = 'tenant_operator' | 'marketing_approver';

export type DemoLoginResponse = {
  readonly role: DemoRole;
  readonly tenant_id: string;
  readonly expires_at: string;
};

export type DemoSessionResponse = {
  readonly role: DemoRole;
  readonly tenant_id: string;
  readonly operator_id?: string;
  readonly permissions?: readonly string[];
};

function browserCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  if (!match) return undefined;
  const value = match.slice(CSRF_COOKIE.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isMutation(method: string | undefined): boolean {
  return method !== undefined && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function secureBrowserFetch(fetchImpl: typeof fetch): typeof fetch {
  return async (input, init = {}) => {
    const headers = new Headers(init.headers);
    for (const header of DISALLOWED_BROWSER_HEADERS) headers.delete(header);
    if (isMutation(init.method)) {
      const csrf = browserCsrfToken();
      if (csrf) headers.set(CSRF_HEADER, csrf);
    }
    return fetchImpl(input, {
      ...init,
      headers,
      credentials: 'same-origin',
    });
  };
}

/** Tenant-console methods are limited to the KPI, approval, customer, takeover, and storefront contracts. */
export class TenantConsoleClient extends HttpClient {
  private readonly browserFetch: typeof fetch;

  constructor(config: HttpClientConfig = {}) {
    const fetchImpl = config.fetch ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    if (!fetchImpl) throw new Error('No fetch implementation available in current environment.');
    const secureFetch = secureBrowserFetch(fetchImpl);
    super({ ...config, baseUrl: config.baseUrl ?? '', fetch: secureFetch });
    this.browserFetch = secureFetch;
  }

  private async ensureDemoCsrfCookie(): Promise<void> {
    if (browserCsrfToken()) return;
    await this.browserFetch('/api/demo/session', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
  }

  async loginDemo(role: DemoRole, password: string): Promise<DemoLoginResponse> {
    await this.ensureDemoCsrfCookie();
    const response = await this.browserFetch('/api/demo/session', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
      credentials: 'same-origin',
    });
    return response.json() as Promise<DemoLoginResponse>;
  }

  async getDemoSession(): Promise<DemoSessionResponse> {
    const response = await this.browserFetch('/api/demo/session', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    return response.json() as Promise<DemoSessionResponse>;
  }

  async logoutDemo(): Promise<void> {
    await this.ensureDemoCsrfCookie();
    await this.browserFetch('/api/demo/logout', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
  }

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

  async postOperatorMessage(
    conversationId: string,
    body: { readonly message: string; readonly idempotency_key?: string },
    options?: RequestOptions | undefined,
  ): Promise<{ readonly conversation_id: string; readonly message_id: string; readonly status: string }> {
    return this.request<{ readonly conversation_id: string; readonly message_id: string; readonly status: string }>(
      `/conversations/${encodeURIComponent(conversationId)}/operator-messages`,
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
