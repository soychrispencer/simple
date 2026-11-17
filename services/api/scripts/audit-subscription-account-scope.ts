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
        const profileTypeSelect = hasProfileScope ? ', billing_profile_type' : '';
        const profileTypeGroup = hasProfileScope ? ', billing_profile_type' : '';

        const [summary] = await pgClient.unsafe(`
            SELECT
                count(*) AS subscription_rows,
                count(*) FILTER (WHERE status = 'active') AS active_rows,
                count(*) FILTER (WHERE account_id IS NULL) AS legacy_unscoped_rows,
                count(DISTINCT vertical) AS product_verticals
            FROM subscriptions
        `);

        const byVertical = await pgClient.unsafe(`
            SELECT
                vertical,
                count(*) AS subscription_rows,
                count(*) FILTER (WHERE status = 'active') AS active_rows,
                count(*) FILTER (WHERE account_id IS NULL) AS legacy_unscoped_rows
            FROM subscriptions
            GROUP BY vertical
            ORDER BY vertical
        `);

        const duplicateAccountScopes = await pgClient.unsafe(`
            SELECT
                vertical,
                count(*) AS duplicate_scopes,
                sum(subscription_rows - 1) AS extra_rows,
                count(*) FILTER (WHERE active_rows > 1) AS scopes_with_multiple_active_rows
            FROM (
                SELECT
                    vertical,
                    account_id${profileTypeSelect},
                    count(*) AS subscription_rows,
                    count(*) FILTER (WHERE status = 'active') AS active_rows
                FROM subscriptions
                WHERE account_id IS NOT NULL
                GROUP BY vertical, account_id${profileTypeGroup}
                HAVING count(*) > 1
            ) AS duplicate_scopes
            GROUP BY vertical
            ORDER BY vertical
        `);

        const duplicateLegacyScopes = await pgClient.unsafe(`
            SELECT
                vertical,
                count(*) AS duplicate_scopes,
                sum(subscription_rows - 1) AS extra_rows,
                count(*) FILTER (WHERE active_rows > 1) AS scopes_with_multiple_active_rows
            FROM (
                SELECT
                    vertical,
                    user_id${profileTypeSelect},
                    count(*) AS subscription_rows,
                    count(*) FILTER (WHERE status = 'active') AS active_rows
                FROM subscriptions
                WHERE account_id IS NULL
                GROUP BY vertical, user_id${profileTypeGroup}
                HAVING count(*) > 1
            ) AS duplicate_scopes
            GROUP BY vertical
            ORDER BY vertical
        `);

        console.log(JSON.stringify({
            note: 'Consulta agregada de solo lectura; no contiene identificadores ni datos personales. Cuando existe la migración de facturación por perfil, las suscripciones de Serenatas se agrupan por usuario y tipo de perfil; antes de ella se agrupan por usuario.',
            profileScopeColumnPresent: hasProfileScope,
            summary,
            byVertical,
            duplicateAccountScopes,
            duplicateLegacyScopes,
        }, null, 2));
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el alcance de suscripciones:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
