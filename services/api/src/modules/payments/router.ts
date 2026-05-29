import { Hono } from 'hono';
import {
    buildMercadoPagoCheckoutBackUrls,
    isDevMercadoPagoPreapprovalId,
    mercadoPagoDevCheckoutFallbackEnabled,
    resolveMercadoPagoPreferenceCheckoutUrl,
} from '../mercadopago/checkout-helpers.js';
import { getPaymentById, getPreapprovalById, verifyMercadoPagoWebhookSignature } from '../mercadopago/service.js';
import {
    createFintocCheckoutSession,
    extractFintocEventData,
    getFintocCheckoutSession,
    isFintocConfigured,
    parseFintocPaymentStatus,
    parseFintocSubscriptionStatus,
    resolvePaymentsProvider,
    verifyFintocWebhookSignature,
} from '../fintoc/service.js';
import { serenataProMonthlyChargeClp } from '../serenatas/plan-config.js';
import { loadCurrentSubscriptionFromDb } from '../subscriptions/persist-db.js';
import { confirmPaymentFromProvider, findPaymentOrderByExternalReference } from './confirm-from-provider.js';
import { confirmSubscriptionFromPreapproval } from './confirm-subscription.js';
import { listUserPaymentOrdersMerged } from './list-user-orders.js';

export type PaymentsRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    requireVerifiedSession: (c: any, next: () => Promise<void>) => Promise<Response | void>;
    parseVertical: (v: any) => any;
    isAdminRole: (role: any) => boolean;
    isMercadoPagoConfigured: () => boolean;
    // Subscription helpers
    getSubscriptionPlans: (vertical: any) => any[];
    getPaidSubscriptionPlan: (vertical: any, planId: any) => any | null;
    getCurrentSubscription: (userId: string, vertical: any) => any | null;
    getActiveSubscriptionsForUser?: (userId: string, vertical: any) => any[];
    activeSubscriptionToResponse: (sub: any | null) => any;
    upsertActiveSubscription: (sub: any) => any;
    makeSubscriptionId: (vertical: any, planId: any) => string;
    activeSubscriptionsByUser: Map<string, any[]>;
    // Payment order helpers
    getPaymentOrdersForUser: (userId: string, opts?: any) => any[];
    upsertPaymentOrder: (order: any) => any;
    updatePaymentOrder: (userId: string, orderId: string, updater: (o: any) => any) => Promise<any>;
    listPaymentOrdersForUserFromDb?: (
        userId: string,
        options?: { vertical?: string; kind?: string; limit?: number },
    ) => Promise<any[]>;
    paymentOrderToResponse: (order: any) => any;
    makePaymentOrderId: (kind: any) => string;
    paymentOrdersByUser: Map<string, any[]>;
    /** Fallback DB cuando la orden no está en el Map (p. ej. tras reinicio de proceso). */
    findPaymentOrderByIdFromDb?: (orderId: string) => Promise<{ userId: string; order: { id: string; userId: string } } | null>;
    /** Hidrata orden completa desde PostgreSQL e inserta en el Map. */
    loadPaymentOrderFromDb?: (orderId: string) => Promise<Record<string, unknown> | null>;
    // MercadoPago
    createCheckoutPreference: (input: any) => Promise<any>;
    createPreapproval: (input: any) => Promise<any>;
    getPaymentById: (id: string) => Promise<any>;
    getPreapprovalById: (id: string) => Promise<any>;
    parseMercadoPagoPaymentStatus: (status: string) => any;
    parseMercadoPagoPreapprovalStatus: (status: string) => any;
    resolveMercadoPagoReturnUrl: (vertical: any, rawUrl: string) => string;
    ensureMercadoPagoSubscriptionReturnUrl: (vertical: any, rawUrl: string) => string;
    appendCheckoutParams: (url: string, params: Record<string, string>) => string;
    // Boost helpers (used in checkout/confirm)
    getBoostListingById: (vertical: any, listingId: string) => any | null;
    getBoostOrdersForUser: (userId: string) => any[];
    getBoostPlans: (vertical: any, section: any) => any[];
    parseBoostSection: (raw: any, vertical: any) => any;
    isBoostSectionAllowed: (vertical: any, section: any) => boolean;
    createBoostOrderRecord: (input: any) => { ok: boolean; order?: any; error?: string };
    countReservedSlots: (vertical: any, section: any) => number;
    sectionLabel: (section: any) => string;
    MAX_BOOST_SLOTS_PER_SECTION: number;
    // Advertising helpers
    getAdCampaignRecordForUser: (userId: string, id: string) => Promise<any | null>;
    getAdvertisingPrice: (vertical: any, format: any, durationDays: any) => number;
    getAdPaymentStatusFromOrderStatus: (status: any) => any;
    normalizeAdCampaigns: (items: any[]) => any[];
    mapAdCampaignRow: (row: any) => any;
    adCampaignToResponse: (record: any) => any;
    AD_FORMAT_LABELS: Record<string, string>;
    db: any;
    tables: { adCampaigns: any };
    dbHelpers: { eq: any; and: any };
    // Admin
    listAdminUsersSnapshot: () => Promise<any[]>;
    // DB helpers for agenda subscriptions
    dbQuery: any;
    dbSql: any;
    tables2: { agendaProfessionalProfiles: any };
    schemas: {
        createCheckoutSchema: any;
        confirmCheckoutSchema: any;
    };
    serenataPayments?: {
        getTarget: (userId: string, serenataId: string) => Promise<any | null>;
        attachOrder: (userId: string, serenataId: string, orderId: string) => Promise<any | null>;
        applyPaid: (userId: string, serenataId: string, orderId: string) => Promise<{ item: any; offersCount: number } | null>;
        markFailed: (userId: string, serenataId: string) => Promise<any | null>;
    };
    /** IDs de pago MP ya procesados por webhook (idempotencia en proceso). */
    processedMercadoPagoWebhookPaymentIds?: Set<string>;
    processedMercadoPagoWebhookPreapprovalIds?: Set<string>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    cancelActiveSubscriptionForUser?: (userId: string, vertical: any) => void;
};

export function createPaymentsRouter(deps: PaymentsRouterDeps) {
    const app = new Hono();

    function fintocPaymentMethodTypes(): Array<'bank_transfer' | 'card'> | undefined {
        const raw = (process.env.FINTOC_PAYMENT_METHOD_TYPES ?? '').trim();
        if (!raw) return undefined;
        const methods = raw.split(',').map((item) => item.trim()).filter(Boolean);
        return methods.filter((item): item is 'bank_transfer' | 'card' => item === 'bank_transfer' || item === 'card');
    }

    async function createHostedCheckout(input: {
        provider: 'fintoc' | 'mercadopago';
        orderId: string;
        title: string;
        description?: string;
        amount: number;
        currency: string;
        user: { email?: string | null; name?: string | null };
        successUrl: string;
        failureUrl: string;
        pendingUrl?: string;
        metadata: Record<string, unknown>;
        subscription?: boolean;
    }): Promise<{
        provider: 'fintoc' | 'mercadopago';
        providerOrderId: string | null;
        providerReferenceId: string | null;
        providerStatus: string;
        checkoutUrl: string | null;
    }> {
        if (input.provider === 'fintoc') {
            if (!isFintocConfigured()) {
                throw new Error('Fintoc no está configurado. Falta FINTOC_SECRET_KEY.');
            }
            const session = await createFintocCheckoutSession({
                externalReference: input.orderId,
                flow: input.subscription ? 'subscription' : 'payment',
                amount: input.amount,
                currency: input.currency,
                customerEmail: input.user.email ?? '',
                successUrl: input.successUrl,
                cancelUrl: input.failureUrl,
                metadata: {
                    ...input.metadata,
                    title: input.title,
                    description: input.description ?? input.title,
                },
                paymentMethodTypes: fintocPaymentMethodTypes(),
            });
            return {
                provider: 'fintoc',
                providerOrderId: session.id,
                providerReferenceId: session.id,
                providerStatus: session.status ?? 'created',
                checkoutUrl: session.redirectUrl,
            };
        }

        const preference = await deps.createCheckoutPreference({
            externalReference: input.orderId,
            title: input.title,
            description: input.description,
            amount: input.amount,
            currencyId: input.currency,
            payerEmail: input.user.email ?? '',
            payerName: input.user.name ?? '',
            backUrls: {
                success: input.successUrl,
                failure: input.failureUrl,
                pending: input.pendingUrl ?? input.successUrl,
            },
            metadata: input.metadata,
        });
        return {
            provider: 'mercadopago',
            providerOrderId: preference.id,
            providerReferenceId: null,
            providerStatus: 'created',
            checkoutUrl: resolveMercadoPagoPreferenceCheckoutUrl(preference),
        };
    }

    function orderProvider(order: { metadata?: unknown }): 'fintoc' | 'mercadopago' {
        const metadata = order.metadata && typeof order.metadata === 'object'
            ? order.metadata as Record<string, unknown>
            : {};
        return metadata.provider === 'fintoc' ? 'fintoc' : 'mercadopago';
    }

    function subscriptionConfirmDeps(provider: 'fintoc' | 'mercadopago') {
        return {
            getPaidSubscriptionPlan: deps.getPaidSubscriptionPlan,
            upsertActiveSubscription: deps.upsertActiveSubscription,
            makeSubscriptionId: deps.makeSubscriptionId,
            updatePaymentOrder: deps.updatePaymentOrder,
            getPrimaryAccountIdForUser: deps.getPrimaryAccountIdForUser,
            parseMercadoPagoPreapprovalStatus: provider === 'fintoc'
                ? parseFintocSubscriptionStatus
                : deps.parseMercadoPagoPreapprovalStatus,
            cancelActiveSubscriptionForUser: deps.cancelActiveSubscriptionForUser,
        };
    }

    async function locatePaymentOrder(orderId: string) {
        let located = findPaymentOrderByExternalReference(deps.paymentOrdersByUser, orderId);
        if (!located && deps.loadPaymentOrderFromDb) {
            const hydrated = await deps.loadPaymentOrderFromDb(orderId);
            if (hydrated) {
                deps.upsertPaymentOrder(hydrated);
                located = {
                    userId: String(hydrated.userId),
                    order: { id: String(hydrated.id), userId: String(hydrated.userId) },
                };
            }
        } else if (!located && deps.findPaymentOrderByIdFromDb) {
            located = await deps.findPaymentOrderByIdFromDb(orderId);
            if (located && deps.loadPaymentOrderFromDb) {
                const hydrated = await deps.loadPaymentOrderFromDb(orderId);
                if (hydrated) deps.upsertPaymentOrder(hydrated);
            }
        }
        return located;
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    app.get('/subscriptions/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const rawVertical = c.req.query('vertical');
        const vertical = rawVertical === 'serenatas' ? 'serenatas' : deps.parseVertical(rawVertical);
        const plans = deps.getSubscriptionPlans(vertical);
        const freePlan = plans.find((plan: any) => plan.id === 'free') ?? null;
        const orders = deps.getPaymentOrdersForUser(user.id, { vertical, kind: 'subscription' }).map((order: any) => deps.paymentOrderToResponse(order));

        let currentSubscription: any = null;

        if (vertical === 'agenda') {
            try {
                const profile = await deps.dbQuery.agendaProfessionalProfiles.findFirst({
                    where: deps.dbHelpers.eq(deps.tables2.agendaProfessionalProfiles.userId, user.id),
                });
                if (profile && profile.plan !== 'free') {
                    const isExpired = profile.plan === 'pro' && profile.planExpiresAt && profile.planExpiresAt < new Date();
                    if (!isExpired) {
                        const matchedPlan = plans.find((p: any) => p.id === profile.plan);
                        currentSubscription = {
                            id: `agenda-${profile.id}`,
                            accountId: profile.accountId ?? null,
                            vertical: 'agenda' as const,
                            planId: profile.plan,
                            planName: matchedPlan?.name ?? profile.plan,
                            priceMonthly: matchedPlan?.priceMonthly ?? 0,
                            currency: 'CLP',
                            features: matchedPlan?.features ?? [],
                            status: 'active' as const,
                            providerStatus: 'manual',
                            startedAt: profile.createdAt.getTime(),
                            updatedAt: profile.updatedAt.getTime(),
                        };
                    }
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] agenda DB error:', dbErr);
                return c.json({ ok: false, error: 'Error al consultar el perfil de agenda. Verifica que las migraciones estén aplicadas.' }, 500);
            }
        } else {
            try {
                const dbSub = await loadCurrentSubscriptionFromDb(user.id, vertical);
                if (dbSub) {
                    currentSubscription = {
                        id: dbSub.id,
                        accountId: dbSub.accountId,
                        vertical: dbSub.vertical,
                        planId: dbSub.planSlug,
                        planName: dbSub.planName,
                        priceMonthly: dbSub.priceMonthly,
                        currency: dbSub.currency,
                        features: dbSub.features,
                        status: 'active' as const,
                        providerStatus: dbSub.providerStatus ?? 'authorized',
                        startedAt: dbSub.startedAt.getTime(),
                        updatedAt: dbSub.updatedAt.getTime(),
                    };
                } else {
                    currentSubscription = deps.activeSubscriptionToResponse(
                        deps.getCurrentSubscription(user.id, vertical),
                    );
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] DB error for', vertical, ':', dbErr);
                currentSubscription = deps.activeSubscriptionToResponse(deps.getCurrentSubscription(user.id, vertical));
            }
        }

        return c.json({
            ok: true,
            vertical,
            paymentProvider: resolvePaymentsProvider(),
            mercadoPagoEnabled: deps.isMercadoPagoConfigured(),
            fintocEnabled: isFintocConfigured(),
            plans,
            freePlan,
            currentSubscription,
            orders,
        });
    });

    app.get('/subscriptions/admin/all', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const verticalFilter = c.req.query('vertical');
        const statusFilter = c.req.query('status');

        const allUsers = await deps.listAdminUsersSnapshot();
        const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

        const results: any[] = [];

        for (const [userId, subs] of deps.activeSubscriptionsByUser.entries()) {
            const u = userMap.get(userId);
            for (const sub of subs) {
                if (verticalFilter && sub.vertical !== verticalFilter) continue;
                if (statusFilter && sub.status !== statusFilter) continue;
                const plan = deps.getSubscriptionPlans(sub.vertical).find((p: any) => p.id === sub.planId);
                results.push({
                    id: sub.id,
                    userId,
                    userName: u?.name ?? 'Usuario',
                    userEmail: u?.email ?? '',
                    vertical: sub.vertical,
                    planId: sub.planId,
                    planName: plan?.name ?? sub.planId,
                    status: sub.status,
                    providerStatus: sub.providerStatus ?? null,
                    startedAt: new Date(sub.startedAt).toISOString(),
                    expiresAt: null,
                    cancelledAt: null,
                });
            }
        }

        results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        return c.json({ ok: true, subscriptions: results, total: results.length });
    });

    // ── Payments ──────────────────────────────────────────────────────────────

    app.get('/payments/orders', deps.requireVerifiedSession, async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = c.req.query('vertical')?.trim() || undefined;
        const kind = c.req.query('kind')?.trim() || undefined;
        const limitRaw = Number(c.req.query('limit') ?? '50');
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

        const orders = await listUserPaymentOrdersMerged(deps, user.id, { vertical, kind, limit });

        return c.json({
            ok: true,
            orders: orders.map((order: any) => deps.paymentOrderToResponse(order)),
        });
    });

    app.get('/payments/orders/:orderId', deps.requireVerifiedSession, async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const orderId = c.req.param('orderId')?.trim();
        if (!orderId) return c.json({ ok: false, error: 'Orden inválida' }, 400);

        let order = deps.getPaymentOrdersForUser(user.id).find((item: any) => item.id === orderId);
        if (!order && deps.loadPaymentOrderFromDb) {
            const loaded = await deps.loadPaymentOrderFromDb(orderId);
            if (loaded && loaded.userId === user.id) {
                order = deps.upsertPaymentOrder(loaded);
            }
        }
        if (!order) {
            return c.json({ ok: false, error: 'Orden no encontrada' }, 404);
        }

        return c.json({ ok: true, status: order.status, order: deps.paymentOrderToResponse(order) });
    });

    app.post('/payments/checkout', deps.requireVerifiedSession, async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createCheckoutSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
        const checkoutData = parsed.data;
        const paymentsProvider = resolvePaymentsProvider();
        const mercadoPagoConfigured = deps.isMercadoPagoConfigured();
        const fintocConfigured = isFintocConfigured();
        const allowDevCheckoutFallback =
            process.env.NODE_ENV !== 'production' && process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK !== 'false';
        if (paymentsProvider === 'fintoc' && !fintocConfigured) {
            return c.json({ ok: false, error: 'Fintoc no está configurado en el backend.' }, 503);
        }
        if (paymentsProvider === 'mercadopago' && !mercadoPagoConfigured && !(allowDevCheckoutFallback && checkoutData.kind === 'serenata_booking')) {
            return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
        }

        try {
            if (checkoutData.kind === 'serenata_booking') {
                if (!deps.serenataPayments) {
                    return c.json({ ok: false, error: 'Pagos de serenatas no disponibles.' }, 503);
                }
                const target = await deps.serenataPayments.getTarget(user.id, checkoutData.serenata.serenataId);
                if (!target) return c.json({ ok: false, error: 'Serenata no encontrada.' }, 404);
                if (target.status !== 'payment_pending') {
                    return c.json({ ok: false, error: 'Esta serenata no está pendiente de pago.' }, 409);
                }
                if (target.paymentStatus === 'paid') {
                    return c.json({ ok: false, error: 'Esta serenata ya fue pagada.' }, 409);
                }
                if (target.price == null || Number(target.price) <= 0) {
                    return c.json({ ok: false, error: 'Esta serenata no tiene un precio válido.' }, 409);
                }
                const vertical = 'serenatas';
                const returnUrl = deps.resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
                const orderId = deps.makePaymentOrderId('serenata_booking');
                const backUrls = buildMercadoPagoCheckoutBackUrls(
                    deps.appendCheckoutParams,
                    returnUrl,
                    orderId,
                    'serenata_booking',
                );
                let checkout: Awaited<ReturnType<typeof createHostedCheckout>> | null = null;
                let checkoutUrl: string | null = null;
                try {
                    if (paymentsProvider === 'mercadopago' && !mercadoPagoConfigured) {
                        throw new Error('Mercado Pago no está configurado en el backend.');
                    }
                    checkout = await createHostedCheckout({
                        provider: paymentsProvider,
                        orderId,
                        title: target.eventType ?? 'Serenata SimpleSerenatas',
                        description: `${target.recipientName} · ${new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(target.eventDate)}`,
                        amount: Number(target.price),
                        currency: 'CLP',
                        user,
                        successUrl: backUrls.success,
                        failureUrl: backUrls.failure,
                        pendingUrl: backUrls.pending,
                        metadata: { kind: 'serenata_booking', vertical, serenataId: target.id },
                    });
                    checkoutUrl = checkout.checkoutUrl;
                } catch (error) {
                    if (paymentsProvider === 'fintoc' || process.env.NODE_ENV === 'production' || process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK === 'false') {
                        throw error;
                    }
                    const fallback = new URL(backUrls.success);
                    fallback.searchParams.set('payment_id', 'dev-approved');
                    checkoutUrl = fallback.toString();
                }

                await deps.serenataPayments.attachOrder(user.id, target.id, orderId);
                const order = deps.upsertPaymentOrder({
                    id: orderId,
                    userId: user.id,
                    vertical,
                    kind: 'serenata_booking',
                    title: target.eventType ?? 'Serenata SimpleSerenatas',
                    amount: Number(target.price ?? 0),
                    currency: 'CLP',
                    status: 'pending',
                    providerStatus: checkout?.providerStatus ?? 'dev_fallback',
                    providerReferenceId: checkout?.providerReferenceId ?? null,
                    preferenceId: checkout?.provider === 'mercadopago' ? checkout.providerOrderId : null,
                    checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'serenata_booking', serenataId: target.id, recipientName: target.recipientName, provider: checkout?.provider ?? 'mercadopago' },
                });

                return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
            }

            if (checkoutData.kind === 'boost') {
                const vertical = checkoutData.vertical;
                const boostInput = checkoutData.boost;
                const returnUrl = deps.resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
                const listing = deps.getBoostListingById(vertical, boostInput.listingId);
                if (!listing) {
                    return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
                }
                if (listing.ownerId !== user.id && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
                }

                const section = boostInput.section
                    ? deps.parseBoostSection(boostInput.section, vertical)
                    : listing.section;
                if (!deps.isBoostSectionAllowed(vertical, section)) {
                    return c.json({ ok: false, error: 'Sección inválida para esta vertical' }, 400);
                }

                const plan = deps.getBoostPlans(vertical, section).find((item: any) => item.id === boostInput.planId);
                if (!plan) {
                    return c.json({ ok: false, error: 'Plan no disponible' }, 400);
                }

                const existingBoost = deps.getBoostOrdersForUser(user.id).some((order: any) => {
                    if (order.vertical !== vertical || order.listingId !== listing.id) return false;
                    return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
                });
                if (existingBoost && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'Ya tienes un boost vigente para esta publicación' }, 409);
                }

                if (deps.countReservedSlots(vertical, section) >= deps.MAX_BOOST_SLOTS_PER_SECTION && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'No quedan cupos en esta sección para el periodo seleccionado' }, 409);
                }

                const orderId = deps.makePaymentOrderId('boost');
                const backUrls = buildMercadoPagoCheckoutBackUrls(deps.appendCheckoutParams, returnUrl, orderId, 'boost');
                const checkout = await createHostedCheckout({
                    provider: paymentsProvider,
                    orderId,
                    title: `Boost ${plan.name} · ${listing.title}`,
                    description: `${deps.sectionLabel(section)} por ${plan.days} días`,
                    amount: plan.price,
                    currency: 'CLP',
                    user,
                    successUrl: backUrls.success,
                    failureUrl: backUrls.failure,
                    pendingUrl: backUrls.pending,
                    metadata: { kind: 'boost', vertical, listingId: listing.id, section, planId: plan.id },
                });

                const order = deps.upsertPaymentOrder({
                    id: orderId,
                    userId: user.id,
                    vertical,
                    kind: 'boost',
                    title: `Boost ${plan.name} · ${listing.title}`,
                    amount: plan.price,
                    currency: 'CLP',
                    status: 'pending',
                    providerStatus: checkout.providerStatus,
                    providerReferenceId: checkout.providerReferenceId,
                    preferenceId: checkout.provider === 'mercadopago' ? checkout.providerOrderId : null,
                    checkoutUrl: checkout.checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'boost', listingId: listing.id, section, planId: plan.id, listingTitle: listing.title, provider: checkout.provider },
                });

                return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
            }

            if (checkoutData.kind === 'advertising') {
                const vertical = checkoutData.vertical;
                const advertisingInput = checkoutData.advertising;
                const campaign = await deps.getAdCampaignRecordForUser(user.id, advertisingInput.campaignId);
                if (!campaign || campaign.vertical !== vertical) {
                    return c.json({ ok: false, error: 'La campaña no existe o no pertenece a tu cuenta.' }, 404);
                }
                if (campaign.paymentStatus === 'paid') {
                    return c.json({ ok: false, error: 'Esa campaña ya fue pagada.' }, 409);
                }
                const returnUrl = deps.resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
                const amount = deps.getAdvertisingPrice(vertical, campaign.format, campaign.durationDays);
                const orderId = deps.makePaymentOrderId('advertising');
                const backUrls = buildMercadoPagoCheckoutBackUrls(deps.appendCheckoutParams, returnUrl, orderId, 'advertising');
                const checkout = await createHostedCheckout({
                    provider: paymentsProvider,
                    orderId,
                    title: `Publicidad ${deps.AD_FORMAT_LABELS[campaign.format]} · ${campaign.name}`,
                    description: `${campaign.durationDays} días`,
                    amount,
                    currency: 'CLP',
                    user,
                    successUrl: backUrls.success,
                    failureUrl: backUrls.failure,
                    pendingUrl: backUrls.pending,
                    metadata: { kind: 'advertising', vertical, campaignId: campaign.id, format: campaign.format, durationDays: campaign.durationDays },
                });

                await deps.db.update(deps.tables.adCampaigns).set({
                    paymentStatus: 'pending',
                    updatedAt: new Date(),
                }).where(deps.dbHelpers.eq(deps.tables.adCampaigns.id, campaign.id));

                const order = deps.upsertPaymentOrder({
                    id: orderId,
                    userId: user.id,
                    vertical,
                    kind: 'advertising',
                    title: `Publicidad ${deps.AD_FORMAT_LABELS[campaign.format]} · ${campaign.name}`,
                    amount,
                    currency: 'CLP',
                    status: 'pending',
                    providerStatus: checkout.providerStatus,
                    providerReferenceId: checkout.providerReferenceId,
                    preferenceId: checkout.provider === 'mercadopago' ? checkout.providerOrderId : null,
                    checkoutUrl: checkout.checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'advertising', campaignId: campaign.id, format: campaign.format, durationDays: campaign.durationDays, campaignName: campaign.name, provider: checkout.provider },
                });

                return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
            }

            const vertical = checkoutData.vertical;
            const resolvedPlanId = checkoutData.planId ?? checkoutData.subscription?.planId;
            if (!resolvedPlanId) {
                return c.json({ ok: false, error: 'planId es requerido' }, 400);
            }
            const returnUrl = deps.ensureMercadoPagoSubscriptionReturnUrl(vertical, checkoutData.returnUrl);
            const plan = deps.getPaidSubscriptionPlan(vertical, resolvedPlanId);
            if (!plan) {
                return c.json({ ok: false, error: 'Plan no disponible' }, 400);
            }
            let subscriptionAlreadyActive = false;
            try {
                const dbSub = await loadCurrentSubscriptionFromDb(user.id, vertical);
                if (dbSub && dbSub.planSlug === plan.id) {
                    subscriptionAlreadyActive = true;
                } else {
                    const memorySub = deps.getCurrentSubscription(user.id, vertical);
                    if (
                        memorySub?.status === 'active'
                        && memorySub.planId === plan.id
                        && deps.cancelActiveSubscriptionForUser
                    ) {
                        deps.cancelActiveSubscriptionForUser(user.id, vertical);
                    }
                }
            } catch (dbErr) {
                console.error('[payments/checkout] subscription DB lookup failed:', dbErr);
            }
            if (subscriptionAlreadyActive) {
                return c.json({ ok: false, error: 'Ese plan ya está activo en tu cuenta.' }, 409);
            }

            const orderId = deps.makePaymentOrderId('subscription');
            const subscriptionChargeAmount =
                vertical === 'serenatas' && plan.id === 'pro'
                    ? serenataProMonthlyChargeClp()
                    : plan.priceMonthly;
            const subscriptionBackUrl = deps.appendCheckoutParams(returnUrl, {
                checkout: 'return',
                purchaseId: orderId,
                kind: 'subscription',
            });
            const subscriptionReason = `Suscripción ${plan.name} · ${vertical === 'autos' ? 'SimpleAutos' : vertical === 'propiedades' ? 'SimplePropiedades' : vertical === 'serenatas' ? 'SimpleSerenatas' : 'SimpleAgenda'}`;

            let providerReferenceId: string;
            let checkoutUrl: string | null;
            let providerStatus: string;
            let orderStatus: 'authorized' | 'pending';
            let orderProvider: 'fintoc' | 'mercadopago';

            try {
                if (paymentsProvider === 'fintoc') {
                    const checkout = await createHostedCheckout({
                        provider: 'fintoc',
                        orderId,
                        title: subscriptionReason,
                        amount: subscriptionChargeAmount,
                        currency: plan.currency,
                        user,
                        successUrl: subscriptionBackUrl,
                        failureUrl: subscriptionBackUrl,
                        metadata: {
                            kind: 'subscription',
                            vertical,
                            planId: plan.id,
                            planName: plan.name,
                            chargeAmountClp: subscriptionChargeAmount,
                        },
                        subscription: true,
                    });
                    providerReferenceId = checkout.providerReferenceId ?? orderId;
                    checkoutUrl = checkout.checkoutUrl;
                    providerStatus = checkout.providerStatus;
                    orderStatus = parseFintocSubscriptionStatus(providerStatus) === 'authorized' ? 'authorized' : 'pending';
                    orderProvider = 'fintoc';
                } else {
                    const preapproval = await deps.createPreapproval({
                        externalReference: orderId,
                        reason: subscriptionReason,
                        amount: subscriptionChargeAmount,
                        currencyId: plan.currency,
                        payerEmail: user.email,
                        backUrl: subscriptionBackUrl,
                    });
                    providerReferenceId = preapproval.id;
                    checkoutUrl = preapproval.initPoint;
                    providerStatus = preapproval.status ?? 'pending';
                    orderStatus = preapproval.status === 'authorized' ? 'authorized' : 'pending';
                    orderProvider = 'mercadopago';
                }
            } catch (error) {
                if (paymentsProvider === 'fintoc') {
                    throw error;
                }
                if (process.env.NODE_ENV === 'production' || !mercadoPagoDevCheckoutFallbackEnabled()) {
                    throw error;
                }
                providerReferenceId = `dev-preapproval-${orderId}`;
                checkoutUrl = subscriptionBackUrl;
                providerStatus = 'dev_fallback';
                orderStatus = 'authorized';
                orderProvider = 'mercadopago';
            }

            const order = deps.upsertPaymentOrder({
                id: orderId,
                userId: user.id,
                vertical,
                kind: 'subscription',
                title: `Suscripción ${plan.name}`,
                amount: subscriptionChargeAmount,
                currency: plan.currency,
                status: orderStatus,
                providerStatus,
                providerReferenceId,
                preferenceId: null,
                checkoutUrl,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                appliedAt: null,
                appliedResourceId: null,
                metadata: {
                    kind: 'subscription',
                    planId: plan.id,
                    planName: plan.name,
                    chargeAmountClp: subscriptionChargeAmount,
                    provider: orderProvider,
                },
            });

            return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos iniciar el checkout.';
            const status = message.includes('requiere una URL publica HTTPS') ? 400 : 502;
            return c.json({ ok: false, error: message }, status);
        }
    });

    app.post('/payments/confirm', deps.requireVerifiedSession, async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.confirmCheckoutSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const paymentId = parsed.data.paymentId != null ? String(parsed.data.paymentId) : '';
        let order = deps.getPaymentOrdersForUser(user.id).find((item: any) => item.id === parsed.data.orderId);
        if (!order && deps.loadPaymentOrderFromDb) {
            const loaded = await deps.loadPaymentOrderFromDb(parsed.data.orderId);
            if (loaded && loaded.userId === user.id) {
                order = deps.upsertPaymentOrder(loaded);
            }
        }
        if (!order) {
            return c.json({ ok: false, error: 'Orden no encontrada' }, 404);
        }

        try {
            const provider = orderProvider(order);
            if (provider === 'fintoc' && !isFintocConfigured()) {
                return c.json({ ok: false, error: 'Fintoc no está configurado en el backend.' }, 503);
            }
            if (provider === 'mercadopago' && !deps.isMercadoPagoConfigured()) {
                return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
            }

            if (order.kind === 'subscription') {
                if (!order.providerReferenceId) {
                    return c.json({ ok: false, error: 'La suscripción no tiene referencia del proveedor de pago.' }, 409);
                }

                const providerReferenceId = String(order.providerReferenceId);
                let providerStatus: string;
                if (provider === 'fintoc') {
                    const session = await getFintocCheckoutSession(providerReferenceId);
                    providerStatus = String(session.status ?? '');
                    const externalReference = String(session.metadata?.orderExternalId ?? '');
                    if (externalReference && externalReference !== order.id) {
                        return c.json({ ok: false, error: 'La respuesta de Fintoc no coincide con esta orden.' }, 409);
                    }
                } else if (isDevMercadoPagoPreapprovalId(providerReferenceId)) {
                    providerStatus = 'authorized';
                } else {
                    const providerPayload = await deps.getPreapprovalById(providerReferenceId);
                    providerStatus = String((providerPayload as any)?.status ?? '');
                    const externalReference = String((providerPayload as any)?.external_reference ?? '');
                    if (externalReference && externalReference !== order.id) {
                        return c.json({ ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.' }, 409);
                    }
                }

                const confirmed = await confirmSubscriptionFromPreapproval(
                    subscriptionConfirmDeps(provider),
                    {
                        userId: user.id,
                        order,
                        providerStatus,
                        providerPreapprovalId: providerReferenceId,
                    },
                );

                if (!confirmed.ok) {
                    const httpStatus =
                        confirmed.status === 400 ? 400
                        : confirmed.status === 404 ? 404
                        : 409;
                    return c.json({ ok: false, error: confirmed.error }, httpStatus);
                }

                const memorySub = confirmed.applied
                    ? (confirmed.subscription as Record<string, unknown>)
                    : deps.getCurrentSubscription(user.id, order.vertical);
                return c.json({
                    ok: true,
                    status: confirmed.order.status,
                    order: deps.paymentOrderToResponse(confirmed.order),
                    subscription: deps.activeSubscriptionToResponse(memorySub),
                });
            }

            const paymentReferenceId = paymentId || order.providerReferenceId || '';
            const providerPayload = provider === 'fintoc'
                ? await (async () => {
                    const sessionId = paymentReferenceId;
                    if (!sessionId) return null;
                    const session = await getFintocCheckoutSession(sessionId);
                    const externalReference = String(session.metadata?.orderExternalId ?? '');
                    if (externalReference && externalReference !== order.id) {
                        throw new Error('La respuesta de Fintoc no coincide con esta orden.');
                    }
                    return {
                        status: parseFintocPaymentStatus(String(session.status ?? '')),
                        external_reference: order.id,
                    } as Record<string, unknown>;
                })()
                : undefined;
            const confirmed = await confirmPaymentFromProvider(deps, {
                userId: user.id,
                orderId: order.id,
                paymentReferenceId,
                providerPayload: providerPayload ?? undefined,
            });
            if (!confirmed.ok) {
                const status = (confirmed.status === 400 || confirmed.status === 404 || confirmed.status === 409)
                    ? confirmed.status
                    : 409;
                return c.json({ ok: false, error: confirmed.error }, status);
            }
            return c.json({ ok: true, status: confirmed.status, order: confirmed.order, ...confirmed.extra });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos validar el pago.';
            return c.json({ ok: false, error: message }, 502);
        }
    });

    app.post('/payments/mercadopago/webhook', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
            const bodyData = (body.data ?? {}) as Record<string, unknown>;
            const topic = String(c.req.query('topic') ?? c.req.query('type') ?? body.type ?? '');
            const paymentId = String(c.req.query('id') ?? c.req.query('data.id') ?? bodyData.id ?? body.id ?? '');

            const signatureResult = verifyMercadoPagoWebhookSignature({
                xSignature: c.req.header('x-signature'),
                xRequestId: c.req.header('x-request-id'),
                dataId: paymentId || null,
            });
            if (signatureResult === false) {
                return c.json({ ok: false, error: 'Firma de webhook inválida o no permitida' }, 401);
            }

            const isPreapproval =
                topic === 'preapproval'
                || topic === 'subscription_preapproval'
                || String(body.type ?? '').includes('preapproval');
            if (isPreapproval) {
                const preapprovalId = String(
                    c.req.query('id') ?? c.req.query('data.id') ?? bodyData.id ?? body.id ?? '',
                );
                if (!preapprovalId) return c.json({ ok: true });

                const processedPre = deps.processedMercadoPagoWebhookPreapprovalIds;
                if (processedPre?.has(preapprovalId)) {
                    return c.json({ ok: true, duplicate: true });
                }

                let providerPayload: Record<string, unknown>;
                try {
                    providerPayload = (await getPreapprovalById(preapprovalId)) as Record<string, unknown>;
                } catch (err) {
                    console.warn('[payments] MP webhook preapproval: no se pudo consultar:', err);
                    return c.json({ ok: true });
                }

                const providerStatus = String(providerPayload.status ?? '');
                const orderId = String(providerPayload.external_reference ?? '');
                if (!orderId) return c.json({ ok: true });

                let located = findPaymentOrderByExternalReference(deps.paymentOrdersByUser, orderId);
                if (!located && deps.loadPaymentOrderFromDb) {
                    const hydrated = await deps.loadPaymentOrderFromDb(orderId);
                    if (hydrated) {
                        deps.upsertPaymentOrder(hydrated);
                        located = {
                            userId: String(hydrated.userId),
                            order: { id: String(hydrated.id), userId: String(hydrated.userId) },
                        };
                    }
                }
                if (!located) return c.json({ ok: true });

                const fullOrder = deps.getPaymentOrdersForUser(located.userId).find((o: { id: string }) => o.id === orderId)
                    ?? (await deps.loadPaymentOrderFromDb?.(orderId));
                if (!fullOrder || fullOrder.kind !== 'subscription') return c.json({ ok: true });

                const result = await confirmSubscriptionFromPreapproval(
                    {
                        getPaidSubscriptionPlan: deps.getPaidSubscriptionPlan,
                        upsertActiveSubscription: deps.upsertActiveSubscription,
                        makeSubscriptionId: deps.makeSubscriptionId,
                        updatePaymentOrder: deps.updatePaymentOrder,
                        getPrimaryAccountIdForUser: deps.getPrimaryAccountIdForUser,
                        parseMercadoPagoPreapprovalStatus: deps.parseMercadoPagoPreapprovalStatus,
                        cancelActiveSubscriptionForUser: deps.cancelActiveSubscriptionForUser,
                    },
                    {
                        userId: located.userId,
                        order: fullOrder as Record<string, unknown>,
                        providerStatus,
                        providerPreapprovalId: preapprovalId,
                    },
                );

                if (result.ok) {
                    processedPre?.add(preapprovalId);
                } else {
                    console.warn('[payments] MP webhook preapproval: confirmación fallida:', result.error);
                }

                return c.json({ ok: true });
            }

            const isPayment = topic === 'payment' || String(body.type ?? '') === 'payment';
            if (!isPayment) return c.json({ ok: true });
            if (!paymentId) return c.json({ ok: true });

            const processed = deps.processedMercadoPagoWebhookPaymentIds;
            if (processed?.has(paymentId)) {
                return c.json({ ok: true, duplicate: true });
            }

            let providerPayload: Record<string, unknown>;
            try {
                providerPayload = (await getPaymentById(paymentId)) as Record<string, unknown>;
            } catch (err) {
                console.warn('[payments] MP webhook: no se pudo consultar el pago:', err);
                if (signatureResult !== 'unsigned') {
                    return c.json({ ok: true });
                }
                providerPayload = {
                    status: String(body.status ?? bodyData.status ?? ''),
                    external_reference: String(body.external_reference ?? bodyData.external_reference ?? ''),
                };
            }

            const providerStatus = String(providerPayload.status ?? '');
            if (providerStatus !== 'approved') {
                return c.json({ ok: true });
            }

            const orderId = String(providerPayload.external_reference ?? '');
            if (!orderId) return c.json({ ok: true });

            let located = findPaymentOrderByExternalReference(deps.paymentOrdersByUser, orderId);
            if (!located && deps.loadPaymentOrderFromDb) {
                const hydrated = await deps.loadPaymentOrderFromDb(orderId);
                if (hydrated) {
                    deps.upsertPaymentOrder(hydrated);
                    located = {
                        userId: String(hydrated.userId),
                        order: { id: String(hydrated.id), userId: String(hydrated.userId) },
                    };
                }
            } else if (!located && deps.findPaymentOrderByIdFromDb) {
                located = await deps.findPaymentOrderByIdFromDb(orderId);
                if (located && deps.loadPaymentOrderFromDb) {
                    const hydrated = await deps.loadPaymentOrderFromDb(orderId);
                    if (hydrated) deps.upsertPaymentOrder(hydrated);
                }
            }
            if (!located) return c.json({ ok: true });

            const result = await confirmPaymentFromProvider(deps, {
                userId: located.userId,
                orderId: located.order.id,
                paymentReferenceId: paymentId,
                providerPayload,
            });

            if (result.ok) {
                processed?.add(paymentId);
            } else {
                console.warn('[payments] MP webhook: confirmación fallida:', result.error);
            }

            return c.json({ ok: true });
        } catch (error) {
            console.error('[payments] MP webhook error:', error);
            return c.json({ ok: true });
        }
    });

    app.post('/payments/fintoc/webhook', async (c) => {
        try {
            const rawBody = await c.req.raw.text();
            const signatureResult = verifyFintocWebhookSignature({
                rawBody,
                signatureHeader: c.req.header('Fintoc-Signature') ?? c.req.header('fintoc-signature'),
            });
            if (signatureResult === false) {
                return c.json({ ok: false, error: 'Firma de webhook inválida o no permitida' }, 401);
            }

            const body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
            const eventData = extractFintocEventData(body);
            const rawSessionId = String(
                eventData.id
                ?? eventData.checkout_session_id
                ?? eventData.checkout_session
                ?? body.checkout_session_id
                ?? '',
            );

            let session: Record<string, unknown> | null = null;
            if (eventData.object === 'checkout_session' || eventData.metadata) {
                session = eventData;
            } else if (rawSessionId) {
                try {
                    session = await getFintocCheckoutSession(rawSessionId) as unknown as Record<string, unknown>;
                } catch (err) {
                    console.warn('[payments] Fintoc webhook: no se pudo consultar checkout session:', err);
                    return c.json({ ok: true });
                }
            }
            if (!session) return c.json({ ok: true });

            const metadata = session.metadata && typeof session.metadata === 'object'
                ? session.metadata as Record<string, unknown>
                : {};
            const orderId = String(metadata.orderExternalId ?? metadata.externalReference ?? metadata.orderId ?? '');
            if (!orderId) return c.json({ ok: true });

            const located = await locatePaymentOrder(orderId);
            if (!located) return c.json({ ok: true });

            const fullOrder = deps.getPaymentOrdersForUser(located.userId).find((o: { id: string }) => o.id === orderId)
                ?? (await deps.loadPaymentOrderFromDb?.(orderId));
            if (!fullOrder) return c.json({ ok: true });

            const sessionId = String(session.id ?? rawSessionId);
            const providerStatus = String(session.status ?? '');

            if (fullOrder.kind === 'subscription') {
                const result = await confirmSubscriptionFromPreapproval(
                    subscriptionConfirmDeps('fintoc'),
                    {
                        userId: located.userId,
                        order: fullOrder as Record<string, unknown>,
                        providerStatus,
                        providerPreapprovalId: sessionId,
                    },
                );
                if (!result.ok) {
                    console.warn('[payments] Fintoc webhook subscription: confirmación fallida:', result.error);
                }
                return c.json({ ok: true });
            }

            const result = await confirmPaymentFromProvider(deps, {
                userId: located.userId,
                orderId,
                paymentReferenceId: sessionId,
                providerPayload: {
                    status: parseFintocPaymentStatus(providerStatus),
                    external_reference: orderId,
                },
            });

            if (!result.ok) {
                console.warn('[payments] Fintoc webhook payment: confirmación fallida:', result.error);
            }

            return c.json({ ok: true });
        } catch (error) {
            console.error('[payments] Fintoc webhook error:', error);
            return c.json({ ok: true });
        }
    });

    return app;
}
