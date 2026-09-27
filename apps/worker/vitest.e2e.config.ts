import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/e2e/**/*.e2e.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
