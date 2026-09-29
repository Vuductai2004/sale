import type { SkillToolInvocation, SkillToolPort } from '@agentos/skills';

import { MARKETING_APPROVED_DOCUMENT_ALLOWLIST } from '../knowledge-adapter.js';
import {
  auditMarketingBrand,
  generateMarketingContent,
} from '../content.js';

import type {
  InputMktAnalyzeSignal,
  InputMktAuditBrand,
  InputMktCheckConsent,
  InputMktDispatchCampaign,
  InputMktEvaluateAttribution,
  InputMktGenerateContent,
  InputMktSegmentAudience,
  MarketingKnowledgePort,
  MarketingSkillToolPortOptions,
} from './types.js';
import type { MarketingKnowledgeDocument } from '../contracts.js';

/**
 * Error thrown by the Marketing skill tool port.
 */
export class MarketingSkillToolError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(`[${code}] ${message}`);
    this.name = 'MarketingSkillToolError';
    this.code = code;
    this.details = details;
  }
}

async function readApprovedMarketingDocuments(
  knowledge: MarketingKnowledgePort,
  tenant_id: string,
): Promise<readonly MarketingKnowledgeDocument[]> {
  return Promise.all(
    MARKETING_APPROVED_DOCUMENT_ALLOWLIST.map((path) => knowledge.readApproved(tenant_id, path)),
  );
}

/**
 * Creates the unified SkillToolPort for Marketing skills.
 * Routes each skill_id and tool_binding to its injected port, failing closed
 * with UNBOUND_PROVIDER when an owner/provider/connector is not bound.
 */
export function createMarketingSkillToolPort(
  options: MarketingSkillToolPortOptions,
): SkillToolPort {
  const knowledgeBackedContentEngine = options.knowledge
    ? {
        async generateContent(input: InputMktGenerateContent) {
          const docs = await readApprovedMarketingDocuments(options.knowledge!, input.tenant_id);
          return generateMarketingContent(input, docs);
        },
      }
    : null;
  const knowledgeBackedBrandGuard = options.knowledge
    ? {
        async auditBrandCompliance(input: InputMktAuditBrand) {
          const docs = await readApprovedMarketingDocuments(options.knowledge!, input.tenant_id);
          const result = auditMarketingBrand(input, docs);
          return {
            ...result,
            violations: [...result.violations],
          };
        },
      }
    : null;
  const contentEngine = options.content_engine ?? knowledgeBackedContentEngine;
  const brandGuard = options.brand_guard ?? knowledgeBackedBrandGuard;
  return {
    async invoke<TInput, TOutput>(invocation: SkillToolInvocation<TInput>): Promise<TOutput> {
      const { skill_id, tool_binding, input, context } = invocation;

      // 1. skill.mkt.analyze_market_signal -> API-002.EventIngestion
      if (
        skill_id === 'skill.mkt.analyze_market_signal' &&
        tool_binding === 'API-002.EventIngestion'
      ) {
        if (!options.signal_reads) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'API-002.EventIngestion is unbound: no signal read connector is configured',
          );
        }
        return (await options.signal_reads.readSignals(
          input as unknown as InputMktAnalyzeSignal,
          context,
        )) as TOutput;
      }

      // 2. skill.mkt.segment_audience -> PostgreSQL.Customer360Store
      if (
        skill_id === 'skill.mkt.segment_audience' &&
        tool_binding === 'PostgreSQL.Customer360Store'
      ) {
        if (!options.customer360) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'PostgreSQL.Customer360Store is unbound: no Customer360 store is configured',
          );
        }
        return (await options.customer360.segmentAudience(
          input as unknown as InputMktSegmentAudience,
          context,
        )) as TOutput;
      }

      // 3. skill.mkt.check_consent -> API-002.ConsentStore
      if (
        skill_id === 'skill.mkt.check_consent' &&
        tool_binding === 'API-002.ConsentStore'
      ) {
        const typedConsentInput = input as unknown as InputMktCheckConsent;
        const segmentId = typedConsentInput.customer_id;
        if (
          typeof segmentId === 'string'
          && /^inactive[_-][1-9][0-9]*d$/.test(segmentId)
        ) {
          if (!options.audience_consent) {
            throw new MarketingSkillToolError(
              'CONSENT_AGGREGATE_PORT_UNAVAILABLE',
              'Tenant-scoped aggregate consent guard is required for campaign segments; no customer identity is assumed',
            );
          }
          return (await options.audience_consent.checkAudienceConsent(
            {
              tenant_id: typedConsentInput.tenant_id,
              segment_id: segmentId,
              channel: typedConsentInput.channel,
            },
            context,
          )) as TOutput;
        }
        const consentPort =
          options.consent ?? options.consent_port ?? options.consentPort;
        if (!consentPort) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'API-002.ConsentStore is unbound: no consent store connector is configured',
          );
        }
        return (await consentPort.checkConsent(
          input as unknown as InputMktCheckConsent,
          context,
        )) as TOutput;
      }

      // 4. skill.mkt.generate_content -> Core.LLMContentEngine
      if (
        skill_id === 'skill.mkt.generate_content' &&
        tool_binding === 'Core.LLMContentEngine'
      ) {
        if (!contentEngine) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'Core.LLMContentEngine is unbound: no content generation engine is configured',
          );
        }
        return (await contentEngine.generateContent(
          input as unknown as InputMktGenerateContent,
          context,
        )) as TOutput;
      }

      // 5. skill.mkt.audit_brand_compliance -> SecondBrain.BrandGuard
      if (
        skill_id === 'skill.mkt.audit_brand_compliance' &&
        tool_binding === 'SecondBrain.BrandGuard'
      ) {
        if (!brandGuard) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'SecondBrain.BrandGuard is unbound: no BrandGuard compliance engine is configured',
          );
        }
        return (await brandGuard.auditBrandCompliance(
          input as unknown as InputMktAuditBrand,
          context,
        )) as TOutput;
      }

      // 6. skill.mkt.dispatch_campaign -> API-003.CommunicationConnector
      if (
        skill_id === 'skill.mkt.dispatch_campaign' &&
        tool_binding === 'API-003.CommunicationConnector'
      ) {
        if (!options.communication) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'API-003.CommunicationConnector is unbound: no communication connector is configured',
          );
        }

        const resolver =
          options.communication.resolveAudience ??
          options.communication.audience_resolver ??
          options.communication.audienceResolver ??
          options.audience_resolver ??
          options.audienceResolver;

        if (!resolver) {
          throw new MarketingSkillToolError(
            'AUDIENCE_RESOLVER_REQUIRED',
            'Server-side audience resolver is required for skill.mkt.dispatch_campaign before communication dispatch; no resolver configured (fail closed)',
          );
        }

        const typedInput = input as unknown as InputMktDispatchCampaign;
        const resolvedUnknown: unknown = await resolver(
          {
            tenant_id: typedInput.tenant_id,
            segment_id: typedInput.segment_id,
            channel: typedInput.channel,
          },
          context,
        );
        let resolvedRecipients: readonly string[];
        let consentAlreadyVerified = false;
        if (Array.isArray(resolvedUnknown)) {
          resolvedRecipients = resolvedUnknown as readonly string[];
        } else if (resolvedUnknown !== null && typeof resolvedUnknown === 'object') {
          const objectResult = resolvedUnknown as Record<string, unknown>;
          if (!Array.isArray(objectResult.recipients)) {
            throw new MarketingSkillToolError(
              'AUDIENCE_REQUIRED',
              `Audience resolver returned no eligible recipients for segment '${typedInput.segment_id}'; campaign dispatch refused (fail closed)`,
            );
          }
          resolvedRecipients = objectResult.recipients as readonly string[];
          consentAlreadyVerified = objectResult.consent_verified === true;
        } else {
          throw new MarketingSkillToolError(
            'AUDIENCE_REQUIRED',
            `Audience resolver returned no eligible recipients for segment '${typedInput.segment_id}'; campaign dispatch refused (fail closed)`,
          );
        }
        if (resolvedRecipients.length === 0) {
          throw new MarketingSkillToolError(
            'AUDIENCE_REQUIRED',
            `Audience resolver returned no eligible recipients for segment '${typedInput.segment_id}'; campaign dispatch refused (fail closed)`,
          );
        }
        for (const recipient of resolvedRecipients) {
          if (typeof recipient !== 'string' || recipient.trim() === '') {
            throw new MarketingSkillToolError(
              'AUDIENCE_REQUIRED',
              'Audience resolver returned invalid or empty recipient identifier (fail closed)',
            );
          }
        }
        let eligibleRecipients: readonly string[];
        if (consentAlreadyVerified) {
          eligibleRecipients = resolvedRecipients;
        } else {
          const consentPort =
            options.consent ??
            options.consent_port ??
            options.consentPort ??
            options.communication.consent ??
            options.communication.consent_port ??
            options.communication.consentPort;
          if (!consentPort) {
            throw new MarketingSkillToolError(
              'CONSENT_PORT_REQUIRED',
              'Server-side MarketingConsentPort is required for skill.mkt.dispatch_campaign before communication dispatch; no consent port configured (fail closed)',
            );
          }
          const consentChecks = await Promise.all(
            resolvedRecipients.map((customerId) =>
              consentPort.checkConsent(
                {
                  tenant_id: typedInput.tenant_id,
                  customer_id: customerId,
                  channel: typedInput.channel,
                },
                context,
              ),
            ),
          );
          eligibleRecipients = resolvedRecipients.filter(
            (_, index) => consentChecks[index]?.allowed === true,
          );
          if (eligibleRecipients.length === 0) {
            throw new MarketingSkillToolError(
              'AUDIENCE_REQUIRED',
              `All ${resolvedRecipients.length} resolved recipients were denied or suppressed by consent recheck; missing consent denied (fail closed)`,
            );
          }
        }
        return (await options.communication.dispatchCampaign(
          {
            ...typedInput,
            recipients: eligibleRecipients,
          },
          context,
        )) as TOutput;
      }


      // 7. skill.mkt.evaluate_attribution -> PostgreSQL.AnalyticsStore
      if (
        skill_id === 'skill.mkt.evaluate_attribution' &&
        tool_binding === 'PostgreSQL.AnalyticsStore'
      ) {
        if (!options.analytics) {
          throw new MarketingSkillToolError(
            'UNBOUND_PROVIDER',
            'PostgreSQL.AnalyticsStore is unbound: no analytics store connector is configured',
          );
        }
        return (await options.analytics.evaluateAttribution(
          input as unknown as InputMktEvaluateAttribution,
          context,
        )) as TOutput;
      }

      throw new MarketingSkillToolError(
        'UNKNOWN_CAPABILITY',
        `Marketing tool binding '${tool_binding}' is not supported for skill '${skill_id}'`,
      );
    },
  };
}
