import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type postgres from 'postgres';

// The Drizzle journal owns migrations through 0045. Keep this runner on the
// post-journal range so it never replays historical journal DDL against an
// already-migrated production schema.
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
    '0082_serenata_groups_legacy_columns',
    '0083_serenata_group_members_repair',
    '0084_serenata_repertoire',
    '0085_serenata_song_catalog',
    '0086_serenata_musician_profile_fields',
    '0087_serenata_saved_provider_groups',
    '0088_serenata_client_rating',
    '0089_serenata_owner_collection_method',
    '0090_serenata_musician_payouts',
    '0091_serenata_client_review_comment',
    '0092_serenata_owner_payout_status',
    '0093_serenata_service_promo_price',
    '0094_user_platform_access',
    '0095_serenata_provider_group_timezone',
    '0096_user_timezone',
    '0097_migrate_timezones_to_users',
    '0098_user_dst_enabled',
    '0099_billing_remove_essential',
    '0100_serenata_drop_legacy_coordinator_admin',
    '0101_instagram_publication_content_type',
    '0102_meta_facebook_page',
    '0103_social_publications',
    '0104_structured_locations',
    '0104_tiktok_youtube_accounts',
    '0105_platform_core_communication',
    '0106_message_threads_platform_context',
    '0107_drop_crm',
    '0108_billing_purge_essential',
    '0109_public_profile_operator_subtype',
    '0110_agenda_accent_color',
    '0110_public_profile_trial_ends_at',
    '0111_accounts_business_legal',
    '0112_agenda_operator_profile',
    '0113_public_profile_operator_subtype_custom',
    '0114_public_profile_structured_location',
    '0115_address_book_scope',
    '0116_address_book_public_and_profile_primary',
    '0117_address_book_business_vertical',
    '0118_serenata_provider_group_public_contact',
    '0119_public_profiles_timezone',
    '0120_unified_business_schedule',
    '0121_marketplace_operator_services',
    '0122_serenata_group_service_catalog',
    '0123_service_catalog_image_url',
    '0124_service_calendar_color',
    '0125_agenda_unified_service_kinds',
    '0126_service_catalog_modality',
    '0127_drop_public_profile_team_members',
    '0128_public_profile_payment_methods',
    '0129_serenata_accepts_cash_default_false',
    '0130_operator_mercadopago_oauth',
    '0131_serenata_provider_booking_rules',
    '0132_business_booking_terms',
    '0133_serenata_policy_agreed',
    '0134_serenata_provider_operator_profile',
    '0135_agenda_operator_site_appearance',
    '0136_boost_orders_target_columns',
    '0137_marketplace_operator_products',
    '0138_instagram_publish_style',
    '0139_timeline_events',
    '0140_relationship_notes',
    '0141_agenda_existing_accounts_to_free',
    '0142_agenda_subscription_billing_cycle',
    '0143_account_vertical_settings',
    '0144_account_subscription_scope',
    '0145_account_invitations',
    '0146_team_marketplace_threads',
    '0147_relationship_notes_account_scope',
    '0148_account_relationship_assignments',
    '0149_agenda_account_property_visits',
    '0150_account_relationship_stage',
    '0151_account_relationship_tasks',
    '0152_account_listing_assignments',
    '0153_account_relationship_task_reminders',
    '0154_account_public_profiles',
    '0155_agenda_account_visit_reminders',
    '0156_agenda_account_visit_google_calendar',
    '0157_agenda_ai_landing_page',
    '0158_agenda_account_visit_type',
    '0159_payment_orders_account_idx',
    '0160_listing_drafts_account_scope',
    '0161_agenda_profile_account_scope',
    '0162_account_invitation_vertical',
    '0163_social_workspace_integrations',
    '0164_instagram_workspace_integration',
    '0165_timeline_event_idempotency_key',
    '0166_shared_message_history',
    '0167_account_users_single_default',
    '0167a_social_workspace_unique_preflight',
    '0168_social_workspace_integration_uniqueness',
    '0169_serenatas_individual_billing',
    '0170_serenatas_commission_zero_default',
    '0171_serenatas_musician_billing_profile',
    '0172_serenatas_profile_billing_scope',
    '0173_remove_legacy_featured_listing_limit',
    '0174_account_single_owner_membership',
    '0175_account_membership_role_check',
    '0176_account_invitation_role_check',
    '0177_account_team_list_indexes',
    '0178_account_personal_workspace_invariant',
    '0179_personal_account_owner_membership',
    '0180_agenda_booking_checkout_url',
    '0181_agenda_reception_assignments',
    '0182_agenda_account_pro_trials',
    '0183_user_vertical_onboarding',
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

const POST_JOURNAL_ADVISORY_LOCK_KEY = '7102611047561';

export async function applyPostJournalMigrations(
    sql: postgres.Sql,
    options: ApplyPostJournalOptions
): Promise<ApplyPostJournalResult> {
    return applyPostJournalMigrationsUnlocked(sql, options);
}

async function applyPostJournalMigrationsUnlocked(
    sql: postgres.Sql,
    options: ApplyPostJournalOptions
): Promise<ApplyPostJournalResult> {
    const dryRun = options.dryRun ?? false;
    const log = options.log ?? console.info;

    let appliedRows: { hash: string }[] = [];
    if (dryRun) {
        const [migrationTable] = await sql<{ exists: boolean }[]>`
            SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists
        `;
        if (migrationTable?.exists) {
            appliedRows = await sql<{ hash: string }[]>`
                SELECT hash FROM drizzle.__drizzle_migrations
            `;
        }
    } else {
        // Serialize concurrent startup without reserving a second connection.
        await sql.begin(async (tx) => {
            await tx`SELECT pg_advisory_xact_lock(${POST_JOURNAL_ADVISORY_LOCK_KEY}::bigint)`;
            await tx`CREATE SCHEMA IF NOT EXISTS drizzle`;
            await tx`
                CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
                    id SERIAL PRIMARY KEY,
                    hash text NOT NULL,
                    created_at bigint
                )
            `;
        });
        appliedRows = await sql<{ hash: string }[]>`
            SELECT hash FROM drizzle.__drizzle_migrations
        `;
    }

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
        try {
            // Keep schema changes and the migration marker in one transaction.
            // A failed statement must not leave a migration half-applied.
            const applied = await sql.begin(async (tx) => {
                await tx`SELECT pg_advisory_xact_lock(${POST_JOURNAL_ADVISORY_LOCK_KEY}::bigint)`;
                const [existing] = await tx<{ hash: string }[]>`
                    SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash} LIMIT 1
                `;
                if (existing) return false;

                for (const statement of statements) {
                    await tx.unsafe(statement);
                }
                await tx`
                    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                    VALUES (${hash}, ${Date.now()})
                `;
                return true;
            });
            if (!applied) {
                appliedHashes.add(hash);
                log(`  ya aplicado en otro proceso: ${tag}`);
                continue;
            }
            appliedHashes.add(hash);
            appliedNow += 1;
            log(`  OK ${tag}`);
        } catch (error) {
            log(`  ERROR ${tag}; se revirtió la migración: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    return { appliedNow, dryRun };
}

/** Resuelve `services/api/drizzle` desde el cwd del proceso (pnpm dev / scripts). */
export function defaultMigrationsFolder(cwd: string = process.cwd()): string {
    return path.join(cwd, 'drizzle');
}
