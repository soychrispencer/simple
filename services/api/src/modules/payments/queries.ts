import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { paymentOrders } from '../../db/schema.js';

type PaymentOrderRow = typeof paymentOrders.$inferSelect;

/** Orden de pago hidratada desde PostgreSQL (compatible con el Map en memoria). */
export type HydratedPaymentOrder = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: string;
    kind: string;
    title: string;
    amount: number;
    currency: 'CLP';
    status: string;
    providerStatus: string | null;
    providerReferenceId: string | null;
    preferenceId: string | null;
    checkoutUrl: string | null;
    createdAt: number;
    updatedAt: number;
    appliedAt: number | null;
    appliedResourceId: string | null;
    metadata: Record<string, unknown>;
};

function asObjectRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

export function mapPaymentOrderRowToHydrated(row: PaymentOrderRow): HydratedPaymentOrder {
    const meta = asObjectRecord(row.metadata);
    const metadata = typeof meta.provider === 'string'
        ? meta
        : { ...meta, provider: row.provider };
    const providerResponse = asObjectRecord(row.providerResponse);
    const providerOrderId = row.providerOrderId?.trim() || null;
    const providerOrderIsNumeric = providerOrderId != null && /^\d+$/.test(providerOrderId);

    const preferenceId =
            typeof metadata.preferenceId === 'string'
            ? metadata.preferenceId
            : providerOrderId && !providerOrderIsNumeric
              ? providerOrderId
              : null;

    const providerReferenceId =
        typeof metadata.providerReferenceId === 'string'
            ? metadata.providerReferenceId
            : providerOrderIsNumeric
              ? providerOrderId
              : providerResponse.id != null
                ? String(providerResponse.id)
                : null;

    const checkoutUrl =
        typeof metadata.checkoutUrl === 'string'
            ? metadata.checkoutUrl
            : row.returnUrl ?? null;

    const appliedAt =
        row.paidAt?.getTime()
        ?? (typeof metadata.appliedAt === 'number' ? metadata.appliedAt : null);

    const externalId =
        typeof metadata.orderExternalId === 'string' && metadata.orderExternalId.trim()
            ? metadata.orderExternalId.trim()
            : row.id;

    return {
        id: externalId,
        accountId: row.accountId,
        userId: row.userId,
        vertical: row.vertical,
        kind: row.kind,
        title: row.title,
        amount: Number(row.amount),
        currency: 'CLP',
        status: row.status,
        providerStatus: row.providerStatus,
        providerReferenceId,
        preferenceId,
        checkoutUrl,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
        appliedAt,
        appliedResourceId:
            typeof metadata.appliedResourceId === 'string' ? metadata.appliedResourceId : null,
        metadata,
    };
}

/** Carga orden completa desde `payment_orders` (DB-first tras reinicio / otra réplica). */
export async function loadPaymentOrderFromDb(orderId: string): Promise<HydratedPaymentOrder | null> {
    const byExternal = await db
        .select()
        .from(paymentOrders)
        .where(sql`(${paymentOrders.metadata}->>'orderExternalId') = ${orderId}`)
        .limit(1);
    if (byExternal[0]) return mapPaymentOrderRowToHydrated(byExternal[0]);

    const rows = await db.select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return mapPaymentOrderRowToHydrated(row);
}

/** Resuelve orden MP por `external_reference` cuando no está en el Map en memoria. */
export async function findPaymentOrderByIdFromDb(orderId: string): Promise<{
    userId: string;
    order: HydratedPaymentOrder;
} | null> {
    const order = await loadPaymentOrderFromDb(orderId);
    if (!order) return null;
    return { userId: order.userId, order };
}

/** Listado de órdenes del usuario desde PostgreSQL (DB-first). */
export async function listPaymentOrdersForUserFromDb(
    userId: string,
    options: { vertical?: string; kind?: string; limit?: number } = {},
): Promise<HydratedPaymentOrder[]> {
    const conditions = [eq(paymentOrders.userId, userId)];
    if (options.vertical) conditions.push(eq(paymentOrders.vertical, options.vertical));
    if (options.kind) conditions.push(eq(paymentOrders.kind, options.kind));

    const rows = await db
        .select()
        .from(paymentOrders)
        .where(and(...conditions))
        .orderBy(desc(paymentOrders.updatedAt))
        .limit(options.limit ?? 100);

    return rows.map(mapPaymentOrderRowToHydrated);
}
