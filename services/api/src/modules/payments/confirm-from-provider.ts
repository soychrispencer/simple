import type { PaymentsRouterDeps } from './router.js';

export type ConfirmPaymentFromProviderInput = {
    userId: string;
    orderId: string;
    paymentReferenceId: string;
    providerPayload?: Record<string, unknown>;
};

export type ConfirmPaymentFromProviderResult =
    | { ok: true; status: string; order: unknown; extra?: Record<string, unknown> }
    | { ok: false; error: string; status?: number };

/**
 * Aplica el estado de un pago de Mercado Pago a una orden existente (checkout único).
 * Usado por POST /payments/confirm y por el webhook IPN.
 */
async function resolvePaymentOrderForConfirm(
    deps: PaymentsRouterDeps,
    userId: string,
    orderId: string,
): Promise<any | null> {
    const fromMap = [...deps.paymentOrdersByUser.values()]
        .flat()
        .find((item) => item.id === orderId && item.userId === userId);
    if (fromMap) return fromMap;

    if (!deps.loadPaymentOrderFromDb) return null;

    const loaded = await deps.loadPaymentOrderFromDb(orderId);
    if (!loaded || loaded.userId !== userId) return null;

    return deps.upsertPaymentOrder(loaded);
}

export async function confirmPaymentFromProvider(
    deps: PaymentsRouterDeps,
    input: ConfirmPaymentFromProviderInput,
): Promise<ConfirmPaymentFromProviderResult> {
    const order = await resolvePaymentOrderForConfirm(deps, input.userId, input.orderId);

    if (!order) {
        return { ok: false, error: 'Orden no encontrada', status: 404 };
    }

    if (order.kind === 'subscription') {
        return { ok: false, error: 'Use confirmación de preapproval para suscripciones.', status: 409 };
    }

    const paymentReferenceId = input.paymentReferenceId;
    if (!paymentReferenceId) {
        return { ok: false, error: 'Mercado Pago no devolvió un identificador de pago.', status: 400 };
    }

    if (
        order.providerReferenceId === paymentReferenceId
        && order.appliedAt
        && (order.status === 'approved' || order.status === 'authorized')
    ) {
        return { ok: true, status: order.status, order: deps.paymentOrderToResponse(order) };
    }

    const isDevApprovedPayment = paymentReferenceId === 'dev-approved' && process.env.NODE_ENV !== 'production';
    const providerPayload = isDevApprovedPayment
        ? { status: 'approved', external_reference: order.id }
        : (input.providerPayload ?? (await deps.getPaymentById(paymentReferenceId) as Record<string, unknown>));

    const providerStatus = String(providerPayload?.status ?? '');
    const externalReference = String(providerPayload?.external_reference ?? '');
    if (externalReference && externalReference !== order.id) {
        return { ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.', status: 409 };
    }

    let nextOrder = await deps.updatePaymentOrder(input.userId, order.id, (current) => ({
        ...current,
        status: deps.parseMercadoPagoPaymentStatus(providerStatus),
        providerStatus,
        providerReferenceId: paymentReferenceId,
        updatedAt: Date.now(),
    })) ?? order;

    if ((nextOrder.status === 'approved' || nextOrder.status === 'authorized') && !nextOrder.appliedAt) {
        if (nextOrder.kind === 'serenata_booking') {
            const serenataMeta = nextOrder.metadata.kind === 'serenata_booking' ? nextOrder.metadata : null;
            if (!serenataMeta || !deps.serenataPayments) {
                return { ok: false, error: 'La orden no tiene metadata de serenata válida.', status: 409 };
            }
            const applied = await deps.serenataPayments.applyPaid(input.userId, serenataMeta.serenataId, nextOrder.id);
            if (!applied) {
                return { ok: false, error: 'Pago aprobado, pero no pudimos activar la serenata.', status: 409 };
            }
            nextOrder = await deps.updatePaymentOrder(input.userId, order.id, (current) => ({
                ...current,
                status: 'approved',
                providerStatus,
                providerReferenceId: paymentReferenceId,
                updatedAt: Date.now(),
                appliedAt: Date.now(),
                appliedResourceId: applied.item.id,
            })) ?? nextOrder;

            return {
                ok: true,
                status: nextOrder.status,
                order: deps.paymentOrderToResponse(nextOrder),
                extra: { serenata: applied.item, offersCount: applied.offersCount },
            };
        }

        if (nextOrder.kind === 'boost') {
            const boostMeta = nextOrder.metadata.kind === 'boost' ? nextOrder.metadata : null;
            if (!boostMeta) {
                return { ok: false, error: 'La orden no tiene metadata de boost válida.', status: 409 };
            }

            const listing = deps.getBoostListingById(nextOrder.vertical, boostMeta.listingId);
            if (!listing) {
                return { ok: false, error: 'Pago aprobado, pero la publicación ya no existe.', status: 409 };
            }
            const plan = deps.getBoostPlans(nextOrder.vertical, boostMeta.section).find(
                (item: { id: string }) => item.id === boostMeta.planId,
            );
            if (!plan) {
                return { ok: false, error: 'Pago aprobado, pero el plan ya no está disponible.', status: 409 };
            }

            const created = deps.createBoostOrderRecord({
                userId: input.userId,
                vertical: nextOrder.vertical,
                listing,
                section: boostMeta.section,
                plan,
            });
            if (!created.ok || !created.order) {
                return { ok: false, error: created.error ?? 'Pago aprobado, pero no pudimos activar el boost.', status: 409 };
            }

            nextOrder = await deps.updatePaymentOrder(input.userId, order.id, (current) => ({
                ...current,
                status: 'approved',
                providerStatus,
                providerReferenceId: paymentReferenceId,
                updatedAt: Date.now(),
                appliedAt: Date.now(),
                appliedResourceId: created.order?.id ?? null,
            })) ?? nextOrder;

            return {
                ok: true,
                status: nextOrder.status,
                order: deps.paymentOrderToResponse(nextOrder),
                extra: {
                    boostOrder: {
                        ...created.order,
                        sectionLabel: deps.sectionLabel(created.order.section),
                        listing,
                    },
                },
            };
        }

        if (nextOrder.kind === 'advertising') {
            const advertisingMeta = nextOrder.metadata.kind === 'advertising' ? nextOrder.metadata : null;
            if (!advertisingMeta) {
                return { ok: false, error: 'La orden no tiene metadata de publicidad válida.', status: 409 };
            }

            const campaign = await deps.getAdCampaignRecordForUser(input.userId, advertisingMeta.campaignId);
            if (!campaign) {
                return { ok: false, error: 'Pago aprobado, pero la campaña ya no existe.', status: 409 };
            }

            const rows = await deps.db.update(deps.tables.adCampaigns).set({
                paymentStatus: 'paid',
                paidAt: new Date(),
                updatedAt: new Date(),
            }).where(deps.dbHelpers.and(
                deps.dbHelpers.eq(deps.tables.adCampaigns.id, campaign.id),
                deps.dbHelpers.eq(deps.tables.adCampaigns.userId, input.userId),
            )).returning();

            const normalizedCampaign = deps.normalizeAdCampaigns([deps.mapAdCampaignRow(rows[0])])[0];
            nextOrder = await deps.updatePaymentOrder(input.userId, order.id, (current) => ({
                ...current,
                status: 'approved',
                providerStatus,
                providerReferenceId: paymentReferenceId,
                updatedAt: Date.now(),
                appliedAt: Date.now(),
                appliedResourceId: normalizedCampaign.id,
            })) ?? nextOrder;

            return {
                ok: true,
                status: nextOrder.status,
                order: deps.paymentOrderToResponse(nextOrder),
                extra: { campaign: deps.adCampaignToResponse(normalizedCampaign) },
            };
        }

        nextOrder = await deps.updatePaymentOrder(input.userId, order.id, (current) => ({
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
                deps.dbHelpers.eq(deps.tables.adCampaigns.userId, input.userId),
            ));
        }
    }

    if ((nextOrder.status === 'rejected' || nextOrder.status === 'cancelled') && nextOrder.kind === 'serenata_booking') {
        const serenataMeta = nextOrder.metadata.kind === 'serenata_booking' ? nextOrder.metadata : null;
        if (serenataMeta && deps.serenataPayments) {
            await deps.serenataPayments.markFailed(input.userId, serenataMeta.serenataId);
        }
    }

    return { ok: true, status: nextOrder.status, order: deps.paymentOrderToResponse(nextOrder) };
}

export function findPaymentOrderByExternalReference(
    paymentOrdersByUser: Map<string, { id: string; userId: string }[]>,
    orderId: string,
): { userId: string; order: { id: string; userId: string } } | null {
    for (const [userId, orders] of paymentOrdersByUser.entries()) {
        const order = orders.find((item) => item.id === orderId);
        if (order) return { userId, order };
    }
    return null;
}
