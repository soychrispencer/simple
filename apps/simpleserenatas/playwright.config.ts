import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3015',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm build && pnpm start -p 3015',
    cwd: __dirname,
    url: 'http://127.0.0.1:3015',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
