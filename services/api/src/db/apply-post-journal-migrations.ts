import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type postgres from 'postgres';

export const POST_JOURNAL_TAGS = [
    '0042_nasty_radioactive_man',
    '0043_serenata_offers',
    '0044_serenata_client_requests',
    '0045_serenata_booking_payments',
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
    '0062_users_email_notification_prefs',
    '0063_users_in_app_notifications_enabled',
    '0064_users_last_notification_sent',
    '0065_users_email_digest_notification_log',
    '0066_users_google_calendar',
    '0067_users_whatsapp_category_prefs',
    '0068_users_requests_notification_prefs',
    '0069_subscriptions_plan_id_uuid',
    '0070_serenata_provider_group_blocked_slots',
    '0071_serenata_provider_group_payment_settings',
    '0072_serenata_group_invites',
    '0073_serenata_group_max_musicians',
    '0074_serenata_provider_group_member_invites',
    '0075_serenata_group_max_musicians_backfill',
    '0076_serenata_group_required_instruments',
    '0077_serenata_group_member_slot_index',
    '0078_serenatas_schema_repair',
    '0079_users_signup_source',
    '0080_serenatas_columns_repair',
    '0081_serenata_groups_repair',
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
    continueOnError?: boolean;
    log?: (message: string) => void;
};

export type ApplyPostJournalResult = {
    appliedNow: number;
    failed: number;
    dryRun: boolean;
};

export async function applyPostJournalMigrations(
    sql: postgres.Sql,
    options: ApplyPostJournalOptions
): Promise<ApplyPostJournalResult> {
    const dryRun = options.dryRun ?? false;
    const continueOnError = options.continueOnError ?? false;
    const log = options.log ?? console.info;

    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
        )
    `;

    const appliedRows = await sql<{ hash: string }[]>`
        SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const appliedHashes = new Set(appliedRows.map((row) => row.hash));

    let appliedNow = 0;
    let failed = 0;
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
        let failedStatements = 0;
        for (const statement of statements) {
            try {
                await sql.unsafe(statement);
            } catch (error) {
                failedStatements += 1;
                log(`  ERROR ${tag}: ${error instanceof Error ? error.message : String(error)}`);
                if (!continueOnError) {
                    throw error;
                }
            }
        }

        if (failedStatements === 0) {
            await sql`
                INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                VALUES (${hash}, ${Date.now()})
            `;
            appliedHashes.add(hash);
            appliedNow += 1;
            log(`  OK ${tag}`);
        } else {
            failed += 1;
            log(`  parcial ${tag}: ${failedStatements} statement(s) fallaron/omitidos`);
        }
    }

    return { appliedNow, failed, dryRun };
}

/** Resuelve `services/api/drizzle` desde el cwd del proceso (pnpm dev / scripts). */
export function defaultMigrationsFolder(cwd: string = process.cwd()): string {
    return path.join(cwd, 'drizzle');
}
