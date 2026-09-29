import { createHmac, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

import { correlationIdOf, fail, replyFailure } from '../../gateway/http.js';
import { authenticate, requireOperator } from '../../gateway/principal.js';
import type { GatewayRuntime } from '../../gateway/ports.js';
import type { DemoCredentialStore } from '../../runtime/demo-auth.js';

interface WidgetMintDependencies {
  readonly demoAuth: DemoCredentialStore;
  readonly runtime: GatewayRuntime;
}

interface CatalogItem {
  readonly sku_id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly use_case: string;
  readonly description: string;
  readonly currency: string;
  readonly list_price: number;
  readonly is_active: true;
}

function projectCatalogItem(value: unknown): CatalogItem | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  for (const field of ['sku_id', 'name', 'brand', 'category', 'use_case', 'description', 'currency']) {
    if (typeof item[field] !== 'string') return null;
  }
  if (item.is_active !== true || typeof item.list_price !== 'number' || !Number.isFinite(item.list_price)) return null;
  return {
    sku_id: item.sku_id as string, name: item.name as string, brand: item.brand as string,
    category: item.category as string, use_case: item.use_case as string,
    description: item.description as string, currency: item.currency as string,
    list_price: item.list_price, is_active: true,
  };
}

/** An operator may launch only a fresh anonymous session or the seeded, verified C05 persona. */
export function registerDemoWidgetRoutes(app: FastifyInstance, deps: WidgetMintDependencies): void {
  app.post('/demo/widget-session', { preHandler: authenticate({ credentials: deps.demoAuth, runtime: deps.runtime }) },
    async (request, reply) => {
      try {
        requireOperator(request, 'conversation:takeover');
        const origin = request.headers.origin;
        const allowed = (process.env.DEMO_WIDGET_ORIGINS ?? '').split(',').map((value) => value.trim());
        if (typeof origin !== 'string' || !allowed.includes(origin) || !/^https?:\/\/[^/]+$/.test(origin)) {
          fail('AUTHENTICATION_FAILED', 'this origin is not approved for the demo widget');
        }
        const body = request.body;
        if (typeof body !== 'object' || body === null || Array.isArray(body) ||
          Object.keys(body).some((key) => key !== 'persona')) {
          fail('VALIDATION_FAILED', 'only a demo persona may be selected');
        }
        const persona = (body as { persona?: unknown }).persona;
        if (persona !== undefined && persona !== 'anonymous' && persona !== 'C05') {
          fail('VALIDATION_FAILED', 'the demo persona is not supported');
        }
        const session_id = persona === 'C05' ? 'sess-novamart-c05' : `demo-anon-${randomUUID()}`;
        const issued = deps.demoAuth.issueWidget(session_id, origin);
        return reply.code(201).header('cache-control', 'no-store').send(issued);
      } catch (error) {
        return replyFailure(reply, error, correlationIdOf(request, deps.runtime));
      }
    });
  app.get('/demo/catalog', { preHandler: authenticate({ credentials: deps.demoAuth, runtime: deps.runtime }) },
    async (request, reply) => {
      try {
        const principal = requireOperator(request, 'conversation:takeover');
        const secret = process.env.MOCK_SECRET_KEY;
        const configured = process.env.ERP_API_BASE_URL;
        if (!secret || !configured || process.env.MOCK_ERP_ENABLED !== 'true') {
          fail('CAPABILITY_NOT_ENABLED', 'demo catalog source is not configured');
        }
        const base = new URL(configured);
        if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
          fail('CAPABILITY_NOT_ENABLED', 'demo catalog source is invalid');
        }
        const response = await fetch(`${configured.replace(/\/+$/, '')}/catalog/items`, {
          headers: {
            'x-tenant-id': principal.tenant_id,
            'x-mock-signature': createHmac('sha256', secret).update('').digest('hex'),
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) fail('CAPABILITY_NOT_ENABLED', 'demo catalog source is unavailable');
        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('items' in data) || !Array.isArray(data.items)) {
          fail('CAPABILITY_NOT_ENABLED', 'demo catalog response is invalid');
        }
        const envelope = data as Record<string, unknown>;
        const items = (data.items as unknown[]).map(projectCatalogItem).filter((item): item is CatalogItem => item !== null);
        if (items.length === 0) fail('CAPABILITY_NOT_ENABLED', 'demo catalog contains no active products');
        const snapshot_at = typeof envelope.snapshot_at === 'string' && envelope.snapshot_at.length > 0 ? envelope.snapshot_at : undefined;
        return reply.code(200).header('cache-control', 'no-store').send({
          items,
          ...(snapshot_at === undefined ? {} : { snapshot_at }),
        });
      } catch (error) {
        return replyFailure(reply, error, correlationIdOf(request, deps.runtime));
      }
    });
}
