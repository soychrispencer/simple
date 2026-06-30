/** @deprecated Compatibilidad legacy. SimpleSerenatas ya no cobra comisión por serenata. */
export const APP_COMMISSION_FREE_BPS = 0;
/** @deprecated Compatibilidad legacy. SimpleSerenatas ya no cobra comisión por serenata. */
export const APP_COMMISSION_PRO_BPS = 0;
export const COMMISSION_VAT_BPS = 1900;
export const SERENATA_PRO_PRICE_MONTHLY_CLP = 19_990;
export const SERENATA_TRIAL_DAYS = 30;

export { BILLING_TRIAL_DAYS, defaultTrialEndsAt as defaultSerenataTrialEndsAt } from '../billing/trial-config.js';

/** Monto mensual cobrado en checkout (neto + IVA 19 %). */
export function serenataPlanMonthlyChargeClp(plan: Extract<SerenataBillingPlanId, 'pro'> = 'pro'): number {
    return Math.round(SERENATA_PRO_PRICE_MONTHLY_CLP * (1 + COMMISSION_VAT_BPS / 10_000));
}

/** @deprecated Usar `serenataPlanMonthlyChargeClp('pro')`. */
export function serenataProMonthlyChargeClp(): number {
    return serenataPlanMonthlyChargeClp('pro');
}

export type SerenataBillingPlanId = 'free' | 'pro';

export function commissionPercentFromBps(bps: number): number {
    return bps / 100;
}

export function appCommissionBpsForPlan(plan: SerenataBillingPlanId): number {
    return plan === 'pro' ? APP_COMMISSION_PRO_BPS : APP_COMMISSION_FREE_BPS;
}

export function planLabel(plan: SerenataBillingPlanId): string {
    if (plan === 'pro') return 'Pro';
    return 'Prueba gratis';
}

/** @deprecated Ejemplo legacy. SimpleSerenatas no cobra comisión por serenata. */
export function exampleAppCommissionClp(grossClp: number, plan: SerenataBillingPlanId): {
    grossClp: number;
    commissionClp: number;
    vatOnCommissionClp: number;
    totalDeductionClp: number;
} {
    const bps = appCommissionBpsForPlan(plan);
    const commissionClp = Math.round((grossClp * bps) / 10_000);
    const vatOnCommissionClp = Math.round((commissionClp * COMMISSION_VAT_BPS) / 10_000);
    return {
        grossClp,
        commissionClp,
        vatOnCommissionClp,
        totalDeductionClp: commissionClp + vatOnCommissionClp,
    };
}
