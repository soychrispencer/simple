#!/usr/bin/env tsx
/**
 * Registra hashes en drizzle.__drizzle_migrations cuando el SQL del journal
 * ya está reflejado en el esquema (sin re-ejecutar DDL destructivo).
 *
 *   pnpm --filter=@simple/api run db:sync:migration-hashes
 *   pnpm --filter=@simple/api run db:sync:migration-hashes -- --dry-run
 *   pnpm --filter=@simple/api run db:sync:migration-hashes -- --tags 0051,0052
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, '..');
const migrationsFolder = path.join(apiRoot, 'drizzle');

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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const tagsArg = args.find((a) => a.startsWith('--tags='))?.slice('--tags='.length)
    ?? (args.includes('--tags') ? args[args.indexOf('--tags') + 1] : undefined);
const tagFilter = tagsArg
    ? new Set(
        tagsArg.split(',').map((t) => {
            const trimmed = t.trim();
            if (/^\d+$/.test(trimmed) && trimmed.length < 4) {
                return trimmed.padStart(4, '0');
            }
            return trimmed;
        }).filter(Boolean),
    )
    : null;

function migrationHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function isPlaceholderMigration(body: string): boolean {
    const stripped = body.replace(/--.*$/gm, '').trim();
    return stripped.length === 0;
}

function extractCreateTableNames(sql: string): string[] {
    const names = new Set<string>();
    const patterns = [
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi,
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi,
    ];
    for (const pattern of patterns) {
        for (const match of sql.matchAll(pattern)) {
            names.add(match[1]);
        }
    }
    return [...names];
}

async function columnExists(
    sql: postgres.Sql,
    tableName: string,
    columnName: string,
): Promise<boolean> {
    const [{ ok }] = await sql`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ${tableName}
              AND column_name = ${columnName}
        ) AS ok
    `;
    return Boolean(ok);
}

async function indexExists(sql: postgres.Sql, indexName: string): Promise<boolean> {
    const [{ ok }] = await sql`
        SELECT to_regclass(${`public.${indexName}`}) IS NOT NULL AS ok
    `;
    return Boolean(ok);
}

type ProbeFn = (sql: postgres.Sql) => Promise<boolean>;

/** Probes explícitos cuando el SQL es solo ALTER/DO/rename. */
const TAG_PROBES: Record<string, ProbeFn> = {
    '0049_serenata_provider_marketplace': async (sql) => {
        const [{ ok }] = await sql`
            SELECT to_regclass('public.serenata_provider_groups') IS NOT NULL AS ok
        `;
        return Boolean(ok);
    },
    '0050_serenata_provider_members': async (sql) => {
        const [{ ok }] = await sql`
            SELECT to_regclass('public.serenata_provider_group_members') IS NOT NULL AS ok
        `;
        return Boolean(ok);
    },
    '0051_serenata_admin_table': async (sql) => {
        const [{ ok }] = await sql`
            SELECT (
                to_regclass('public.serenata_owners') IS NOT NULL
                OR to_regclass('public.serenata_admins') IS NOT NULL
                OR to_regclass('public.serenata_coordinators') IS NOT NULL
            ) AS ok
        `;
        return Boolean(ok);
    },
    '0052_serenata_admin_columns': async (sql) => {
        if (await columnExists(sql, 'serenata_provider_groups', 'owner_id')) return true;
        return columnExists(sql, 'serenata_provider_groups', 'admin_id');
    },
    '0060_serenata_owners': async (sql) => {
        const [{ tableOk }] = await sql`
            SELECT to_regclass('public.serenata_owners') IS NOT NULL AS "tableOk"
        `;
        if (!tableOk) return false;
        return columnExists(sql, 'serenata_provider_groups', 'owner_id');
    },
    '0053_serenata_lifecycle': async (sql) => columnExists(sql, 'serenatas', 'completed_at'),
    '0047_user_pending_email': async (sql) => columnExists(sql, 'users', 'pending_email'),
    '0054_listings_public_search_gin': async (sql) => indexExists(sql, 'listings_raw_data_gin_idx'),
    '0055_serenata_sla_availability': async (sql) => columnExists(sql, 'serenatas', 'response_due_at'),
    '0056_serenata_availability_rules': async (sql) => {
        const [{ ok }] = await sql`
            SELECT to_regclass('public.serenata_availability_rules') IS NOT NULL AS ok
        `;
        return Boolean(ok);
    },
    '0057_serenata_groups_provider_link': async (sql) => columnExists(sql, 'serenata_groups', 'provider_group_id'),
    '0058_mortgage_rates_highest_rate': async (sql) => columnExists(sql, 'mortgage_rates', 'highest_rate'),
    '0059_admin_audit_logs': async (sql) => {
        const [{ ok }] = await sql`
            SELECT to_regclass('public.admin_audit_logs') IS NOT NULL AS ok
        `;
        return Boolean(ok);
    },
    '0018_performance_indexes': async (sql) => indexExists(sql, 'listings_owner_id_idx'),
    '0020_simpleagenda_integrations': async (sql) => columnExists(sql, 'agenda_professional_profiles', 'encuadre'),
    '0021_agenda_reminder_30min': async (sql) => columnExists(sql, 'agenda_appointments', 'reminder_30min_sent_at'),
    '0022_agenda_wa_prefs': async (sql) => columnExists(sql, 'agenda_professional_profiles', 'wa_notifications_enabled'),
    '0023_agenda_payment_methods': async (sql) => columnExists(sql, 'agenda_professional_profiles', 'mp_access_token'),
    '0024_address_book': async (sql) => {
        const [{ ok }] = await sql`
            SELECT to_regclass('public.address_book') IS NOT NULL AS ok
        `;
        return Boolean(ok);
    },
    '0039_user_primary_vertical': async (sql) => columnExists(sql, 'users', 'primary_vertical'),
    '0041_remove_discontinued_vertical': async (sql) => {
        const [{ ok }] = await sql`
            SELECT NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'users_primary_vertical_check'
                  AND pg_get_constraintdef(oid) LIKE '%serenatas%'
            ) AS ok
        `;
        return Boolean(ok);
    },
    '0044_serenata_client_requests': async (sql) => columnExists(sql, 'serenatas', 'client_id'),
    '0046_serenata_musician_working_comunas': async (sql) => columnExists(sql, 'serenata_musicians', 'working_comunas'),
    '0048_serenata_package_logistics': async (sql) => columnExists(sql, 'serenatas', 'package_code'),
};

async function tablesExist(sql: postgres.Sql, tableNames: string[]): Promise<boolean> {
    if (tableNames.length === 0) return true;
    for (const name of tableNames) {
        const [{ ok }] = await sql`
            SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS ok
        `;
        if (!ok) return false;
    }
    return true;
}

async function schemaMatchesMigration(
    sql: postgres.Sql,
    tag: string,
    body: string,
): Promise<boolean> {
    if (TAG_PROBES[tag]) {
        return TAG_PROBES[tag](sql);
    }
    if (isPlaceholderMigration(body)) {
        return true;
    }
    const tables = extractCreateTableNames(body);
    if (tables.length > 0) {
        return tablesExist(sql, tables);
    }
    // ALTER-only sin probe: no auto-sync (evita falsos positivos)
    return false;
}

async function main() {
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
        entries: Array<{ tag: string }>;
    };

    const sql = postgres(DATABASE_URL!, { max: 1 });
    try {
        const appliedRows = await sql<{ hash: string }[]>`
            SELECT hash FROM drizzle.__drizzle_migrations
        `;
        const appliedHashes = new Set(appliedRows.map((row) => row.hash));

        let registered = 0;
        let skipped = 0;
        let needsSql = 0;

        for (const entry of journal.entries) {
            const tagBase = entry.tag.replace(/\.sql$/, '');
            const tagNum = tagBase.match(/^(\d{4})_/)?.[1];
            if (
                tagFilter
                && !tagFilter.has(entry.tag)
                && !tagFilter.has(tagBase)
                && !(tagNum && tagFilter.has(tagNum))
            ) {
                continue;
            }

            const filePath = path.join(migrationsFolder, `${entry.tag}.sql`);
            if (!existsSync(filePath)) {
                console.warn(`  omitido (sin archivo): ${entry.tag}`);
                continue;
            }

            const body = readFileSync(filePath, 'utf8');
            const hash = migrationHash(body);
            if (appliedHashes.has(hash)) {
                skipped += 1;
                continue;
            }

            const matches = await schemaMatchesMigration(sql, entry.tag, body);
            if (!matches) {
                console.info(`  pendiente DDL: ${entry.tag} (hash ${hash.slice(0, 12)}…)`);
                needsSql += 1;
                continue;
            }

            if (dryRun) {
                console.info(`  [dry-run] registraría: ${entry.tag}`);
            } else {
                await sql`
                    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                    VALUES (${hash}, ${Date.now()})
                `;
                appliedHashes.add(hash);
                console.info(`  registrado: ${entry.tag} (${hash.slice(0, 12)}…)`);
            }
            registered += 1;
        }

        console.info('');
        console.info(
            `Resumen: ${registered} hash(es) ${dryRun ? 'simulados' : 'insertados'}, ${skipped} ya aplicados, ${needsSql} requieren migración SQL.`,
        );

        if (needsSql > 0) {
            console.info('Siguiente paso: pnpm db:migrate o pnpm --filter=@simple/api run db:repair:marketplace');
        }
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
