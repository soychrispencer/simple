import { describe, expect, it, vi } from 'vitest';
import { confirmPaymentFromProvider } from './confirm-from-provider.js';
import type { PaymentsRouterDeps } from './router.js';

function makeDeps(overrides: Partial<PaymentsRouterDeps> = {}): PaymentsRouterDeps {
    const order = {
        id: 'order-1',
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
        isMercadoPagoConfigured: vi.fn(),
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
        paymentOrderToResponse: (o: typeof order) => o,
        makePaymentOrderId: vi.fn(),
        paymentOrdersByUser,
        createCheckoutPreference: vi.fn(),
        createPreapproval: vi.fn(),
        getPaymentById: vi.fn().mockResolvedValue({ status: 'approved', external_reference: 'order-1' }),
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
        schemas: {
            createCheckoutSchema: {},
            confirmCheckoutSchema: {},
        },
        ...overrides,
    } as unknown as PaymentsRouterDeps;
}

describe('confirmPaymentFromProvider', () => {
    it('rechaza orden inexistente', async () => {
        const deps = makeDeps();
        const result = await confirmPaymentFromProvider(deps, {
            userId: 'user-1',
            orderId: 'missing',
            paymentReferenceId: 'mp-99',
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(404);
    });

    it('hidrata desde DB si la orden no está en el Map', async () => {
        const order = {
            id: 'order-db',
            userId: 'user-1',
            kind: 'boost' as const,
            status: 'pending',
            providerReferenceId: null as string | null,
            appliedAt: null as number | null,
            metadata: { kind: 'boost' as const },
            updatedAt: Date.now(),
        };
        const deps = makeDeps({
            paymentOrdersByUser: new Map(),
            loadPaymentOrderFromDb: vi.fn().mockResolvedValue(order),
            upsertPaymentOrder: vi.fn((o) => o),
        });

        const result = await confirmPaymentFromProvider(deps, {
            userId: 'user-1',
            orderId: 'order-db',
            paymentReferenceId: 'mp-2',
        });

        expect(deps.loadPaymentOrderFromDb).toHaveBeenCalledWith('order-db');
        expect(deps.upsertPaymentOrder).toHaveBeenCalled();
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(409);
    });

    it('es idempotente si el pago ya fue aplicado', async () => {
        const deps = makeDeps();
        const orders = deps.paymentOrdersByUser.get('user-1')!;
        orders[0] = {
            ...orders[0],
            providerReferenceId: 'mp-1',
            appliedAt: Date.now(),
            status: 'approved',
        };

        const result = await confirmPaymentFromProvider(deps, {
            userId: 'user-1',
            orderId: 'order-1',
            paymentReferenceId: 'mp-1',
        });

        expect(result.ok).toBe(true);
        expect(deps.getPaymentById).not.toHaveBeenCalled();
    });
});
