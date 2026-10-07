import { describe, expect, it } from 'vitest';
import { shouldUpgradeAgendaPromotion } from './promotion.js';

describe('agenda introductory subscription promotion', () => {
    it('switches to the regular charge only after six successful charges', () => {
        expect(shouldUpgradeAgendaPromotion({
            reason: 'Suscripción Pro · SimpleAgenda',
            chargedQuantity: 5,
            currentAmount: 11888,
        })).toBe(false);
        expect(shouldUpgradeAgendaPromotion({
            reason: 'Suscripción Pro · SimpleAgenda',
            chargedQuantity: 6,
            currentAmount: 11888,
        })).toBe(true);
    });

    it('does not alter other products or subscriptions already at regular price', () => {
        expect(shouldUpgradeAgendaPromotion({
            reason: 'Suscripción Pro · SimpleAutos',
            chargedQuantity: 6,
            currentAmount: 11888,
        })).toBe(false);
        expect(shouldUpgradeAgendaPromotion({
            reason: 'Suscripción Pro · SimpleAgenda',
            chargedQuantity: 6,
            currentAmount: 23788,
        })).toBe(false);
    });
});
