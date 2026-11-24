import { pgClient } from '../db/index.js';

async function main() {
    try {
        const audit = await pgClient.begin(async (tx) => {
            await tx.unsafe('SET TRANSACTION READ ONLY');
            const [profileScopeColumn] = await tx.unsafe(`
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

            const [summary] = await tx.unsafe(`
            SELECT
                count(*) AS subscription_rows,
                count(*) FILTER (WHERE status = 'active') AS active_rows,
                count(*) FILTER (WHERE account_id IS NULL) AS legacy_unscoped_rows,
                count(DISTINCT vertical) AS product_verticals
            FROM subscriptions
        `);

            const byVertical = await tx.unsafe(`
            SELECT
                vertical,
                count(*) AS subscription_rows,
                count(*) FILTER (WHERE status = 'active') AS active_rows,
                count(*) FILTER (WHERE account_id IS NULL) AS legacy_unscoped_rows
            FROM subscriptions
            GROUP BY vertical
            ORDER BY vertical
        `);

            const duplicateAccountScopes = await tx.unsafe(`
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

            const duplicateLegacyScopes = await tx.unsafe(`
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

            const subscriptionOrdersByVertical = await tx.unsafe(`
            SELECT
                vertical,
                count(*) AS subscription_orders,
                count(*) FILTER (WHERE status = 'approved') AS approved_orders,
                count(*) FILTER (WHERE status = 'authorized') AS authorized_orders,
                count(*) FILTER (WHERE subscription_id IS NOT NULL) AS orders_linked_to_subscription
            FROM payment_orders
            WHERE kind = 'subscription'
            GROUP BY vertical
            ORDER BY vertical
        `);

            const agendaProfilesByPlan = await tx.unsafe(`
            SELECT
                plan,
                count(*) AS profile_rows,
                count(*) FILTER (
                    WHERE plan IN ('pro', 'pro_plus')
                      AND (plan_expires_at IS NULL OR plan_expires_at > now())
                ) AS currently_pro_profiles
            FROM agenda_professional_profiles
            GROUP BY plan
            ORDER BY plan
        `);

            const [agendaProProfilesWithoutSubscription] = await tx.unsafe(`
            SELECT
                count(*) AS currently_pro_profiles,
                count(*) FILTER (WHERE NOT EXISTS (
                    SELECT 1
                    FROM subscriptions AS subscription
                    JOIN subscription_plans AS plan ON plan.id = subscription.plan_id
                    WHERE subscription.vertical = 'agenda'
                      AND subscription.status = 'active'
                      AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
                      AND plan.plan_id IN ('pro', 'pro_plus', 'enterprise')
                      AND (
                          subscription.account_id = profile.account_id
                          OR (
                              subscription.account_id IS NULL
                              AND profile.account_id IS NULL
                              AND subscription.user_id = profile.user_id
                          )
                      )
                )) AS profiles_without_active_subscription
            FROM agenda_professional_profiles AS profile
            WHERE profile.plan IN ('pro', 'pro_plus')
              AND (profile.plan_expires_at IS NULL OR profile.plan_expires_at > now())
        `);

            const serenataProviderStatuses = await tx.unsafe(`
            SELECT subscription_status, count(*) AS profile_rows
            FROM serenata_owners
            GROUP BY subscription_status
            ORDER BY subscription_status
        `);

            return {
                profileScopeColumnPresent: hasProfileScope,
                summary,
                byVertical,
                duplicateAccountScopes,
                duplicateLegacyScopes,
                subscriptionOrdersByVertical,
                agendaProfilesByPlan,
                agendaProProfilesWithoutSubscription,
                serenataProviderStatuses,
            };
        });

        console.log(JSON.stringify({
            note: 'Consulta agregada dentro de una transacción READ ONLY; no contiene identificadores ni datos personales. Incluye órdenes de suscripción y marcadores de plan heredados para explicar un catálogo de suscripciones vacío. Cuando existe la migración de facturación por perfil, las suscripciones de Serenatas se agrupan por usuario y tipo de perfil; antes de ella se agrupan por usuario.',
            ...audit,
        }, null, 2));
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el alcance de suscripciones:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
