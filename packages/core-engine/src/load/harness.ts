/**
 * Offline, sample-driven load measurements for the P5 benchmark boundary.
 *
 * This module deliberately does not execute sessions, call providers, or decide whether a
 * benchmark passed. Callers inject the observations they want measured; values that cannot be
 * observed are reported as unavailable instead of being inferred as a successful result.
 */

export type LoadProfileName = 'smoke' | 'high';

export const DEFAULT_HIGH_CONCURRENCY = 10_000;

export type LoadSampleOutcome = 'success' | 'error' | 'refusal' | 'refused' | 'ok';

export interface LoadHarnessSample {
  readonly sessionId?: string;
  readonly startedAtMs?: number;
  readonly completedAtMs?: number;
  readonly turnLatencyMs?: number;
  readonly latencyMs?: number;
  readonly outcome?: LoadSampleOutcome;
  readonly status?: LoadSampleOutcome;
  readonly error?: boolean;
  readonly refused?: boolean;
  readonly refusal?: boolean;
  readonly effectKey?: string;
  readonly duplicateEffect?: boolean;
  readonly authorityPolicyViolation?: boolean;
  readonly authorityViolation?: boolean;
  readonly queueDepth?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedTokens?: number;
  readonly cost?: number;
  readonly currency?: string;
}

export interface CostTokenSample {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedTokens?: number;
  readonly cost?: number;
  readonly currency?: string;
}

export interface HarnessClock {
  readonly nowMs: () => number;
}

export interface LoadProfile {
  readonly name: LoadProfileName;
  readonly configuredConcurrency: number;
  readonly samples: readonly LoadHarnessSample[];
  readonly measurementWindowMs?: number;
  readonly costSample?: CostTokenSample;
  readonly clock?: HarnessClock;
}

export interface LoadHarnessOptions {
  readonly profile?: LoadProfile | LoadProfileName;
  readonly samples?: readonly LoadHarnessSample[];
  readonly costSample?: CostTokenSample;
  /** Alias retained for callers that name the optional observation a cost sample. */
  readonly costTokenSample?: CostTokenSample;
  readonly clock?: HarnessClock;
  readonly measurementWindowMs?: number;
  readonly startedAtMs?: number;
  readonly endedAtMs?: number;
}

export interface QueueDepthMetrics {
  readonly sampleCount: number;
  readonly average: number;
  readonly maximum: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export type CostTokenStatus = 'available' | 'partial' | 'unavailable';

export interface CostTokenMetrics {
  readonly status: CostTokenStatus;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedTokens: number | null;
  readonly totalTokens: number | null;
  readonly cost: number | null;
  readonly currency: string | null;
}

export interface LoadMetrics {
  readonly profile: LoadProfileName;
  /** Configured capacity is reported separately from measured concurrency. */
  readonly configuredConcurrency: number;
  readonly measured: boolean;
  readonly sampleCount: number;
  readonly completedTurns: number;
  readonly concurrentSessions: number | null;
  readonly durationMs: number | null;
  readonly throughputTurnsPerSecond: number | null;
  readonly turnLatencySamples: number;
  readonly p50TurnLatencyMs: number | null;
  readonly p95TurnLatencyMs: number | null;
  readonly p99TurnLatencyMs: number | null;
  readonly errorCount: number;
  readonly refusalCount: number;
  readonly errorRate: number | null;
  readonly refusalRate: number | null;
  readonly errorOrRefusalRate: number | null;
  readonly duplicateEffectCount: number;
  readonly authorityPolicyViolationCount: number;
  readonly queueDepth?: QueueDepthMetrics;
  readonly costTokenStatus: CostTokenMetrics;
  /** No target or production SLO is evaluated by this offline measurement. */
  readonly benchmarkStatus: 'not-evaluated';
}

const SMOKE_START_MS = 1_700_000_000_000;
const SMOKE_WINDOW_MS = 100;

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer`);
  }
  return value;
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
  return value;
}

function percentile(values: readonly number[], quantile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  // Nearest-rank is deterministic and avoids pretending that an interpolated value was observed.
  const rank = Math.max(1, Math.ceil(values.length * quantile));
  return [...values].sort((left, right) => left - right)[rank - 1] ?? null;
}

function sampleLatency(sample: LoadHarnessSample): number | null {
  if (sample.turnLatencyMs !== undefined) {
    return finiteNonNegative(sample.turnLatencyMs, 'turnLatencyMs');
  }
  if (sample.latencyMs !== undefined) {
    return finiteNonNegative(sample.latencyMs, 'latencyMs');
  }
  if (sample.startedAtMs !== undefined && sample.completedAtMs !== undefined) {
    return finiteNonNegative(sample.completedAtMs - sample.startedAtMs, 'sample latency');
  }
  return null;
}

function optionalNumber(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return finiteNonNegative(value, label);
}

function readClock(clock: HarnessClock | undefined): number | undefined {
  if (clock === undefined) {
    return undefined;
  }
  return finiteNonNegative(clock.nowMs(), 'clock time');
}

function profileFor(value: LoadProfile | LoadProfileName | undefined): LoadProfile {
  if (value === undefined || value === 'smoke') {
    return createSmokeProfile();
  }
  if (value === 'high') {
    return createHighProfile();
  }
  return value;
}

function observedDurationMs(
  samples: readonly LoadHarnessSample[],
  options: LoadHarnessOptions,
  profile: LoadProfile,
): number | null {
  const explicit = options.measurementWindowMs ?? profile.measurementWindowMs;
  if (explicit !== undefined) {
    return finiteNonNegative(explicit, 'measurementWindowMs');
  }

  const starts = samples
    .map((sample) => sample.startedAtMs)
    .filter((value): value is number => value !== undefined);
  const ends = samples
    .map((sample) => sample.completedAtMs)
    .filter((value): value is number => value !== undefined);
  if (starts.length > 0 && ends.length > 0) {
    return finiteNonNegative(Math.max(...ends) - Math.min(...starts), 'observed duration');
  }

  const started = options.startedAtMs ?? readClock(options.clock ?? profile.clock);
  const ended = options.endedAtMs ?? readClock(options.clock ?? profile.clock);
  if (started !== undefined && ended !== undefined && ended >= started) {
    return ended - started;
  }

  const latencies = samples
    .map(sampleLatency)
    .filter((value): value is number => value !== null);
  return latencies.length > 0 ? Math.max(...latencies) : null;
}

interface Interval {
  readonly start: number;
  readonly end: number;
  readonly sessionId: string;
}

function sessionIntervals(samples: readonly LoadHarnessSample[]): Interval[] {
  const intervals: Interval[] = [];
  samples.forEach((sample, index) => {
    if (sample.startedAtMs === undefined) {
      return;
    }
    const latency = sampleLatency(sample);
    const end = sample.completedAtMs ?? (latency === null ? undefined : sample.startedAtMs + latency);
    if (end === undefined) {
      return;
    }
    finiteNonNegative(sample.startedAtMs, 'startedAtMs');
    finiteNonNegative(end, 'completedAtMs');
    if (end < sample.startedAtMs) {
      throw new RangeError('completedAtMs must not precede startedAtMs');
    }
    intervals.push({
      start: sample.startedAtMs,
      end,
      sessionId: sample.sessionId ?? `sample-${index}`,
    });
  });
  return intervals;
}

function concurrentSessionCount(samples: readonly LoadHarnessSample[]): number | null {
  const intervals = sessionIntervals(samples);
  if (intervals.length === 0) {
    const ids = new Set(samples.map((sample, index) => sample.sessionId ?? `sample-${index}`));
    return samples.length === 0 ? null : ids.size;
  }

  // Merge each session's overlapping turn intervals first, then count active sessions. This keeps
  // two overlapping turns from one session from being reported as two concurrent sessions.
  const bySession = new Map<string, Interval[]>();
  for (const interval of intervals) {
    const current = bySession.get(interval.sessionId);
    if (current === undefined) {
      bySession.set(interval.sessionId, [interval]);
    } else {
      current.push(interval);
    }
  }

  const merged: Interval[] = [];
  for (const [sessionId, sessionIntervalsForId] of bySession) {
    const ordered = [...sessionIntervalsForId].sort((left, right) => left.start - right.start);
    let current = ordered[0];
    if (current === undefined) {
      continue;
    }
    for (const next of ordered.slice(1)) {
      if (next.start <= current.end) {
        current = { ...current, end: Math.max(current.end, next.end) };
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
    // Preserve the session key even though it is only used for readability while debugging.
    void sessionId;
  }

  const events = merged.flatMap((interval) => [
    { time: interval.start, delta: 1 },
    { time: interval.end, delta: -1 },
  ]);
  events.sort((left, right) => left.time - right.time || left.delta - right.delta);
  let active = 0;
  let maximum = 0;
  for (const event of events) {
    active += event.delta;
    maximum = Math.max(maximum, active);
  }
  return maximum;
}

function duplicateEffectCount(samples: readonly LoadHarnessSample[]): number {
  const seen = new Set<string>();
  let count = 0;
  for (const sample of samples) {
    let repeatedEffect = false;
    if (sample.effectKey !== undefined) {
      repeatedEffect = seen.has(sample.effectKey);
      if (!repeatedEffect) {
        seen.add(sample.effectKey);
      }
    }
    if (repeatedEffect || sample.duplicateEffect === true) {
      count += 1;
    }
  }
  return count;
}

function costTokenMetrics(
  samples: readonly LoadHarnessSample[],
  options: LoadHarnessOptions,
  profile: LoadProfile,
): CostTokenMetrics {
  const supplied = options.costTokenSample ?? options.costSample ?? profile.costSample;
  const tokenRows: readonly {
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    cost?: number;
    currency?: string;
  }[] = supplied === undefined ? samples : [supplied];
  const hasTokenData = tokenRows.some(
    (row) =>
      row.inputTokens !== undefined || row.outputTokens !== undefined || row.cachedTokens !== undefined,
  );
  const hasCostData = tokenRows.some((row) => row.cost !== undefined);
  if (!hasTokenData && !hasCostData) {
    return {
      status: 'unavailable',
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
      totalTokens: null,
      cost: null,
      currency: null,
    };
  }

  const sum = (key: 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'cost'): number | null => {
    const values = tokenRows
      .map((row) => row[key])
      .filter((value): value is number => value !== undefined);
    if (values.length === 0) {
      return null;
    }
    return values.reduce((total, value) => total + finiteNonNegative(value, key), 0);
  };
  const inputTokens = sum('inputTokens');
  const outputTokens = sum('outputTokens');
  const cachedTokens = sum('cachedTokens');
  const cost = sum('cost');
  const currency = tokenRows.find((row) => row.currency !== undefined)?.currency ?? null;
  const tokenDataComplete = inputTokens !== null && outputTokens !== null;
  const costDataComplete = cost !== null;
  return {
    status: tokenDataComplete && costDataComplete ? 'available' : 'partial',
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens:
      inputTokens === null && outputTokens === null && cachedTokens === null
        ? null
        : (inputTokens ?? 0) + (outputTokens ?? 0) + (cachedTokens ?? 0),
    cost,
    currency,
  };
}

function queueMetrics(samples: readonly LoadHarnessSample[]): QueueDepthMetrics | undefined {
  const values = samples
    .map((sample) => optionalNumber(sample.queueDepth, 'queueDepth'))
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) {
    return undefined;
  }
  return {
    sampleCount: values.length,
    average: values.reduce((total, value) => total + value, 0) / values.length,
    maximum: Math.max(...values),
    p50: percentile(values, 0.5) ?? 0,
    p95: percentile(values, 0.95) ?? 0,
    p99: percentile(values, 0.99) ?? 0,
  };
}

export function createSmokeProfile(): LoadProfile {
  const samples: readonly LoadHarnessSample[] = [
    {
      sessionId: 'smoke-session-1',
      startedAtMs: SMOKE_START_MS,
      completedAtMs: SMOKE_START_MS + 40,
      turnLatencyMs: 40,
      outcome: 'success',
      effectKey: 'smoke-effect-1',
      queueDepth: 0,
      inputTokens: 100,
      outputTokens: 25,
      cachedTokens: 10,
      cost: 0.01,
      currency: 'TWD',
    },
    {
      sessionId: 'smoke-session-2',
      startedAtMs: SMOKE_START_MS,
      completedAtMs: SMOKE_START_MS + 60,
      turnLatencyMs: 60,
      outcome: 'ok',
      effectKey: 'smoke-effect-1',
      queueDepth: 1,
      inputTokens: 110,
      outputTokens: 30,
      cachedTokens: 10,
      cost: 0.012,
      currency: 'TWD',
    },
    {
      sessionId: 'smoke-session-3',
      startedAtMs: SMOKE_START_MS,
      completedAtMs: SMOKE_START_MS + 80,
      turnLatencyMs: 80,
      outcome: 'error',
      authorityPolicyViolation: true,
      queueDepth: 2,
      inputTokens: 90,
      outputTokens: 20,
      cachedTokens: 0,
      cost: 0.009,
      currency: 'TWD',
    },
    {
      sessionId: 'smoke-session-4',
      startedAtMs: SMOKE_START_MS,
      completedAtMs: SMOKE_START_MS + SMOKE_WINDOW_MS,
      turnLatencyMs: SMOKE_WINDOW_MS,
      outcome: 'refusal',
      queueDepth: 1,
      inputTokens: 80,
      outputTokens: 15,
      cachedTokens: 0,
      cost: 0.008,
      currency: 'TWD',
    },
  ];
  return {
    name: 'smoke',
    configuredConcurrency: 4,
    samples,
    measurementWindowMs: SMOKE_WINDOW_MS,
    clock: { nowMs: () => SMOKE_START_MS },
  };
}

export function createHighProfile(concurrency = DEFAULT_HIGH_CONCURRENCY): LoadProfile {
  return {
    name: 'high',
    configuredConcurrency: positiveInteger(concurrency, 'concurrency'),
    samples: [],
  };
}

export function runLoadHarness(options: LoadHarnessOptions = {}): LoadMetrics {
  const profile = profileFor(options.profile);
  const samples = options.samples ?? profile.samples;
  const configuredConcurrency = profile.configuredConcurrency;
  const latencies = samples
    .map(sampleLatency)
    .filter((value): value is number => value !== null);
  const errors = samples.filter(
    (sample) => sample.error === true || sample.outcome === 'error' || sample.status === 'error',
  ).length;
  const refusals = samples.filter(
    (sample) =>
      sample.refused === true ||
      sample.refusal === true ||
      sample.outcome === 'refusal' ||
      sample.outcome === 'refused' ||
      sample.status === 'refusal' ||
      sample.status === 'refused',
  ).length;
  const durationMs = observedDurationMs(samples, options, profile);
  const completedTurns = samples.length;
  const throughputTurnsPerSecond =
    durationMs !== null && durationMs > 0 ? completedTurns / (durationMs / 1000) : null;
  const measured = samples.length > 0;
  const queueDepth = queueMetrics(samples);

  return {
    profile: profile.name,
    configuredConcurrency,
    measured,
    sampleCount: samples.length,
    completedTurns,
    concurrentSessions: concurrentSessionCount(samples),
    durationMs,
    throughputTurnsPerSecond,
    turnLatencySamples: latencies.length,
    p50TurnLatencyMs: percentile(latencies, 0.5),
    p95TurnLatencyMs: percentile(latencies, 0.95),
    p99TurnLatencyMs: percentile(latencies, 0.99),
    errorCount: errors,
    refusalCount: refusals,
    errorRate: measured ? errors / samples.length : null,
    refusalRate: measured ? refusals / samples.length : null,
    errorOrRefusalRate: measured ? (errors + refusals) / samples.length : null,
    duplicateEffectCount: duplicateEffectCount(samples),
    authorityPolicyViolationCount: samples.filter(
      (sample) => sample.authorityPolicyViolation === true || sample.authorityViolation === true,
    ).length,
    ...(queueDepth === undefined ? {} : { queueDepth }),
    costTokenStatus: costTokenMetrics(samples, options, profile),
    benchmarkStatus: 'not-evaluated',
  };
}

export function runSmokeProfile(): LoadMetrics {
  const profile = createSmokeProfile();
  return runLoadHarness({
    profile,
    samples: profile.samples,
    ...(profile.clock === undefined ? {} : { clock: profile.clock }),
  });
}
