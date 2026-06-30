import { logger } from '@simple/logger';
import type { HydratedPaymentOrder } from './queries.js';
import { persistPaymentOrderToDb, type PaymentOrderPersistInput } from './persist.js';

export type PaymentOrderRecord = PaymentOrderPersistInput;

export type PaymentOrderStoreDeps = {
    paymentOrdersByUser: Map<string, PaymentOrderRecord[]>;
    loadPaymentOrderFromDb?: (orderId: string) => Promise<HydratedPaymentOrder | null>;
};

export function makePaymentOrderId(kind: string): string {
    return `${kind}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

export function createPaymentOrderStore(deps: PaymentOrderStoreDeps) {
    function getPaymentOrdersForUser(
        userId: string,
        options: { vertical?: string; kind?: string } = {},
    ): PaymentOrderRecord[] {
        const current = deps.paymentOrdersByUser.get(userId) ?? [];
        return current
            .filter((item) => (options.vertical ? item.vertical === options.vertical : true))
            .filter((item) => (options.kind ? item.kind === options.kind : true))
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    function upsertPaymentOrder(nextOrder: PaymentOrderRecord): PaymentOrderRecord {
        const current = deps.paymentOrdersByUser.get(nextOrder.userId) ?? [];
        const next = [nextOrder, ...current.filter((item) => item.id !== nextOrder.id)];
        deps.paymentOrdersByUser.set(nextOrder.userId, next);
        void persistPaymentOrderToDb(nextOrder).catch((error) => {
            logger.warn('payment_orders persist failed', {
                orderId: nextOrder.id,
                error: error instanceof Error ? error.message : String(error),
            });
        });
        return nextOrder;
    }

    async function updatePaymentOrder(
        userId: string,
        orderId: string,
        updater: (current: PaymentOrderRecord) => PaymentOrderRecord,
    ): Promise<PaymentOrderRecord | null> {
        let current = deps.paymentOrdersByUser.get(userId) ?? [];
        let target = current.find((item) => item.id === orderId);

        if (!target && deps.loadPaymentOrderFromDb) {
            const loaded = await deps.loadPaymentOrderFromDb(orderId);
            if (loaded && loaded.userId === userId) {
                upsertPaymentOrder(loaded as PaymentOrderRecord);
                current = deps.paymentOrdersByUser.get(userId) ?? [];
                target = current.find((item) => item.id === orderId) ?? (loaded as PaymentOrderRecord);
            }
        }

        if (!target) return null;

        const nextOrder = updater(target);
        deps.paymentOrdersByUser.set(
            userId,
            [nextOrder, ...current.filter((item) => item.id !== orderId)],
        );
        void persistPaymentOrderToDb(nextOrder).catch((error) => {
            logger.warn('payment_orders persist failed', {
                orderId: nextOrder.id,
                error: error instanceof Error ? error.message : String(error),
            });
        });
        return nextOrder;
    }

    return {
        getPaymentOrdersForUser,
        upsertPaymentOrder,
        updatePaymentOrder,
        makePaymentOrderId,
    };
}
