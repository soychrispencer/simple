import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from './types.js';

describe('Serenatas subscription catalog', () => {
    it('exposes base, coordinator and enterprise plans', () => {
        const plans = SUBSCRIPTION_PLANS_BY_VERTICAL.serenatas;

        expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro', 'enterprise']);
        expect(plans.find((plan) => plan.id === 'pro')).toMatchObject({
            name: 'Coordinador',
            priceMonthly: 19990,
        });
        expect(plans.find((plan) => plan.id === 'enterprise')?.priceMonthly).toBeGreaterThan(19990);
    });
});
