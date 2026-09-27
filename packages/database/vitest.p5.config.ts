import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** P5 repository smoke against a migrated PostgreSQL rehearsal database and NOBYPASSRLS app role. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/p5.live.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
