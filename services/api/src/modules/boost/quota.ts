import type { VerticalType } from '@simple/types';
import { getSubscriptionPlans } from '../advertising/service.js';
type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';
import { countFreeBoostsUsedThisMonth } from './service.js';

export type FreeBoostQuota = {
    max: number;
    used: number;
    remaining: number;
    planId: string;
    planName: string;
    /** true cuando max/remaining son -1 (superadmin o Enterprise). */
    unlimited: boolean;
};

/**
 * Cuota de boosts gratuitos según plan de suscripción activo (maxFreeBoostsPerMonth).
 */
export function resolveFreeBoostQuota(
    user: { id: string; role: string },
    vertical: VerticalType,
    planId: SubscriptionPlanId,
): FreeBoostQuota {
    if (user.role === 'superadmin') {
        const used = countFreeBoostsUsedThisMonth(user.id, vertical);
        return {
            max: -1,
            used,
            remaining: -1,
            planId: 'superadmin',
            planName: 'Administrador',
            unlimited: true,
        };
    }

    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
    const max = plan?.maxFreeBoostsPerMonth ?? 0;
    const planName = plan?.name ?? 'Gratuito';
    const used = countFreeBoostsUsedThisMonth(user.id, vertical);

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
