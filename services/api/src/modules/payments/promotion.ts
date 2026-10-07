import { AGENDA_INTRO_PROMOTION } from '../billing/agenda-promotion.js';

export { AGENDA_INTRO_PROMOTION };

export function shouldUpgradeAgendaPromotion(input: {
    reason: unknown;
    chargedQuantity: unknown;
    currentAmount: unknown;
}): boolean {
    const reason = typeof input.reason === 'string' ? input.reason : '';
    const chargedQuantity = Number(input.chargedQuantity);
    const currentAmount = Number(input.currentAmount);
    const promoCharge = Math.round(AGENDA_INTRO_PROMOTION.promoNetMonthly * 1.19);

    return reason.includes('SimpleAgenda')
        && Number.isFinite(chargedQuantity)
        && chargedQuantity >= AGENDA_INTRO_PROMOTION.months
        && currentAmount === promoCharge;
}
