import {
  type AppendCustomerEventInput,
  type CustomerEventRepository,
} from '@agentos/database';

import { fail } from '../../gateway/http.js';
import type {
  EvidenceClassification,
  TimelineEntry,
} from '../../gateway/contracts.js';
import type { EventPort, ReceiptPort } from '../../gateway/ports.js';
import type { IEffectGuard } from '@agentos/core-engine/contracts';

/** The ten stages exposed by the unified Customer 360 timeline (FR-C360-002). */
const TIMELINE_STAGES = Object.freeze([
  'View',
  'Search',
  'Click',
  'Chat',
  'Add to cart',
  'Purchase',
  'Delivery',
  'Support',
  'Review',
  'Repurchase',
] as const);

type TimelineStage = (typeof TIMELINE_STAGES)[number];

/** Payload properties whose values are server-owned evidence, never client-delivered data. */
const RESERVED_EVENT_PAYLOAD_FIELDS = Object.freeze([
  'classification',
  'classification_authority',
  'evidence_reference',
] as const);

const BASELINE_EVENT_STAGES: Readonly<Record<string, TimelineStage>> = Object.freeze({
  session: 'View',
  view: 'View',
  product_view: 'View',
  'product.view': 'View',
  search: 'Search',
  click: 'Click',
  chat: 'Chat',
  message_received: 'Chat',
  'message.received': 'Chat',
  add_to_cart: 'Add to cart',
  checkout: 'Purchase',
  purchase: 'Purchase',
  delivery: 'Delivery',
  support: 'Support',
  review: 'Review',
  repurchase: 'Repurchase',
});

/**
 * Maps platform extension events by their documented suffix vocabulary. For example,
 * ext.marketing.campaign_view maps to View and ext.commerce.delivery_dispatched maps
 * to Delivery. An extension without one of these explicit suffix tokens stays Unknown.
 */
function extensionTimelineStage(eventName: string): TimelineStage | null {
  const match = /^ext\.[^.]+\.(.+)$/.exec(eventName);
  if (match === null) return null;
  const name = match[1]!.toLowerCase();
  if (/(^|[_.-])(view|impression)(?:$|[_.-])/.test(name)) return 'View';
  if (/(^|[_.-])search(?:$|[_.-])/.test(name)) return 'Search';
  if (/(^|[_.-])click(?:$|[_.-])/.test(name)) return 'Click';
  if (/(^|[_.-])(chat|message)(?:$|[_.-])/.test(name)) return 'Chat';
  if (/(^|[_.-])(add_to_cart|cart_add)(?:$|[_.-])/.test(name)) return 'Add to cart';
  if (/(^|[_.-])(purchase|checkout|order)(?:$|[_.-])/.test(name)) return 'Purchase';
  if (/(^|[_.-])(delivery|delivered|shipment)(?:$|[_.-])/.test(name)) return 'Delivery';
  if (/(^|[_.-])support(?:$|[_.-])/.test(name)) return 'Support';
  if (/(^|[_.-])review(?:$|[_.-])/.test(name)) return 'Review';
  if (/(^|[_.-])(repurchase|reorder|replenishment)(?:$|[_.-])/.test(name)) return 'Repurchase';
  return null;
}

function stringPayloadField(payload: Record<string, unknown>, ...keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

function timelineDomain(eventName: string): TimelineEntry['domain'] | undefined {
  const match = /^ext\.([^.]+)\..+$/.exec(eventName);
  if (match === null) return undefined;
  switch (match[1]!.trim().toUpperCase()) {
    case 'MARKETING': return 'MARKETING';
    case 'SALES': return 'SALES';
    case 'COMMERCE': return 'COMMERCE';
    case 'CARE':
    case 'SUPPORT': return 'SUPPORT';
    case 'ORCHESTRATOR': return 'ORCHESTRATOR';
    default: return undefined;
  }
}

function timelineStage(eventName: string): TimelineStage | 'Unknown' {
  return BASELINE_EVENT_STAGES[eventName] ?? extensionTimelineStage(eventName) ?? 'Unknown';
}

function storedClassification(value: unknown): EvidenceClassification | undefined {
  return value === 'FACT' || value === 'SIGNAL' || value === 'HYPOTHESIS' || value === 'DECISION' || value === 'ACTION'
    ? value
    : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function reservedEventPayloadField(payload: Record<string, unknown>): string | undefined {
  const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(value, key);

  for (const field of RESERVED_EVENT_PAYLOAD_FIELDS) {
    if (hasOwn(payload, field)) return field;
  }

  // R04 wraps the delivered payload under payload; R12 passes it directly.
  const nested = payload['payload'];
  if (isPlainRecord(nested)) {
    for (const field of RESERVED_EVENT_PAYLOAD_FIELDS) {
      if (hasOwn(nested, field)) return field;
    }
  }
  return undefined;
}

/** Maps a stored event row onto the truthful ten-stage timeline projection (03 §8). */
function toTimelineEntry(item: {
  readonly event_id: string;
  readonly source_event_id: string;
  readonly event_name: string;
  readonly session_id: string;
  readonly channel: string;
  readonly occurred_at: string;
  readonly payload: Record<string, unknown>;
}): TimelineEntry {
  const authoritativeClassification =
    item.payload['classification_authority'] === 'SERVER'
      ? storedClassification(item.payload['classification'])
      : undefined;
  const classification = authoritativeClassification ?? 'SIGNAL';
  const stage = timelineStage(item.event_name);
  const domain = timelineDomain(item.event_name);
  const summary = stringPayloadField(item.payload, 'summary', 'event_summary', 'description', 'message');
  const evidence_reference =
    authoritativeClassification === undefined
      ? undefined
      : stringPayloadField(item.payload, 'evidence_reference');
  const source_record_id = stringPayloadField(item.payload, 'source_record_id', 'sourceRecordId');
  const gaps: string[] = [];
  if (authoritativeClassification === undefined) gaps.push('CLASSIFICATION_NOT_SERVER_AUTHORITATIVE');
  if (stage === 'Unknown') gaps.push('stage mapping unavailable for event ' + item.event_name);
  if (domain === undefined) gaps.push('domain absent or outside the stored domain vocabulary');
  if (summary === undefined) gaps.push('summary absent from stored event payload');
  if (authoritativeClassification !== undefined && evidence_reference === undefined) {
    gaps.push('EVIDENCE_REFERENCE_ABSENT');
  }
  if (source_record_id === undefined) gaps.push('source_record_id absent from stored event payload');

  return {
    occurred_at: item.occurred_at,
    event_id: item.event_id,
    event_type: item.event_name,
    stage,
    canonical_event: BASELINE_EVENT_STAGES[item.event_name] === undefined ? null : item.event_name,
    classification,
    ...(domain === undefined ? {} : { domain }),
    ...(summary === undefined ? {} : { summary }),
    ...(evidence_reference === undefined ? {} : { evidence_reference }),
    ...(source_record_id === undefined ? {} : { source_record_id }),
    ...(gaps.length === 0 ? {} : { gap_reason: gaps.join('; ') }),
  };
}

/**
 * Binds the customer-event table to the gateway's event port.
 *
 * The port owns the durable append and the timeline read only: the canonical derivation belongs to
 * the connector layer and the `(tenant, source_event_id)` uniqueness constraint owns deduplication,
 * so a redelivery normalises here exactly as it did the first time and is then dropped by the store.
 */
export function createEventPort(repository: CustomerEventRepository): EventPort {
  return {
    append: async (input: AppendCustomerEventInput) => {
      const reservedField = reservedEventPayloadField(input.payload);
      if (reservedField !== undefined) {
        fail(
          'CUSTOMER_EVENT_RESERVED_PAYLOAD_FIELD',
          'client event payload contains a server-owned evidence field',
          { field: reservedField },
        );
      }
      return repository.append(input);
    },

    receipt: async (tenant_id, source_event_id) => repository.findByIdempotencyKey(tenant_id, source_event_id),

    timeline: async (input) => {
      const page = await repository.listTimeline({
        tenant_id: input.tenant_id,
        customer_id: input.customer_id,
        ...(input.from === undefined ? {} : { from: input.from }),
        ...(input.to === undefined ? {} : { to: input.to }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
      });

      return {
        items: page.items.map(toTimelineEntry),
        next_cursor: page.next_cursor,
      };
    },
  };
}

/**
 * The receipt the caller of a storefront turn or an event delivery re-reads (R11, R12, R04).
 *
 * The receipt lives beside the canonical effect reservation, never in a second store, so a replay
 * and an idempotency conflict are decided by the same row that decided the first dispatch.
 */
export function createReceiptPort(guard: IEffectGuard): ReceiptPort {
  return {
    receiptFor: async (tenant_id, effect_key) => {
      const outcome = await guard.reconcile({ tenant_id, effect_key, skill_id: 'gateway.receipt' });
      if (outcome.outcome !== 'SUCCEEDED') return null;

      const receipt = outcome.receipt;
      if (typeof receipt !== 'object' || receipt === null || Array.isArray(receipt)) return null;

      return { ...receipt };
    },

    storeReceipt: async (tenant_id, effect_key, receipt) => {
      await guard.resolve({ tenant_id, effect_key, status: 'SUCCEEDED', receipt });
    },
  };
}
