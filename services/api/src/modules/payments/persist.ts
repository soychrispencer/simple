import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { paymentOrders } from '../../db/schema.js';

/** Campos mínimos de una orden en memoria para persistir en PostgreSQL. */
export type PaymentOrderPersistInput = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: string;
    kind: string;
    title: string;
    amount: number;
    currency: string;
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

export function buildPaymentOrderMetadata(order: PaymentOrderPersistInput): Record<string, unknown> {
    return {
        ...order.metadata,
        orderExternalId: order.id,
        ...(order.preferenceId ? { preferenceId: order.preferenceId } : {}),
        ...(order.providerReferenceId ? { providerReferenceId: order.providerReferenceId } : {}),
        ...(order.checkoutUrl ? { checkoutUrl: order.checkoutUrl } : {}),
        ...(order.appliedResourceId ? { appliedResourceId: order.appliedResourceId } : {}),
        ...(order.appliedAt != null ? { appliedAt: order.appliedAt } : {}),
    };
}

export function resolveProviderOrderId(order: PaymentOrderPersistInput): string | null {
    return order.preferenceId ?? order.providerReferenceId ?? null;
}

/** Inserta o actualiza fila en `payment_orders` (id interno UUID; `orderExternalId` en metadata). */
export async function persistPaymentOrderToDb(order: PaymentOrderPersistInput): Promise<void> {
    const metadata = buildPaymentOrderMetadata(order);
    const providerOrderId = resolveProviderOrderId(order);
    const providerResponse =
        order.providerReferenceId != null ? { id: order.providerReferenceId } : {};

    const rowValues = {
        accountId: order.accountId ?? null,
        userId: order.userId,
        vertical: order.vertical,
        kind: order.kind,
        title: order.title,
        amount: String(order.amount),
        currency: order.currency,
        status: order.status,
        provider: 'mercadopago' as const,
        providerOrderId,
        providerStatus: order.providerStatus,
        providerResponse,
        metadata,
        returnUrl: order.checkoutUrl,
        paidAt: order.appliedAt != null ? new Date(order.appliedAt) : null,
        updatedAt: new Date(order.updatedAt),
    };

    const existing = await db
        .select({ id: paymentOrders.id })
        .from(paymentOrders)
        .where(sql`(${paymentOrders.metadata}->>'orderExternalId') = ${order.id}`)
        .limit(1);

    const existingId = existing[0]?.id;
    if (existingId) {
        await db.update(paymentOrders).set(rowValues).where(eq(paymentOrders.id, existingId));
        return;
    }

    await db.insert(paymentOrders).values({
        id: randomUUID(),
        ...rowValues,
        createdAt: new Date(order.createdAt),
    });
}
