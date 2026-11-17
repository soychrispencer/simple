import type { PaidSubscriptionPlanRecord, SerenataBillingProfileType, VerticalType } from '../../lib/domain-types.js';
import { persistPaymentOrderToDb } from './persist.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';

export type ConfirmSubscriptionDeps = {
    getPaidSubscriptionPlan: (vertical: VerticalType, planId: 'pro' | 'pro_plus' | 'enterprise') => PaidSubscriptionPlanRecord | null;
    upsertActiveSubscription: (sub: Record<string, unknown>) => Record<string, unknown>;
    makeSubscriptionId: (vertical: VerticalType, planId: 'pro' | 'pro_plus' | 'enterprise') => string;
    updatePaymentOrder: (
        userId: string,
        orderId: string,
        updater: (current: Record<string, unknown>) => Record<string, unknown>,
    ) => Promise<Record<string, unknown> | null>;
    getCurrentSubscription?: (
        userId: string,
        vertical: VerticalType,
        accountId?: string | null,
        billingProfileType?: SerenataBillingProfileType,
    ) => { providerPreapprovalId?: string | null } | null;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getPersonalAccountIdForUser?: (userId: string) => Promise<string | null>;
    parseMercadoPagoPreapprovalStatus: (status: string) => string;
    cancelActiveSubscriptionForUser: (userId: string, vertical: VerticalType, accountId?: string | null, billingProfileType?: SerenataBillingProfileType) => void;
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
    const metadata = input.order.metadata as {
        kind?: string;
        planId?: string;
        billingCycle?: 'monthly' | 'annual';
        billingProfileType?: SerenataBillingProfileType;
    } | undefined;
    if (metadata?.kind !== 'subscription' || !metadata.planId) {
        return { ok: false, error: 'La orden no tiene metadata de suscripción válida.', status: 409 };
    }

    const vertical = String(input.order.vertical) as VerticalType;
    const capturedOrderAccountId = typeof input.order.accountId === 'string' && input.order.accountId.trim()
        ? input.order.accountId
        : null;
    const orderAccountId = (vertical as string) === 'serenatas'
        ? await deps.getPersonalAccountIdForUser?.(input.userId) ?? null
        : capturedOrderAccountId
            ?? (deps.getPersonalAccountIdForUser
                ? await deps.getPersonalAccountIdForUser(input.userId)
                : await deps.getPrimaryAccountIdForUser(input.userId));
    const planId = metadata.planId as 'pro' | 'pro_plus' | 'enterprise';
    const billingProfileType = (vertical as string) === 'serenatas'
        ? metadata.billingProfileType ?? 'provider'
        : undefined;
    const billingCycle = metadata.billingCycle === 'annual' ? 'annual' : 'monthly';
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
        const currentDbSubscription = await loadCurrentSubscriptionFromDb(
            input.userId,
            vertical,
            orderAccountId,
            { includeInactive: true, ...(billingProfileType ? { billingProfileType } : {}) },
        );
        if (!currentDbSubscription || currentDbSubscription.providerSubscriptionId !== input.providerPreapprovalId) {
            // A delayed cancellation from an older preapproval must not
            // downgrade a newer subscription for this person or account.
            const currentCachedSubscription = deps.getCurrentSubscription?.(input.userId, vertical, orderAccountId, billingProfileType);
            if (currentCachedSubscription?.providerPreapprovalId === input.providerPreapprovalId) {
                // Another API instance may already have persisted this
                // cancellation while this instance still has stale memory.
                deps.cancelActiveSubscriptionForUser(input.userId, vertical, orderAccountId, billingProfileType);
            }
            return { ok: true, order: nextOrder, subscription: {}, applied: false };
        }
        const cancelled = await persistUserSubscription({
            userId: input.userId,
            accountId: orderAccountId,
            vertical,
            ...(billingProfileType ? { billingProfileType } : {}),
            planSlug: planId,
            billingCycle,
            provider: 'mercadopago',
            providerSubscriptionId: input.providerPreapprovalId,
            providerStatus: input.providerStatus,
            status: 'cancelled',
            expectedProviderSubscriptionId: input.providerPreapprovalId,
        });
        const currentSubscription = deps.getCurrentSubscription?.(input.userId, vertical, orderAccountId, billingProfileType);
        if (
            currentSubscription?.providerPreapprovalId === input.providerPreapprovalId
            || (!deps.getCurrentSubscription && cancelled.applied)
        ) {
            deps.cancelActiveSubscriptionForUser(input.userId, vertical, orderAccountId, billingProfileType);
        }
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }

    if (parsedStatus !== 'authorized' || nextOrder.appliedAt) {
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }

    const plan = deps.getPaidSubscriptionPlan(vertical, planId);
    if (!plan) {
        return { ok: false, error: 'No pudimos resolver el plan de suscripción.', status: 409 };
    }

    const latestDbSubscription = await loadCurrentSubscriptionFromDb(
        input.userId,
        vertical,
        orderAccountId,
        { includeInactive: true, ...(billingProfileType ? { billingProfileType } : {}) },
    );
    const orderCreatedAt = Number(input.order.createdAt);
    if (
        latestDbSubscription
        && latestDbSubscription.providerSubscriptionId !== input.providerPreapprovalId
        && Number.isFinite(orderCreatedAt)
        && latestDbSubscription.startedAt.getTime() > orderCreatedAt
    ) {
        // An older checkout may become authorized after a newer plan was
        // already selected for this account or provider.
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }

    const persisted = await persistUserSubscription({
        userId: input.userId,
        accountId: orderAccountId,
        vertical,
        ...(billingProfileType ? { billingProfileType } : {}),
        planSlug: planId,
        billingCycle,
        provider: 'mercadopago',
        providerSubscriptionId: input.providerPreapprovalId,
        providerStatus: input.providerStatus,
        status: 'active',
        ...(Number.isFinite(orderCreatedAt) && orderCreatedAt > 0
            ? { subscriptionStartedAt: new Date(orderCreatedAt) }
            : {}),
        // Compare-and-set protects the row if a newer checkout is applied
        // after the read above but before this write.
        expectedProviderSubscriptionId: latestDbSubscription?.providerSubscriptionId ?? null,
    });
    if (!persisted.applied) {
        return { ok: true, order: nextOrder, subscription: {}, applied: false };
    }
    const { subscriptionDbId } = persisted;

    const billedAmount = Number(nextOrder.amount ?? plan.priceMonthly);
    const billedCurrency = String(nextOrder.currency ?? plan.currency);

    const subscription = deps.upsertActiveSubscription({
        id: deps.makeSubscriptionId(vertical, planId),
        accountId: orderAccountId,
        userId: input.userId,
        vertical,
        ...(billingProfileType ? { billingProfileType } : {}),
        planId: plan.id,
        planName: plan.name,
        priceMonthly: plan.priceMonthly,
        billingCycle,
        currency: billedCurrency,
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
        accountId: orderAccountId,
        userId: input.userId,
        vertical,
        kind: 'subscription',
        title: String(nextOrder.title ?? `Suscripción ${plan.name}`),
        amount: billedAmount,
        currency: billedCurrency,
        status: 'authorized',
        provider: 'mercadopago',
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
