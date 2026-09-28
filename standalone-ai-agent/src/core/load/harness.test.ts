import { describe, expect, it } from 'vitest';

import { createHighProfile, createSmokeProfile, runLoadHarness, runSmokeProfile } from './harness.js';

describe('P5 load harness smoke profile', () => {
  it('computes offline metrics from deterministic injected samples', () => {
    const metrics = runSmokeProfile();

    expect(metrics.profile).toBe('smoke');
    expect(metrics.configuredConcurrency).toBe(4);
    expect(metrics.measured).toBe(true);
    expect(metrics.concurrentSessions).toBe(4);
    expect(metrics.completedTurns).toBe(4);
    expect(metrics.throughputTurnsPerSecond).toBe(40);
    expect(metrics.p50TurnLatencyMs).toBe(60);
    expect(metrics.p95TurnLatencyMs).toBe(100);
    expect(metrics.p99TurnLatencyMs).toBe(100);
    expect(metrics.errorRate).toBe(0.25);
    expect(metrics.refusalRate).toBe(0.25);
    expect(metrics.errorOrRefusalRate).toBe(0.5);
    expect(metrics.duplicateEffectCount).toBe(0);
    expect(metrics.authorityPolicyViolationCount).toBe(0);
    expect(metrics.queueDepth?.maximum).toBe(2);
    expect(metrics.costTokenStatus.status).toBe('available');
    expect(metrics.costTokenStatus.totalTokens).toBe(490);

    // This is an offline measurement only; no production SLO or benchmark pass is asserted.
    expect(metrics.benchmarkStatus).toBe('not-evaluated');
  });

  it('still measures injected duplicate effects and authority violations', () => {
    const profile = createSmokeProfile();
    const duplicated = profile.samples[0];
    if (!duplicated) throw new Error('Smoke profile has no effect sample.');
    const metrics = runLoadHarness({
      profile,
      samples: [
        duplicated,
        { ...duplicated, sessionId: 'smoke-duplicate', authorityPolicyViolation: true },
      ],
    });
    expect(metrics.duplicateEffectCount).toBe(1);
    expect(metrics.authorityPolicyViolationCount).toBe(1);
    expect(metrics.benchmarkStatus).toBe('not-evaluated');
  });

  it('does not present the unmeasured high profile as a benchmark result', () => {
    const metrics = runLoadHarness({ profile: createHighProfile() });
    expect(metrics.configuredConcurrency).toBe(10_000);
    expect(metrics.measured).toBe(false);
    expect(metrics.benchmarkStatus).toBe('not-evaluated');
  });
});
