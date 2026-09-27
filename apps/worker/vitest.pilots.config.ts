import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Offline pilot harness (`pnpm test:pilots`): the executable E2E-OFF-ESC PILOT-04 customer-care
 * suite and the PILOT-02 sales suite.
 *
 * Both files are named explicitly, so this gate fails with "no test files found" if either pilot
 * disappears instead of reporting a green run over fewer cases. The worker unit config excludes
 * exactly these two files, so the union of `test:unit`, `test:pilots` and `test:e2e` executes every
 * worker assertion exactly once.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/runtime/care/pilot-04.test.ts', 'src/runtime/sales/pilot-02.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
