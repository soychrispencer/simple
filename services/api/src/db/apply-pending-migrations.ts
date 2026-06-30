/**
 * Segunda vía de migraciones: aplica SQL del journal cuyo hash no está en
 * `drizzle.__drizzle_migrations`. Complementa `migrate()` de drizzle-orm (CLI).
 * Ver `drizzle/README.md` y el arranque en `src/index.ts`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type postgres from 'postgres';

function migrationHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export async function applyPendingJournalMigrations(
    sql: postgres.Sql,
    migrationsFolder: string
): Promise<number> {
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    if (!existsSync(journalPath)) return 0;

    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
        entries: Array<{ tag: string }>;
    };

    const appliedRows = await sql<{ hash: string }[]>`
        SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const appliedHashes = new Set(appliedRows.map((row) => row.hash));

    let appliedNow = 0;
    for (const entry of journal.entries) {
        const filePath = path.join(migrationsFolder, `${entry.tag}.sql`);
        if (!existsSync(filePath)) continue;

        const body = readFileSync(filePath, 'utf8');
        const hash = migrationHash(body);
        if (appliedHashes.has(hash)) continue;

        await sql.unsafe(body);
        await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
        `;
        appliedHashes.add(hash);
        appliedNow += 1;
        console.info(`[simple-api] applied pending migration ${entry.tag}`);
    }

    return appliedNow;
}

export function resolveMigrationsFolder(): string {
    return path.resolve(__dirname, '../../drizzle');
}
