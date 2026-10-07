import { describe, expect, it } from 'vitest';

import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('admits exactly one HALF_OPEN probe and reopens after a failed probe', () => {
    let now = 0;
    const breaker = new CircuitBreaker(1, 100, () => now);

    expect(breaker.canExecute()).toBe(true);
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);

    now = 100;
    expect(breaker.canExecute()).toBe(true);
    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.canExecute()).toBe(false);

    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);
  });

  it('closes after a successful HALF_OPEN probe and resets the failure count', () => {
    let now = 0;
    const breaker = new CircuitBreaker(2, 100, () => now);

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    now = 100;
    expect(breaker.canExecute()).toBe(true);
    breaker.recordSuccess();

    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('reports wouldAdmit accurately without consuming the probe or advancing state', () => {
    let now = 0;
    const breaker = new CircuitBreaker(1, 100, () => now);

    expect(breaker.wouldAdmit()).toBe(true);
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.wouldAdmit()).toBe(false);

    now = 100;
    expect(breaker.wouldAdmit()).toBe(true);
    // Still OPEN because wouldAdmit does not advance state to HALF_OPEN
    expect(breaker.getState()).toBe('OPEN');

    // canExecute advances state to HALF_OPEN and marks probe in flight
    expect(breaker.canExecute()).toBe(true);
    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.wouldAdmit()).toBe(false);

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.wouldAdmit()).toBe(true);
  });
});
