import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distEntry = path.join(root, 'packages', 'ui', 'dist', 'index.js');
const distResolveActiveNav = path.join(root, 'packages', 'ui', 'dist', 'panel', 'resolve-active-nav.js');

if (!existsSync(distEntry) || !existsSync(distResolveActiveNav)) {
    console.log('@simple/ui: dist no encontrado, ejecutando build…');
    execSync('pnpm --filter @simple/ui build', { cwd: root, stdio: 'inherit' });
}
