import { describe, expect, it } from 'vitest';
import {
    catalogPaidPlans,
    filterCatalogPlans,
    isMarketplacePlanAvailableForAccount,
    normalizeCatalogSubscription,
} from './plan-catalog.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';

describe('plan-catalog', () => {
    it.each(['autos', 'propiedades'] as const)('%s muestra solo la oferta que corresponde a la actividad de la cuenta', (vertical) => {
        const plans = SUBSCRIPTION_PLANS_BY_VERTICAL[vertical];

        expect(filterCatalogPlans(vertical, plans, 'individual').map((plan) => plan.id)).toEqual(['free']);
        expect(catalogPaidPlans(vertical, plans, 'individual')).toEqual([]);
        expect(filterCatalogPlans(vertical, plans, 'independent').map((plan) => plan.id)).toEqual(['free', 'pro']);
        expect(catalogPaidPlans(vertical, plans, 'independent').map((plan) => plan.id)).toEqual(['pro']);
        expect(filterCatalogPlans(vertical, plans, 'company').map((plan) => plan.id)).toEqual(['free', 'pro', 'enterprise']);
        expect(catalogPaidPlans(vertical, plans, 'company').map((plan) => plan.id)).toEqual(['pro', 'enterprise']);
    });

    it('agenda expone sus cuatro planes y Serenatas solo su plan de pago', () => {
        expect(filterCatalogPlans('agenda', SUBSCRIPTION_PLANS_BY_VERTICAL.agenda).map((plan) => plan.id)).toEqual(['free', 'pro', 'pro_plus', 'enterprise']);
        expect(catalogPaidPlans('serenatas', SUBSCRIPTION_PLANS_BY_VERTICAL.serenatas).map((plan) => plan.id)).toEqual(['pro']);
    });

    it('enriquece suscripción actual con datos del catálogo', () => {
        const plans = filterCatalogPlans('agenda', SUBSCRIPTION_PLANS_BY_VERTICAL.agenda);
        const freePlan = plans.find((plan) => plan.id === 'free') ?? null;
        const normalized = normalizeCatalogSubscription(
            'agenda',
            {
                planId: 'free',
                planName: 'Antiguo',
                features: [],
            },
            plans,
        );

        expect(normalized).toMatchObject({
            planId: 'free',
            planName: freePlan?.name ?? 'Gratis',
        });
    });

    it('mantiene enterprise en autos', () => {
        expect(catalogPaidPlans('autos', SUBSCRIPTION_PLANS_BY_VERTICAL.autos).map((plan) => plan.id)).toEqual([
            'pro',
            'enterprise',
        ]);
    });

    it('applies one paid-plan eligibility rule to catalog and checkout', () => {
        expect(isMarketplacePlanAvailableForAccount('individual', 'free')).toBe(true);
        expect(isMarketplacePlanAvailableForAccount('individual', 'pro')).toBe(false);
        expect(isMarketplacePlanAvailableForAccount('independent', 'pro')).toBe(true);
        expect(isMarketplacePlanAvailableForAccount('independent', 'enterprise')).toBe(false);
        expect(isMarketplacePlanAvailableForAccount('company', 'enterprise')).toBe(true);
    });
});
