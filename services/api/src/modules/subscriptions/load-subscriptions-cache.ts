import { and, eq, or, isNull, gt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscriptions, subscriptionPlans } from '../../db/schema.js';
import type { ActiveSubscription, SubscriptionPlanId, VerticalType } from '../../lib/domain-types.js';

function isPaidPlanId(planId: string): planId is Exclude<SubscriptionPlanId, 'free'> {
    return planId === 'pro' || planId === 'enterprise';
}

/**
 * Hidrata `activeSubscriptionsByUser` desde PostgreSQL al arrancar la API.
 * Sin esto, tras reiniciar el servidor el plan efectivo queda en "free" aunque exista suscripción en DB.
 */
export async function loadActiveSubscriptionsCache(): Promise<Map<string, ActiveSubscription[]>> {
    const now = new Date();
    const rows = await db
        .select({
            id: subscriptions.id,
            accountId: subscriptions.accountId,
            userId: subscriptions.userId,
            vertical: subscriptions.vertical,
            status: subscriptions.status,
            providerSubscriptionId: subscriptions.providerSubscriptionId,
            providerStatus: subscriptions.providerStatus,
            startedAt: subscriptions.startedAt,
            updatedAt: subscriptions.updatedAt,
            expiresAt: subscriptions.expiresAt,
            planId: subscriptionPlans.planId,
            planName: subscriptionPlans.name,
            priceMonthly: subscriptionPlans.priceMonthly,
            currency: subscriptionPlans.currency,
            features: subscriptionPlans.features,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
            and(
                eq(subscriptions.status, 'active'),
                or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now)),
            ),
        );

    const byUser = new Map<string, ActiveSubscription[]>();

    for (const row of rows) {
        if (!isPaidPlanId(row.planId)) continue;

        const subscription: ActiveSubscription = {
            id: row.id,
            accountId: row.accountId ?? null,
            userId: row.userId,
            vertical: row.vertical as VerticalType,
            planId: row.planId,
            planName: row.planName,
            priceMonthly: Number(row.priceMonthly),
            currency: (row.currency as 'CLP') ?? 'CLP',
            features: Array.isArray(row.features) ? (row.features as string[]) : [],
            status: 'active',
            providerPreapprovalId: row.providerSubscriptionId ?? `db-${row.id}`,
            providerStatus: row.providerStatus ?? null,
            startedAt: row.startedAt.getTime(),
            updatedAt: row.updatedAt.getTime(),
        };

        const current = byUser.get(row.userId) ?? [];
        const withoutVertical = current.filter((item) => item.vertical !== subscription.vertical);
        byUser.set(row.userId, [subscription, ...withoutVertical]);
    }

    return byUser;
}
