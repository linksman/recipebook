import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
    },
    globalSetup: './src/__tests__/globalSetup.ts',
    pool: 'forks',
    fileParallelism: false,
  },
});
