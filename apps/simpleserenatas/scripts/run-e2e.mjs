#!/usr/bin/env node
/**
 * Ejecuta Playwright o sale 0 si PLAYWRIGHT_SKIP=1 (CI sin browsers).
 */
if (process.env.PLAYWRIGHT_SKIP === '1') {
    console.info('[test:e2e] SKIP — PLAYWRIGHT_SKIP=1');
    process.exit(0);
}

import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['exec', 'playwright', 'test'], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
});

process.exit(result.status ?? 1);
