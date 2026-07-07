import { Hono } from 'hono';
import {
    buildMercadoPagoCheckoutBackUrls,
    isDevMercadoPagoPreapprovalId,
    mercadoPagoDevCheckoutFallbackAllowedForKind,
    mercadoPagoDevCheckoutFallbackEnabled,
    resolveMercadoPagoPreferenceCheckoutUrl,
} from '../mercadopago/checkout-helpers.js';
import { getPaymentById, getPreapprovalById, verifyMercadoPagoWebhookSignature } from '../mercadopago/service.js';
import { serenataPlanMonthlyChargeClp, defaultSerenataTrialEndsAt } from '../serenatas/plan-config.js';
import {
    catalogPaidPlans,
    filterCatalogPlans,
    normalizeCatalogSubscription,
} from '../billing/plan-catalog.js';
import { loadCurrentSubscriptionFromDb } from '../subscriptions/persist-db.js';
import { normalizeTrialEndsAtForDisplay } from '../billing/trial-config.js';
import { db } from '../../db/index.js';
import { serenataOwners } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { confirmPaymentFromProvider, findPaymentOrderByExternalReference } from './confirm-from-provider.js';
import { confirmSubscriptionFromPreapproval } from './confirm-subscription.js';
import { persistPaymentOrderToDb } from './persist.js';
import { listUserPaymentOrdersMerged } from './list-user-orders.js';
import { resolvePaymentProvider } from './resolve-provider.js';
import {
    getSubscriptionBillingCharge,
    localizePaidPlansForBilling,
} from '../billing/subscription-billing.js';
import { isPlatformLaunchActive } from '@simple/utils';

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
    getBoostTargetById?: (vertical: any, targetType: import('../boost/types.js').BoostTargetType, targetId: string) => Promise<any | null>;
    inferBoostTargetType?: (vertical: any) => string;
    getBoostOrdersForUser: (userId: string) => any[];
    getBoostPlans: (vertical: any, section: any) => any[];
    parseBoostSection: (raw: any, vertical: any) => any;
    isBoostSectionAllowed: (vertical: any, section: any) => boolean;
    createBoostOrderRecord: (input: any) => { ok: boolean; order?: any; error?: string };
    insertBoostOrderRow?: (order: any, accountId?: string | null) => Promise<void>;
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
    tables2: { agendaProfessionalProfiles: any; serenataOwners: any; publicProfiles: any };
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

    async function createHostedCheckout(input: {
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
    }): Promise<{
        providerOrderId: string | null;
        providerReferenceId: string | null;
        providerStatus: string;
        checkoutUrl: string | null;
    }> {
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
            providerOrderId: preference.id,
            providerReferenceId: null,
            providerStatus: 'created',
            checkoutUrl: resolveMercadoPagoPreferenceCheckoutUrl(preference),
        };
    }

    function subscriptionConfirmDeps() {
        return {
            getPaidSubscriptionPlan: deps.getPaidSubscriptionPlan,
            upsertActiveSubscription: deps.upsertActiveSubscription,
            makeSubscriptionId: deps.makeSubscriptionId,
            updatePaymentOrder: deps.updatePaymentOrder,
            getPrimaryAccountIdForUser: deps.getPrimaryAccountIdForUser,
            parseMercadoPagoPreapprovalStatus: deps.parseMercadoPagoPreapprovalStatus,
            cancelActiveSubscriptionForUser: deps.cancelActiveSubscriptionForUser,
        };
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    app.get('/subscriptions/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const rawVertical = c.req.query('vertical');
        const vertical = rawVertical === 'serenatas' ? 'serenatas' : deps.parseVertical(rawVertical);
        const allPlans = deps.getSubscriptionPlans(vertical);
        const plans = filterCatalogPlans(vertical, allPlans);
        const freePlan = plans.find((plan: any) => plan.id === 'free') ?? null;
        const paidPlans = catalogPaidPlans(vertical, allPlans);
        const orders = deps.getPaymentOrdersForUser(user.id, { vertical, kind: 'subscription' }).map((order: any) => deps.paymentOrderToResponse(order));

        let currentSubscription: any = null;

        if (vertical === 'agenda') {
            try {
                const profile = await deps.dbQuery.agendaProfessionalProfiles.findFirst({
                    where: deps.dbHelpers.eq(deps.tables2.agendaProfessionalProfiles.userId, user.id),
                });
                const dbSub = await loadCurrentSubscriptionFromDb(user.id, 'agenda');
                if (dbSub && (dbSub.planSlug === 'pro' || dbSub.planSlug === 'enterprise') && dbSub.status === 'active') {
                    const matchedPlan = plans.find((p: any) => p.id === dbSub.planSlug) ?? plans.find((p: any) => p.id === 'pro');
                    currentSubscription = {
                        id: dbSub.id,
                        accountId: dbSub.accountId,
                        vertical: 'agenda' as const,
                        planId: dbSub.planSlug === 'enterprise' ? 'enterprise' : 'pro',
                        planName: matchedPlan?.name ?? dbSub.planName ?? 'Pro',
                        priceMonthly: dbSub.priceMonthly,
                        currency: dbSub.currency,
                        features: dbSub.features,
                        status: 'active' as const,
                        providerStatus: dbSub.providerStatus ?? 'authorized',
                        startedAt: dbSub.startedAt.getTime(),
                        updatedAt: dbSub.updatedAt.getTime(),
                        planExpiresAt: dbSub.expiresAt?.getTime() ?? null,
                    };
                } else if (profile) {
                    if (profile.plan === 'pro') {
                        const isExpired = profile.planExpiresAt && profile.planExpiresAt < new Date();
                        if (!isExpired) {
                            const matchedPlan = plans.find((p: any) => p.id === 'pro');
                            currentSubscription = {
                                id: `agenda-${profile.id}`,
                                accountId: profile.accountId ?? null,
                                vertical: 'agenda' as const,
                                planId: 'pro',
                                planName: matchedPlan?.name ?? 'Pro',
                                priceMonthly: matchedPlan?.priceMonthly ?? 0,
                                currency: 'CLP',
                                features: matchedPlan?.features ?? [],
                                status: 'active' as const,
                                providerStatus: 'manual',
                                startedAt: profile.createdAt.getTime(),
                                updatedAt: profile.updatedAt.getTime(),
                                planExpiresAt: profile.planExpiresAt ? profile.planExpiresAt.getTime() : null,
                            };
                        }
                    } else if (profile.plan !== 'pro' && profile.planExpiresAt) {
                        const matchedPlan = plans.find((p: any) => p.id === 'free');
                        currentSubscription = {
                            id: `agenda-${profile.id}`,
                            accountId: profile.accountId ?? null,
                            vertical: 'agenda' as const,
                            planId: 'free',
                            planName: matchedPlan?.name ?? 'Prueba completa',
                            priceMonthly: 0,
                            currency: 'CLP',
                            features: matchedPlan?.features ?? [],
                            status: profile.planExpiresAt < new Date() ? 'expired' as const : 'active' as const,
                            providerStatus: 'trial',
                            startedAt: profile.createdAt.getTime(),
                            updatedAt: profile.updatedAt.getTime(),
                            planExpiresAt: profile.planExpiresAt.getTime(),
                        };
                    }
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] agenda DB error:', dbErr);
                return c.json({ ok: false, error: 'Error al consultar el perfil de agenda. Verifica que las migraciones estén aplicadas.' }, 500);
            }
        } else if (vertical === 'serenatas') {
            try {
                const dbSub = await loadCurrentSubscriptionFromDb(user.id, 'serenatas');
                if (dbSub && (dbSub.planSlug === 'pro' || dbSub.planSlug === 'enterprise') && dbSub.status === 'active') {
                    const matchedPlan = plans.find((p: any) => p.id === 'pro');
                    currentSubscription = {
                        id: dbSub.id,
                        accountId: dbSub.accountId,
                        vertical: 'serenatas' as const,
                        planId: 'pro',
                        planName: matchedPlan?.name ?? dbSub.planName ?? 'Pro',
                        priceMonthly: dbSub.priceMonthly,
                        currency: dbSub.currency,
                        features: dbSub.features,
                        status: 'active' as const,
                        providerStatus: dbSub.providerStatus ?? 'authorized',
                        startedAt: dbSub.startedAt.getTime(),
                        updatedAt: dbSub.updatedAt.getTime(),
                        planExpiresAt: dbSub.expiresAt?.getTime() ?? null,
                    };
                }

                const owner = await deps.dbQuery.serenataOwners.findFirst({
                    where: deps.dbHelpers.eq(deps.tables2.serenataOwners.userId, user.id),
                });

                if (!currentSubscription && owner && owner.subscriptionStatus === 'active') {
                    const planId = 'pro';
                    const matchedPlan = plans.find((p: any) => p.id === planId);
                    currentSubscription = {
                        id: `serenatas-${owner.id}`,
                        accountId: null,
                        vertical: 'serenatas' as const,
                        planId,
                        planName: matchedPlan?.name ?? 'Pro',
                        priceMonthly: owner.subscriptionPrice,
                        currency: 'CLP',
                        features: matchedPlan?.features ?? [],
                        status: 'active' as const,
                        providerStatus: 'manual',
                        startedAt: owner.createdAt.getTime(),
                        updatedAt: owner.updatedAt.getTime(),
                        planExpiresAt: null,
                    };
                } else if (!currentSubscription && owner && owner.subscriptionStatus !== 'active') {
                    let trialEndsAt = owner.trialEndsAt;
                    if (!trialEndsAt) {
                        trialEndsAt = defaultSerenataTrialEndsAt(owner.createdAt ?? new Date());
                        await db
                            .update(serenataOwners)
                            .set({ trialEndsAt, updatedAt: new Date() })
                            .where(eq(serenataOwners.id, owner.id));
                    }
                    const matchedPlan = plans.find((p: any) => p.id === 'free');
                    const effectiveTrialEndsAt = normalizeTrialEndsAtForDisplay(
                        trialEndsAt,
                        owner.createdAt,
                    );
                    const isExpired = effectiveTrialEndsAt < new Date();
                    currentSubscription = {
                        id: `serenatas-${owner.id}`,
                        accountId: null,
                        vertical: 'serenatas' as const,
                        planId: 'free',
                        planName: matchedPlan?.name ?? 'Prueba gratis',
                        priceMonthly: 0,
                        currency: 'CLP',
                        features: matchedPlan?.features ?? [],
                        status: isExpired ? 'expired' as const : 'active' as const,
                        providerStatus: 'trial',
                        startedAt: owner.createdAt.getTime(),
                        updatedAt: owner.updatedAt.getTime(),
                        planExpiresAt: effectiveTrialEndsAt.getTime(),
                    };
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] serenatas DB error:', dbErr);
                currentSubscription = deps.activeSubscriptionToResponse(deps.getCurrentSubscription(user.id, vertical));
            }
        } else if (vertical === 'autos' || vertical === 'propiedades') {
            try {
                const dbSub = await loadCurrentSubscriptionFromDb(user.id, vertical);
                if (dbSub && (dbSub.planSlug === 'pro' || dbSub.planSlug === 'enterprise') && dbSub.status === 'active') {
                    const matchedPlan = plans.find((p: any) => p.id === dbSub.planSlug) ?? plans.find((p: any) => p.id === 'pro');
                    currentSubscription = {
                        id: dbSub.id,
                        accountId: dbSub.accountId,
                        vertical,
                        planId: dbSub.planSlug,
                        planName: matchedPlan?.name ?? dbSub.planName ?? 'Pro',
                        priceMonthly: dbSub.priceMonthly,
                        currency: dbSub.currency,
                        features: dbSub.features,
                        status: 'active' as const,
                        providerStatus: dbSub.providerStatus ?? 'authorized',
                        startedAt: dbSub.startedAt.getTime(),
                        updatedAt: dbSub.updatedAt.getTime(),
                        planExpiresAt: dbSub.expiresAt?.getTime() ?? null,
                    };
                } else {
                    currentSubscription = deps.activeSubscriptionToResponse(
                        deps.getCurrentSubscription(user.id, vertical),
                    );
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] marketplace DB error:', dbErr);
                currentSubscription = deps.activeSubscriptionToResponse(deps.getCurrentSubscription(user.id, vertical));
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

        currentSubscription = normalizeCatalogSubscription(vertical, currentSubscription, plans);

        const paymentProvider = resolvePaymentProvider(user.residenceCountryCode);
        const launchMode = isPlatformLaunchActive(vertical);
        const checkoutEnabled = !launchMode && (
            deps.isMercadoPagoConfigured()
            || (process.env.NODE_ENV !== 'production' && mercadoPagoDevCheckoutFallbackEnabled())
        );

        return c.json({
            ok: true,
            vertical,
            paymentProvider,
            billingCountryCode: (user.residenceCountryCode ?? 'CL').trim().toUpperCase(),
            checkoutEnabled,
            launchMode,
            mercadoPagoEnabled: deps.isMercadoPagoConfigured(),
            plans: localizePaidPlansForBilling(
                paymentProvider,
                vertical as import('../../lib/domain-types.js').PaymentVerticalType,
                paidPlans as import('../../lib/domain-types.js').PaidSubscriptionPlanRecord[],
            ),
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
        const mercadoPagoConfigured = deps.isMercadoPagoConfigured();
        const allowDevCheckoutFallback = mercadoPagoDevCheckoutFallbackAllowedForKind(checkoutData.kind);
        if (!mercadoPagoConfigured && !allowDevCheckoutFallback) {
            return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
        }

        if (checkoutData.kind === 'subscription' && isPlatformLaunchActive(checkoutData.vertical)) {
            return c.json({
                ok: false,
                error: 'Los planes de suscripción estarán disponibles próximamente.',
            }, 403);
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
                    if (!mercadoPagoConfigured) {
                        throw new Error('Mercado Pago no está configurado en el backend.');
                    }
                    checkout = await createHostedCheckout({
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
                    if (process.env.NODE_ENV === 'production' || process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK === 'false') {
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
                    preferenceId: checkout?.providerOrderId ?? null,
                    checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'serenata_booking', serenataId: target.id, recipientName: target.recipientName, provider: 'mercadopago' },
                });

                return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
            }

            if (checkoutData.kind === 'boost') {
                const vertical = checkoutData.vertical;
                const boostInput = checkoutData.boost;
                const returnUrl = deps.resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
                const targetType = boostInput.targetType ?? deps.inferBoostTargetType?.(vertical) ?? 'listing';
                const target = deps.getBoostTargetById
                    ? await deps.getBoostTargetById(vertical, targetType, boostInput.listingId)
                    : deps.getBoostListingById(vertical, boostInput.listingId);
                if (!target) {
                    return c.json({ ok: false, error: 'Recurso no encontrado' }, 404);
                }
                if (target.ownerId !== user.id && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'No tienes permisos sobre este recurso' }, 403);
                }

                const section = boostInput.section
                    ? deps.parseBoostSection(boostInput.section, vertical)
                    : target.section;
                if (!deps.isBoostSectionAllowed(vertical, section)) {
                    return c.json({ ok: false, error: 'Sección inválida para esta vertical' }, 400);
                }

                const plan = deps.getBoostPlans(vertical, section).find((item: any) => item.id === boostInput.planId);
                if (!plan) {
                    return c.json({ ok: false, error: 'Plan no disponible' }, 400);
                }

                const existingBoost = deps.getBoostOrdersForUser(user.id).some((order: any) => {
                    const orderTargetId = order.targetId ?? order.listingId;
                    if (order.vertical !== vertical || orderTargetId !== target.id) return false;
                    return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
                });
                if (existingBoost && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'Ya tienes un boost vigente para este recurso' }, 409);
                }

                if (deps.countReservedSlots(vertical, section) >= deps.MAX_BOOST_SLOTS_PER_SECTION && user.role !== 'superadmin') {
                    return c.json({ ok: false, error: 'No quedan cupos en esta sección para el periodo seleccionado' }, 409);
                }

                const orderId = deps.makePaymentOrderId('boost');
                const backUrls = buildMercadoPagoCheckoutBackUrls(deps.appendCheckoutParams, returnUrl, orderId, 'boost');
                const checkout = await createHostedCheckout({
                    orderId,
                    title: `Boost ${plan.name} · ${target.title}`,
                    description: `${deps.sectionLabel(section)} por ${plan.days} días`,
                    amount: plan.price,
                    currency: 'CLP',
                    user,
                    successUrl: backUrls.success,
                    failureUrl: backUrls.failure,
                    pendingUrl: backUrls.pending,
                    metadata: { kind: 'boost', vertical, targetType, targetId: target.id, listingId: target.id, section, planId: plan.id },
                });

                const order = deps.upsertPaymentOrder({
                    id: orderId,
                    userId: user.id,
                    vertical,
                    kind: 'boost',
                    title: `Boost ${plan.name} · ${target.title}`,
                    amount: plan.price,
                    currency: 'CLP',
                    status: 'pending',
                    providerStatus: checkout.providerStatus,
                    providerReferenceId: checkout.providerReferenceId,
                    preferenceId: checkout.providerOrderId,
                    checkoutUrl: checkout.checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'boost', targetType, targetId: target.id, listingId: target.id, section, planId: plan.id, listingTitle: target.title, provider: 'mercadopago' },
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
                    preferenceId: checkout.providerOrderId,
                    checkoutUrl: checkout.checkoutUrl,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'advertising', campaignId: campaign.id, format: campaign.format, durationDays: campaign.durationDays, campaignName: campaign.name, provider: 'mercadopago' },
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
                return c.json({
                    ok: true,
                    alreadyActive: true,
                    checkoutUrl: returnUrl,
                    message: 'Ese plan ya está activo en tu cuenta.',
                });
            }

            const paymentProvider = resolvePaymentProvider(user.residenceCountryCode);
            if (!mercadoPagoConfigured) {
                if (process.env.NODE_ENV === 'production' || !mercadoPagoDevCheckoutFallbackEnabled()) {
                    return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
                }
            }

            const orderId = deps.makePaymentOrderId('subscription');
            const billing = getSubscriptionBillingCharge(paymentProvider, vertical, plan);
            const subscriptionChargeAmount = billing.amount;
            const subscriptionCurrency = billing.currency;
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

            if (!mercadoPagoConfigured) {
                providerReferenceId = `dev-preapproval-${orderId}`;
                checkoutUrl = subscriptionBackUrl;
                providerStatus = 'dev_fallback';
                orderStatus = 'authorized';
            } else {
                try {
                    const preapproval = await deps.createPreapproval({
                        externalReference: orderId,
                        reason: subscriptionReason,
                        amount: subscriptionChargeAmount,
                        currencyId: subscriptionCurrency,
                        payerEmail: user.email,
                        backUrl: subscriptionBackUrl,
                    });
                    providerReferenceId = preapproval.id;
                    checkoutUrl = preapproval.initPoint;
                    providerStatus = preapproval.status ?? 'pending';
                    orderStatus = preapproval.status === 'authorized' ? 'authorized' : 'pending';
                    if (!checkoutUrl && mercadoPagoDevCheckoutFallbackEnabled()) {
                        providerReferenceId = `dev-preapproval-${orderId}`;
                        checkoutUrl = subscriptionBackUrl;
                        providerStatus = 'dev_fallback';
                        orderStatus = 'authorized';
                    }
                } catch (error) {
                    if (process.env.NODE_ENV === 'production' || !mercadoPagoDevCheckoutFallbackEnabled()) {
                        throw error;
                    }
                    providerReferenceId = `dev-preapproval-${orderId}`;
                    checkoutUrl = subscriptionBackUrl;
                    providerStatus = 'dev_fallback';
                    orderStatus = 'authorized';
                }
            }

            const order = deps.upsertPaymentOrder({
                id: orderId,
                userId: user.id,
                vertical,
                kind: 'subscription',
                title: `Suscripción ${plan.name}`,
                amount: subscriptionChargeAmount,
                currency: subscriptionCurrency,
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
                    chargeAmountClp: subscriptionCurrency === 'CLP' ? subscriptionChargeAmount : undefined,
                    provider: paymentProvider,
                },
            });

            try {
                const accountId = await deps.getPrimaryAccountIdForUser(user.id);
                await persistPaymentOrderToDb({
                    id: String(order.id),
                    accountId,
                    userId: user.id,
                    vertical,
                    kind: 'subscription',
                    title: String(order.title),
                    amount: subscriptionChargeAmount,
                    currency: subscriptionCurrency,
                    status: orderStatus,
                    providerStatus,
                    providerReferenceId,
                    preferenceId: null,
                    checkoutUrl,
                    createdAt: Number(order.createdAt),
                    updatedAt: Number(order.updatedAt),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: order.metadata as Record<string, unknown>,
                });
            } catch (dbErr) {
                console.error('[payments/checkout] subscription order persist failed:', dbErr);
            }

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
            if (order.kind === 'subscription') {
                const providerReferenceId = String(order.providerReferenceId ?? '');
                const isDevPreapproval = isDevMercadoPagoPreapprovalId(providerReferenceId);

                if (!deps.isMercadoPagoConfigured() && !isDevPreapproval) {
                    return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
                }
                if (!providerReferenceId) {
                    return c.json({ ok: false, error: 'La suscripción no tiene referencia del proveedor de pago.' }, 409);
                }

                let providerStatus: string;

                if (isDevPreapproval) {
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
                    subscriptionConfirmDeps(),
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

            if (!deps.isMercadoPagoConfigured()) {
                return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
            }

            const paymentReferenceId = paymentId || order.providerReferenceId || '';
            const confirmed = await confirmPaymentFromProvider(deps, {
                userId: user.id,
                orderId: order.id,
                paymentReferenceId,
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

    return app;
}
