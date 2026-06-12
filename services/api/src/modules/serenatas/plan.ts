import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { subscriptionPlans, subscriptions } from '../../db/schema.js';
import {
    APP_COMMISSION_FREE_BPS,
    APP_COMMISSION_PRO_BPS,
    COMMISSION_VAT_BPS,
    SERENATA_ESSENTIAL_PRICE_MONTHLY_CLP,
    SERENATA_PRO_PRICE_MONTHLY_CLP,
    SERENATA_TRIAL_DAYS,
    serenataPlanMonthlyChargeClp,
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

    if (row.planSlug === 'essential') return 'essential';
    if (row.planSlug === 'pro') return 'pro';
    // Legacy: filas antiguas con slug enterprise se tratan como Pro hasta migrar.
    if (row.planSlug === 'enterprise') return 'pro';
    return 'free';
}

export type SerenataMePlanResponse = {
    plan: SerenataBillingPlanId;
    planLabel: string;
    /** @deprecated Legacy: el modelo actual es prueba gratis por tiempo limitado + Esencial/Pro. */
    alwaysFreeMonthly: true;
    /** @deprecated SimpleSerenatas no cobra comisión por serenata. */
    ownerOwnSerenataCommissionPercent: 0;
    /** @deprecated SimpleSerenatas no cobra comisión por serenata. */
    commissionAppBps: number;
    /** @deprecated SimpleSerenatas no cobra comisión por serenata. */
    commissionAppPercent: number;
    /** @deprecated Solo aplica a cálculos legacy de comisión, no al modelo comercial actual. */
    commissionVatBps: number;
    /** @deprecated Solo aplica a cálculos legacy de comisión, no al modelo comercial actual. */
    commissionVatPercent: number;
    essentialPriceMonthly: number;
    /** Neto mensual antes de IVA. */
    essentialPriceMonthlyNet: number;
    /** Total mensual cobrado en checkout (neto + IVA). */
    essentialPriceMonthlyWithVat: number;
    essentialCheckoutAvailable: boolean;
    proPriceMonthly: number;
    /** Neto mensual antes de IVA (referencia en UI). */
    proPriceMonthlyNet: number;
    /** Total mensual cobrado en checkout MP (neto + IVA). */
    proPriceMonthlyWithVat: number;
    proCheckoutAvailable: boolean;
    trialDays: number;
    trialEndsAt: string | null;
    trialActive: boolean;
    subscriptionRequired: boolean;
    profileVisibilityStatus: 'trial' | 'active' | 'paused';
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
    options: {
        proCheckoutAvailable: boolean;
        exampleGrossClp?: number;
        trialEndsAt?: Date | string | null;
    },
): SerenataMePlanResponse {
    const commissionAppBps = appCommissionBpsForPlan(plan);
    const exampleGrossClp = options.exampleGrossClp ?? 100_000;
    const trialEndsAt = options.trialEndsAt
        ? new Date(options.trialEndsAt)
        : null;
    const isPaidPlan = plan === 'essential' || plan === 'pro';
    const trialActive = !isPaidPlan && Boolean(trialEndsAt && trialEndsAt.getTime() >= Date.now());
    const subscriptionRequired = !isPaidPlan && Boolean(trialEndsAt && trialEndsAt.getTime() < Date.now());
    return {
        plan,
        planLabel: planLabel(plan),
        alwaysFreeMonthly: true,
        ownerOwnSerenataCommissionPercent: 0,
        commissionAppBps,
        commissionAppPercent: commissionPercentFromBps(commissionAppBps),
        commissionVatBps: COMMISSION_VAT_BPS,
        commissionVatPercent: commissionPercentFromBps(COMMISSION_VAT_BPS),
        essentialPriceMonthly: SERENATA_ESSENTIAL_PRICE_MONTHLY_CLP,
        essentialPriceMonthlyNet: SERENATA_ESSENTIAL_PRICE_MONTHLY_CLP,
        essentialPriceMonthlyWithVat: serenataPlanMonthlyChargeClp('essential'),
        essentialCheckoutAvailable: options.proCheckoutAvailable,
        proPriceMonthly: SERENATA_PRO_PRICE_MONTHLY_CLP,
        proPriceMonthlyNet: SERENATA_PRO_PRICE_MONTHLY_CLP,
        proPriceMonthlyWithVat: serenataProMonthlyChargeClp(),
        proCheckoutAvailable: options.proCheckoutAvailable,
        trialDays: SERENATA_TRIAL_DAYS,
        trialEndsAt: trialEndsAt && !Number.isNaN(trialEndsAt.getTime()) ? trialEndsAt.toISOString() : null,
        trialActive,
        subscriptionRequired,
        profileVisibilityStatus: isPaidPlan ? 'active' : subscriptionRequired ? 'paused' : 'trial',
        exampleGrossClp,
        example: exampleAppCommissionClp(exampleGrossClp, plan),
        constants: {
            APP_COMMISSION_FREE_BPS,
            APP_COMMISSION_PRO_BPS,
            COMMISSION_VAT_BPS,
        },
    };
}
