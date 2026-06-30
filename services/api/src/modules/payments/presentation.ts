import type { ActiveSubscription, PaymentOrderRecord } from '../../lib/domain-types.js';

export function paymentOrderToResponse(order: PaymentOrderRecord) {
    return {
        id: order.id,
        accountId: order.accountId,
        vertical: order.vertical,
        kind: order.kind,
        title: order.title,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        providerStatus: order.providerStatus,
        providerReferenceId: order.providerReferenceId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        appliedAt: order.appliedAt,
        appliedResourceId: order.appliedResourceId,
        metadata: order.metadata,
    };
}

export function activeSubscriptionToResponse(subscription: ActiveSubscription | null) {
    if (!subscription) return null;
    return {
        id: subscription.id,
        accountId: subscription.accountId,
        vertical: subscription.vertical,
        planId: subscription.planId,
        planName: subscription.planName,
        priceMonthly: subscription.priceMonthly,
        currency: subscription.currency,
        features: subscription.features,
        status: subscription.status,
        providerStatus: subscription.providerStatus,
        startedAt: subscription.startedAt,
        updatedAt: subscription.updatedAt,
    };
}
