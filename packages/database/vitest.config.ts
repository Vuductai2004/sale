import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Unit suite (`pnpm test:unit`): no PostgreSQL, no network.
 *
 * The dedicated Gate P0 suites name their own files — `test:adversarial` owns the effect-reservation
 * and durable-workflow arbitration repositories, `test:security` owns the approval queue and the
 * audit/evidence chains — so those files are excluded here. The union of `test:unit`,
 * `test:adversarial` and `test:security` executes every offline assertion exactly once, and each
 * dedicated config keeps an explicit non-empty selector that fails closed if its files disappear.
 *
 * Live PostgreSQL suites are excluded too. `pnpm test:rls-policies` runs the
 * application-role policy suite, `pnpm test:rls-rehearsal` runs the privileged-fixture rehearsal, and
 * `pnpm test:p5-db` runs the P5 provisioning/autonomy repositories.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/**/*.adversarial.test.ts',
      'src/repositories/effect-reservations.test.ts',
      'src/repositories/durable-workflows.test.ts',
      'src/**/*.security.test.ts',
      'src/repositories/approvals.test.ts',
      'src/repositories/audit-evidence.test.ts',
      'src/rls.test.ts',
      'src/rls.rehearsal.test.ts',
      'src/p5.live.test.ts',
    ],
  },
});
