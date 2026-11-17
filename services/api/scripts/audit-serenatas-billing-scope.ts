import { pgClient } from '../src/db/index.js';

async function main() {
    try {
        const [profileScopeColumn] = await pgClient.unsafe(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'subscriptions'
                  AND column_name = 'billing_profile_type'
            ) AS present
        `);
        const hasProfileScope = Boolean(profileScopeColumn?.present);
        const profileTypeColumn = hasProfileScope
            ? 'subscription.billing_profile_type'
            : "'legacy_unscoped'::varchar";
        const profileTypeGroup = hasProfileScope ? ', subscription.billing_profile_type' : '';
        const multipleProfileUsers = hasProfileScope
            ? `(
                SELECT count(*)
                FROM (
                    SELECT user_id
                    FROM subscriptions
                    WHERE vertical = $1
                    GROUP BY user_id
                    HAVING count(DISTINCT billing_profile_type) > 1
                ) AS users_with_multiple_profile_types
            )`
            : '(SELECT 0::bigint)';

        const [summary] = await pgClient.unsafe(`
            WITH per_profile AS (
                SELECT
                    subscription.user_id,
                    ${profileTypeColumn} AS billing_profile_type,
                    count(*) FILTER (WHERE subscription.status = $2) AS active_count,
                    count(DISTINCT subscription.account_id) AS account_count
                FROM subscriptions AS subscription
                WHERE subscription.vertical = $1
                GROUP BY subscription.user_id${profileTypeGroup}
            )
            SELECT
                (SELECT count(*) FROM subscriptions WHERE vertical = $1) AS subscription_rows,
                (SELECT count(*) FROM subscriptions WHERE vertical = $1 AND status = $2) AS active_rows,
                count(DISTINCT user_id) AS users_with_subscription,
                count(*) AS billing_profile_scopes,
                count(*) FILTER (WHERE active_count > 1) AS profiles_with_multiple_active_subscriptions,
                count(*) FILTER (WHERE account_count > 1) AS profiles_with_multiple_account_scopes,
                ${multipleProfileUsers} AS users_with_multiple_profile_types
            FROM per_profile
        `, ['serenatas', 'active']);

        const scopes = await pgClient.unsafe(`
            SELECT
                COALESCE(account.is_personal, false) AS is_personal_account,
                ${profileTypeColumn} AS billing_profile_type,
                subscription.status,
                count(*) AS subscription_rows,
                count(DISTINCT subscription.user_id) AS users
            FROM subscriptions AS subscription
            LEFT JOIN accounts AS account ON account.id = subscription.account_id
            WHERE subscription.vertical = $1
            GROUP BY COALESCE(account.is_personal, false), ${profileTypeColumn}, subscription.status
            ORDER BY is_personal_account DESC, billing_profile_type, subscription.status
        `, ['serenatas']);

        const rowsToMove = await pgClient.unsafe(`
            SELECT
                count(*) AS subscription_rows,
                count(DISTINCT subscription.user_id) AS users,
                count(*) FILTER (
                    WHERE subscription.status = $2
                      AND subscription.provider_subscription_id IS NOT NULL
                ) AS active_subscription_provider_ids
            FROM subscriptions AS subscription
            INNER JOIN accounts AS personal_account
                ON personal_account.owner_user_id = subscription.user_id
               AND personal_account.is_personal = true
            WHERE subscription.vertical = $1
              AND subscription.account_id IS DISTINCT FROM personal_account.id
        `, ['serenatas', 'active']);

        const usersWithoutPersonalAccount = await pgClient.unsafe(`
            SELECT count(DISTINCT subscription.user_id) AS users
            FROM subscriptions AS subscription
            LEFT JOIN accounts AS personal_account
                ON personal_account.owner_user_id = subscription.user_id
               AND personal_account.is_personal = true
            WHERE subscription.vertical = $1
              AND personal_account.id IS NULL
        `, ['serenatas']);

        console.log(JSON.stringify({
            note: 'Consulta agregada de solo lectura; no contiene IDs ni datos personales. Las suscripciones se agrupan por usuario y perfil cuando la migración de alcance por perfil está aplicada; antes de esa migración se agrupan por usuario.',
            profileScopeColumnPresent: hasProfileScope,
            summary,
            scopes,
            rowsToMove,
            usersWithoutPersonalAccount,
        }, null, 2));
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el alcance de cobro de Serenatas:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
