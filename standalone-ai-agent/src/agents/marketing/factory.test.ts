import { describe, expect, it, vi } from 'vitest';
import type {
  ActionDraft,
  HydratedContext,
  DurableLeaseManager,
  IAdapterDispatcher,
  IAgentRuntime,
  IAuditTrail,
  IContextAggregator,
  IEffectGuard,
  IEvidenceLogger,
  IPolicyEngine,
  ISessionControl,
  IStatefulWorkflowEngine,
  SignalEnvelope,
} from '@agentos/core-engine/contracts';
import type * as Database from '@agentos/database';
import type { DurableWorkflowRepository } from '@agentos/database';

const getProfile = vi.hoisted(() => vi.fn());

vi.mock('@agentos/database', async (importOriginal) => ({
  ...(await importOriginal<typeof Database>()),
  getProfile,
}));

import { createMarketingOrchestratorFactory } from './factory.js';

const TENANT = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222';
const CUSTOMER = '33333333-3333-4333-8333-333333333333';
const AUDIT_SECRET = 'marketing-test-audit-secret-32-characters';

const profile = (tenant_id = TENANT) => ({
  customer_id: CUSTOMER,
  tenant_id,
  verified_phone: '+886900000000',
  verified_email: 'customer@example.test',
  total_spent: '125.50',
  order_count: 3,
  rfm_segment_hypothesis: 'LOYAL',
  consent_marketing: true,
  consent_updated_at: new Date('2026-01-01T00:00:00.000Z'),
  suppression_active: false,
  line_user_id: 'line-customer-1',
  created_at: new Date('2025-01-01T00:00:00.000Z'),
});

const subject = {
  session_id: 'session-marketing-test',
  channel_type: 'WEB_CHAT',
  verified_customer_id: CUSTOMER,
};

const signal = (): SignalEnvelope => ({
  signal_id: 'signal-marketing-test',
  tenant_id: TENANT,
  correlation_id: 'correlation-marketing-test',
  source_channel: 'WEB_CHAT',
  event_type: 'campaign.requested',
  payload: {
    skill_id: 'skill.mkt.analyze_market_signal',
    input: {},
  },
  subject,
  timestamp: '2026-01-01T00:00:00.000Z',
});

interface OrchestratorInternals {
  readonly dependencies: {
    readonly contextAggregator: IContextAggregator;
    readonly agentRuntime: IAgentRuntime;
    readonly policyEngine: IPolicyEngine;
  };
}

const makeFactory = (crossDomainHandoff = false) => createMarketingOrchestratorFactory({
  auditSecret: AUDIT_SECRET,
  audit: null,
  workflowRepository: {} as DurableWorkflowRepository,
  adapters: {
    workflowEngine: {} as IStatefulWorkflowEngine,
    evidenceLogger: {} as IEvidenceLogger,
    auditTrail: {} as IAuditTrail,
    sessionControl: {} as ISessionControl,
    leaseManager: {} as DurableLeaseManager,
  },
  adapterDispatcher: {} as IAdapterDispatcher,
  effectGuard: {} as IEffectGuard,
  policyEngine: {} as IPolicyEngine,
  ...(crossDomainHandoff
    ? { crossDomainHandoff: { admit: vi.fn() } }
    : {}),
});

const internals = (orchestrator: unknown): OrchestratorInternals => orchestrator as OrchestratorInternals;

describe('Marketing policy factory composition', () => {
  it('retains the audit secret and autonomy port without promoting AUTH-4 campaign dispatch', async () => {
    const auditTrail: IAuditTrail = { append: vi.fn(async () => undefined) };
    const admit = vi.fn(async () => ({ workflow: 'PARKED_DRAFT' as const, reason: 'not promoted' }));
    const factory = createMarketingOrchestratorFactory({
      auditSecret: AUDIT_SECRET,
      autonomy: { admit },
      resolve_grant: async () => 'AUTH-3',
      adapters: {
        workflowEngine: {} as IStatefulWorkflowEngine,
        evidenceLogger: {} as IEvidenceLogger,
        auditTrail,
        sessionControl: {} as ISessionControl,
        leaseManager: {} as DurableLeaseManager,
      },
      adapterDispatcher: {} as IAdapterDispatcher,
      effectGuard: {} as IEffectGuard,
    });
    const policyEngine = internals(await factory(TENANT)).dependencies.policyEngine;
    const context: HydratedContext = {
      tenant_id: TENANT,
      correlation_id: 'correlation-marketing-test',
      customer: null,
      working_memory: {
        session_id: subject.session_id,
        last_touch_channel: 'WEB_CHAT',
        turn_count: 1,
        takeover_active: false,
      },
      knowledge_citations: [],
      hydrated_at: '2026-01-01T00:00:00.000Z',
    };
    const action: ActionDraft = {
      action_id: '33333333-3333-4333-8333-333333333333',
      run_id: 'run-marketing',
      tenant_id: TENANT,
      agent_id: 'MKT-05',
      skill_id: 'skill.mkt.dispatch_campaign',
      adapter_target: 'API-003.CommunicationConnector',
      step_index: 0,
      mutating: true,
      price_bearing: false,
      request_id: 'request-marketing',
      action_revision: 0,
      effect_key: 'effect-marketing',
      required_authority: 'AUTH-4',
      payload: { tenant_id: TENANT, effect_key: 'effect-marketing' },
    };

    const approval = await policyEngine.evaluateAuthority(action, context);
    expect(approval.verdict).toBe('AWAITING_HUMAN_APPROVAL');
    expect(approval.autonomyWorkflow).toBeUndefined();
    expect(auditTrail.append).toHaveBeenCalledTimes(1);

    const readOnly = await policyEngine.evaluateAuthority({
      ...action,
      agent_id: 'MKT-02',
      skill_id: 'skill.mkt.segment_audience',
      adapter_target: 'PostgreSQL.Customer360Store',
      mutating: false,
      required_authority: 'AUTH-1',
      payload: { tenant_id: TENANT },
    }, context);
    expect(readOnly.verdict).toBe('AUTO_APPROVED');
    expect(readOnly.autonomyWorkflow).toBe('PARKED_DRAFT');
    expect(admit).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: TENANT,
      skill_id: 'skill.mkt.segment_audience',
    }));
  });
});

describe('default Marketing context aggregation', () => {
  it('hydrates a matching customer profile through the default factory aggregator', async () => {
    getProfile.mockResolvedValueOnce(profile());

    const orchestrator = await makeFactory()(TENANT);
    const context = await internals(orchestrator).dependencies.contextAggregator.hydrateContext(
      TENANT,
      subject,
      'correlation-marketing-test',
    );

    expect(getProfile).toHaveBeenCalledWith(TENANT, CUSTOMER);
    expect(context.customer).toEqual({
      customer_id: CUSTOMER,
      tenant_id: TENANT,
      verified_phone: '+886900000000',
      verified_email: 'customer@example.test',
      total_spent: 125.5,
      order_count: 3,
      rfm_segment_hypothesis: 'LOYAL',
      consent_marketing: true,
      consent_updated_at: '2026-01-01T00:00:00.000Z',
      suppression_active: false,
      created_at: '2025-01-01T00:00:00.000Z',
    });
  });

  it('fails closed when the authoritative profile is missing', async () => {
    getProfile.mockResolvedValueOnce(null);

    const orchestrator = await makeFactory()(TENANT);
    const context = await internals(orchestrator).dependencies.contextAggregator.hydrateContext(
      TENANT,
      subject,
      'correlation-missing-profile',
    );

    expect(context.customer).toBeNull();
  });

  it('fails closed when the profile tenant does not match the requested tenant', async () => {
    getProfile.mockResolvedValueOnce(profile(OTHER_TENANT));

    const orchestrator = await makeFactory()(TENANT);
    const context = await internals(orchestrator).dependencies.contextAggregator.hydrateContext(
      TENANT,
      subject,
      'correlation-foreign-profile',
    );

    expect(context.customer).toBeNull();
  });

  it('does not look up a malformed verified customer id', async () => {
    getProfile.mockClear();

    const orchestrator = await makeFactory()(TENANT);
    const context = await internals(orchestrator).dependencies.contextAggregator.hydrateContext(
      TENANT,
      { ...subject, verified_customer_id: 'not-a-uuid' },
      'correlation-malformed-customer',
    );

    expect(getProfile).not.toHaveBeenCalled();
    expect(context.customer).toBeNull();
  });

  it('produces a journey entry intent after default hydration when a handoff broker is bound', async () => {
    getProfile.mockResolvedValueOnce(profile());

    const orchestrator = await makeFactory(true)(TENANT);
    const { contextAggregator, agentRuntime } = internals(orchestrator).dependencies;
    const context = await contextAggregator.hydrateContext(TENANT, subject, 'correlation-journey-entry');
    const inbound = signal();
    const hypothesis = await agentRuntime.deriveHypothesis(inbound, context);
    const routing = await agentRuntime.resolveRouting(inbound, context, hypothesis);
    const plan = await agentRuntime.formulatePlan(routing, context, hypothesis);

    expect(plan.handoff_intent).toEqual({
      source_domain: 'marketing',
      target_domain: 'sales',
      target_agent: 'SAL-02',
      reason: 'Marketing leg completed for a verified customer; Sales consultation is the next leg',
    });
  });
});
