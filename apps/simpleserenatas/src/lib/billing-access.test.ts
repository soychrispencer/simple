import { describe, expect, it } from 'vitest';
import { resolveSerenatasBillingAccess } from './billing-access';
import type { SerenataMePlan } from '@/lib/serenatas-api';

function basePlan(overrides: Partial<SerenataMePlan> = {}): SerenataMePlan {
    return {
        plan: 'free',
        planLabel: 'Prueba gratis',
        alwaysFreeMonthly: true,
        ownerOwnSerenataCommissionPercent: 0,
        commissionAppBps: 0,
        commissionAppPercent: 0,
        commissionVatBps: 0,
        commissionVatPercent: 0,
        proPriceMonthly: 19990,
        proPriceMonthlyNet: 19990,
        proPriceMonthlyWithVat: 23788,
        proCheckoutAvailable: true,
        trialDays: 30,
        trialEndsAt: '2099-12-31T00:00:00.000Z',
        trialActive: true,
        subscriptionRequired: false,
        profileVisibilityStatus: 'trial',
        exampleGrossClp: 100_000,
        example: { grossClp: 100_000, commissionClp: 0, vatOnCommissionClp: 0, totalDeductionClp: 0 },
        constants: { APP_COMMISSION_FREE_BPS: 0, APP_COMMISSION_PRO_BPS: 0, COMMISSION_VAT_BPS: 1900 },
        ...overrides,
    };
}

describe('resolveSerenatasBillingAccess', () => {
    it('marca Pro cuando el plan es pro', () => {
        const billing = resolveSerenatasBillingAccess(basePlan({ plan: 'pro', trialActive: false }));
        expect(billing.status).toBe('pro');
    });

    it('marca Pro cuando el perfil público está activo aunque plan venga free', () => {
        const billing = resolveSerenatasBillingAccess(basePlan({
            plan: 'free',
            trialActive: true,
            profileVisibilityStatus: 'active',
        }));
        expect(billing.status).toBe('pro');
    });

    it('limita días de prueba a la ventana comercial aunque trialEndsAt sea lejano', () => {
        const billing = resolveSerenatasBillingAccess(basePlan());
        expect(billing.status).toBe('trial');
        expect(billing.daysRemaining).toBeLessThanOrEqual(30);
        expect(billing.daysRemaining).toBeGreaterThan(0);
    });

    it('marca expirado cuando subscriptionRequired es true', () => {
        const billing = resolveSerenatasBillingAccess(basePlan({
            subscriptionRequired: true,
            trialActive: false,
        }));
        expect(billing.status).toBe('expired');
    });
});
