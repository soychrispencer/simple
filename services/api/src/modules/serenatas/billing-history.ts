import type { PaymentOrderRecord } from '../../lib/domain-types.js';
import { listPaymentOrdersForUserFromDb } from '../payments/queries.js';
import { paymentOrderToResponse } from '../payments/presentation.js';

/** Órdenes de pago del usuario en vertical serenatas (suscripción Pro, reservas, etc.). */
export async function listSerenataBillingHistory(userId: string, limit = 50) {
    const rows = await listPaymentOrdersForUserFromDb(userId, { vertical: 'serenatas', limit });
    return rows.map((row) => paymentOrderToResponse(row as PaymentOrderRecord));
}
