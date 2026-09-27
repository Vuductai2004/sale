import type { ApiErrorEnvelope } from './types/common.js';
declare const process: { env?: { NEXT_PUBLIC_API_URL?: string } };

export const DEFAULT_API_ORIGIN = 'http://localhost:4000';

/** Next inlines only this public build-time value; no server secret enters the browser. */
export function apiOrigin(): string {
  const configured = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined;
  return configured !== undefined && configured.length > 0 ? configured : DEFAULT_API_ORIGIN;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined | readonly (string | number | boolean)[]>;

/**
 * Builds a valid query string from a parameters record.
 * Omits undefined and null values, and repeats arrays — including a nullish entry a runtime caller
 * can still supply, which the legacy console client skipped instead of serializing as text.
 */
export function buildQueryString(params?: QueryParams | undefined): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}

/** Guarantees one /api/v1 prefix, preserving the existing gateway URL convention. */
export function buildApiUrl(endpoint: string, query?: QueryParams | undefined, baseUrl?: string | undefined): string {
  const origin = (baseUrl !== undefined ? baseUrl : apiOrigin()).trim();
  let cleanOrigin = origin.replace(/\/+$/, '');
  if (cleanOrigin.endsWith('/api/v1')) cleanOrigin = cleanOrigin.slice(0, -'/api/v1'.length);
  let cleanEndpoint = endpoint.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (cleanEndpoint === 'api/v1') cleanEndpoint = '';
  else if (cleanEndpoint.startsWith('api/v1/')) cleanEndpoint = cleanEndpoint.slice('api/v1/'.length);
  const pathPrefix = cleanOrigin.length > 0 ? `${cleanOrigin}/api/v1` : '/api/v1';
  const fullPath = cleanEndpoint.length > 0 ? `${pathPrefix}/${cleanEndpoint}` : pathPrefix;
  const queryString = buildQueryString(query);
  return queryString.length > 0 ? `${fullPath}?${queryString}` : fullPath;
}

export class ApiError extends Error {
  readonly errorCode: string;
  readonly retryable: boolean;
  readonly correlationId: string;
  readonly status: number;
  readonly details?: Record<string, unknown> | unknown | undefined;
  readonly envelope?: ApiErrorEnvelope | undefined;
  readonly code: string;
  readonly error_code: string;
  readonly correlation_id: string;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = envelope.error_code;
    this.code = envelope.error_code;
    this.error_code = envelope.error_code;
    this.retryable = envelope.retryable;
    this.correlationId = envelope.correlation_id;
    this.correlation_id = envelope.correlation_id;
    this.details = envelope.details;
    this.envelope = envelope;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface HttpClientConfig {
  readonly baseUrl?: string | undefined;
  readonly tenantId?: string | undefined;
  readonly operatorId?: string | undefined;
  readonly fetch?: typeof fetch | undefined;
  readonly defaultHeaders?: Record<string, string> | undefined;
}

export interface RequestOptions {
  readonly tenantId?: string | undefined;
  readonly operatorId?: string | undefined;
  readonly headers?: Record<string, string> | undefined;
  readonly signal?: AbortSignal | undefined;
}

/** Shared wire transport; domain endpoints and DTOs live in their owning application. */
export class HttpClient {
  private readonly config: HttpClientConfig;

  constructor(config: HttpClientConfig = {}) {
    this.config = config;
  }

  url(endpoint: string, query?: QueryParams | undefined): string {
    return buildApiUrl(endpoint, query, this.config.baseUrl);
  }

  async requestRaw(
    endpoint: string,
    init: RequestInit = {},
    query?: QueryParams | undefined,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    if (init.body && typeof init.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const tenantId = options.tenantId || this.config.tenantId;
    if (tenantId) headers['x-tenant-id'] = tenantId;
    const operatorId = options.operatorId || this.config.operatorId;
    if (operatorId) headers['x-operator-id'] = operatorId;
    const requestInit: RequestInit = { ...init, headers };
    if (options.signal !== undefined) requestInit.signal = options.signal;
    const fetchFn = this.config.fetch ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    if (!fetchFn) throw new Error('No fetch implementation available in current environment.');
    return fetchFn(this.url(endpoint, query), requestInit);
  }

  async request<T>(
    endpoint: string,
    init: RequestInit = {},
    query?: QueryParams | undefined,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await this.requestRaw(endpoint, init, query, options);
    if (!response.ok) {
      let envelope: ApiErrorEnvelope;
      try {
        const errorJson = (await response.json()) as Record<string, unknown>;
        const raw = errorJson && typeof errorJson.error === 'object' && errorJson.error !== null
          ? errorJson.error as Record<string, unknown> : errorJson;
        const rawMsg =
          (typeof raw?.message === 'string' && raw.message) ||
          (typeof errorJson?.message === 'string' && errorJson.message) ||
          (typeof errorJson?.error === 'string' && errorJson.error) ||
          response.statusText || `Request failed with status ${response.status}`;
        const rawCode =
          (typeof raw?.error_code === 'string' && raw.error_code) ||
          (typeof raw?.code === 'string' && raw.code) ||
          (typeof errorJson?.error_code === 'string' && errorJson.error_code) ||
          (typeof errorJson?.code === 'string' && errorJson.code) || 'HTTP_ERROR';
        const rawCorr =
          (typeof raw?.correlation_id === 'string' && raw.correlation_id) ||
          (typeof raw?.correlationId === 'string' && raw.correlationId) ||
          (typeof errorJson?.correlation_id === 'string' && errorJson.correlation_id) ||
          (typeof errorJson?.correlationId === 'string' && errorJson.correlationId) ||
          response.headers.get('x-correlation-id') || '';
        const rawRetry = typeof raw?.retryable === 'boolean' ? raw.retryable
          : typeof errorJson?.retryable === 'boolean' ? errorJson.retryable
          : response.status >= 500 && response.status !== 501;
        envelope = {
          error_code: rawCode,
          message: rawMsg,
          retryable: rawRetry,
          correlation_id: rawCorr,
          details: raw?.details ?? errorJson?.details,
        };
      } catch {
        envelope = {
          error_code: 'HTTP_ERROR',
          message: response.statusText || `Request failed with status ${response.status}`,
          retryable: response.status >= 500 && response.status !== 501,
          correlation_id: response.headers.get('x-correlation-id') || '',
        };
      }
      throw new ApiError(response.status, envelope);
    }
    if (response.status === 204) return undefined as unknown as T;
    return await response.json() as T;
  }
}
