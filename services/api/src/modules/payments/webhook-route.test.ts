import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../mercadopago/service.js', () => ({
    verifyMercadoPagoWebhookSignature: vi.fn(() => 'unsigned' as const),
    getPaymentById: vi.fn().mockResolvedValue({
        status: 'approved',
        external_reference: 'order-webhook-1',
    }),
}));

import { createPaymentsRouter } from './router.js';
import type { PaymentsRouterDeps } from './router.js';
import { getPaymentById } from '../mercadopago/service.js';

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
});
