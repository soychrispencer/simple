#!/usr/bin/env node
/**
 * CI/local: instala Chromium si hace falta y corre Playwright.
 * Omitir todo: PLAYWRIGHT_SKIP=1 pnpm test:e2e:ci
 */
if (process.env.PLAYWRIGHT_SKIP === '1') {
    console.info('[test:e2e:ci] SKIP — PLAYWRIGHT_SKIP=1');
    process.exit(0);
}

import { spawnSync } from 'node:child_process';

function run(command, args) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: true,
        env: process.env,
    });
    if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1);
    }
}

run('pnpm', ['exec', 'playwright', 'install', 'chromium']);
run('pnpm', ['exec', 'playwright', 'test']);
