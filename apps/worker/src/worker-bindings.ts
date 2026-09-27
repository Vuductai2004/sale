import {
  type AutonomyAdmissionPort,
  type ICrossDomainHandoffBroker,
  type RevenueOrchestrator,
} from '@agentos/core-engine';
import type { DurableWorkflowRepository } from '@agentos/database';

import {
  createCareOrchestratorFactory,
  getUnboundCapabilities,
  type CareOrchestratorFactoryOptions,
} from './runtime/care/index.js';
import {
  createSalesOrchestratorFactory,
  getSalesUnboundCapabilities,
  type SalesOrchestratorFactoryOptions,
} from './runtime/sales/index.js';
import type { WorkerConnectors, WorkerConnectorEnv } from './runtime/connectors.js';
import {
  type DomainRuntimeBinding,
  type DomainSignalContract,
} from './runtime/domain-registry.js';
import {
  createMarketingOrchestratorFactory,
  type MarketingOrchestratorFactoryOptions,
} from './runtime/marketing/factory.js';

interface WorkerBindingEnv extends WorkerConnectorEnv {
  readonly SALES_SIGNAL_SOURCE_CHANNELS?: string;
  readonly SALES_SIGNAL_EVENT_TYPES?: string;
  readonly MARKETING_SIGNAL_SOURCE_CHANNELS?: string;
  readonly MARKETING_SIGNAL_EVENT_TYPES?: string;
  readonly AUDIT_HMAC_SECRET?: string;
}

type OrchestratorFactory =
  (tenant_id: string) => Promise<RevenueOrchestrator | null> | RevenueOrchestrator | null;

type WorkflowRepository = Pick<DurableWorkflowRepository,
  'claimNextQueuedTask' | 'getTask' | 'releaseTaskLease' | 'recordFailure' | 'transitionTask'>;

interface WorkerBindingOptions {
  readonly env: WorkerBindingEnv;
  readonly workerId: string;
  readonly workflowRepository: WorkflowRepository;
  readonly connectors: Pick<WorkerConnectors, 'erp_read'>;
  readonly enabledModules: readonly string[];
  readonly blockers: string[];
  readonly autonomy?: AutonomyAdmissionPort | undefined;
  readonly crossDomainHandoff?: ICrossDomainHandoffBroker | undefined;
  readonly careSignalContract: DomainSignalContract;
  readonly crossDomainHandoffChannel: string;
  readonly crossDomainHandoffEventTypes: Readonly<Record<string, string>>;
  readonly marketingSignalContractDefaults: {
    readonly source_channels: readonly string[];
    readonly event_types: readonly string[];
  };
  readonly careFactoryOptions: CareOrchestratorFactoryOptions;
  readonly orchestratorFactory?: OrchestratorFactory | undefined;
  readonly salesOrchestratorFactory?: OrchestratorFactory | undefined;
  readonly salesFactoryOptions?: SalesOrchestratorFactoryOptions | undefined;
  readonly marketingOrchestratorFactory?: OrchestratorFactory | undefined;
  readonly marketingFactoryOptions?: MarketingOrchestratorFactoryOptions | undefined;
}

export function createWorkerDomainBindings(options: WorkerBindingOptions): DomainRuntimeBinding[] {
  const {
    env,
    workerId,
    workflowRepository,
    connectors,
    enabledModules,
    blockers,
    autonomy,
    crossDomainHandoff,
    careSignalContract,
    crossDomainHandoffChannel,
    crossDomainHandoffEventTypes,
    marketingSignalContractDefaults,
  } = options;
  const bindings: DomainRuntimeBinding[] = [];

  let careOrchestratorFactory: OrchestratorFactory | null = null;
  if (enabledModules.includes('support')) {
    const unboundCapabilities = getUnboundCapabilities(options.careFactoryOptions);
    for (const cap of unboundCapabilities) {
      blockers.push(`CARE_CAPABILITY_UNBOUND: ${cap}`);
    }

    const careFactory = unboundCapabilities.length === 0
      ? createCareOrchestratorFactory(options.careFactoryOptions)
      : null;

    careOrchestratorFactory = options.orchestratorFactory ?? careFactory;

    if (!careOrchestratorFactory) {
      blockers.push('CARE_ORCHESTRATOR_UNBOUND: No authentic Customer Care RevenueOrchestrator factory provided (fail closed).');
    } else {
      bindings.push({
        contract: careSignalContract,
        createOrchestrator: careOrchestratorFactory,
      });
    }
  }

  if (enabledModules.includes('sales')) {
    const rawChannels = env.SALES_SIGNAL_SOURCE_CHANNELS;
    const rawEventTypes = env.SALES_SIGNAL_EVENT_TYPES;
    const salesChannels = rawChannels ? rawChannels.split(',').map((c) => c.trim()).filter(Boolean) : [];
    const salesEventTypes = rawEventTypes ? rawEventTypes.split(',').map((e) => e.trim()).filter(Boolean) : [];

    if (salesChannels.length === 0 || salesEventTypes.length === 0) {
      blockers.push('SALES_CAPABILITY_UNBOUND: SALES_SIGNAL_SOURCE_CHANNELS and SALES_SIGNAL_EVENT_TYPES must be configured and non-empty');
    } else {
      const salesFactoryOptions: SalesOrchestratorFactoryOptions = options.salesFactoryOptions === undefined
        ? {
            workerId,
            workflowRepository: workflowRepository as DurableWorkflowRepository,
            erp_read: connectors.erp_read,
            ...(crossDomainHandoff === undefined ? {} : { crossDomainHandoff }),
            ...(autonomy === undefined ? {} : { autonomy }),
          }
        : {
            ...options.salesFactoryOptions,
            ...(options.salesFactoryOptions.crossDomainHandoff !== undefined || crossDomainHandoff === undefined
              ? {}
              : { crossDomainHandoff }),
            ...(options.salesFactoryOptions.autonomy !== undefined || autonomy === undefined
              ? {}
              : { autonomy }),
          };

      // Reported, never used to suppress the domain: a deployment that binds only the read
      // connectors still serves catalog/stock/customer reads and refuses each mutation at
      // dispatch. The default factory is built only when no injected factory already covers it,
      // so a supplied factory never forces construction of a graph the caller replaced.
      const salesUnboundCapabilities = getSalesUnboundCapabilities(salesFactoryOptions);
      for (const cap of salesUnboundCapabilities) {
        blockers.push(`SALES_CAPABILITY_UNBOUND: ${cap}`);
      }

      const salesFactory = options.salesOrchestratorFactory
        ? null
        : createSalesOrchestratorFactory(salesFactoryOptions);
      const salesOrchestratorFactory = options.salesOrchestratorFactory ?? salesFactory;

      if (!salesOrchestratorFactory) {
        blockers.push('SALES_ORCHESTRATOR_UNBOUND: No authentic Sales RevenueOrchestrator factory provided (fail closed).');
      } else {
        bindings.push({
          contract: {
            module: 'sales',
            source_channels: Object.freeze([...salesChannels, crossDomainHandoffChannel]),
            event_types: Object.freeze([
              ...salesEventTypes,
              crossDomainHandoffEventTypes['marketing_to_sales'] as string,
            ]),
            signal_invalid_code: 'SALES_SIGNAL_INVALID',
          },
          createOrchestrator: salesOrchestratorFactory,
        });
      }
    }
  }

  if (enabledModules.includes('marketing')) {
    const marketingChannels = env.MARKETING_SIGNAL_SOURCE_CHANNELS
      ? env.MARKETING_SIGNAL_SOURCE_CHANNELS.split(',').map((value) => value.trim()).filter(Boolean)
      : [...marketingSignalContractDefaults.source_channels];
    const marketingEventTypes = env.MARKETING_SIGNAL_EVENT_TYPES
      ? env.MARKETING_SIGNAL_EVENT_TYPES.split(',').map((value) => value.trim()).filter(Boolean)
      : [...marketingSignalContractDefaults.event_types];

    let marketingFactory = options.marketingOrchestratorFactory;
    if (!marketingFactory) {
      try {
        marketingFactory = createMarketingOrchestratorFactory({
          ...(options.marketingFactoryOptions ?? {}),
          workerId,
          workflowRepository: options.marketingFactoryOptions?.workflowRepository ?? workflowRepository as DurableWorkflowRepository,
          ...(env.AUDIT_HMAC_SECRET === undefined ? {} : { auditSecret: env.AUDIT_HMAC_SECRET }),
          ...(options.marketingFactoryOptions?.crossDomainHandoff !== undefined
            ? {}
            : crossDomainHandoff === undefined ? {} : { crossDomainHandoff }),
          ...(options.marketingFactoryOptions?.autonomy !== undefined || autonomy === undefined
            ? {}
            : { autonomy }),
        });
      } catch (error) {
        blockers.push('MARKETING_ORCHESTRATOR_UNBOUND: ' + (error instanceof Error ? error.message : String(error)));
      }
    }

    if (marketingFactory) {
      bindings.push({
        contract: {
          module: 'marketing',
          source_channels: Object.freeze(marketingChannels),
          event_types: Object.freeze(marketingEventTypes),
          signal_invalid_code: 'MARKETING_SIGNAL_INVALID',
        },
        createOrchestrator: marketingFactory,
      });
    }
  }

  return bindings;
}
