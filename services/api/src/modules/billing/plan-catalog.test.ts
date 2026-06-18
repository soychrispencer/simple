import { describe, expect, it } from 'vitest';
import {
    catalogPaidPlans,
    filterCatalogPlans,
    normalizeCatalogSubscription,
    normalizeLegacyPlanId,
} from './plan-catalog.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';

describe('plan-catalog', () => {
    it('oculta essential en agenda y serenatas', () => {
        const legacyAgenda = [
            ...SUBSCRIPTION_PLANS_BY_VERTICAL.agenda,
            {
                id: 'essential' as const,
                name: 'Esencial',
                description: 'legacy',
                priceMonthly: 9990,
                currency: 'CLP' as const,
                maxListings: 0,
                maxFeaturedListings: 0,
                maxImagesPerListing: 0,
                analyticsEnabled: false,
                prioritySupport: false,
                customBranding: false,
                apiAccess: false,
                maxFreeBoostsPerMonth: 0,
                features: [],
            },
        ];

        expect(filterCatalogPlans('agenda', legacyAgenda).map((plan) => plan.id)).toEqual(['free', 'pro']);
        expect(catalogPaidPlans('serenatas', legacyAgenda).map((plan) => plan.id)).toEqual(['pro']);
    });

    it('normaliza essential a prueba gratuita en la suscripción actual', () => {
        const plans = filterCatalogPlans('agenda', SUBSCRIPTION_PLANS_BY_VERTICAL.agenda);
        const freePlan = plans.find((plan) => plan.id === 'free') ?? null;
        const normalized = normalizeCatalogSubscription(
            'agenda',
            {
                planId: 'essential',
                planName: 'Esencial',
                features: ['legacy'],
            },
            plans,
            freePlan,
        );

        expect(normalized).toMatchObject({
            planId: 'free',
            planName: 'Prueba completa',
            priceMonthly: 0,
        });
    });

    it('mantiene enterprise en autos', () => {
        expect(normalizeLegacyPlanId('autos', 'enterprise')).toBe('enterprise');
        expect(catalogPaidPlans('autos', SUBSCRIPTION_PLANS_BY_VERTICAL.autos).map((plan) => plan.id)).toEqual([
            'pro',
            'enterprise',
        ]);
    });
});
