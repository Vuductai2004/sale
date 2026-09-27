import { describe, expect, it } from 'vitest';

import { AutonomyService, MemoryAutonomyStore } from '../autonomy/index.js';
import {
  PolicyEnforcementPoint,
  type PolicyRegistrySkill,
  type PolicySecurityContext,
} from './index.js';

const TENANT = '11111111-1111-4111-8111-111111111111';
const CONTEXT: PolicySecurityContext = {
  tenant_id: TENANT,
  agent_id: 'SAL-01',
  run_id: 'run-autonomy',
  request_id: 'request-autonomy',
  correlation_id: 'correlation-autonomy',
  session_id: 'session-autonomy',
  takeover_active: false,
};

function skill(overrides: Partial<PolicyRegistrySkill> = {}): PolicyRegistrySkill {
  return {
    skill_id: 'skill.sales.check_stock',
    required_authority: 'AUTH-0',
    allowed_agents: ['SAL-01'],
    mutating: false,
    price_bearing: false,
    idempotent: true,
    epistemic_class: 'FACT',
    write_target: 'HYPOTHESIS',
    requires_consent: false,
    requires_verified_identity: false,
    timeout_ms: 5_000,
    policy_version: 'v1',
    ...overrides,
  };
}

describe('PolicyEnforcementPoint controlled autonomy', () => {
  it('annotates only a final permit and leaves AUTH-4/AUTH-5 verdicts unchanged', async () => {
    const autonomy = new AutonomyService(new MemoryAutonomyStore());
    await autonomy.promote({
      tenant_id: TENANT,
      skill_id: 'skill.sales.check_stock',
      policy_version: 'v1',
      required_authority: 'AUTH-0',
      evidence_window_ref: 'window-1',
      evidence_ref: 'evidence-1',
      audit_ref: 'audit-1',
      authority_violations: 0,
      duplicate_effects: 0,
      audit_complete: true,
      evidence_complete: true,
      approver_id: 'operator-1',
    });
    const pep = new PolicyEnforcementPoint({
      registry: {
        getSkill: (skill_id) => skill_id === 'skill.sales.check_stock' ? skill() : undefined,
        getAgent: (agent_id) => agent_id === 'SAL-01' ? { agent_id, assigned_authority: 'AUTH-3' } : undefined,
      },
      approvals: { createOrReadPending: async () => ({ approval_id: 'approval-1' }) },
      audit: { append: async () => undefined },
      auditSecret: 'autonomy-test-secret',
      autonomy,
    });

    const permit = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      payload: {},
    });
    expect(permit.verdict).toBe('AUTO_APPROVED');
    expect(permit.autonomyWorkflow).toBe('AUTO_EXECUTE');

    const auth4 = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      required_authority: 'AUTH-4',
      payload: {},
    });
    expect(auth4.verdict).toBe('AWAITING_HUMAN_APPROVAL');
    expect(auth4.authorized).toBe(false);
    expect(auth4.decisionCode).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(auth4.autonomyWorkflow).toBeUndefined();

    const auth5 = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      required_authority: 'AUTH-5',
      payload: {},
    });
    expect(auth5.verdict).toBe('DENIED');
    expect(auth5.errorCode).toBe('PROHIBITED_ACTION');
    expect(auth5.decisionCode).toBe('DENY_PROHIBITED');
    expect(auth5.autonomyWorkflow).toBeUndefined();
    await autonomy.pauseTenant({ tenant_id: TENANT, actor: 'operator-1' });
    const paused = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      payload: {},
    });
    expect(paused.verdict).toBe('AUTO_APPROVED');
    expect(paused.decisionCode).toBe('PERMIT');
    expect(paused.autonomyWorkflow).toBe('PARKED_DRAFT');
  });
  it('parks an AUTO_APPROVED decision when autonomy admission throws', async () => {
    const pep = new PolicyEnforcementPoint({
      registry: {
        getSkill: (skill_id) => skill_id === 'skill.sales.check_stock' ? skill() : undefined,
        getAgent: (agent_id) => agent_id === 'SAL-01' ? { agent_id, assigned_authority: 'AUTH-3' } : undefined,
      },
      approvals: { createOrReadPending: async () => ({ approval_id: 'approval-1' }) },
      audit: { append: async () => undefined },
      auditSecret: 'autonomy-test-secret',
      autonomy: {
        admit: async () => {
          throw new Error('autonomy store unavailable');
        },
      },
    });

    const permit = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      payload: {},
    });
    expect(permit.verdict).toBe('AUTO_APPROVED');
    expect(permit.authorized).toBe(true);
    expect(permit.decisionCode).toBe('PERMIT');
    expect(permit.autonomyWorkflow).toBe('PARKED_DRAFT');
    const canonical = await new PolicyEnforcementPoint({
      registry: {
        getSkill: (skill_id) => skill_id === 'skill.sales.check_stock' ? skill() : undefined,
        getAgent: (agent_id) => agent_id === 'SAL-01' ? { agent_id, assigned_authority: 'AUTH-3' } : undefined,
      },
      approvals: { createOrReadPending: async () => ({ approval_id: 'approval-1' }) },
      audit: { append: async () => undefined },
      auditSecret: 'autonomy-test-secret',
    }).enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      payload: {},
    });
    expect(permit.reason).toBe(canonical.reason);
    expect(permit.errorCode).toBe(canonical.errorCode);
    expect(permit.ruleId).toBe(canonical.ruleId);
    expect(permit.auditStatus).toBe(canonical.auditStatus);

    const approval = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      required_authority: 'AUTH-4',
      payload: {},
    });
    expect(approval.verdict).toBe('AWAITING_HUMAN_APPROVAL');
    expect(approval.authorized).toBe(false);
    expect(approval.decisionCode).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(approval.autonomyWorkflow).toBeUndefined();

    const denied = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      required_authority: 'AUTH-5',
      payload: {},
    });
    expect(denied.verdict).toBe('DENIED');
    expect(denied.authorized).toBe(false);
    expect(denied.decisionCode).toBe('DENY_PROHIBITED');
    expect(denied.autonomyWorkflow).toBeUndefined();
  });

  it('parks a final permit after durable evidence drift without changing the PEP verdict', async () => {
    const autonomy = new AutonomyService(new MemoryAutonomyStore());
    await autonomy.promote({
      tenant_id: TENANT,
      skill_id: 'skill.sales.check_stock',
      policy_version: 'v1',
      required_authority: 'AUTH-0',
      evidence_window_ref: 'window-1',
      evidence_ref: 'evidence-1',
      audit_ref: 'audit-1',
      authority_violations: 0,
      duplicate_effects: 0,
      audit_complete: true,
      evidence_complete: true,
      approver_id: 'operator-1',
    });
    await autonomy.admit({
      tenant_id: TENANT,
      skill_id: 'skill.sales.check_stock',
      policy_version: 'v1',
      evidence_complete: false,
    });
    const admission = await autonomy.admit({
      tenant_id: TENANT,
      skill_id: 'skill.sales.check_stock',
      policy_version: 'v1',
    });
    expect(admission.workflow).toBe('PARKED_DRAFT');
    const pep = new PolicyEnforcementPoint({
      registry: {
        getSkill: (skill_id) => skill_id === 'skill.sales.check_stock' ? skill() : undefined,
        getAgent: (agent_id) => agent_id === 'SAL-01' ? { agent_id, assigned_authority: 'AUTH-3' } : undefined,
      },
      approvals: { createOrReadPending: async () => ({ approval_id: 'approval-1' }) },
      audit: { append: async () => undefined },
      auditSecret: 'autonomy-test-secret',
      autonomy,
    });
    const drifted = await pep.enforce(CONTEXT, {
      skill_id: 'skill.sales.check_stock',
      tool_name: 'adapter:stock',
      payload: {},
    });
    expect(drifted.verdict).toBe('AUTO_APPROVED');
    expect(drifted.decisionCode).toBe('PERMIT');
    expect(drifted.autonomyWorkflow).toBe('PARKED_DRAFT');
  });
});
