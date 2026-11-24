import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const auditScripts = [
    'audit-account-membership-integrity',
    'audit-subscription-account-scope',
    'audit-serenatas-billing-scope',
    'audit-social-workspace-integrations',
    'audit-private-media-scope',
    'audit-user-vertical-onboarding',
];
const scriptDirectory = dirname(__filename);
const sourceMode = __filename.endsWith('.ts');

for (const script of auditScripts) {
    const extension = sourceMode ? '.ts' : '.js';
    const scriptPath = resolve(scriptDirectory, `${script}${extension}`);
    const commandArgs = sourceMode ? ['--import', 'tsx', scriptPath] : [scriptPath];
    console.log(`\n[roles-plan audit] ${script}${extension}`);
    const result = spawnSync(process.execPath, commandArgs, {
        env: process.env,
        stdio: 'inherit',
    });

    if (result.error) {
        console.error(`No se pudo ejecutar ${script}: ${result.error.message}`);
        process.exitCode = 1;
        break;
    }
    if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        break;
    }
}
