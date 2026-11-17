import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3003';

export default defineConfig({
    testDir: './e2e',
    testMatch: 'roles.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL,
        ...(process.env.PLAYWRIGHT_CHANNEL === 'chrome' ? { channel: 'chrome' as const } : {}),
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
