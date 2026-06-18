import { existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = path.join(root, 'packages', 'ui');
const distEntry = path.join(uiRoot, 'dist', 'index.js');
const distSubscriptionManager = path.join(uiRoot, 'dist', 'panel', 'subscription-manager.js');
const srcSubscriptionManager = path.join(uiRoot, 'src', 'panel', 'subscription-manager.tsx');

function isStale(sourcePath, distPath) {
    if (!existsSync(distPath)) return true;
    if (!existsSync(sourcePath)) return false;
    return statSync(sourcePath).mtimeMs > statSync(distPath).mtimeMs;
}

const needsBuild =
    !existsSync(distEntry)
    || isStale(srcSubscriptionManager, distSubscriptionManager);

if (needsBuild) {
    console.log('@simple/ui: compilando dist (fuente más reciente que dist)…');
    execSync('pnpm --filter @simple/utils build && pnpm --filter @simple/ui build', {
        cwd: root,
        stdio: 'inherit',
    });
}
