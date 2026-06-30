import path from 'node:path';
import postgres from 'postgres';
import { applyPostJournalMigrations } from './apply-post-journal-migrations.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('[simple-api] DATABASE_URL is required to apply post-journal migrations');
    process.exit(1);
}

const resolvedDatabaseUrl = databaseUrl;

async function main() {
    const sql = postgres(resolvedDatabaseUrl, { max: 1 });
    try {
        const result = await applyPostJournalMigrations(sql, {
            migrationsFolder: path.resolve(process.cwd(), 'drizzle'),
            continueOnError: true,
            log: (message) => console.info(`[simple-api] post-journal ${message}`),
        });
        console.info(
            `[simple-api] post-journal: ${result.appliedNow} migration(s) applied, ${result.failed} failed/skipped`
        );
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error('[simple-api] post-journal migrations failed', error);
    process.exit(1);
});
