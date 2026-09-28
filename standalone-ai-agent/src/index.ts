/**
 * Standalone AI Agent OS SDK
 * 
 * Provides self-contained access to the 3 Autonomous E-Commerce AI Agents:
 * - Marketing Agent (Signal analysis, Audience segmentation, Content drafting)
 * - Sales Agent (Lead qualification, Product recommendation, Price check, Cart recovery)
 * - Customer Care Agent (Order tracking, Second Brain FAQ lookup, Escalation)
 * 
 * Powered by:
 * - RevenueOrchestrator (11-stage deterministic lifecycle)
 * - PolicyEnforcementPoint (AUTH-0 to AUTH-5 governance)
 * - EffectGuard (Deduplication & idempotent side-effects)
 */

// Core AI Engine
export { RevenueOrchestrator } from './core/orchestrator/revenue-orchestrator.js';
export { PolicyEnforcementPoint } from './core/policy/PolicyEnforcementPoint.js';
export { EffectGuard } from './core/durability/effect-guard.js';
export { MemoryEffectGuard } from './core/effects/memory-effect-guard.js';
export { MemoryWorkflowEngine } from './core/workflow/memory-workflow-engine.js';
export { Stage } from './core/lifecycle/stages.js';

// Domain Registry & Agent Runtimes
export { createDomainRuntimeRegistry } from './agents/domain-registry.js';
export { createCareFactory } from './agents/care/factory.js';
export { createSalesFactory } from './agents/sales/factory.js';
export { createMarketingFactory } from './agents/marketing/factory.js';

// Skills & Knowledge
export { createSkillRegistry } from './skills/registry.js';
export { loadApprovedDocuments } from './knowledge/loader.js';
export { parseFaqMarkdown } from './agents/care/skills/faq-parser.js';

// Offline Harnesses for quick standalone testing
export { createSalesOfflineHarness } from './agents/sales/offline-harness.js';
