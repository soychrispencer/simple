import { existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = path.join(root, 'packages', 'ui');
const utilsRoot = path.join(root, 'packages', 'utils');
const uiDistEntry = path.join(uiRoot, 'dist', 'index.js');
const utilsDistEntry = path.join(utilsRoot, 'dist', 'index.js');

function newestSourceMtime(dir) {
    let newest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            newest = Math.max(newest, newestSourceMtime(fullPath));
            continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
            continue;
        }
        newest = Math.max(newest, statSync(fullPath).mtimeMs);
    }
    return newest;
}

function isPackageStale(srcRoot, distEntry) {
    if (!existsSync(distEntry)) return true;
    const srcNewest = newestSourceMtime(srcRoot);
    if (srcNewest === 0) return false;
    return srcNewest > statSync(distEntry).mtimeMs;
}

const needsUtilsBuild = isPackageStale(path.join(utilsRoot, 'src'), utilsDistEntry);
const needsUiBuild = isPackageStale(path.join(uiRoot, 'src'), uiDistEntry);

if (needsUtilsBuild || needsUiBuild) {
    if (needsUtilsBuild) {
        console.log('@simple/utils: compilando dist (fuente más reciente que dist)…');
        execSync('pnpm --filter @simple/utils build', { cwd: root, stdio: 'inherit' });
    }
    if (needsUiBuild) {
        console.log('@simple/ui: compilando dist (fuente más reciente que dist)…');
        execSync('pnpm --filter @simple/ui build', { cwd: root, stdio: 'inherit' });
    }
}
