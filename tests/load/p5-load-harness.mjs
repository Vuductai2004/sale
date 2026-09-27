#!/usr/bin/env node
/**
 * Offline P5 load measurement. Build core-engine before running this script so Node 20 and CI
 * execute the compiled harness. The smoke profile is deterministic and sample-driven. The high
 * profile only records the requested capacity until a real sample source is supplied; it never
 * manufactures 10,000 sessions or reports a benchmark/SLO pass.
 */

const harness = await import('../../packages/core-engine/dist/load/harness.js');

function optionValue(args, name) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline !== undefined) {
    return inline.slice(name.length + 1);
  }
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function positiveConcurrency(raw) {
  if (raw === undefined) {
    return harness.DEFAULT_HIGH_CONCURRENCY;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--concurrency must be a positive integer; received '${raw}'`);
  }
  return value;
}

function run() {
  const args = process.argv.slice(2);
  const profileName = optionValue(args, '--profile') ?? 'smoke';
  if (profileName !== 'smoke' && profileName !== 'high') {
    throw new Error(`--profile must be 'smoke' or 'high'; received '${profileName}'`);
  }

  let metrics;
  if (profileName === 'smoke') {
    metrics = harness.runSmokeProfile();
  } else {
    const profile = harness.createHighProfile(positiveConcurrency(optionValue(args, '--concurrency')));
    metrics = harness.runLoadHarness({ profile, samples: profile.samples });
  }
  if (args.includes('--assert-safe-smoke')) {
    if (metrics.profile !== 'smoke' || !metrics.measured || metrics.sampleCount === 0
      || metrics.duplicateEffectCount !== 0 || metrics.authorityPolicyViolationCount !== 0
      || metrics.benchmarkStatus !== 'not-evaluated') {
      throw new Error('P5_SMOKE_FAILED: deterministic smoke must measure zero duplicate effects and authority violations without claiming a benchmark.');
    }
  }
  return metrics;
}

try {
  console.log(JSON.stringify(run(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
