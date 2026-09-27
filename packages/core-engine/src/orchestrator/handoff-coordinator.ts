import {
  highestAuthority,
  OrchestratorError,
  type CrossDomainHandoffDraft,
  type ExecutionPlan,
  type HandoffEvidenceRef,
  type HydratedContext,
} from '../contracts/index.js';

export interface HandoffCoordinateParams {
  tenant_id: string;
  run_id: string;
  correlation_id: string;
  plan: ExecutionPlan;
  context: HydratedContext;
}

/** Builds the evidence projection from the source run's own server-derived plan. */
export function handoffEvidenceRefs(
  run_id: string,
  plan: ExecutionPlan,
  source_domain: string,
): readonly HandoffEvidenceRef[] {
  const refs: HandoffEvidenceRef[] = [
    {
      classification: 'DECISION',
      claim: `Run ${run_id} completed the ${source_domain} leg of the customer journey `
        + `(${plan.steps.length} planned step(s), plan ${plan.plan_id})`,
      source_uri: `agentos://runs/${run_id}`,
      source_version: String(plan.steps.length),
      verified_by: 'agentos.orchestrator',
    },
  ];

  for (const step of plan.steps) {
    if (!step.mutating) {
      continue;
    }
    refs.push({
      classification: 'ACTION',
      claim: `${step.skill_id} executed by ${step.agent_id} at step ${step.step_index}`,
      source_uri: `agentos://runs/${run_id}/steps/${step.step_index}`,
      source_version: String(step.step_index),
      verified_by: step.agent_id,
    });
  }

  return refs;
}

/** Builds the server-derived cross-domain handoff package without performing admission. */
export function buildHandoffDraft(params: HandoffCoordinateParams): CrossDomainHandoffDraft {
  const intent = params.plan.handoff_intent;
  if (intent === undefined) {
    throw new OrchestratorError('HANDOFF_PACKAGE_INVALID', 'Cannot build a handoff package without handoff intent.');
  }
  const sourceStep = params.plan.steps[0];
  if (sourceStep === undefined) {
    throw new OrchestratorError(
      'HANDOFF_PACKAGE_INVALID',
      'A plan that declares a handoff must have at least one step: an empty plan has no leg of '
        + 'the journey to hand off from (plans/customer-lifecycle.md §3).',
    );
  }

  return {
    tenant_id: params.tenant_id,
    customer_id: params.context.customer?.customer_id ?? '',
    correlation_id: params.correlation_id,
    source_domain: intent.source_domain,
    source_agent: sourceStep.agent_id,
    source_run_id: params.run_id,
    source_authority: highestAuthority(params.plan.steps.map((step) => step.required_authority)),
    target_domain: intent.target_domain,
    target_agent: intent.target_agent,
    reason: intent.reason,
    evidence: handoffEvidenceRefs(params.run_id, params.plan, intent.source_domain),
    occurred_at: new Date().toISOString(),
  };
}
