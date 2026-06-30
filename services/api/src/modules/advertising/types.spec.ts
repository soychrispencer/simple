import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from './types.js';

describe('Serenatas subscription catalog', () => {
    it('exposes trial and pro plans only', () => {
        const plans = SUBSCRIPTION_PLANS_BY_VERTICAL.serenatas;

        expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro']);
        expect(plans.find((plan) => plan.id === 'pro')).toMatchObject({
            name: 'Pro',
            priceMonthly: 19990,
            recommended: true,
        });
    });
});

describe('Agenda subscription catalog', () => {
    it('exposes trial and pro plans only', () => {
        const plans = SUBSCRIPTION_PLANS_BY_VERTICAL.agenda;
        expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro']);
    });
});
