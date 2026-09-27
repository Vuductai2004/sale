import {
  OrchestratorError,
  type ActionDraft,
  type DurableTaskCheckpoint,
  type ExecutionPlan,
  type HypothesisRecord,
  type ImmutableEvidenceRecord,
  type RetryClass,
  type SignalEnvelope,
  type TaskLifecycleState,
} from '../contracts/index.js';

/** Disposition of the guarded step loop, consumed by the façade entry points. */
export interface StepLoopOutcome {
  readonly lifecycle_state: TaskLifecycleState;
  readonly evidence?: ImmutableEvidenceRecord;
  readonly message?: string;
}

/** The plan-step cursor a resume must continue from: the ordinal AFTER the last planned step. */
export function nextStepCursor(plan: ExecutionPlan): number {
  return plan.steps.reduce((highest, step) => Math.max(highest, step.step_index), 0) + 1;
}

/** Copies only optional outcome fields that are actually present. */
export function outcomeFields(fields: {
  evidence?: ImmutableEvidenceRecord | undefined;
  message?: string | undefined;
}): { evidence?: ImmutableEvidenceRecord; message?: string } {
  const present: { evidence?: ImmutableEvidenceRecord; message?: string } = {};
  if (fields.evidence !== undefined) {
    present.evidence = fields.evidence;
  }
  if (fields.message !== undefined) {
    present.message = fields.message;
  }
  return present;
}

export function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function readCompleteResumeCheckpoint(
  value: unknown,
  run_id: string,
): DurableTaskCheckpoint {
  if (!isPlainJsonObject(value)) {
    throw new OrchestratorError(
      'CHECKPOINT_INCOMPLETE',
      'Task ' + run_id + ' has no complete resume checkpoint; a human operator must resolve it in SCR-003.',
    );
  }
  const { plan, current_step, pending_action, context, previous_evidence_hash, request_id } = value;
  if (
    !isPlainJsonObject(plan) ||
    !Number.isInteger(current_step) ||
    (current_step as number) < 1 ||
    !Object.prototype.hasOwnProperty.call(value, 'pending_action') ||
    (pending_action !== null && !isPlainJsonObject(pending_action)) ||
    !isPlainJsonObject(context) ||
    typeof previous_evidence_hash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(previous_evidence_hash) ||
    typeof request_id !== 'string' ||
    request_id.trim().length === 0
  ) {
    throw new OrchestratorError(
      'CHECKPOINT_INCOMPLETE',
      'Task ' + run_id + ' has no complete resume checkpoint; a human operator must resolve it in SCR-003.',
    );
  }
  return value as unknown as DurableTaskCheckpoint;
}

export function validateSignalEnvelope(signal: SignalEnvelope): void {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(signal.tenant_id)) {
    throw new OrchestratorError('INVALID_TENANT_ID', 'tenant_id must be a UUID (NFR-006).');
  }
  if (!signal.signal_id || !signal.correlation_id || !signal.source_channel) {
    throw new OrchestratorError('INVALID_SIGNAL', 'Missing mandatory envelope routing metadata (SRS §17).');
  }
  if (!signal.subject?.session_id) {
    throw new OrchestratorError(
      'INVALID_SESSION',
      'A unique server-issued session_id is mandatory for every signal, including anonymous traffic (NFR-006).'
    );
  }
}

/** Hard Invariant FR-C360-003: HYPOTHESIS records can never be promoted to FACT. */
export function enforceEpistemicSeparation(hypothesis: HypothesisRecord): void {
  if (hypothesis.classification !== 'HYPOTHESIS') {
    throw new OrchestratorError('SECURITY_VIOLATION', 'Inferred data must be stamped classification: HYPOTHESIS');
  }
}

/** Hard Invariant BR-001 / BR-002 / BR-003: a price-bearing action needs an authoritative floor. */
export function verifyFloorPrice(action: ActionDraft): void {
  const payloadPriceBearing = action.payload['price_bearing'] === true
    || action.payload['offer_id'] !== undefined
    || action.payload['discount_amount'] !== undefined
    || action.payload['discount_percent'] !== undefined
    || action.proposed_price !== undefined;
  if (!action.price_bearing && !payloadPriceBearing) return;
  const proposedPrice = action.proposed_price;
  const priceFloor = action.computed_price_floor;
  if (typeof proposedPrice !== 'number'
    || !Number.isFinite(proposedPrice)
    || typeof priceFloor !== 'number'
    || !Number.isFinite(priceFloor)
    || !action.floor_source?.trim()) {
    throw new OrchestratorError(
      'P_FLOOR_UNAVAILABLE',
      `No owner-approved P_floor with provenance for ${action.skill_id}; refusing to price (BR-001, BR-003, NFR-008).`
    );
  }
  if (proposedPrice < priceFloor) {
    throw new OrchestratorError(
      'ERR_FLOOR_PRICE_VIOLATION',
      `Proposed price ${proposedPrice} < P_floor ${priceFloor} (${action.floor_source}).`
    );
  }
}

export function classifyFailure(error: unknown): RetryClass {
  if (error instanceof OrchestratorError) {
    switch (error.code) {
      case 'DISPATCH_TIMEOUT':
      case 'PROVIDER_INDETERMINATE':
      case 'EFFECT_UNKNOWN':
        return 'UNKNOWN';
      case 'PROVIDER_RATE_LIMITED':
      case 'PROVIDER_UNAVAILABLE':
      case 'CONCURRENT_TASK_LOCK':
        return 'RETRYABLE';
      default:
        return 'FATAL';
    }
  }
  return 'FATAL';
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof OrchestratorError) {
    return { code: error.code, message: error.message };
  }
  return { code: 'UNCLASSIFIED', message: error instanceof Error ? error.message : String(error) };
}

/** Copies the optional floor mirrors a plan step actually carries. */
export function floorMirrors(step: {
  computed_price_floor?: number;
  floor_source?: string;
  proposed_price?: number;
}): Pick<ActionDraft, 'computed_price_floor' | 'floor_source' | 'proposed_price'> {
  const mirrors: { computed_price_floor?: number; floor_source?: string; proposed_price?: number } = {};
  if (step.computed_price_floor !== undefined) mirrors.computed_price_floor = step.computed_price_floor;
  if (step.floor_source !== undefined) mirrors.floor_source = step.floor_source;
  if (step.proposed_price !== undefined) mirrors.proposed_price = step.proposed_price;
  return mirrors;
}
