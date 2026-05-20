/** Comisión Simple sobre serenatas originadas en la app (basis points). */
export const APP_COMMISSION_FREE_BPS = 1500;
export const APP_COMMISSION_PRO_BPS = 800;
export const COMMISSION_VAT_BPS = 1900;
export const SERENATA_PRO_PRICE_MONTHLY_CLP = 19_990;

/** Monto mensual cobrado en Mercado Pago (neto + IVA 19 %). */
export function serenataProMonthlyChargeClp(): number {
    return Math.round(SERENATA_PRO_PRICE_MONTHLY_CLP * (1 + COMMISSION_VAT_BPS / 10_000));
}

export type SerenataBillingPlanId = 'free' | 'pro';

export function commissionPercentFromBps(bps: number): number {
    return bps / 100;
}

export function appCommissionBpsForPlan(plan: SerenataBillingPlanId): number {
    return plan === 'pro' ? APP_COMMISSION_PRO_BPS : APP_COMMISSION_FREE_BPS;
}

export function planLabel(plan: SerenataBillingPlanId): string {
    return plan === 'pro' ? 'Pro' : 'Gratis';
}

/** Ejemplo informativo: comisión + IVA sobre un monto bruto en CLP. */
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
