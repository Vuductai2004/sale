import type { PlannedStep, PlatformAgentId } from '@agentos/core-engine/contracts';
import type { SkillEffectClass } from '@agentos/skills';
import type { SkillRegistryRowMetadata } from './intent-classifier.js';

/**
 * Effect policy derivation matrix transcribed from implement/05 §6.5:
 * Only READ rows are permitted in the Sales foundation runtime.
 */
export interface DerivedEffectPolicy {
  readonly mutating: boolean;
  readonly idempotent: boolean;
  readonly price_bearing: boolean;
}

export function deriveEffectPolicy(effectClass: SkillEffectClass): DerivedEffectPolicy {
  switch (effectClass) {
    case 'READ':
      return { mutating: false, idempotent: true, price_bearing: false };
    case 'INTERNAL':
      return { mutating: true, idempotent: false, price_bearing: false };
    case 'EFFECT':
      return { mutating: true, idempotent: false, price_bearing: false };
    case 'APPROVAL':
      return { mutating: true, idempotent: false, price_bearing: false };
    default:
      return { mutating: false, idempotent: true, price_bearing: false };
  }
}

/** Builds one canonical execution-plan step without changing its input fields. */
export function buildPlannedStep(
  stepIndex: number,
  agentId: PlatformAgentId,
  row: SkillRegistryRowMetadata,
  inputParameters: Record<string, unknown>,
  dependsOnSteps: readonly number[],
): PlannedStep {
  const policy = deriveEffectPolicy(row.effect_class);
  return {
    step_index: stepIndex,
    agent_id: agentId,
    skill_id: row.skill_id,
    adapter_target: row.guarded_dependency,
    input_parameters: inputParameters,
    required_authority: row.required_authority,
    mutating: row.mutating ?? policy.mutating,
    price_bearing: row.price_bearing ?? policy.price_bearing,
    idempotent: row.idempotent ?? policy.idempotent,
    timeout_ms: row.timeout_ms,
    depends_on_steps: [...dependsOnSteps],
  };
}
