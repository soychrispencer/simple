import { desc, gte, or, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { paymentOrders } from '../../db/schema.js';
import { mapPaymentOrderRowToHydrated, type HydratedPaymentOrder } from './queries.js';

const DEFAULT_DAYS_BACK = 30;
const DEFAULT_LIMIT = 2_000;
export type LoadPaymentOrdersCacheOptions = {
    /** Días hacia atrás para órdenes no pendientes (default 30). */
    daysBack?: number;
    /** Máximo de filas a cargar (default 2000). */
    limit?: number;
};

/**
 * Carga órdenes recientes o pendientes desde PostgreSQL para hidratar `paymentOrdersByUser`.
 * Incluye pending/authorized y cualquier orden creada en los últimos N días.
 */
export async function loadPaymentOrdersCache(
    options: LoadPaymentOrdersCacheOptions = {},
): Promise<Map<string, HydratedPaymentOrder[]>> {
    const daysBack = options.daysBack ?? DEFAULT_DAYS_BACK;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const rows = await db
        .select()
        .from(paymentOrders)
        .where(
            or(
                eq(paymentOrders.status, 'pending'),
                eq(paymentOrders.status, 'authorized'),
                gte(paymentOrders.createdAt, since),
            ),
        )
        .orderBy(desc(paymentOrders.updatedAt))
        .limit(limit);

    const byUser = new Map<string, HydratedPaymentOrder[]>();
    for (const row of rows) {
        const order = mapPaymentOrderRowToHydrated(row);
        const list = byUser.get(order.userId) ?? [];
        if (!list.some((item) => item.id === order.id)) {
            list.push(order);
            byUser.set(order.userId, list);
        }
    }

    for (const [userId, list] of byUser) {
        list.sort((a, b) => b.createdAt - a.createdAt);
        byUser.set(userId, list);
    }

    return byUser;
}
