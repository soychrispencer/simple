import type { VerticalType } from '@simple/types';
import { getSubscriptionPlans } from '../advertising/service.js';
type SubscriptionPlanId = 'free' | 'pro' | 'pro_plus' | 'enterprise';
import { countFreeBoostsUsedThisMonth } from './service.js';

export type FreeBoostQuota = {
    max: number;
    used: number;
    remaining: number;
    planId: string;
    planName: string;
    /** true cuando el plan tiene cuota ilimitada. */
    unlimited: boolean;
};

/**
 * Cuota de boosts gratuitos según plan de suscripción activo (maxFreeBoostsPerMonth).
 */
export function resolveFreeBoostQuota(
    user: { id: string; role?: string },
    vertical: VerticalType,
    planId: SubscriptionPlanId,
    accountId?: string | null,
    legacyPersonalOwnerUserId?: string,
): FreeBoostQuota {
    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
    const max = plan?.maxFreeBoostsPerMonth ?? 0;
    const planName = plan?.name ?? 'Gratuito';
    const used = countFreeBoostsUsedThisMonth(user.id, vertical, accountId, legacyPersonalOwnerUserId);

    if (max < 0) {
        return {
            max: -1,
            used,
            remaining: -1,
            planId,
            planName,
            unlimited: true,
        };
    }

    return {
        max,
        used,
        remaining: Math.max(0, max - used),
        planId,
        planName,
        unlimited: false,
    };
}
