import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import { cancelPreapproval } from '../mercadopago/service.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';
import type { SerenataBillingProfileType } from '../../lib/domain-types.js';

export async function cancelSerenatasProSubscription(
    userId: string,
    billingProfileType: SerenataBillingProfileType = 'provider',
    hooks?: { clearInMemorySubscription?: (userId: string, billingProfileType: SerenataBillingProfileType) => void },
): Promise<
    | { ok: true; message: string }
    | { ok: false; error: string; status: 400 | 502 }
> {
    const sub = await loadCurrentSubscriptionFromDb(userId, 'serenatas', undefined, { billingProfileType });
    if (!sub || sub.planSlug !== 'pro') {
        return { ok: false, error: 'No tienes una suscripción activa.', status: 400 };
    }

    const preapprovalId = sub.providerSubscriptionId;
    const skipMpCancel =
        !preapprovalId
        || isDevMercadoPagoPreapprovalId(preapprovalId)
        || preapprovalId.startsWith('admin-manual-')
        || preapprovalId.startsWith('cancelled-');

    if (!skipMpCancel) {
        try {
            await cancelPreapproval(preapprovalId);
        } catch (error) {
            console.warn('[serenatas] MP cancel preapproval:', error);
            return {
                ok: false,
                error: 'No pudimos cancelar el cobro en Mercado Pago. Intenta de nuevo o contacta soporte.',
                status: 502,
            };
        }
    }

    await persistUserSubscription({
        userId,
        accountId: sub.accountId,
        vertical: 'serenatas',
        billingProfileType,
        planSlug: sub.planSlug,
        providerSubscriptionId: preapprovalId ?? `cancelled-${sub.id}`,
        providerStatus: 'cancelled',
        status: 'cancelled',
    });

    hooks?.clearInMemorySubscription?.(userId, billingProfileType);

    return {
        ok: true,
        message: 'Suscripción cancelada. Al finalizar el período vigente, tu perfil puede quedar pausado hasta activar Pro nuevamente. SimpleSerenatas no cobra comisión por serenata.',
    };
}
