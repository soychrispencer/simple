/**
 * CLI: aplica migraciones SQL del journal cuyo hash no está en la BD.
 *
 * Uso: pnpm exec tsx scripts/archive/apply-pending-migrations.ts
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import {
    applyPendingJournalMigrations,
    resolveMigrationsFolder,
} from '../../src/db/apply-pending-migrations.js';

async function main() {
    const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

    for (const name of ['.env', '.env.local']) {
        const p = path.join(apiRoot, name);
        if (existsSync(p)) process.loadEnvFile?.(p);
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL no definida');
        process.exit(1);
    }

    const sql = postgres(url);
    try {
        const appliedNow = await applyPendingJournalMigrations(sql, resolveMigrationsFolder());
        console.log(`Hecho. Migraciones nuevas aplicadas en esta corrida: ${appliedNow}`);
    } finally {
        await sql.end();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
