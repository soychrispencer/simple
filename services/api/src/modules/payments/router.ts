import { Hono } from 'hono';

export type PaymentsRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
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
    updatePaymentOrder: (userId: string, orderId: string, updater: (o: any) => any) => any;
    paymentOrderToResponse: (order: any) => any;
    makePaymentOrderId: (kind: any) => string;
    paymentOrdersByUser: Map<string, any[]>;
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
};

export function createPaymentsRouter(deps: PaymentsRouterDeps) {
    const app = new Hono();

    // ── Subscriptions ─────────────────────────────────────────────────────────

    app.get('/subscriptions/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
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
                const subRows = await deps.db.execute(deps.dbSql`
                    SELECT id, account_id, plan_id, vertical, status, provider_status, started_at, updated_at
                    FROM subscriptions
                    WHERE user_id = ${user.id} AND vertical = ${vertical}
                    ORDER BY created_at DESC
                    LIMIT 1
                `);

                if (subRows.length > 0) {
                    const sub = subRows[0] as any;
                    const matchedPlan = plans.find((p: any) => p.id === sub.plan_id);
                    const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
                    const subStatus = isExpired ? 'expired' : (sub.status || 'active');

                    if (subStatus !== 'expired' && subStatus !== 'cancelled') {
                        currentSubscription = {
                            id: sub.id,
                            accountId: sub.account_id ?? null,
                            vertical: sub.vertical,
                            planId: sub.plan_id,
                            planName: matchedPlan?.name ?? sub.plan_id,
                            priceMonthly: matchedPlan?.priceMonthly ?? 0,
                            currency: 'CLP',
                            features: matchedPlan?.features ?? [],
                            status: subStatus === 'active' ? 'active' : 'paused',
                            providerStatus: sub.provider_status ?? 'manual',
                            startedAt: new Date(sub.started_at).getTime(),
                            updatedAt: new Date(sub.updated_at).getTime(),
                        };
                    }
                }
            } catch (dbErr) {
                console.error('[subscriptions/catalog] DB error for', vertical, ':', dbErr);
                currentSubscription = deps.activeSubscriptionToResponse(deps.getCurrentSubscription(user.id, vertical));
            }
        }

        return c.json({
            ok: true,
            vertical,
            mercadoPagoEnabled: deps.isMercadoPagoConfigured(),
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

    app.post('/payments/checkout', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isMercadoPagoConfigured()) {
            return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createCheckoutSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
        const checkoutData = parsed.data;

        try {
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
                const backUrls = {
                    success: deps.appendCheckoutParams(returnUrl, { checkout: 'success', purchaseId: orderId, kind: 'boost' }),
                    failure: deps.appendCheckoutParams(returnUrl, { checkout: 'failure', purchaseId: orderId, kind: 'boost' }),
                    pending: deps.appendCheckoutParams(returnUrl, { checkout: 'pending', purchaseId: orderId, kind: 'boost' }),
                };
                const preference = await deps.createCheckoutPreference({
                    externalReference: orderId,
                    title: `Boost ${plan.name} · ${listing.title}`,
                    description: `${deps.sectionLabel(section)} por ${plan.days} días`,
                    amount: plan.price,
                    currencyId: 'CLP',
                    payerEmail: user.email,
                    payerName: user.name,
                    backUrls,
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
                    providerStatus: 'created',
                    providerReferenceId: null,
                    preferenceId: preference.id,
                    checkoutUrl: preference.initPoint ?? preference.sandboxInitPoint,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'boost', listingId: listing.id, section, planId: plan.id, listingTitle: listing.title },
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
                const backUrls = {
                    success: deps.appendCheckoutParams(returnUrl, { checkout: 'success', purchaseId: orderId, kind: 'advertising' }),
                    failure: deps.appendCheckoutParams(returnUrl, { checkout: 'failure', purchaseId: orderId, kind: 'advertising' }),
                    pending: deps.appendCheckoutParams(returnUrl, { checkout: 'pending', purchaseId: orderId, kind: 'advertising' }),
                };
                const preference = await deps.createCheckoutPreference({
                    externalReference: orderId,
                    title: `Publicidad ${deps.AD_FORMAT_LABELS[campaign.format]} · ${campaign.name}`,
                    description: `${campaign.durationDays} días`,
                    amount,
                    currencyId: 'CLP',
                    payerEmail: user.email,
                    payerName: user.name,
                    backUrls,
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
                    providerStatus: 'created',
                    providerReferenceId: null,
                    preferenceId: preference.id,
                    checkoutUrl: preference.initPoint ?? preference.sandboxInitPoint,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    appliedAt: null,
                    appliedResourceId: null,
                    metadata: { kind: 'advertising', campaignId: campaign.id, format: campaign.format, durationDays: campaign.durationDays, campaignName: campaign.name },
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
            const currentSubscription = deps.getCurrentSubscription(user.id, vertical);
            if (currentSubscription?.planId === plan.id && currentSubscription.status === 'active') {
                return c.json({ ok: false, error: 'Ese plan ya está activo en tu cuenta.' }, 409);
            }

            const orderId = deps.makePaymentOrderId('subscription');
            const preapproval = await deps.createPreapproval({
                externalReference: orderId,
                reason: `Suscripción ${plan.name} · ${vertical === 'autos' ? 'SimpleAutos' : vertical === 'propiedades' ? 'SimplePropiedades' : 'SimpleAgenda'}`,
                amount: plan.priceMonthly,
                currencyId: plan.currency,
                payerEmail: user.email,
                backUrl: deps.appendCheckoutParams(returnUrl, { checkout: 'return', purchaseId: orderId, kind: 'subscription' }),
            });

            const order = deps.upsertPaymentOrder({
                id: orderId,
                userId: user.id,
                vertical,
                kind: 'subscription',
                title: `Suscripción ${plan.name}`,
                amount: plan.priceMonthly,
                currency: plan.currency,
                status: preapproval.status === 'authorized' ? 'authorized' : 'pending',
                providerStatus: preapproval.status,
                providerReferenceId: preapproval.id,
                preferenceId: null,
                checkoutUrl: preapproval.initPoint,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                appliedAt: null,
                appliedResourceId: null,
                metadata: { kind: 'subscription', planId: plan.id, planName: plan.name },
            });

            return c.json({ ok: true, orderId: order.id, checkoutUrl: order.checkoutUrl, order: deps.paymentOrderToResponse(order) });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos iniciar el checkout.';
            const status = message.includes('requiere una URL publica HTTPS') ? 400 : 502;
            return c.json({ ok: false, error: message }, status);
        }
    });

    app.post('/payments/confirm', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isMercadoPagoConfigured()) {
            return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.confirmCheckoutSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const paymentId = parsed.data.paymentId != null ? String(parsed.data.paymentId) : '';
        const order = deps.getPaymentOrdersForUser(user.id).find((item: any) => item.id === parsed.data.orderId);
        if (!order) {
            return c.json({ ok: false, error: 'Orden no encontrada' }, 404);
        }

        try {
            if (order.kind === 'subscription') {
                const subscriptionMeta = order.metadata.kind === 'subscription' ? order.metadata : null;
                if (!subscriptionMeta) {
                    return c.json({ ok: false, error: 'La orden no tiene metadata de suscripción válida.' }, 409);
                }
                if (!order.providerReferenceId) {
                    return c.json({ ok: false, error: 'La suscripción no tiene referencia en Mercado Pago.' }, 409);
                }

                const providerPayload = await deps.getPreapprovalById(order.providerReferenceId);
                const providerStatus = String((providerPayload as any)?.status ?? '');
                const externalReference = String((providerPayload as any)?.external_reference ?? '');
                if (externalReference && externalReference !== order.id) {
                    return c.json({ ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.' }, 409);
                }

                let nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                    ...current,
                    status: deps.parseMercadoPagoPreapprovalStatus(providerStatus),
                    providerStatus,
                    updatedAt: Date.now(),
                })) ?? order;

                if (nextOrder.status === 'authorized' && !nextOrder.appliedAt) {
                    const plan = deps.getPaidSubscriptionPlan(nextOrder.vertical, subscriptionMeta.planId);
                    if (!plan) {
                        return c.json({ ok: false, error: 'No pudimos resolver el plan de suscripción.' }, 409);
                    }

                    const subscription = deps.upsertActiveSubscription({
                        id: deps.makeSubscriptionId(nextOrder.vertical, subscriptionMeta.planId),
                        userId: user.id,
                        vertical: nextOrder.vertical,
                        planId: subscriptionMeta.planId,
                        planName: plan.name,
                        priceMonthly: plan.priceMonthly,
                        currency: plan.currency,
                        features: plan.features,
                        status: 'active',
                        providerPreapprovalId: nextOrder.providerReferenceId ?? '',
                        providerStatus,
                        startedAt: Date.now(),
                        updatedAt: Date.now(),
                    });

                    nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                        ...current,
                        status: 'authorized',
                        providerStatus,
                        updatedAt: Date.now(),
                        appliedAt: Date.now(),
                        appliedResourceId: subscription.id,
                    })) ?? nextOrder;

                    return c.json({
                        ok: true,
                        status: nextOrder.status,
                        order: deps.paymentOrderToResponse(nextOrder),
                        subscription: deps.activeSubscriptionToResponse(subscription),
                    });
                }

                return c.json({
                    ok: true,
                    status: nextOrder.status,
                    order: deps.paymentOrderToResponse(nextOrder),
                    subscription: deps.activeSubscriptionToResponse(deps.getCurrentSubscription(user.id, order.vertical)),
                });
            }

            const paymentReferenceId = paymentId || order.providerReferenceId || '';
            if (!paymentReferenceId) {
                return c.json({ ok: false, error: 'Mercado Pago no devolvió un identificador de pago.' }, 400);
            }

            const providerPayload = await deps.getPaymentById(paymentReferenceId);
            const payloadObject = providerPayload as any;
            const providerStatus = String(payloadObject?.status ?? '');
            const externalReference = String(payloadObject?.external_reference ?? '');
            if (externalReference && externalReference !== order.id) {
                return c.json({ ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.' }, 409);
            }

            let nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                ...current,
                status: deps.parseMercadoPagoPaymentStatus(providerStatus),
                providerStatus,
                providerReferenceId: paymentReferenceId,
                updatedAt: Date.now(),
            })) ?? order;

            if ((nextOrder.status === 'approved' || nextOrder.status === 'authorized') && !nextOrder.appliedAt) {
                if (nextOrder.kind === 'boost') {
                    const boostMeta = nextOrder.metadata.kind === 'boost' ? nextOrder.metadata : null;
                    if (!boostMeta) {
                        return c.json({ ok: false, error: 'La orden no tiene metadata de boost válida.' }, 409);
                    }

                    const listing = deps.getBoostListingById(nextOrder.vertical, boostMeta.listingId);
                    if (!listing) {
                        return c.json({ ok: false, error: 'Pago aprobado, pero la publicación ya no existe.' }, 409);
                    }
                    const plan = deps.getBoostPlans(nextOrder.vertical, boostMeta.section).find(
                        (item: any) => item.id === boostMeta.planId
                    );
                    if (!plan) {
                        return c.json({ ok: false, error: 'Pago aprobado, pero el plan ya no está disponible.' }, 409);
                    }

                    const created = deps.createBoostOrderRecord({
                        userId: user.id,
                        vertical: nextOrder.vertical,
                        listing,
                        section: boostMeta.section,
                        plan,
                    });
                    if (!created.ok || !created.order) {
                        return c.json({ ok: false, error: created.error ?? 'Pago aprobado, pero no pudimos activar el boost.' }, 409);
                    }

                    nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                        ...current,
                        status: 'approved',
                        providerStatus,
                        providerReferenceId: paymentReferenceId,
                        updatedAt: Date.now(),
                        appliedAt: Date.now(),
                        appliedResourceId: created.order?.id ?? null,
                    })) ?? nextOrder;

                    return c.json({
                        ok: true,
                        status: nextOrder.status,
                        order: deps.paymentOrderToResponse(nextOrder),
                        boostOrder: {
                            ...created.order,
                            sectionLabel: deps.sectionLabel(created.order.section),
                            listing,
                        },
                    });
                }

                if (nextOrder.kind === 'advertising') {
                    const advertisingMeta = nextOrder.metadata.kind === 'advertising' ? nextOrder.metadata : null;
                    if (!advertisingMeta) {
                        return c.json({ ok: false, error: 'La orden no tiene metadata de publicidad válida.' }, 409);
                    }

                    const campaign = await deps.getAdCampaignRecordForUser(user.id, advertisingMeta.campaignId);
                    if (!campaign) {
                        return c.json({ ok: false, error: 'Pago aprobado, pero la campaña ya no existe.' }, 409);
                    }

                    const rows = await deps.db.update(deps.tables.adCampaigns).set({
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        updatedAt: new Date(),
                    }).where(deps.dbHelpers.and(
                        deps.dbHelpers.eq(deps.tables.adCampaigns.id, campaign.id),
                        deps.dbHelpers.eq(deps.tables.adCampaigns.userId, user.id),
                    )).returning();

                    const normalizedCampaign = deps.normalizeAdCampaigns([deps.mapAdCampaignRow(rows[0])])[0];
                    nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                        ...current,
                        status: 'approved',
                        providerStatus,
                        providerReferenceId: paymentReferenceId,
                        updatedAt: Date.now(),
                        appliedAt: Date.now(),
                        appliedResourceId: normalizedCampaign.id,
                    })) ?? nextOrder;

                    return c.json({
                        ok: true,
                        status: nextOrder.status,
                        order: deps.paymentOrderToResponse(nextOrder),
                        campaign: deps.adCampaignToResponse(normalizedCampaign),
                    });
                }

                nextOrder = deps.updatePaymentOrder(user.id, order.id, (current: any) => ({
                    ...current,
                    status: 'approved',
                    providerStatus,
                    providerReferenceId: paymentReferenceId,
                    updatedAt: Date.now(),
                    appliedAt: Date.now(),
                    appliedResourceId: current.id,
                })) ?? nextOrder;
            }

            if (nextOrder.kind === 'advertising') {
                const advertisingMeta = nextOrder.metadata.kind === 'advertising' ? nextOrder.metadata : null;
                if (advertisingMeta) {
                    await deps.db.update(deps.tables.adCampaigns).set({
                        paymentStatus: deps.getAdPaymentStatusFromOrderStatus(nextOrder.status),
                        updatedAt: new Date(),
                    }).where(deps.dbHelpers.and(
                        deps.dbHelpers.eq(deps.tables.adCampaigns.id, advertisingMeta.campaignId),
                        deps.dbHelpers.eq(deps.tables.adCampaigns.userId, user.id),
                    ));
                }
            }

            return c.json({ ok: true, status: nextOrder.status, order: deps.paymentOrderToResponse(nextOrder) });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos validar el pago.';
            return c.json({ ok: false, error: message }, 502);
        }
    });

    return app;
}
