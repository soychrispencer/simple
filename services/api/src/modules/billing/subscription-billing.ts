import type { PaidSubscriptionPlanRecord, PaymentVerticalType } from '../../lib/domain-types.js';
import { AGENDA_PRICING } from '@simple/utils';
import type { PaymentProvider } from '../payments/resolve-provider.js';

/** Precio mensual USD (referencia internacional, sin IVA chileno). */
export const INTERNATIONAL_SUBSCRIPTION_USD_MONTHLY: Record<
    PaymentVerticalType,
    Partial<Record<'pro' | 'pro_plus' | 'enterprise', number>>
> = {
    autos: { pro: 39, enterprise: 99 },
    propiedades: { pro: 39, enterprise: 99 },
    agenda: { pro: 19 },
    serenatas: { pro: 19 },
};

export function getMercadoPagoSubscriptionChargeClp(
    vertical: PaymentVerticalType,
    plan: PaidSubscriptionPlanRecord,
    billingCycle: 'monthly' | 'annual' = 'monthly',
): number {
    const withVat = (vertical === 'agenda' && (plan.id === 'pro' || plan.id === 'pro_plus'))
        || (vertical === 'serenatas' && plan.id === 'pro');
    if (withVat) {
        if (vertical === 'agenda' && billingCycle === 'annual') {
            const annualNetPrice = plan.id === 'pro_plus'
                ? AGENDA_PRICING.proPlusAnnualTotalNetClp
                : AGENDA_PRICING.proAnnualTotalNetClp;
            return Math.round(annualNetPrice * (1 + 1900 / 10_000));
        }
        const netPrice = vertical === 'agenda' && plan.promotion
            ? plan.promotion.priceMonthly
            : plan.priceMonthly;
        return Math.round(netPrice * (1 + 1900 / 10_000));
    }
    return plan.priceMonthly;
}

export function getSubscriptionBillingCharge(
    provider: PaymentProvider,
    vertical: PaymentVerticalType,
    plan: PaidSubscriptionPlanRecord,
    billingCycle: 'monthly' | 'annual' = 'monthly',
): { amount: number; currency: 'CLP' | 'USD' } {
    if (provider === 'mercadopago') {
        return {
            amount: getMercadoPagoSubscriptionChargeClp(vertical, plan, billingCycle),
            currency: 'CLP',
        };
    }
    const usd = INTERNATIONAL_SUBSCRIPTION_USD_MONTHLY[vertical]?.[plan.id];
    if (usd == null) {
        return {
            amount: getMercadoPagoSubscriptionChargeClp(vertical, plan),
            currency: 'CLP',
        };
    }
    return { amount: usd, currency: 'USD' };
}

export function localizePaidPlansForBilling<T extends PaidSubscriptionPlanRecord>(
    provider: PaymentProvider,
    vertical: PaymentVerticalType,
    plans: T[],
): T[] {
    if (provider === 'mercadopago') return plans;
    return plans.map((plan) => {
        const billing = getSubscriptionBillingCharge(provider, vertical, plan);
        return {
            ...plan,
            priceMonthly: billing.amount,
            currency: billing.currency,
        } as T;
    });
}
