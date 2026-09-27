import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/e2e/**', '**/*.e2e.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
