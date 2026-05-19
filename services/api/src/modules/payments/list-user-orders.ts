import type { HydratedPaymentOrder } from './queries.js';
import type { PaymentOrderRecord } from './order-cache.js';

export type ListUserPaymentOrdersDeps = {
    getPaymentOrdersForUser: (
        userId: string,
        options?: { vertical?: string; kind?: string },
    ) => PaymentOrderRecord[];
    listPaymentOrdersForUserFromDb?: (
        userId: string,
        options?: { vertical?: string; kind?: string; limit?: number },
    ) => Promise<HydratedPaymentOrder[]>;
    upsertPaymentOrder: (order: PaymentOrderRecord) => PaymentOrderRecord;
};

/**
 * Lista órdenes del usuario fusionando PostgreSQL (fuente) con el Map en memoria.
 * Si el mismo id existe en ambos, gana la copia con `updatedAt` más reciente.
 */
export async function listUserPaymentOrdersMerged(
    deps: ListUserPaymentOrdersDeps,
    userId: string,
    options: { vertical?: string; kind?: string; limit?: number } = {},
): Promise<PaymentOrderRecord[]> {
    const limit = options.limit ?? 100;
    const fromMap = deps.getPaymentOrdersForUser(userId, options);

    if (!deps.listPaymentOrdersForUserFromDb) {
        return fromMap.slice(0, limit);
    }

    const fromDb = await deps.listPaymentOrdersForUserFromDb(userId, { ...options, limit });
    const byId = new Map<string, PaymentOrderRecord>();

    for (const row of fromDb) {
        byId.set(row.id, deps.upsertPaymentOrder(row as PaymentOrderRecord));
    }

    for (const row of fromMap) {
        const existing = byId.get(row.id);
        if (!existing || row.updatedAt >= existing.updatedAt) {
            byId.set(row.id, row);
        }
    }

    return [...byId.values()]
        .filter((item) => (options.vertical ? item.vertical === options.vertical : true))
        .filter((item) => (options.kind ? item.kind === options.kind : true))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}
