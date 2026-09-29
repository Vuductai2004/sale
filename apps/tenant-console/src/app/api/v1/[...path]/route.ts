import {
  apiV1Url,
  appendClearedCookies,
  configurationResponse,
  deleteDemoSession,
  forbiddenResponse,
  getDemoSession,
  hasDemoCookieKey,
  isDemoEnabled,
  isMutationMethod,
  jsonResponse,
  maxProxyBodyBytes,
  mutationGuard,
  unavailableResponse,
  unauthorizedResponse,
} from '../../../../lib/demo-bff';

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'if-none-match',
  'if-match',
  'x-correlation-id',
  'x-idempotency-key',
  'x-request-id',
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
  'etag',
  'last-modified',
  'location',
] as const;

type RouteContext = { params: { path?: string[] } | Promise<{ path?: string[] }> };

function routePath(segments: string[] | undefined): string | undefined {
  if (!segments || segments.length === 0) return undefined;
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..' || segment.includes('/'))) {
    return undefined;
  }
  return segments.join('/');
}

function isAllowedPath(path: string, method: string): boolean {
  if (path === 'demo/widget-session') return method === 'POST';
  if (path === 'demo/catalog') return method === 'GET';
  if (/^approvals(?:\/[^/]+(?:\/decision)?)?$/.test(path)) return true;
  if (/^customers\/[^/]+\/timeline$/.test(path)) return true;
  if (/^telemetry(?:\/kpi-snapshot|\/stream)?$/.test(path)) return true;
  if (/^conversations(?:\/[^/]+(?:\/(?:takeover|takeover\/heartbeat|resume|messages|operator-messages))?)?$/.test(path)) return true;
  if (/^storefront\/(?:stream|events)$/.test(path)) return true;
  if (/^tasks\/[^/]+$/.test(path)) return true;
  if (/^runs\/[^/]+\/trace$/.test(path)) return method === 'GET';
  if (/^campaigns(?:\/[^/]+)?$/.test(path)) return true;
  return false;
}

function requestHeaders(request: Request, token: string, path: string): Headers {
  const isStorefront = path.startsWith('storefront/') || path.startsWith('tasks/');
  const customAuth = isStorefront ? request.headers.get('authorization') : null;
  const headers = new Headers({ Authorization: customAuth ?? `Bearer ${token}` });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (path === 'demo/widget-session' || isStorefront) {
    const origin = request.headers.get('origin');
    if (origin) headers.set('origin', origin);
  }
  return headers;
}

function responseHeaders(response: Response): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  if (!isDemoEnabled()) return unavailableResponse();
  if (!hasDemoCookieKey()) return configurationResponse();

  const params = await context.params;
  const path = routePath(params.path);
  if (!path || !isAllowedPath(path, request.method.toUpperCase())) {
    return jsonResponse({ error: 'NOT_FOUND' }, 404);
  }

  const session = getDemoSession(request);
  if (!session) return unauthorizedResponse();
  if (path === 'demo/widget-session' && session.role !== 'tenant_operator') return forbiddenResponse();

  if (isMutationMethod(request.method)) {
    const guard = mutationGuard(request, session);
    if (guard) return guard;
  }

  let body: ArrayBuffer | undefined;
  if (isMutationMethod(request.method)) {
    const declaredLength = Number(request.headers.get('content-length') || '0');
    if (declaredLength > maxProxyBodyBytes()) return jsonResponse({ error: 'REQUEST_TOO_LARGE' }, 413);
    body = await request.arrayBuffer();
    if (body.byteLength > maxProxyBodyBytes()) return jsonResponse({ error: 'REQUEST_TOO_LARGE' }, 413);
  }

  const target = `${apiV1Url(`/${path}`)}${new URL(request.url).search}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: requestHeaders(request, session.apiToken, path),
      ...(body ? { body } : {}),
      redirect: 'manual',
    });
  } catch {
    return jsonResponse({ error: 'API_UNAVAILABLE' }, 502);
  }

  if (upstream.status === 401 && !path.startsWith('storefront/') && !path.startsWith('tasks/')) {
    deleteDemoSession(request);
    const response = new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream),
    });
    appendClearedCookies(response, request);
    return response;
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream),
  });
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}

export async function HEAD(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, context);
}
