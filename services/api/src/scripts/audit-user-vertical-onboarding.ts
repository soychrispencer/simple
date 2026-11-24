import { pgClient } from '../db/index.js';

type OnboardingAuditRow = {
    vertical: 'autos' | 'propiedades' | 'agenda' | 'serenatas';
    registered_users: string;
    configured_or_completed: string;
    needs_wizard: string;
    deferred: string;
    invited_or_non_manager: string;
    missing_membership: string;
    suspended: string;
    new_to_vertical: string;
};

async function main() {
    try {
        const { onboardingTablePresent, rows } = await pgClient.begin(async (tx) => {
            await tx.unsafe('SET TRANSACTION READ ONLY');

            const [tableInfo] = await tx.unsafe<{ present: boolean }[]>(`
                SELECT to_regclass(format('%I.user_vertical_onboarding', current_schema())) IS NOT NULL AS present
            `);
            const onboardingTablePresent = Boolean(tableInfo?.present);
            const onboardingJoin = onboardingTablePresent
                ? `LEFT JOIN user_vertical_onboarding AS onboarding
                    ON onboarding.user_id = person.user_id
                   AND onboarding.vertical = vertical.vertical`
                : '';
            const onboardingStatus = onboardingTablePresent ? 'onboarding.status' : 'NULL::text';

            const rows = await tx.unsafe<OnboardingAuditRow[]>(`
                WITH verticals(vertical, app) AS (
                    VALUES
                        ('autos'::text, 'simpleautos'::text),
                        ('propiedades'::text, 'simplepropiedades'::text),
                        ('agenda'::text, 'simpleagenda'::text),
                        ('serenatas'::text, 'simpleserenatas'::text)
                ), current_spaces AS (
                    SELECT
                        person.id AS user_id,
                        person.status AS user_status,
                        person.signup_app,
                        person.primary_vertical,
                        default_membership.account_id AS default_account_id,
                        default_membership.role AS default_role,
                        personal_membership.account_id AS personal_account_id,
                        personal_membership.role AS personal_role,
                        COALESCE(default_membership.account_id, personal_membership.account_id) AS current_account_id,
                        COALESCE(default_membership.role, personal_membership.role) AS effective_role,
                        current_account.is_personal AS current_account_is_personal,
                        current_account.owner_user_id AS current_account_owner_user_id
                    FROM users AS person
                    LEFT JOIN LATERAL (
                        SELECT membership.account_id, membership.role
                        FROM account_users AS membership
                        WHERE membership.user_id = person.id
                          AND membership.is_default = true
                        ORDER BY membership.created_at, membership.id
                        LIMIT 1
                    ) AS default_membership ON true
                    LEFT JOIN LATERAL (
                        SELECT membership.account_id, membership.role
                        FROM accounts AS personal_account
                        JOIN account_users AS membership
                          ON membership.account_id = personal_account.id
                         AND membership.user_id = person.id
                         AND membership.role = 'owner'
                        WHERE personal_account.owner_user_id = person.id
                          AND personal_account.is_personal = true
                        ORDER BY personal_account.created_at, personal_account.id
                        LIMIT 1
                    ) AS personal_membership ON true
                    LEFT JOIN accounts AS current_account
                      ON current_account.id = COALESCE(default_membership.account_id, personal_membership.account_id)
                ), user_vertical AS (
                    SELECT
                        person.user_id,
                        person.user_status,
                        person.current_account_id,
                        person.effective_role,
                        COALESCE(person.current_account_is_personal, person.current_account_id IS NULL) AS current_account_is_personal,
                        COALESCE(person.current_account_owner_user_id, person.user_id) AS current_account_owner_user_id,
                        vertical.vertical,
                        COALESCE((
                            CASE
                                WHEN platform_access.user_id IS NOT NULL THEN platform_access.status = 'active'
                                ELSE person.signup_app = vertical.app
                                  OR person.primary_vertical = vertical.vertical
                            END
                        ), false) AS has_vertical_access,
                        ${onboardingStatus} AS onboarding_status,
                        CASE
                            WHEN vertical.vertical = 'serenatas' THEN
                                EXISTS (SELECT 1 FROM serenata_clients AS profile WHERE profile.user_id = person.user_id)
                                OR EXISTS (SELECT 1 FROM serenata_musicians AS profile WHERE profile.user_id = person.user_id)
                                OR EXISTS (SELECT 1 FROM serenata_owners AS profile WHERE profile.user_id = person.user_id)
                            ELSE
                                EXISTS (
                                    SELECT 1
                                    FROM account_vertical_settings AS workspace
                                    WHERE workspace.account_id = person.current_account_id
                                      AND workspace.vertical = vertical.vertical
                                )
                                OR EXISTS (
                                    SELECT 1
                                    FROM public_profiles AS profile
                                    WHERE profile.user_id = person.user_id
                                      AND profile.vertical = vertical.vertical
                                      AND (
                                          profile.account_id = person.current_account_id
                                          OR (
                                              profile.account_id IS NULL
                                              AND COALESCE(person.current_account_is_personal, false)
                                              AND person.current_account_owner_user_id = person.user_id
                                          )
                                      )
                                )
                        END AS has_legacy_vertical_record,
                        CASE
                            WHEN vertical.vertical = 'serenatas' THEN
                                EXISTS (SELECT 1 FROM serenata_clients AS profile WHERE profile.user_id = person.user_id)
                                OR EXISTS (SELECT 1 FROM serenata_musicians AS profile WHERE profile.user_id = person.user_id)
                                OR EXISTS (SELECT 1 FROM serenata_owners AS profile WHERE profile.user_id = person.user_id)
                            ELSE
                                EXISTS (
                                    SELECT 1
                                    FROM account_vertical_settings AS workspace
                                    WHERE workspace.account_id = person.current_account_id
                                      AND workspace.vertical = vertical.vertical
                                      AND workspace.onboarding_completed_at IS NOT NULL
                                )
                                OR EXISTS (
                                    SELECT 1
                                    FROM public_profiles AS profile
                                    WHERE profile.user_id = person.user_id
                                      AND profile.vertical = vertical.vertical
                                      AND (
                                          profile.account_id = person.current_account_id
                                          OR (
                                              profile.account_id IS NULL
                                              AND COALESCE(person.current_account_is_personal, false)
                                              AND person.current_account_owner_user_id = person.user_id
                                          )
                                      )
                                      AND (
                                          NULLIF(BTRIM(profile.operator_subtype), '') IS NOT NULL
                                          OR (
                                              COALESCE(person.current_account_is_personal, false)
                                              AND profile.is_published = true
                                          )
                                      )
                                )
                        END AS legacy_equivalent
                    FROM current_spaces AS person
                    CROSS JOIN verticals AS vertical
                    LEFT JOIN user_platform_access AS platform_access
                      ON platform_access.user_id = person.user_id
                     AND platform_access.app = vertical.app
                    ${onboardingJoin}
                ), classified AS (
                    SELECT
                        vertical,
                        CASE
                            WHEN user_status = 'suspended' THEN 'suspended'
                            WHEN onboarding_status = 'completed' OR legacy_equivalent THEN 'configured_or_completed'
                            WHEN vertical = 'serenatas' AND onboarding_status = 'deferred' THEN 'deferred'
                            WHEN onboarding_status = 'deferred' THEN 'deferred'
                            WHEN NOT has_vertical_access AND NOT has_legacy_vertical_record AND onboarding_status IS NULL THEN 'new_to_vertical'
                            WHEN vertical = 'serenatas' THEN 'needs_wizard'
                            WHEN current_account_id IS NOT NULL AND effective_role = 'agent' THEN 'invited_or_non_manager'
                            WHEN current_account_id IS NOT NULL AND effective_role NOT IN ('owner', 'admin') THEN 'missing_membership'
                            WHEN current_account_id IS NULL
                              OR effective_role IN ('owner', 'admin') THEN 'needs_wizard'
                            ELSE 'missing_membership'
                        END AS outcome
                    FROM user_vertical
                )
                SELECT
                    vertical::text AS vertical,
                    count(*) FILTER (WHERE outcome <> 'new_to_vertical')::text AS registered_users,
                    count(*) FILTER (WHERE outcome = 'configured_or_completed')::text AS configured_or_completed,
                    count(*) FILTER (WHERE outcome = 'needs_wizard')::text AS needs_wizard,
                    count(*) FILTER (WHERE outcome = 'deferred')::text AS deferred,
                    count(*) FILTER (WHERE outcome = 'invited_or_non_manager')::text AS invited_or_non_manager,
                    count(*) FILTER (WHERE outcome = 'missing_membership')::text AS missing_membership,
                    count(*) FILTER (WHERE outcome = 'suspended')::text AS suspended,
                    count(*) FILTER (WHERE outcome = 'new_to_vertical')::text AS new_to_vertical
                FROM classified
                GROUP BY vertical
                ORDER BY CASE vertical
                    WHEN 'autos' THEN 1
                    WHEN 'propiedades' THEN 2
                    WHEN 'agenda' THEN 3
                    ELSE 4
                END
            `);

            return { onboardingTablePresent, rows };
        });

        console.log(JSON.stringify({
            note: 'Reporte agregado por vertical en una transacción READ ONLY. No imprime IDs, correos ni otros datos personales. “registeredUsers” incluye a quienes tienen acceso o configuración/historial previo en esa vertical; “needsWizard” cuenta solo pendientes de ese grupo. “newToVertical” estima usuarios Simple que aún no tienen actividad registrada en esa vertical; al entrar por primera vez, la aplicación también puede mostrarles el wizard. Los integrantes invitados se omiten de needsWizard porque sus permisos ya vienen de la invitación.',
            onboardingTablePresent,
            byVertical: rows.map((row) => ({
                vertical: row.vertical,
                registeredUsers: Number(row.registered_users),
                configuredOrCompleted: Number(row.configured_or_completed),
                needsWizard: Number(row.needs_wizard),
                deferred: Number(row.deferred),
                invitedOrNonManager: Number(row.invited_or_non_manager),
                missingMembership: Number(row.missing_membership),
                suspended: Number(row.suspended),
                newToVertical: Number(row.new_to_vertical),
            })),
        }, null, 2));
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el wizard por vertical:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
