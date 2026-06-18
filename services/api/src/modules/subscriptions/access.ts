import type {
    ActiveSubscription,
    AppUser,
    PaidSubscriptionPlanRecord,
    PublicProfileAccountKind,
    SubscriptionPlanId,
    VerticalType,
} from '../../lib/domain-types.js';
import { getSubscriptionPlans } from '../advertising/service.js';

export type SubscriptionAccessStore = {
    activeSubscriptionsByUser: Map<string, ActiveSubscription[]>;
};

export function createSubscriptionAccess(store: SubscriptionAccessStore) {
    const { activeSubscriptionsByUser } = store;

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

    function getCurrentSubscription(userId: string, vertical: VerticalType): ActiveSubscription | null {
        return getActiveSubscriptionsForUser(userId, vertical).find((item) => item.status === 'active') ?? null;
    }

    function getEffectivePlanId(user: AppUser, vertical: VerticalType): SubscriptionPlanId {
        if (user.role === 'superadmin') return 'enterprise';
        return getCurrentSubscription(user.id, vertical)?.planId ?? 'free';
    }

    function getDefaultPublicProfileAccountKind(user: AppUser, vertical: VerticalType): PublicProfileAccountKind {
        const planId = getEffectivePlanId(user, vertical);
        if (planId === 'enterprise') return 'company';
        if (planId === 'pro') return 'independent';
        return 'individual';
    }

    function getCurrentPlanLabel(user: AppUser, vertical: VerticalType): string {
        if (user.role === 'superadmin') return 'Empresa';
        if (user.role === 'admin') return 'Admin';
        const plan = getSubscriptionPlans(vertical).find((item) => item.id === getEffectivePlanId(user, vertical));
        return plan?.name ?? 'Gratuito';
    }

    function getInstagramRequiredPlanIds(): Array<Exclude<SubscriptionPlanId, 'free'>> {
        return ['pro', 'enterprise'];
    }

    function userCanUsePublicProfile(user: AppUser, vertical: VerticalType): boolean {
        if (user.role === 'superadmin' || user.role === 'admin') return true;
        return getEffectivePlanId(user, vertical) !== 'free';
    }

    function userCanUseInstagram(user: AppUser, vertical: VerticalType): boolean {
        if (user.role === 'superadmin') return true;
        const planId = getEffectivePlanId(user, vertical);
        return planId === 'pro' || planId === 'enterprise';
    }

    function cancelActiveSubscriptionForUser(userId: string, vertical: VerticalType): void {
        const current = activeSubscriptionsByUser.get(userId) ?? [];
        activeSubscriptionsByUser.set(
            userId,
            current.map((item) => {
                if (item.vertical !== vertical || item.status !== 'active') return item;
                return {
                    ...item,
                    status: 'cancelled' as const,
                    updatedAt: Date.now(),
                };
            }),
        );
    }

    function upsertActiveSubscription(nextSubscription: ActiveSubscription): ActiveSubscription {
        const current = activeSubscriptionsByUser.get(nextSubscription.userId) ?? [];
        const replaced = current.map((item) => {
            if (item.vertical !== nextSubscription.vertical) return item;
            if (item.status !== 'active') return item;
            return {
                ...item,
                status: 'cancelled' as const,
                updatedAt: Date.now(),
            };
        });
        const next = [nextSubscription, ...replaced.filter((item) => item.id !== nextSubscription.id)];
        activeSubscriptionsByUser.set(nextSubscription.userId, next);
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
