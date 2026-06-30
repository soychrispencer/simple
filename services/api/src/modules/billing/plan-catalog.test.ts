import { describe, expect, it } from 'vitest';
import {
    catalogPaidPlans,
    filterCatalogPlans,
    normalizeCatalogSubscription,
} from './plan-catalog.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';

describe('plan-catalog', () => {
    it('agenda y serenatas solo exponen free y pro', () => {
        expect(filterCatalogPlans('agenda', SUBSCRIPTION_PLANS_BY_VERTICAL.agenda).map((plan) => plan.id)).toEqual(['free', 'pro']);
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
            planName: freePlan?.name ?? 'Prueba completa',
        });
    });

    it('mantiene enterprise en autos', () => {
        expect(catalogPaidPlans('autos', SUBSCRIPTION_PLANS_BY_VERTICAL.autos).map((plan) => plan.id)).toEqual([
            'pro',
            'enterprise',
        ]);
    });
});
