/** @deprecated Compatibilidad legacy. SimpleSerenatas ya no cobra comisión por serenata. */
export const APP_COMMISSION_FREE_BPS = 0;
/** @deprecated Compatibilidad legacy. SimpleSerenatas ya no cobra comisión por serenata. */
export const APP_COMMISSION_PRO_BPS = 0;
export const COMMISSION_VAT_BPS = 1900;
export const SERENATA_ESSENTIAL_PRICE_MONTHLY_CLP = 9_990;
export const SERENATA_PRO_PRICE_MONTHLY_CLP = 19_990;
export const SERENATA_TRIAL_DAYS = 30;

export function defaultSerenataTrialEndsAt(from = new Date()): Date {
    const trialEndsAt = new Date(from);
    trialEndsAt.setDate(trialEndsAt.getDate() + SERENATA_TRIAL_DAYS);
    return trialEndsAt;
}

/** Monto mensual cobrado en checkout (neto + IVA 19 %). */
export function serenataPlanMonthlyChargeClp(plan: Extract<SerenataBillingPlanId, 'essential' | 'pro'>): number {
    const net = plan === 'essential' ? SERENATA_ESSENTIAL_PRICE_MONTHLY_CLP : SERENATA_PRO_PRICE_MONTHLY_CLP;
    return Math.round(net * (1 + COMMISSION_VAT_BPS / 10_000));
}

/** @deprecated Usar `serenataPlanMonthlyChargeClp('pro')`. */
export function serenataProMonthlyChargeClp(): number {
    return serenataPlanMonthlyChargeClp('pro');
}

export type SerenataBillingPlanId = 'free' | 'essential' | 'pro';

export function commissionPercentFromBps(bps: number): number {
    return bps / 100;
}

export function appCommissionBpsForPlan(plan: SerenataBillingPlanId): number {
    return plan === 'pro' ? APP_COMMISSION_PRO_BPS : APP_COMMISSION_FREE_BPS;
}

export function planLabel(plan: SerenataBillingPlanId): string {
    if (plan === 'pro') return 'Pro';
    if (plan === 'essential') return 'Esencial';
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
