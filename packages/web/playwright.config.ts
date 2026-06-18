import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --workspace=@recipebook/api',
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev --workspace=@recipebook/web',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
