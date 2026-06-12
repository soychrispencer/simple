import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from './types.js';

describe('Serenatas subscription catalog', () => {
    it('exposes trial, essential and pro plans', () => {
        const plans = SUBSCRIPTION_PLANS_BY_VERTICAL.serenatas;

        expect(plans.map((plan) => plan.id)).toEqual(['free', 'essential', 'pro']);
        expect(plans.find((plan) => plan.id === 'essential')).toMatchObject({
            name: 'Esencial',
            priceMonthly: 9990,
        });
        expect(plans.find((plan) => plan.id === 'pro')).toMatchObject({
            name: 'Pro',
            priceMonthly: 19990,
            recommended: true,
        });
    });
});
