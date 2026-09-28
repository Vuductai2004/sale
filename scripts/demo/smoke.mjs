#!/usr/bin/env node

const TENANT_ID = '99999999-9999-4999-8999-999999999999';

function apiV1Base(env) {
  const raw = (env.DEMO_API_URL ?? env.API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw) throw new Error('DEMO_SMOKE_FAILED: DEMO_API_URL or API_BASE_URL is required');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

async function json(response) {
  try { return await response.json(); } catch { return null; }
}

async function request(base, path, init = {}) {
  const response = await fetch(`${base}/${path.replace(/^\/+/, '')}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  return { response, body: await json(response) };
}

async function login(base, role, password) {
  const { response, body } = await request(base, 'demo/login', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ role, password }),
  });
  if (!response.ok || !body || typeof body.access_token !== 'string' || body.tenant_id !== TENANT_ID) {
    throw new Error(`DEMO_SMOKE_FAILED: ${role} login returned HTTP ${response.status}`);
  }
  return body.access_token;
}

async function readFirstStreamChunk(response) {
  if (!response.body) throw new Error('DEMO_SMOKE_FAILED: storefront stream has no body');
  const reader = response.body.getReader();
  try {
    const { value, done } = await reader.read();
    if (done || !value || value.byteLength === 0) throw new Error('DEMO_SMOKE_FAILED: storefront stream emitted no receipt');
    return new TextDecoder().decode(value).slice(0, 1024);
  } finally {
    await reader.cancel();
  }
}

export async function runDemoSmoke(env = process.env) {
  if (env.DEMO_MODE !== 'true' || !['local', 'ci'].includes(env.APP_ENV)) {
    throw new Error('DEMO_SMOKE_FAILED: DEMO_MODE=true and APP_ENV=local|ci are required');
  }
  const base = apiV1Base(env);
  const origin = (env.DEMO_WIDGET_ORIGINS ?? 'http://localhost:3000').split(',')[0].trim();
  const tenantToken = await login(base, 'tenant_operator', env.DEMO_TENANT_OPERATOR_PASSWORD ?? '');
  const approverToken = await login(base, 'marketing_approver', env.DEMO_MARKETING_APPROVER_PASSWORD ?? '');
  const platformToken = await login(base, 'platform_admin', env.DEMO_PLATFORM_ADMIN_PASSWORD ?? '');
  const auth = (token) => ({ accept: 'application/json', authorization: `Bearer ${token}` });

  const widget = await request(base, 'demo/widget-session', {
    method: 'POST',
    headers: { ...auth(tenantToken), origin, 'content-type': 'application/json' },
    body: JSON.stringify({ persona: 'C05' }),
  });
  if (!widget.response.ok || typeof widget.body?.access_token !== 'string') throw new Error(`DEMO_SMOKE_FAILED: widget mint HTTP ${widget.response.status}`);
  const widgetToken = widget.body.access_token;

  const catalog = await request(base, 'demo/catalog', { headers: auth(tenantToken) });
  if (!catalog.response.ok || !Array.isArray(catalog.body?.items) || catalog.body.items.length === 0) throw new Error(`DEMO_SMOKE_FAILED: catalog HTTP ${catalog.response.status}`);

  // Scenario A (Sales advisor). The Support path additionally requires a live OpenAI-compatible
  // provider for the gateway's intent proposal; without one it refuses with a typed provider error
  // rather than answering from an unvalidated classification.
  const stream = await fetch(`${base}/storefront/stream`, {
    method: 'POST',
    headers: { ...auth(widgetToken), origin, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'I need a laptop under 20 million VND for graphic design.',
      idempotency_key: `demo-smoke-${Date.now()}`,
      module: 'auto',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!stream.ok) {
    const detail = await stream.text().catch(() => '');
    throw new Error(`DEMO_SMOKE_FAILED: storefront stream HTTP ${stream.status} ${detail.slice(0, 300)}`);
  }
  const receiptChunk = await readFirstStreamChunk(stream);

  const readiness = await request(base, 'demo/readiness', { headers: auth(platformToken) });
  if (!readiness.response.ok || readiness.body?.demo_mode !== true) throw new Error(`DEMO_SMOKE_FAILED: readiness HTTP ${readiness.response.status}`);

  const conversations = await request(base, 'conversations?limit=20', { headers: auth(tenantToken) });
  if (!conversations.response.ok) throw new Error(`DEMO_SMOKE_FAILED: conversations HTTP ${conversations.response.status}`);

  const approvals = await request(base, 'approvals?status=PENDING&limit=20', { headers: auth(approverToken) });
  if (!approvals.response.ok) throw new Error(`DEMO_SMOKE_FAILED: approvals HTTP ${approvals.response.status}`);

  const campaign = await request(base, 'campaigns/drafts', {
    method: 'POST',
    headers: { ...auth(tenantToken), 'content-type': 'application/json', 'x-idempotency-key': `demo-smoke-${Date.now()}` },
    body: JSON.stringify({
      idempotency_key: `demo-smoke-${Date.now()}`,
      segment_id: 'inactive_90d',
      objective: 'winback',
      instruction: 'Create a NovaMart reactivation draft for the inactive 90-day segment.',
      content_constraints: { channel: 'EMAIL_HTML', locale: 'vi-VN', max_length: 600 },
    }),
  });
  if (!campaign.response.ok) throw new Error(`DEMO_SMOKE_FAILED: campaign draft HTTP ${campaign.response.status}`);

  return {
    tenant_id: TENANT_ID,
    catalog_items: catalog.body.items.length,
    widget_session: 'issued',
    storefront_receipt: receiptChunk.includes('task_id') ? 'observed' : 'streamed',
    readiness: readiness.body.provider?.probe ?? 'unknown',
    conversations: 'observed',
    approvals: 'observed',
    campaign_draft: 'accepted',
  };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/demo/smoke.mjs')) {
  runDemoSmoke().then((result) => {
    console.log(`NovaMart demo smoke passed: ${JSON.stringify(result)}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'DEMO_SMOKE_FAILED');
    process.exitCode = 1;
  });
}
