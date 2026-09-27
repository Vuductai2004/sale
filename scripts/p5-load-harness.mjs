#!/usr/bin/env node
/**
 * Offline P5 load measurement. The smoke profile is deterministic and sample-driven. The high
 * profile only records the requested capacity until a real sample source is supplied; it never
 * manufactures 10,000 sessions or reports a benchmark/SLO pass.
 */

const harness = await import('../packages/core-engine/src/load/harness.ts');

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

  if (profileName === 'smoke') {
    return harness.runSmokeProfile();
  }

  const profile = harness.createHighProfile(positiveConcurrency(optionValue(args, '--concurrency')));
  return harness.runLoadHarness({ profile, samples: profile.samples });
}

try {
  console.log(JSON.stringify(run(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
