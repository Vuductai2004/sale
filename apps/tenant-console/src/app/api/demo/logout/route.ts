import {
  apiV1Url,
  appendClearedCookies,
  backendErrorPayload,
  configurationResponse,
  deleteDemoSession,
  getDemoSession,
  hasDemoCookieKey,
  isDemoEnabled,
  jsonResponse,
  mutationGuard,
  unavailableResponse,
  unauthorizedResponse,
} from '../../../../lib/demo-bff';

async function readBackendJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isDemoEnabled()) return unavailableResponse();
  if (!hasDemoCookieKey()) return configurationResponse();

  const session = getDemoSession(request);
  const guard = mutationGuard(request, session);
  if (guard) return guard;
  if (!session) return unauthorizedResponse();

  let upstream: Response;
  try {
    upstream = await fetch(apiV1Url('/demo/logout'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.apiToken}`,
      },
      redirect: 'manual',
    });
  } catch {
    deleteDemoSession(request);
    const response = jsonResponse({ error: 'API_UNAVAILABLE' }, 502);
    appendClearedCookies(response, request);
    return response;
  }

  const payload = await readBackendJson(upstream);
  deleteDemoSession(request);
  const response = upstream.ok
    ? jsonResponse({ ok: true }, 200)
    : jsonResponse(backendErrorPayload(payload, 'LOGOUT_FAILED'), upstream.status);
  appendClearedCookies(response, request);
  return response;
}
