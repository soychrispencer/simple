import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaProfessionalProfiles, serenataOwners, subscriptionPlans, subscriptions } from '../../db/schema.js';
import type { PaymentVerticalType, SubscriptionPlanId } from '../../lib/domain-types.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';
import type { PaymentProvider } from '../payments/resolve-provider.js';
import {
    APP_COMMISSION_FREE_BPS,
    APP_COMMISSION_PRO_BPS,
} from '../serenatas/plan-config.js';

export type DbSubscriptionRow = {
    id: string;
    accountId: string | null;
    userId: string;
    vertical: string;
    planSlug: string;
    planName: string;
    priceMonthly: number;
    currency: string;
    features: string[];
    status: string;
    providerStatus: string | null;
    providerSubscriptionId: string | null;
    startedAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
};

/** Garantiza fila en `subscription_plans` para el slug del catálogo en memoria. */
export async function ensureSubscriptionPlanDbId(
    vertical: PaymentVerticalType,
    planSlug: string,
): Promise<string> {
    const catalog = SUBSCRIPTION_PLANS_BY_VERTICAL[vertical]?.find((p) => p.id === planSlug);
    if (!catalog) {
        throw new Error(`Plan ${planSlug} no existe en catálogo (${vertical}).`);
    }

    const existing = await db
        .select({ id: subscriptionPlans.id })
        .from(subscriptionPlans)
        .where(and(eq(subscriptionPlans.vertical, vertical), eq(subscriptionPlans.planId, planSlug)))
        .limit(1);

    if (existing[0]?.id) {
        await db
            .update(subscriptionPlans)
            .set({
                name: catalog.name,
                description: catalog.description,
                priceMonthly: String(catalog.priceMonthly),
                priceYearly: String(catalog.priceMonthly * 12),
                currency: catalog.currency,
                maxListings: catalog.maxListings,
                maxFeaturedListings: catalog.maxFeaturedListings,
                maxImagesPerListing: catalog.maxImagesPerListing,
                analyticsEnabled: catalog.analyticsEnabled,
                prioritySupport: catalog.prioritySupport,
                customBranding: catalog.customBranding,
                apiAccess: catalog.apiAccess,
                features: catalog.features,
                isActive: true,
                isDefault: planSlug === 'free',
                updatedAt: new Date(),
            })
            .where(eq(subscriptionPlans.id, existing[0].id));
        return existing[0].id;
    }

    const [inserted] = await db
        .insert(subscriptionPlans)
        .values({
            vertical,
            planId: planSlug,
            name: catalog.name,
            description: catalog.description,
            priceMonthly: String(catalog.priceMonthly),
            priceYearly: String(catalog.priceMonthly * 12),
            currency: catalog.currency,
            maxListings: catalog.maxListings,
            maxFeaturedListings: catalog.maxFeaturedListings,
            maxImagesPerListing: catalog.maxImagesPerListing,
            analyticsEnabled: catalog.analyticsEnabled,
            prioritySupport: catalog.prioritySupport,
            customBranding: catalog.customBranding,
            apiAccess: catalog.apiAccess,
            features: catalog.features,
            isActive: true,
            isDefault: planSlug === 'free',
        })
        .returning({ id: subscriptionPlans.id });

    return inserted.id;
}

export async function loadCurrentSubscriptionFromDb(
    userId: string,
    vertical: PaymentVerticalType,
): Promise<DbSubscriptionRow | null> {
    const rows = await db
        .select({
            id: subscriptions.id,
            accountId: subscriptions.accountId,
            userId: subscriptions.userId,
            vertical: subscriptions.vertical,
            planSlug: subscriptionPlans.planId,
            planName: subscriptionPlans.name,
            priceMonthly: subscriptionPlans.priceMonthly,
            currency: subscriptionPlans.currency,
            features: subscriptionPlans.features,
            status: subscriptions.status,
            providerStatus: subscriptions.providerStatus,
            providerSubscriptionId: subscriptions.providerSubscriptionId,
            startedAt: subscriptions.startedAt,
            updatedAt: subscriptions.updatedAt,
            expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.vertical, vertical)))
        .limit(1);

    const row = rows[0];
    if (!row) return null;

    const expired = row.expiresAt && row.expiresAt < new Date();
    const inactive = row.status === 'cancelled' || row.status === 'expired' || expired;
    if (inactive) return null;

    return {
        ...row,
        priceMonthly: Number(row.priceMonthly),
        features: Array.isArray(row.features) ? (row.features as string[]) : [],
    };
}

export async function persistUserSubscription(input: {
    userId: string;
    accountId: string | null;
    vertical: PaymentVerticalType;
    planSlug: Exclude<SubscriptionPlanId, 'free'>;
    provider?: PaymentProvider;
    providerSubscriptionId: string;
    providerStatus: string;
    status: 'active' | 'cancelled' | 'paused' | 'expired';
    expiresAt?: Date | null;
}): Promise<{ subscriptionDbId: string; planSlug: string }> {
    const provider = input.provider ?? 'mercadopago';
    const planDbId = await ensureSubscriptionPlanDbId(input.vertical, input.planSlug);
    const now = new Date();

    const existing = await db
        .select({ id: subscriptions.id, startedAt: subscriptions.startedAt })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, input.userId), eq(subscriptions.vertical, input.vertical)))
        .limit(1);

    if (existing[0]) {
        await db
            .update(subscriptions)
            .set({
                accountId: input.accountId,
                planId: planDbId,
                status: input.status,
                provider,
                providerSubscriptionId: input.providerSubscriptionId,
                providerStatus: input.providerStatus,
                expiresAt: input.expiresAt ?? null,
                cancelledAt: input.status === 'cancelled' ? now : null,
                updatedAt: now,
            })
            .where(eq(subscriptions.id, existing[0].id));

        await syncSerenataOwnerCommissionForPlan(input.userId, input.planSlug, input.status);
        await syncAgendaProfilePlanForUser(input.userId, input.planSlug, input.status, input.expiresAt);
        return { subscriptionDbId: existing[0].id, planSlug: input.planSlug };
    }

    const [inserted] = await db
        .insert(subscriptions)
        .values({
            accountId: input.accountId,
            userId: input.userId,
            planId: planDbId,
            vertical: input.vertical,
            status: input.status,
            provider,
            providerSubscriptionId: input.providerSubscriptionId,
            providerStatus: input.providerStatus,
            startedAt: now,
            expiresAt: input.expiresAt ?? null,
            cancelledAt: input.status === 'cancelled' ? now : null,
        })
        .returning({ id: subscriptions.id });

    await syncSerenataOwnerCommissionForPlan(input.userId, input.planSlug, input.status);
    await syncAgendaProfilePlanForUser(input.userId, input.planSlug, input.status, input.expiresAt);
    return { subscriptionDbId: inserted.id, planSlug: input.planSlug };
}

/** Asignación manual desde SimpleAdmin (superadmin). */
export async function persistManualAdminSubscription(input: {
    userId: string;
    accountId: string | null;
    vertical: PaymentVerticalType;
    planSlug: SubscriptionPlanId;
    status?: 'active' | 'cancelled' | 'expired';
    expiresAt?: Date | null;
}): Promise<{ planSlug: string; status: string; expiresAt: string | null }> {
    const status =
        input.status ?? (input.planSlug === 'free' ? 'cancelled' : 'active');
    const expiresAt = input.expiresAt ?? null;

    if (input.planSlug === 'free' || status === 'cancelled' || status === 'expired') {
        const existing = await db
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, input.userId), eq(subscriptions.vertical, input.vertical)))
            .limit(1);

        const resolvedStatus = status === 'active' ? 'cancelled' : status;

        if (existing[0]) {
            await db
                .update(subscriptions)
                .set({
                    status: resolvedStatus,
                    provider: 'manual',
                    providerSubscriptionId: `admin-manual-${Date.now()}`,
                    providerStatus: 'manual',
                    expiresAt,
                    cancelledAt: resolvedStatus === 'cancelled' ? new Date() : null,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existing[0].id));
        }

        await syncSerenataOwnerCommissionForPlan(input.userId, 'free', resolvedStatus);
        return {
            planSlug: 'free',
            status: resolvedStatus,
            expiresAt: expiresAt?.toISOString() ?? null,
        };
    }

    const paidSlug = input.planSlug as Exclude<SubscriptionPlanId, 'free'>;
    const dbStatus: 'active' | 'expired' = input.status === 'expired' ? 'expired' : 'active';
    const persisted = await persistUserSubscription({
        userId: input.userId,
        accountId: input.accountId,
        vertical: input.vertical,
        planSlug: paidSlug,
        providerSubscriptionId: `admin-manual-${Date.now()}`,
        providerStatus: 'manual',
        status: dbStatus,
        expiresAt,
    });

    return {
        planSlug: persisted.planSlug,
        status: dbStatus,
        expiresAt: expiresAt?.toISOString() ?? null,
    };
}

async function syncAgendaProfilePlanForUser(
    userId: string,
    planSlug: string,
    status: string,
    expiresAt?: Date | null,
): Promise<void> {
    if (status !== 'active' || (planSlug !== 'pro' && planSlug !== 'enterprise')) {
        return;
    }

    await db
        .update(agendaProfessionalProfiles)
        .set({
            plan: 'pro',
            planExpiresAt: expiresAt ?? null,
            updatedAt: new Date(),
        })
        .where(eq(agendaProfessionalProfiles.userId, userId));
}

async function syncSerenataOwnerCommissionForPlan(
    userId: string,
    planSlug: string,
    status: string,
): Promise<void> {
    const owner = await db
        .select({ id: serenataOwners.id })
        .from(serenataOwners)
        .where(eq(serenataOwners.userId, userId))
        .limit(1);

    if (!owner[0]) return;

    const isActivePaidPlan = status === 'active' && planSlug === 'pro';
    const commissionRateBps = isActivePaidPlan ? APP_COMMISSION_PRO_BPS : APP_COMMISSION_FREE_BPS;

    await db
        .update(serenataOwners)
        .set({
            commissionRateBps,
            subscriptionStatus: isActivePaidPlan ? 'active' : 'trialing',
            updatedAt: new Date(),
        })
        .where(eq(serenataOwners.id, owner[0].id));
}
