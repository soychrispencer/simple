import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type postgres from 'postgres';

export const POST_JOURNAL_TAGS = [
    '0046_serenata_musician_working_comunas',
    '0047_user_pending_email',
    '0048_serenata_package_logistics',
    '0049_serenata_provider_marketplace',
    '0050_serenata_provider_members',
    '0051_serenata_admin_table',
    '0052_serenata_admin_columns',
    '0053_serenata_lifecycle',
    '0054_listings_public_search_gin',
    '0055_serenata_sla_availability',
    '0056_serenata_availability_rules',
    '0057_serenata_groups_provider_link',
    '0058_mortgage_rates_highest_rate',
    '0059_admin_audit_logs',
    '0060_serenata_owners',
    '0061_users_whatsapp_enabled',
] as const;

export type PostJournalTag = (typeof POST_JOURNAL_TAGS)[number];

export function migrationHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function splitStatements(sql: string): string[] {
    return sql
        .split(/-->\s*statement-breakpoint\s*/i)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
}

export type ApplyPostJournalOptions = {
    migrationsFolder: string;
    dryRun?: boolean;
    log?: (message: string) => void;
};

export type ApplyPostJournalResult = {
    appliedNow: number;
    dryRun: boolean;
};

export async function applyPostJournalMigrations(
    sql: postgres.Sql,
    options: ApplyPostJournalOptions
): Promise<ApplyPostJournalResult> {
    const dryRun = options.dryRun ?? false;
    const log = options.log ?? console.info;

    const appliedRows = await sql<{ hash: string }[]>`
        SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const appliedHashes = new Set(appliedRows.map((row) => row.hash));

    let appliedNow = 0;
    for (const tag of POST_JOURNAL_TAGS) {
        const filePath = path.join(options.migrationsFolder, `${tag}.sql`);
        if (!existsSync(filePath)) {
            log(`  omitido (sin archivo): ${tag}`);
            continue;
        }
        const body = readFileSync(filePath, 'utf8');
        const hash = migrationHash(body);
        if (appliedHashes.has(hash)) {
            log(`  ya aplicado: ${tag}`);
            continue;
        }

        if (dryRun) {
            log(`  [dry-run] aplicaría: ${tag}`);
            appliedNow += 1;
            continue;
        }

        const statements = splitStatements(body);
        log(`  aplicando ${tag} (${statements.length} statements)…`);
        for (const statement of statements) {
            await sql.unsafe(statement);
        }
        await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
        `;
        appliedHashes.add(hash);
        appliedNow += 1;
        log(`  OK ${tag}`);
    }

    return { appliedNow, dryRun };
}

/** Resuelve `services/api/drizzle` desde el cwd del proceso (pnpm dev / scripts). */
export function defaultMigrationsFolder(cwd: string = process.cwd()): string {
    return path.join(cwd, 'drizzle');
}
