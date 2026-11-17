import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../mercadopago/service.js', () => ({
    verifyMercadoPagoWebhookSignature: vi.fn(() => 'unsigned' as const),
    getPaymentById: vi.fn().mockResolvedValue({
        status: 'approved',
        external_reference: 'order-webhook-1',
    }),
    getPreapprovalById: vi.fn(),
    updatePreapprovalRecurringAmount: vi.fn(),
}));
vi.mock('../subscriptions/persist-db.js', () => ({
    loadCurrentSubscriptionFromDb: vi.fn().mockResolvedValue(null),
    persistUserSubscription: vi.fn(),
}));

import { createPaymentsRouter } from './router.js';
import type { PaymentsRouterDeps } from './router.js';
import { getPaymentById, getPreapprovalById, updatePreapprovalRecurringAmount } from '../mercadopago/service.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';
import { createCheckoutSchema } from '../../lib/request-schemas.js';

function makeCatalogDeps(accountKind: 'individual' | 'independent' | 'company') {
    return makeDeps({
        authUser: vi.fn().mockResolvedValue({ id: 'user-1', role: 'user', residenceCountryCode: 'CL' }),
        parseVertical: vi.fn((vertical: string) => vertical),
        getSubscriptionPlans: vi.fn((vertical: keyof typeof SUBSCRIPTION_PLANS_BY_VERTICAL) => SUBSCRIPTION_PLANS_BY_VERTICAL[vertical]),
        getPrimaryAccountIdForUser: vi.fn().mockResolvedValue('account-1'),
        getMarketplaceAccountBillingContext: vi.fn().mockResolvedValue({
            accountId: 'account-1',
            accountName: 'Cuenta de prueba',
            isPersonal: accountKind !== 'company',
            accountKind,
            role: 'owner',
            memberCount: 1,
            canManageBilling: true,
        }),
        getMarketplaceEntitlements: vi.fn().mockResolvedValue(null),
        getCurrentSubscription: vi.fn().mockReturnValue(null),
        activeSubscriptionToResponse: (subscription: unknown) => subscription,
        getPaymentOrdersForUser: vi.fn().mockReturnValue([]),
        listPaymentOrdersForAccountFromDb: vi.fn().mockResolvedValue([]),
    });
}

function makeCheckoutDeps(accountKind: 'individual' | 'independent' | 'company', planId: 'pro' | 'enterprise') {
    return makeDeps({
        authUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.test', role: 'user', residenceCountryCode: 'CL' }),
        requireVerifiedSession: vi.fn(async (_context: unknown, next: () => Promise<void>) => next()),
        parseVertical: vi.fn((vertical: string) => vertical),
        getPrimaryAccountIdForUser: vi.fn().mockResolvedValue('account-1'),
        getAccountMembershipFromDb: vi.fn().mockResolvedValue({ accountId: 'account-1', role: 'owner' }),
        getMarketplaceAccountBillingContext: vi.fn().mockResolvedValue({
            accountId: 'account-1',
            accountName: 'Cuenta de prueba',
            isPersonal: accountKind !== 'company',
            accountKind,
            role: 'owner',
            memberCount: 1,
            canManageBilling: true,
        }),
        getPaidSubscriptionPlan: vi.fn((vertical: keyof typeof SUBSCRIPTION_PLANS_BY_VERTICAL) =>
            SUBSCRIPTION_PLANS_BY_VERTICAL[vertical].find((plan) => plan.id === planId) ?? null),
        getCurrentSubscription: vi.fn().mockReturnValue(null),
        schemas: { createCheckoutSchema, confirmCheckoutSchema: {} },
    });
}

function makeDeps(overrides: Partial<PaymentsRouterDeps> = {}): PaymentsRouterDeps {
    const order = {
        id: 'order-webhook-1',
        userId: 'user-1',
        kind: 'boost' as const,
        status: 'pending',
        providerReferenceId: null as string | null,
        appliedAt: null as number | null,
        metadata: { kind: 'boost' as const },
        updatedAt: Date.now(),
    };

    const paymentOrdersByUser = new Map<string, typeof order[]>([['user-1', [order]]]);

    return {
        authUser: vi.fn(),
        requireVerifiedSession: vi.fn(),
        parseVertical: vi.fn(),
        isAdminRole: vi.fn(),
        isMercadoPagoConfigured: () => true,
        getSubscriptionPlans: vi.fn(),
        getPaidSubscriptionPlan: vi.fn(),
        getCurrentSubscription: vi.fn(),
        activeSubscriptionToResponse: vi.fn(),
        upsertActiveSubscription: vi.fn(),
        makeSubscriptionId: vi.fn(),
        activeSubscriptionsByUser: new Map(),
        getPaymentOrdersForUser: vi.fn(),
        upsertPaymentOrder: vi.fn(),
        updatePaymentOrder: vi.fn((_userId, orderId, updater) => {
            const current = paymentOrdersByUser.get('user-1')?.find((o) => o.id === orderId);
            if (!current) return undefined;
            const next = updater(current);
            paymentOrdersByUser.set('user-1', [next]);
            return next;
        }),
        paymentOrderToResponse: (o) => o,
        makePaymentOrderId: vi.fn(),
        paymentOrdersByUser,
        findPaymentOrderByIdFromDb: vi.fn().mockResolvedValue(null),
        createCheckoutPreference: vi.fn(),
        createPreapproval: vi.fn(),
        getPaymentById: vi.fn(),
        getPreapprovalById: vi.fn(),
        parseMercadoPagoPaymentStatus: (status: string) => (status === 'approved' ? 'approved' : 'pending'),
        parseMercadoPagoPreapprovalStatus: vi.fn(),
        resolveMercadoPagoReturnUrl: vi.fn(),
        ensureMercadoPagoSubscriptionReturnUrl: vi.fn(),
        appendCheckoutParams: vi.fn(),
        getBoostListingById: vi.fn(),
        getBoostOrdersForUser: vi.fn(),
        getBoostPlans: vi.fn(),
        parseBoostSection: vi.fn(),
        isBoostSectionAllowed: vi.fn(),
        createBoostOrderRecord: vi.fn(),
        countReservedSlots: vi.fn(),
        sectionLabel: vi.fn(),
        MAX_BOOST_SLOTS_PER_SECTION: 3,
        getAdCampaignRecordForUser: vi.fn(),
        getAdvertisingPrice: vi.fn(),
        getAdPaymentStatusFromOrderStatus: vi.fn(),
        normalizeAdCampaigns: vi.fn(),
        mapAdCampaignRow: vi.fn(),
        adCampaignToResponse: vi.fn(),
        AD_FORMAT_LABELS: {},
        db: {},
        tables: { adCampaigns: {} },
        dbHelpers: { eq: vi.fn(), and: vi.fn() },
        listAdminUsersSnapshot: vi.fn(),
        dbQuery: vi.fn(),
        dbSql: vi.fn(),
        tables2: { agendaProfessionalProfiles: {} },
        schemas: { createCheckoutSchema: {}, confirmCheckoutSchema: {} },
        processedMercadoPagoWebhookPaymentIds: new Set<string>(),
        ...overrides,
    } as PaymentsRouterDeps;
}

describe('POST /payments/mercadopago/webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
        process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED = 'true';
    });

    it('acepta pago aprobado y consulta MP por id', async () => {
        const deps = makeDeps();
        const app = new Hono();
        app.route('/api', createPaymentsRouter(deps));

        const response = await app.request('/api/payments/mercadopago/webhook?topic=payment&id=mp-pay-99', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: 'payment', data: { id: 'mp-pay-99' } }),
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json).toMatchObject({ ok: true });
        expect(getPaymentById).toHaveBeenCalledWith('mp-pay-99');
    });

    it('ignora un pago de suscripción sin una orden local conocida', async () => {
        vi.mocked(getPaymentById).mockResolvedValueOnce({
            status: 'approved',
            external_reference: 'order-not-found',
            preapproval_id: 'agenda-sub-1',
        });

        const app = new Hono();
        app.route('/api', createPaymentsRouter(makeDeps()));
        const response = await app.request('/api/payments/mercadopago/webhook?topic=payment&id=mp-pay-promo', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: 'payment', data: { id: 'mp-pay-promo' } }),
        });

        expect(response.status).toBe(200);
        expect(updatePreapprovalRecurringAmount).not.toHaveBeenCalled();
        expect(getPreapprovalById).not.toHaveBeenCalled();
    });
});

describe('GET /subscriptions/catalog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        { accountKind: 'individual' as const, paidPlanIds: [] },
        { accountKind: 'independent' as const, paidPlanIds: ['pro'] },
        { accountKind: 'company' as const, paidPlanIds: ['pro', 'enterprise'] },
    ])('returns only the $accountKind offer for the active account', async ({ accountKind, paidPlanIds }) => {
        const app = new Hono();
        app.route('/api', createPaymentsRouter(makeCatalogDeps(accountKind)));

        const response = await app.request('/api/subscriptions/catalog?vertical=propiedades');
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.accountContext).toMatchObject({ accountId: 'account-1', accountKind });
        expect(json.freePlan.id).toBe('free');
        expect(json.plans.map((plan: { id: string }) => plan.id)).toEqual(paidPlanIds);
    });
});

describe('POST /payments/checkout marketplace segment rules', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
        process.env.MARKETPLACE_LAUNCH_MODE = 'false';
    });

    it.each([
        { accountKind: 'individual' as const, planId: 'pro' as const },
        { accountKind: 'independent' as const, planId: 'enterprise' as const },
    ])('rejects $planId checkout for $accountKind before contacting Mercado Pago', async ({ accountKind, planId }) => {
        const deps = makeCheckoutDeps(accountKind, planId);
        const app = new Hono();
        app.route('/api', createPaymentsRouter(deps));

        const response = await app.request('/api/payments/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                kind: 'subscription',
                vertical: 'propiedades',
                planId,
                returnUrl: 'http://localhost:3003/panel',
            }),
        });

        expect(response.status).toBe(403);
        expect(deps.createPreapproval).not.toHaveBeenCalled();
        expect(deps.createCheckoutPreference).not.toHaveBeenCalled();
    });
});
