import type { PaidSubscriptionPlanRecord, VerticalType } from '../../lib/domain-types.js';
import { persistPaymentOrderToDb } from './persist.js';
import { persistUserSubscription } from '../subscriptions/persist-db.js';

export type ConfirmSubscriptionDeps = {
    getPaidSubscriptionPlan: (vertical: VerticalType, planId: 'essential' | 'pro' | 'enterprise') => PaidSubscriptionPlanRecord | null;
    upsertActiveSubscription: (sub: Record<string, unknown>) => Record<string, unknown>;
    makeSubscriptionId: (vertical: VerticalType, planId: 'essential' | 'pro' | 'enterprise') => string;
    updatePaymentOrder: (
        userId: string,
        orderId: string,
        updater: (current: Record<string, unknown>) => Record<string, unknown>,
    ) => Promise<Record<string, unknown> | null>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    parseMercadoPagoPreapprovalStatus: (status: string) => string;
    cancelActiveSubscriptionForUser?: (userId: string, vertical: VerticalType) => void;
};

export type ConfirmSubscriptionInput = {
    userId: string;
    order: Record<string, unknown>;
    providerStatus: string;
    providerPreapprovalId: string;
};

export type ConfirmSubscriptionResult =
    | {
          ok: true;
          order: Record<string, unknown>;
          subscription: Record<string, unknown>;
          applied: boolean;
      }
    | { ok: false; error: string; status?: number };

export async function confirmSubscriptionFromPreapproval(
    deps: ConfirmSubscriptionDeps,
    input: ConfirmSubscriptionInput,
): Promise<ConfirmSubscriptionResult> {
    const metadata = input.order.metadata as { kind?: string; planId?: string } | undefined;
    if (metadata?.kind !== 'subscription' || !metadata.planId) {
        return { ok: false, error: 'La orden no tiene metadata de suscripción válida.', status: 409 };
    }

    const planId = metadata.planId as 'essential' | 'pro' | 'enterprise';
    const vertical = String(input.order.vertical) as VerticalType;
    const parsedStatus = deps.parseMercadoPagoPreapprovalStatus(input.providerStatus);

    let nextOrder = await deps.updatePaymentOrder(String(input.order.userId), String(input.order.id), (current) => ({
        ...current,
        status: parsedStatus,
        providerStatus: input.providerStatus,
        providerReferenceId: input.providerPreapprovalId,
        updatedAt: Date.now(),
    }));

    if (!nextOrder) {
        return { ok: false, error: 'Orden no encontrada.', status: 404 };
    }

    if (parsedStatus === 'cancelled') {
        const accountId = await deps.getPrimaryAccountIdForUser(input.userId);
        await persistUserSubscription({
            userId: input.userId,
            accountId,
            vertical,
            planSlug: planId,
            providerSubscriptionId: input.providerPreapprovalId,
            providerStatus: input.providerStatus,
            status: 'cancelled',
        });
        deps.cancelActiveSubscriptionForUser?.(input.userId, vertical);
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }

    if (parsedStatus !== 'authorized' || nextOrder.appliedAt) {
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }

    const plan = deps.getPaidSubscriptionPlan(vertical, planId);
    if (!plan) {
        return { ok: false, error: 'No pudimos resolver el plan de suscripción.', status: 409 };
    }

    const accountId = await deps.getPrimaryAccountIdForUser(input.userId);
    const { subscriptionDbId } = await persistUserSubscription({
        userId: input.userId,
        accountId,
        vertical,
        planSlug: planId,
        providerSubscriptionId: input.providerPreapprovalId,
        providerStatus: input.providerStatus,
        status: 'active',
    });

    const subscription = deps.upsertActiveSubscription({
        id: deps.makeSubscriptionId(vertical, planId),
        userId: input.userId,
        vertical,
        planId: plan.id,
        planName: plan.name,
        priceMonthly: plan.priceMonthly,
        currency: plan.currency,
        features: plan.features,
        status: 'active',
        providerPreapprovalId: input.providerPreapprovalId,
        providerStatus: input.providerStatus,
        startedAt: Date.now(),
        updatedAt: Date.now(),
    });

    nextOrder = await deps.updatePaymentOrder(String(input.order.userId), String(input.order.id), (current) => ({
        ...current,
        status: 'authorized',
        providerStatus: input.providerStatus,
        updatedAt: Date.now(),
        appliedAt: Date.now(),
        appliedResourceId: subscriptionDbId,
    })) ?? nextOrder;

    await persistPaymentOrderToDb({
        id: String(nextOrder.id),
        accountId: accountId ?? null,
        userId: input.userId,
        vertical,
        kind: 'subscription',
        title: String(nextOrder.title ?? `Suscripción ${plan.name}`),
        amount: Number(nextOrder.amount ?? plan.priceMonthly),
        currency: String(nextOrder.currency ?? plan.currency),
        status: 'authorized',
        provider: String(nextOrder.metadata && typeof nextOrder.metadata === 'object' && (nextOrder.metadata as Record<string, unknown>).provider === 'fintoc' ? 'fintoc' : 'mercadopago'),
        providerStatus: input.providerStatus,
        providerReferenceId: input.providerPreapprovalId,
        preferenceId: null,
        checkoutUrl: nextOrder.checkoutUrl ? String(nextOrder.checkoutUrl) : null,
        createdAt: Number(nextOrder.createdAt ?? Date.now()),
        updatedAt: Date.now(),
        appliedAt: Date.now(),
        appliedResourceId: subscriptionDbId,
        metadata: (nextOrder.metadata as Record<string, unknown>) ?? { kind: 'subscription', planId },
    });

    return {
        ok: true,
        order: nextOrder,
        subscription,
        applied: true,
    };
}
