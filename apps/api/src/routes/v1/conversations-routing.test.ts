import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createCredentialStore } from '../../gateway/principal.js';
import type { GatewayRuntime } from '../../gateway/ports.js';
import { replyFailure } from '../../gateway/http.js';
import { registerConversationRoutes } from './conversations.js';
import { registerStorefrontRoutes } from './storefront.js';

const TENANT = 'tenant-a';
const CONVERSATION = '11111111-1111-4111-8111-111111111111';

function harness() {
  const start = vi.fn(async (input: { correlation_id: string }) => ({
    run_id: 'run-a', task_version: 1, lifecycle_state: 'queued', correlation_id: input.correlation_id,
  }));
  const read = vi.fn(async () => ({
    run_id: 'run-a', task_version: 2, lifecycle_state: 'completed', correlation_id: 'corr-a',
    conversation_id: CONVERSATION, session_id: 'thread-a', answer: 'Approved answer', sources: [],
  }));
  const runtime = {
    runs: { start, read },
    identity: { resolveCustomer: vi.fn(async () => ({ customer_id: null })) },
    conversations: {
      get: vi.fn(async () => ({
        conversation_id: CONVERSATION, tenant_id: TENANT, customer_id: null, channel: 'WEB_CHAT',
        external_thread_id: 'thread-a', state: 'open',
      })),
      bindOrCreate: vi.fn(async () => ({
        conversation_id: CONVERSATION, tenant_id: TENANT, customer_id: null, channel: 'WEB_CHAT',
        external_thread_id: 'thread-a', state: 'open', bound: false,
      })),
      appendMessage: vi.fn(async () => undefined),
    },
    takeover: { holder: vi.fn(async () => null) },
    receipts: { receiptFor: vi.fn(async () => null), storeReceipt: vi.fn(async () => undefined) },
    effects: {
      computeEffectKey: (input: { request_id: string }) => input.request_id,
      computeRequestFingerprint: (input: unknown) => JSON.stringify(input),
    },
    audit: { record: vi.fn(async () => undefined) },
    clock: () => new Date('2026-09-28T00:00:00.000Z'),
    ids: () => 'corr-a',
  } as unknown as GatewayRuntime;
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => replyFailure(reply, error, 'routing-test'));
  const credentials = createCredentialStore({
      sessions: [
        { token: 'owner', tenant_id: TENANT, conversation_id: CONVERSATION, session_id: 'thread-a', channel: 'WEB_CHAT' },
        { token: 'other', tenant_id: TENANT, conversation_id: '22222222-2222-4222-8222-222222222222', session_id: 'thread-b', channel: 'WEB_CHAT' },
      ],
      widgets: [{ token: 'widget', tenant_id: TENANT, session_id: 'thread-a', origin: 'https://demo.example.test' }],
      operators: [
        { token: 'reader', tenant_id: TENANT, operator_id: 'op-reader', permissions: ['run:read'] },
        { token: 'non-reader', tenant_id: TENANT, operator_id: 'op-no-read', permissions: [] },
      ],
  });
  registerConversationRoutes(app, { runtime, credentials, enabledModules: ['support', 'sales'] });
  registerStorefrontRoutes(app, { runtime, credentials, enabledModules: ['support', 'sales'] });
  return { app, start, read };
}

describe('conversation turn routing and task ownership', () => {
  it('routes auto product advice to Sales but an order complaint to Care', async () => {
    const { app, start } = harness();
    try {
      for (const [message, module, key] of [
        ['Recommend a product in stock under my budget', 'sales', 'product'],
        ['I need a refund for a damaged product', 'support', 'complaint'],
      ]) {
        const response = await app.inject({
          method: 'POST', url: `/conversations/${CONVERSATION}/messages`,
          headers: { authorization: 'Bearer owner' },
          payload: { message, module: 'auto', idempotency_key: key },
        });
        expect(response.statusCode).toBe(202);
        expect(start.mock.calls.at(-1)?.[0]).toMatchObject({ payload: { module, message } });
      }
    } finally { await app.close(); }
  });

  it('admits an omitted-module storefront product turn as Sales with its session-bound receipt', async () => {
    const { app, start } = harness();
    try {
      const response = await app.inject({
        method: 'POST', url: '/storefront/stream',
        headers: { authorization: 'Bearer widget', origin: 'https://demo.example.test' },
        payload: { message: 'Recommend a product in stock', idempotency_key: 'widget-product' },
      });
      expect(response.statusCode).toBe(200);
      expect(start.mock.calls[0]?.[0]).toMatchObject({
        session_id: 'thread-a', payload: { module: 'sales' },
      });
      expect(response.body).toContain('\"task_id\":\"run-a\"');
    } finally { await app.close(); }
  });

  it('returns a completed answer only to its owner session, bound widget, or permitted operator', async () => {
    const { app, read } = harness();
    try {
      for (const [token, origin] of [['owner', ''], ['widget', 'https://demo.example.test'], ['reader', '']]) {
        const response = await app.inject({
          method: 'GET', url: '/tasks/run-a',
          headers: { authorization: `Bearer ${token}`, ...(origin ? { origin } : {}) },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().answer).toBe('Approved answer');
      }
      for (const [token, expected] of [['other', 404], ['non-reader', 403], ['unknown', 401]]) {
        const response = await app.inject({ method: 'GET', url: '/tasks/run-a', headers: { authorization: `Bearer ${token}` } });
        expect(response.statusCode).toBe(expected);
        expect(response.json().answer).toBeUndefined();
      }
      expect(read).toHaveBeenCalledTimes(5);
    } finally { await app.close(); }
  });
});
