#!/usr/bin/env tsx
/**
 * Repara drift: migraciones 0049–0052 marcadas en journal pero tablas ausentes.
 * Idempotente (SQL con IF NOT EXISTS / bloques DO).
 *
 *   pnpm --filter=@simple/api exec tsx scripts/repair-marketplace-schema.ts
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

function migrationHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

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

const MIGRATION_FILES = [
    '0049_serenata_provider_marketplace.sql',
    '0050_serenata_provider_members.sql',
    '0051_serenata_admin_table.sql',
    '0052_serenata_admin_columns.sql',
];

function splitStatements(sql: string): string[] {
    return sql
        .split(/-->\s*statement-breakpoint\s*/i)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
}

async function main() {
    const sql = postgres(DATABASE_URL!, { max: 1 });
    try {
        const [{ ok }] = await sql`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'serenata_provider_groups'
            ) AS ok`;
        if (ok) {
            console.log('serenata_provider_groups ya existe; nada que reparar.');
            return;
        }

        console.log('Tabla serenata_provider_groups ausente; aplicando SQL 0049–0052…');
        for (const file of MIGRATION_FILES) {
            const filePath = path.join(apiRoot, 'drizzle', file);
            const raw = readFileSync(filePath, 'utf8');
            const statements = splitStatements(raw);
            console.log(`  ${file} (${statements.length} statements)`);
            for (const statement of statements) {
                await sql.unsafe(statement);
            }
            const hash = migrationHash(raw);
            const [{ exists: hashExists }] = await sql`
                SELECT EXISTS (
                    SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
                ) AS exists
            `;
            if (!hashExists) {
                await sql`
                    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                    VALUES (${hash}, ${Date.now()})
                `;
                console.log(`  hash registrado: ${file.replace(/\.sql$/, '')}`);
            }
        }

        const [{ ok: after }] = await sql`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'serenata_provider_groups'
            ) AS ok`;
        if (!after) {
            console.error('Reparación falló: serenata_provider_groups sigue ausente.');
            process.exit(1);
        }
        console.log('Reparación marketplace completada.');
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
