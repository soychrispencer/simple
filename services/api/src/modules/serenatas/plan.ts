import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscriptionPlans, subscriptions } from '../../db/schema.js';
import {
    APP_COMMISSION_FREE_BPS,
    APP_COMMISSION_PRO_BPS,
    COMMISSION_VAT_BPS,
    SERENATA_PRO_PRICE_MONTHLY_CLP,
    serenataProMonthlyChargeClp,
    appCommissionBpsForPlan,
    commissionPercentFromBps,
    exampleAppCommissionClp,
    planLabel,
    type SerenataBillingPlanId,
} from './plan-config.js';

export async function resolveActiveSerenataBillingPlan(userId: string): Promise<SerenataBillingPlanId> {
    const rows = await db
        .select({
            planSlug: subscriptionPlans.planId,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.vertical, 'serenatas')))
        .limit(1);

    const row = rows[0];
    if (!row) return 'free';

    const expired = row.expiresAt && row.expiresAt < new Date();
    const inactive = row.status === 'cancelled' || row.status === 'expired' || expired;
    if (inactive) return 'free';

    if (row.planSlug === 'pro') return 'pro';
    // Legacy: filas antiguas con slug enterprise se tratan como Pro hasta migrar.
    if (row.planSlug === 'enterprise') return 'pro';
    return 'free';
}

export type SerenataMePlanResponse = {
    plan: SerenataBillingPlanId;
    planLabel: string;
    alwaysFreeMonthly: true;
    ownerOwnSerenataCommissionPercent: 0;
    commissionAppBps: number;
    commissionAppPercent: number;
    commissionVatBps: number;
    commissionVatPercent: number;
    proPriceMonthly: number;
    /** Neto mensual antes de IVA (referencia en UI). */
    proPriceMonthlyNet: number;
    /** Total mensual cobrado en checkout MP (neto + IVA). */
    proPriceMonthlyWithVat: number;
    proCheckoutAvailable: boolean;
    exampleGrossClp: number;
    example: ReturnType<typeof exampleAppCommissionClp>;
    constants: {
        APP_COMMISSION_FREE_BPS: number;
        APP_COMMISSION_PRO_BPS: number;
        COMMISSION_VAT_BPS: number;
    };
};

export function buildSerenataMePlanResponse(
    plan: SerenataBillingPlanId,
    options: { proCheckoutAvailable: boolean; exampleGrossClp?: number },
): SerenataMePlanResponse {
    const commissionAppBps = appCommissionBpsForPlan(plan);
    const exampleGrossClp = options.exampleGrossClp ?? 100_000;
    return {
        plan,
        planLabel: planLabel(plan),
        alwaysFreeMonthly: true,
        ownerOwnSerenataCommissionPercent: 0,
        commissionAppBps,
        commissionAppPercent: commissionPercentFromBps(commissionAppBps),
        commissionVatBps: COMMISSION_VAT_BPS,
        commissionVatPercent: commissionPercentFromBps(COMMISSION_VAT_BPS),
        proPriceMonthly: SERENATA_PRO_PRICE_MONTHLY_CLP,
        proPriceMonthlyNet: SERENATA_PRO_PRICE_MONTHLY_CLP,
        proPriceMonthlyWithVat: serenataProMonthlyChargeClp(),
        proCheckoutAvailable: options.proCheckoutAvailable,
        exampleGrossClp,
        example: exampleAppCommissionClp(exampleGrossClp, plan),
        constants: {
            APP_COMMISSION_FREE_BPS,
            APP_COMMISSION_PRO_BPS,
            COMMISSION_VAT_BPS,
        },
    };
}
