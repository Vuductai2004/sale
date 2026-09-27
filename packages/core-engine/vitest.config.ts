import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Core-engine unit suite (`pnpm test:unit`, which also runs the plain-Node boot tests).
 *
 * The Gate P0 suites name their own files: `test:contracts` owns the canonical-JSON/
 * HMAC/authority-rank contracts, `test:adversarial` owns the EffectGuard cases, and
 * `test:security` owns the policy enforcement point. Those files are excluded here so the union of
 * `test:unit`, `test:contracts`, `test:adversarial` and `test:security` executes every assertion
 * exactly once, while each dedicated config keeps an explicit non-empty selector that fails closed
 * if its files disappear.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/**/*.contracts.test.ts',
      'src/durability/canonical-json.test.ts',
      'src/authority-rank.test.ts',
      'src/**/*.adversarial.test.ts',
      'src/durability/effect-guard.test.ts',
      'src/**/*.security.test.ts',
      'src/policy/policy.test.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
