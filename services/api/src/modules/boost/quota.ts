import type { VerticalType } from '@simple/types';
import { getSubscriptionPlans } from '../advertising/service.js';
type SubscriptionPlanId = 'free' | 'essential' | 'pro' | 'enterprise';
import { countFreeBoostsUsedThisMonth } from './service.js';

export type FreeBoostQuota = { max: number; used: number; remaining: number };

/**
 * Cuota de boosts gratuitos según plan de suscripción activo (maxFreeBoostsPerMonth).
 */
export function resolveFreeBoostQuota(
    user: { id: string; role: string },
    vertical: VerticalType,
    planId: SubscriptionPlanId,
): FreeBoostQuota {
    if (user.role === 'superadmin') {
        return { max: -1, used: 0, remaining: -1 };
    }

    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
    const max = plan?.maxFreeBoostsPerMonth ?? 0;
    if (max < 0) {
        return { max: -1, used: 0, remaining: -1 };
    }

    const used = countFreeBoostsUsedThisMonth(user.id, vertical);
    return { max, used, remaining: Math.max(0, max - used) };
}
