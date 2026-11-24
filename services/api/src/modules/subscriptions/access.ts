import type {
    ActiveSubscription,
    AppUser,
    PaidSubscriptionPlanRecord,
    PublicProfileAccountKind,
    SerenataBillingProfileType,
    SubscriptionPlanId,
    VerticalType,
} from '../../lib/domain-types.js';
import {
    isMarketplaceLaunchActive,
    isPlatformLaunchActive,
    resolveMarketplaceSubscriptionEntitlements,
} from '@simple/utils';
import { getSubscriptionPlans } from '../advertising/service.js';

export type SubscriptionAccessStore = {
    activeSubscriptionsByUser: Map<string, ActiveSubscription[]>;
    activeSubscriptionsByAccount: Map<string, ActiveSubscription[]>;
    defaultAccountIdByUserId: Map<string, string>;
    accountsById?: Map<string, { isPersonal?: boolean; ownerUserId?: string }>;
};

export function createSubscriptionAccess(store: SubscriptionAccessStore) {
    const { activeSubscriptionsByUser, activeSubscriptionsByAccount, defaultAccountIdByUserId, accountsById } = store;

    function canReadLegacyPersonalSubscription(userId: string, accountId: string | null): boolean {
        if (!accountId) return false;
        const account = accountsById?.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    }

    function getPaidSubscriptionPlan(
        vertical: VerticalType,
        planId: Exclude<SubscriptionPlanId, 'free'>,
    ): PaidSubscriptionPlanRecord | null {
        const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
        return plan ? (plan as PaidSubscriptionPlanRecord) : null;
    }

    function getActiveSubscriptionsForUser(userId: string, vertical?: VerticalType): ActiveSubscription[] {
        const items = activeSubscriptionsByUser.get(userId) ?? [];
        const filtered = vertical ? items.filter((item) => item.vertical === vertical) : items;
        return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    function hasActiveAccess(item: ActiveSubscription): boolean {
        return item.status === 'active' && (item.expiresAt == null || item.expiresAt > Date.now());
    }

    function getCurrentSubscription(
        userId: string,
        vertical: VerticalType,
        explicitAccountId?: string | null,
        billingProfileType?: SerenataBillingProfileType,
    ): ActiveSubscription | null {
        if ((vertical as string) === 'serenatas') {
            const targetProfileType = billingProfileType ?? 'provider';
            return getActiveSubscriptionsForUser(userId, vertical)
                .find((item) => (
                    hasActiveAccess(item)
                    && (item.billingProfileType ?? 'provider') === targetProfileType
                )) ?? null;
        }
        const accountId = explicitAccountId === undefined
            ? defaultAccountIdByUserId.get(userId) ?? null
            : explicitAccountId;
        if (accountId) {
            const accountSubscription = (activeSubscriptionsByAccount.get(accountId) ?? [])
                .find((item) => item.vertical === vertical && hasActiveAccess(item));
            if (accountSubscription) return accountSubscription;
        }

        const canReadLegacy = canReadLegacyPersonalSubscription(userId, accountId);

        return getActiveSubscriptionsForUser(userId, vertical).find((item) => (
            hasActiveAccess(item)
            && (accountId !== null && item.accountId === accountId || (canReadLegacy && !item.accountId))
        )) ?? null;
    }

    function getEffectivePlanId(user: AppUser, vertical: VerticalType, explicitAccountId?: string | null): SubscriptionPlanId {
        if ((vertical as string) === 'serenatas') {
            return getCurrentSubscription(user.id, vertical, explicitAccountId)?.planId ?? 'free';
        }
        const accountId = explicitAccountId === undefined
            ? user.primaryAccountId ?? defaultAccountIdByUserId.get(user.id)
            : explicitAccountId;
        const accountSubscription = accountId
            ? (activeSubscriptionsByAccount.get(accountId) ?? [])
                .find((item) => item.vertical === vertical && hasActiveAccess(item))
            : null;
        if (accountSubscription) return accountSubscription.planId;
        if (explicitAccountId !== undefined) {
            const canReadLegacy = canReadLegacyPersonalSubscription(user.id, accountId ?? null);
            return getActiveSubscriptionsForUser(user.id, vertical).find((item) => (
                hasActiveAccess(item)
                && (accountId !== null && item.accountId === accountId || (canReadLegacy && !item.accountId))
            ))?.planId ?? 'free';
        }
        return getCurrentSubscription(user.id, vertical)?.planId ?? 'free';
    }

    function getDefaultPublicProfileAccountKind(_user: AppUser, _vertical: VerticalType): PublicProfileAccountKind {
        return 'individual';
    }

    function getMarketplaceCapabilities(
        user: AppUser,
        vertical: VerticalType,
        launchMode: boolean,
        accountId?: string | null,
    ) {
        if (vertical !== 'autos' && vertical !== 'propiedades') return null;
        const planId = getEffectivePlanId(user, vertical, accountId);
        const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
        if (!plan) return null;
        const resolvedAccountId = accountId === undefined
            ? user.primaryAccountId ?? defaultAccountIdByUserId.get(user.id) ?? null
            : accountId;
        return resolveMarketplaceSubscriptionEntitlements({
            vertical,
            accountId: resolvedAccountId,
            accountKind: 'individual',
            plan,
            usage: { activeListings: 0 },
            launchMode,
        }).capabilities;
    }

    function getCurrentPlanLabel(user: AppUser, vertical: VerticalType, accountId?: string | null): string {
        const plan = getSubscriptionPlans(vertical).find((item) => item.id === getEffectivePlanId(user, vertical, accountId));
        return plan?.name ?? 'Gratuito';
    }

    function getInstagramRequiredPlanIds(): Array<Exclude<SubscriptionPlanId, 'free'>> {
        return ['pro', 'pro_plus', 'enterprise'];
    }

    function userCanUsePublicProfile(user: AppUser, vertical: VerticalType, accountId?: string | null): boolean {
        if (isMarketplaceLaunchActive(vertical)) return true;
        if (vertical === 'autos' || vertical === 'propiedades') {
            return getMarketplaceCapabilities(user, vertical, false, accountId)?.publicProfile ?? false;
        }
        return getEffectivePlanId(user, vertical, accountId) !== 'free';
    }

    function userCanUseInstagram(user: AppUser, vertical: VerticalType, accountId?: string | null): boolean {
        if (isPlatformLaunchActive(vertical)) return true;
        if (vertical === 'autos' || vertical === 'propiedades') {
            return getMarketplaceCapabilities(user, vertical, false, accountId)?.instagramPublishing ?? false;
        }
        const planId = getEffectivePlanId(user, vertical, accountId);
        return planId === 'pro' || planId === 'pro_plus' || planId === 'enterprise';
    }

    function cancelActiveSubscriptionForUser(
        userId: string,
        vertical: VerticalType,
        explicitAccountId?: string | null,
        billingProfileType?: SerenataBillingProfileType,
    ): void {
        if ((vertical as string) === 'serenatas') {
            const targetProfileType = billingProfileType ?? 'provider';
            const current = activeSubscriptionsByUser.get(userId) ?? [];
            activeSubscriptionsByUser.set(userId, current.map((item) => (
                item.vertical === vertical
                && item.status === 'active'
                && (item.billingProfileType ?? 'provider') === targetProfileType
                    ? { ...item, status: 'cancelled' as const, updatedAt: Date.now() }
                    : item
            )));
            for (const [accountId, accountSubscriptions] of activeSubscriptionsByAccount.entries()) {
                activeSubscriptionsByAccount.set(accountId, accountSubscriptions.map((item) => (
                    item.userId === userId
                    && item.vertical === vertical
                    && item.status === 'active'
                    && (item.billingProfileType ?? 'provider') === targetProfileType
                        ? { ...item, status: 'cancelled' as const, updatedAt: Date.now() }
                        : item
                )));
            }
            return;
        }
        const accountId = explicitAccountId === undefined
            ? defaultAccountIdByUserId.get(userId) ?? null
            : explicitAccountId;
        const canCancelLegacy = canReadLegacyPersonalSubscription(userId, accountId);
        const current = activeSubscriptionsByUser.get(userId) ?? [];
        activeSubscriptionsByUser.set(
            userId,
            current.map((item) => {
                if (
                    item.vertical !== vertical
                    || item.status !== 'active'
                    || !(accountId !== null && item.accountId === accountId || (canCancelLegacy && !item.accountId))
                ) return item;
                return {
                    ...item,
                    status: 'cancelled' as const,
                    updatedAt: Date.now(),
                };
            }),
        );

        if (accountId) {
            const accountSubscriptions = activeSubscriptionsByAccount.get(accountId) ?? [];
            activeSubscriptionsByAccount.set(accountId, accountSubscriptions.map((item) => (
                item.vertical !== vertical || item.status !== 'active'
                    ? item
                    : { ...item, status: 'cancelled' as const, updatedAt: Date.now() }
            )));
        }
    }

    function upsertActiveSubscription(nextSubscription: ActiveSubscription): ActiveSubscription {
        const current = activeSubscriptionsByUser.get(nextSubscription.userId) ?? [];
        const replaced = current.map((item) => {
            if (
                item.vertical !== nextSubscription.vertical
                || ((nextSubscription.vertical as string) === 'serenatas'
                    && (item.billingProfileType ?? 'provider') !== (nextSubscription.billingProfileType ?? 'provider'))
                || ((nextSubscription.vertical as string) !== 'serenatas'
                    && (item.accountId ?? null) !== (nextSubscription.accountId ?? null))
            ) return item;
            if (item.status !== 'active') return item;
            return {
                ...item,
                status: 'cancelled' as const,
                updatedAt: Date.now(),
            };
        });
        const next = [nextSubscription, ...replaced.filter((item) => item.id !== nextSubscription.id)];
        activeSubscriptionsByUser.set(nextSubscription.userId, next);

        if ((nextSubscription.vertical as string) === 'serenatas') {
            for (const [accountId, accountCurrent] of activeSubscriptionsByAccount.entries()) {
                const accountReplaced = accountCurrent.map((item) => (
                    item.userId === nextSubscription.userId
                    && item.vertical === nextSubscription.vertical
                    && (item.billingProfileType ?? 'provider') === (nextSubscription.billingProfileType ?? 'provider')
                    && item.status === 'active'
                        ? { ...item, status: 'cancelled' as const, updatedAt: Date.now() }
                        : item
                ));
                activeSubscriptionsByAccount.set(accountId, accountReplaced);
            }
        }

        if (nextSubscription.accountId) {
            const accountCurrent = activeSubscriptionsByAccount.get(nextSubscription.accountId) ?? [];
            const accountReplaced = accountCurrent.map((item) => {
                if (
                    item.vertical !== nextSubscription.vertical
                    || item.status !== 'active'
                    || ((nextSubscription.vertical as string) === 'serenatas'
                        && (item.userId !== nextSubscription.userId
                            || (item.billingProfileType ?? 'provider') !== (nextSubscription.billingProfileType ?? 'provider')))
                ) return item;
                return { ...item, status: 'cancelled' as const, updatedAt: Date.now() };
            });
            activeSubscriptionsByAccount.set(
                nextSubscription.accountId,
                [nextSubscription, ...accountReplaced.filter((item) => item.id !== nextSubscription.id)],
            );
        }
        return nextSubscription;
    }

    function makeSubscriptionId(vertical: VerticalType, planId: Exclude<SubscriptionPlanId, 'free'>): string {
        return `sub-${vertical}-${planId}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
    }

    function formatPlanLimit(value: number): string {
        return value < 0 ? 'Ilimitadas' : String(value);
    }

    return {
        getPaidSubscriptionPlan,
        getActiveSubscriptionsForUser,
        getCurrentSubscription,
        getEffectivePlanId,
        getDefaultPublicProfileAccountKind,
        getCurrentPlanLabel,
        getInstagramRequiredPlanIds,
        userCanUsePublicProfile,
        userCanUseInstagram,
        upsertActiveSubscription,
        cancelActiveSubscriptionForUser,
        makeSubscriptionId,
        formatPlanLimit,
    };
}
