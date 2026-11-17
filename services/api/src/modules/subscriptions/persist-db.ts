import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accounts, accountUsers, agendaProfessionalProfiles, serenataMusicians, serenataOwners, subscriptionPlans, subscriptions } from '../../db/schema.js';
import type { PaymentVerticalType, SerenataBillingProfileType, SubscriptionPlanId } from '../../lib/domain-types.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';
import type { PaymentProvider } from '../payments/resolve-provider.js';
import {
    APP_COMMISSION_FREE_BPS,
    APP_COMMISSION_PRO_BPS,
} from '../serenatas/plan-config.js';
import { AGENDA_PRICING } from '@simple/utils';
import {
    expiredAgendaPlanEndsAt,
} from '../agenda/plan-limits.js';

export type DbSubscriptionRow = {
    id: string;
    accountId: string | null;
    userId: string;
    vertical: string;
    billingProfileType: SerenataBillingProfileType | null;
    planSlug: string;
    planName: string;
    billingCycle: 'monthly' | 'annual';
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

export async function getPersonalAccountIdForUserFromDb(userId: string): Promise<string | null> {
    const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.ownerUserId, userId), eq(accounts.isPersonal, true)))
        .orderBy(asc(accounts.createdAt), asc(accounts.id))
        .limit(1);
    return account?.id ?? null;
}

async function resolveSubscriptionAccountId(
    userId: string,
    vertical: PaymentVerticalType,
    accountId?: string | null,
): Promise<string | null> {
    // SimpleSerenatas is an individual provider product. Its workspace scope is
    // always the provider's personal account, even when the user is in a team.
    if (vertical === 'serenatas') return getPersonalAccountIdForUserFromDb(userId);
    if (accountId !== undefined) return accountId;
    const memberships = await db
        .select({ accountId: accountUsers.accountId })
        .from(accountUsers)
        .where(eq(accountUsers.userId, userId))
        .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt))
        .limit(1);
    return memberships[0]?.accountId ?? null;
}

async function canUseLegacyPersonalSubscription(userId: string, accountId: string | null): Promise<boolean> {
    if (!accountId) return false;
    const [account] = await db
        .select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
    return Boolean(account?.isPersonal && account.ownerUserId === userId);
}

/** Garantiza fila en `subscription_plans` para el slug del catálogo en memoria. */
export async function ensureSubscriptionPlanDbId(
    vertical: PaymentVerticalType,
    planSlug: string,
): Promise<string> {
    const catalog = SUBSCRIPTION_PLANS_BY_VERTICAL[vertical]?.find((p) => p.id === planSlug);
    if (!catalog) {
        throw new Error(`Plan ${planSlug} no existe en catálogo (${vertical}).`);
    }
    const priceYearly = vertical === 'agenda' && planSlug === 'pro'
        ? AGENDA_PRICING.proAnnualTotalNetClp
        : vertical === 'agenda' && planSlug === 'pro_plus'
            ? AGENDA_PRICING.proPlusAnnualTotalNetClp
            : catalog.priceMonthly * 12;

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
                priceYearly: String(priceYearly),
                currency: catalog.currency,
                maxListings: catalog.maxListings,
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
            priceYearly: String(priceYearly),
            currency: catalog.currency,
            maxListings: catalog.maxListings,
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
    accountId?: string | null,
    options: { includeInactive?: boolean; billingProfileType?: SerenataBillingProfileType } = {},
): Promise<DbSubscriptionRow | null> {
    const resolvedAccountId = await resolveSubscriptionAccountId(userId, vertical, accountId);
    const billingProfileType = vertical === 'serenatas' ? options.billingProfileType ?? 'provider' : null;
    if (!resolvedAccountId && vertical !== 'serenatas') return null;
    const queryRows = async (scopeAccountId: string | null) => db
        .select({
            id: subscriptions.id,
            accountId: subscriptions.accountId,
            userId: subscriptions.userId,
            vertical: subscriptions.vertical,
            billingProfileType: subscriptions.billingProfileType,
            planSlug: subscriptionPlans.planId,
            planName: subscriptionPlans.name,
            billingCycle: subscriptions.billingCycle,
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
        .where(vertical === 'serenatas'
            ? and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.vertical, vertical),
                eq(subscriptions.billingProfileType, billingProfileType!),
                scopeAccountId ? eq(subscriptions.accountId, scopeAccountId) : isNull(subscriptions.accountId),
            )
            : scopeAccountId
                ? and(eq(subscriptions.accountId, scopeAccountId), eq(subscriptions.vertical, vertical))
                : and(eq(subscriptions.userId, userId), eq(subscriptions.vertical, vertical), isNull(subscriptions.accountId)))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1);

    let rows = await queryRows(resolvedAccountId);
    if (rows.length === 0 && await canUseLegacyPersonalSubscription(userId, resolvedAccountId)) {
        // Keep unscoped legacy subscriptions visible only in the owner's personal account.
        rows = await queryRows(null);
    }

    const row = rows[0];
    if (!row) return null;

    const expired = row.expiresAt && row.expiresAt < new Date();
    const inactive = row.status === 'cancelled' || row.status === 'expired' || expired;
    if (inactive && !options.includeInactive) return null;

    return {
        ...row,
        accountId: vertical === 'serenatas' ? resolvedAccountId ?? row.accountId : row.accountId,
        billingProfileType: row.billingProfileType === 'provider' || row.billingProfileType === 'musician'
            ? row.billingProfileType
            : null,
        billingCycle: row.billingCycle === 'annual' ? 'annual' : 'monthly',
        priceMonthly: Number(row.priceMonthly),
        features: Array.isArray(row.features) ? (row.features as string[]) : [],
    };
}

export async function persistUserSubscription(input: {
    userId: string;
    accountId: string | null;
    vertical: PaymentVerticalType;
    billingProfileType?: SerenataBillingProfileType;
    planSlug: Exclude<SubscriptionPlanId, 'free'>;
    billingCycle?: 'monthly' | 'annual';
    provider?: PaymentProvider;
    providerSubscriptionId: string;
    providerStatus: string;
    status: 'active' | 'cancelled' | 'paused' | 'expired';
    subscriptionStartedAt?: Date;
    expiresAt?: Date | null;
    /** Compare-and-set guard for asynchronous provider events. A null value means no row existed yet. */
    expectedProviderSubscriptionId?: string | null;
}): Promise<{ subscriptionDbId: string; planSlug: string; applied: boolean }> {
    const provider = input.provider ?? 'mercadopago';
    const accountId = await resolveSubscriptionAccountId(input.userId, input.vertical, input.accountId);
    const billingProfileType = input.vertical === 'serenatas' ? input.billingProfileType ?? 'provider' : null;
    if (!accountId && input.status === 'active') {
        throw new Error('No se puede activar una suscripción sin vincularla a un espacio de trabajo.');
    }
    const planDbId = await ensureSubscriptionPlanDbId(input.vertical, input.planSlug);
    const now = new Date();

    const scopeKey = accountId
        ? `${input.vertical}:account:${accountId}${billingProfileType ? `:profile:${billingProfileType}` : ''}`
        : `${input.vertical}:legacy-user:${input.userId}${billingProfileType ? `:profile:${billingProfileType}` : ''}`;
    const persisted = await db.transaction(async (tx) => {
        // Serialize the read-and-write, including the first insert when no row exists.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scopeKey}, 0))`);

        const canClaimLegacyPersonalRow = async () => {
            if (!accountId) return false;
            const [account] = await tx
                .select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
                .from(accounts)
                .where(eq(accounts.id, accountId))
                .limit(1);
            return Boolean(account?.isPersonal && account.ownerUserId === input.userId);
        };

        const findExisting = async (scopeAccountId: string | null) => tx
            .select({
                id: subscriptions.id,
                startedAt: subscriptions.startedAt,
                accountId: subscriptions.accountId,
                billingProfileType: subscriptions.billingProfileType,
                providerSubscriptionId: subscriptions.providerSubscriptionId,
                status: subscriptions.status,
            })
            .from(subscriptions)
            .where(input.vertical === 'serenatas'
                ? and(
                    eq(subscriptions.userId, input.userId),
                    eq(subscriptions.vertical, input.vertical),
                    eq(subscriptions.billingProfileType, billingProfileType!),
                    scopeAccountId ? eq(subscriptions.accountId, scopeAccountId) : isNull(subscriptions.accountId),
                )
                : scopeAccountId
                    ? and(eq(subscriptions.accountId, scopeAccountId), eq(subscriptions.vertical, input.vertical))
                    : and(eq(subscriptions.userId, input.userId), eq(subscriptions.vertical, input.vertical), isNull(subscriptions.accountId)))
            .orderBy(desc(subscriptions.updatedAt))
            .limit(1);
        let existingRows = await findExisting(accountId);
        if (existingRows.length === 0 && await canClaimLegacyPersonalRow()) {
            // Claim an unscoped legacy row only for the payer's own personal account.
            existingRows = await findExisting(null);
        }
        const existing = existingRows.slice(0, 1);
        const currentProviderSubscriptionId = existing[0]?.providerSubscriptionId ?? null;

        if (
            input.expectedProviderSubscriptionId !== undefined
            && currentProviderSubscriptionId !== input.expectedProviderSubscriptionId
        ) {
            return { subscriptionDbId: existing[0]?.id ?? '', planSlug: input.planSlug, applied: false };
        }

        if (existing[0]) {
            const updateWhere = input.expectedProviderSubscriptionId !== undefined
                ? and(
                    eq(subscriptions.id, existing[0].id),
                    input.expectedProviderSubscriptionId === null
                        ? isNull(subscriptions.providerSubscriptionId)
                        : eq(subscriptions.providerSubscriptionId, input.expectedProviderSubscriptionId),
                )
                : eq(subscriptions.id, existing[0].id);
            const [updated] = await tx
                .update(subscriptions)
                .set({
                    accountId,
                    billingProfileType,
                    planId: planDbId,
                    status: input.status,
                    provider,
                    providerSubscriptionId: input.providerSubscriptionId,
                    providerStatus: input.providerStatus,
                    billingCycle: input.billingCycle ?? 'monthly',
                    startedAt: input.subscriptionStartedAt
                        ?? (existing[0].providerSubscriptionId !== input.providerSubscriptionId ? now : existing[0].startedAt),
                    expiresAt: input.expiresAt ?? null,
                    cancelledAt: input.status === 'cancelled' ? now : null,
                    updatedAt: now,
                })
                .where(updateWhere)
                .returning({ id: subscriptions.id });
            if (!updated) return { subscriptionDbId: existing[0].id, planSlug: input.planSlug, applied: false };
            return { subscriptionDbId: existing[0].id, planSlug: input.planSlug, applied: true };
        }

        const [inserted] = await tx
            .insert(subscriptions)
            .values({
                accountId,
                userId: input.userId,
                planId: planDbId,
                vertical: input.vertical,
                billingProfileType,
                status: input.status,
                provider,
                providerSubscriptionId: input.providerSubscriptionId,
                providerStatus: input.providerStatus,
                billingCycle: input.billingCycle ?? 'monthly',
                startedAt: input.subscriptionStartedAt ?? now,
                expiresAt: input.expiresAt ?? null,
                cancelledAt: input.status === 'cancelled' ? now : null,
            })
            .returning({ id: subscriptions.id });
        return { subscriptionDbId: inserted.id, planSlug: input.planSlug, applied: true };
    });

    if (!persisted.applied) return persisted;
    if (input.vertical === 'serenatas') {
        await syncSerenataCommissionForPlan(input.userId, billingProfileType!, input.planSlug, input.status);
    }
    if (input.vertical === 'agenda') {
        await syncAgendaProfilePlanForUser(input.userId, input.planSlug, input.status, input.expiresAt, accountId);
    }
    return persisted;
}

/** Asignación manual desde SimpleAdmin (superadmin). */
export async function persistManualAdminSubscription(input: {
    userId: string;
    accountId: string | null;
    vertical: PaymentVerticalType;
    billingProfileType?: SerenataBillingProfileType;
    planSlug: SubscriptionPlanId;
    status?: 'active' | 'cancelled' | 'expired';
    expiresAt?: Date | null;
}): Promise<{ planSlug: string; status: string; expiresAt: string | null }> {
    const status =
        input.status ?? (input.planSlug === 'free' ? 'cancelled' : 'active');
    const expiresAt = input.expiresAt ?? null;
    const billingProfileType = input.vertical === 'serenatas' ? input.billingProfileType ?? 'provider' : undefined;

    if (input.planSlug === 'free' || status === 'cancelled' || status === 'expired') {
        const accountId = await resolveSubscriptionAccountId(input.userId, input.vertical, input.accountId);
        const findExisting = async (scopeAccountId: string | null) => db
            .select({ id: subscriptions.id, accountId: subscriptions.accountId, status: subscriptions.status })
            .from(subscriptions)
            .where(input.vertical === 'serenatas'
                ? and(
                    eq(subscriptions.userId, input.userId),
                    eq(subscriptions.vertical, input.vertical),
                    eq(subscriptions.billingProfileType, billingProfileType!),
                    scopeAccountId ? eq(subscriptions.accountId, scopeAccountId) : isNull(subscriptions.accountId),
                )
                : scopeAccountId
                    ? and(eq(subscriptions.accountId, scopeAccountId), eq(subscriptions.vertical, input.vertical))
                    : and(eq(subscriptions.userId, input.userId), eq(subscriptions.vertical, input.vertical), isNull(subscriptions.accountId)))
            .orderBy(desc(subscriptions.updatedAt))
            .limit(1);
        let existingRows = await findExisting(accountId);
        if (existingRows.length === 0 && await canUseLegacyPersonalSubscription(input.userId, accountId)) {
            // No vincular ni cancelar una suscripción personal antigua desde un espacio de empresa.
            existingRows = await findExisting(null);
        }
        const existing = existingRows.slice(0, 1);

        const resolvedStatus = status === 'active' ? 'cancelled' : status;

        if (existing[0]) {
            await db
                .update(subscriptions)
                .set({
                    accountId,
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

        if (input.vertical === 'serenatas') {
            await syncSerenataCommissionForPlan(input.userId, billingProfileType!, 'free', resolvedStatus);
        }
        if (input.vertical === 'agenda') {
            await syncAgendaProfilePlanForUser(
                input.userId,
                'free',
                resolvedStatus,
                expiresAt && expiresAt.getTime() < Date.now() ? expiresAt : expiredAgendaPlanEndsAt(),
                accountId,
            );
        }
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
        billingProfileType,
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
    accountId?: string | null,
): Promise<void> {
    let profileScope = accountId
        ? eq(agendaProfessionalProfiles.accountId, accountId)
        : and(eq(agendaProfessionalProfiles.userId, userId), isNull(agendaProfessionalProfiles.accountId));
    if (accountId) {
        const [accountProfile] = await db
            .select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.accountId, accountId))
            .limit(1);
        if (!accountProfile && await canUseLegacyPersonalSubscription(userId, accountId)) {
            profileScope = and(eq(agendaProfessionalProfiles.userId, userId), isNull(agendaProfessionalProfiles.accountId));
        }
    }

    if (status === 'active' && (planSlug === 'pro' || planSlug === 'pro_plus' || planSlug === 'enterprise')) {
        await db
            .update(agendaProfessionalProfiles)
            .set({
                plan: planSlug === 'pro_plus' ? 'pro_plus' : 'pro',
                planExpiresAt: expiresAt ?? null,
                updatedAt: new Date(),
            })
            .where(profileScope);
        return;
    }

    if (status === 'cancelled' || status === 'expired' || planSlug === 'free') {
        const endsAt =
            expiresAt && expiresAt.getTime() <= Date.now()
                ? expiresAt
                : expiredAgendaPlanEndsAt();
        await db
            .update(agendaProfessionalProfiles)
            .set({ plan: 'free', planExpiresAt: endsAt, updatedAt: new Date() })
            .where(profileScope);
    }
}

async function syncSerenataCommissionForPlan(
    userId: string,
    billingProfileType: SerenataBillingProfileType,
    planSlug: string,
    status: string,
): Promise<void> {
    const isActivePaidPlan = status === 'active' && planSlug === 'pro';
    const commissionRateBps = isActivePaidPlan ? APP_COMMISSION_PRO_BPS : APP_COMMISSION_FREE_BPS;
    if (billingProfileType === 'provider') {
        await db
            .update(serenataOwners)
            .set({
                commissionRateBps,
                subscriptionStatus: isActivePaidPlan ? 'active' : 'trialing',
                updatedAt: new Date(),
            })
            .where(eq(serenataOwners.userId, userId));
        return;
    }

    await db
        .update(serenataMusicians)
        .set({ commissionRateBps, updatedAt: new Date() })
        .where(eq(serenataMusicians.userId, userId));
}
