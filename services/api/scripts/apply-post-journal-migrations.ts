#!/usr/bin/env tsx
/**
 * Aplica migraciones SQL numeradas que existen en disco pero NO están en
 * `drizzle/meta/_journal.json` (post-0045). Idempotente (IF NOT EXISTS / DO).
 *
 *   pnpm --filter=@simple/api exec tsx scripts/apply-post-journal-migrations.ts
 *   pnpm --filter=@simple/api exec tsx scripts/apply-post-journal-migrations.ts -- --dry-run
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { applyPostJournalMigrations } from '../src/db/apply-post-journal-migrations.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, '..');

for (const candidate of [path.join(apiRoot, '.env'), path.join(apiRoot, '.env.local')]) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const i = trimmed.indexOf('=');
        if (i <= 0) continue;
        const key = trimmed.slice(0, i).trim();
        if (!key || process.env[key]) continue;
        process.env[key] = trimmed.slice(i + 1).trim();
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

async function main() {
    const sql = postgres(DATABASE_URL!, { max: 1 });
    try {
        const { appliedNow, dryRun: isDryRun } = await applyPostJournalMigrations(sql, {
            migrationsFolder: path.join(apiRoot, 'drizzle'),
            dryRun,
        });
        console.info(
            `\nResumen: ${appliedNow} migración(es) post-journal ${isDryRun ? 'simuladas' : 'aplicadas'}.`
        );
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
