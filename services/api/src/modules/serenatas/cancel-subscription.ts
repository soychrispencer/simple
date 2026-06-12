import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import { cancelPreapproval } from '../mercadopago/service.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';

export async function cancelSerenatasProSubscription(
    userId: string,
    hooks?: { clearInMemorySubscription?: (userId: string) => void },
): Promise<
    | { ok: true; message: string }
    | { ok: false; error: string; status: number }
> {
    const sub = await loadCurrentSubscriptionFromDb(userId, 'serenatas');
    if (!sub || (sub.planSlug !== 'essential' && sub.planSlug !== 'pro')) {
        return { ok: false, error: 'No tienes una suscripción activa.', status: 400 };
    }

    const preapprovalId = sub.providerSubscriptionId;
    if (preapprovalId && !isDevMercadoPagoPreapprovalId(preapprovalId)) {
        try {
            await cancelPreapproval(preapprovalId);
        } catch (error) {
            console.warn('[serenatas] MP cancel preapproval:', error);
        }
    }

    await persistUserSubscription({
        userId,
        accountId: sub.accountId,
        vertical: 'serenatas',
        planSlug: sub.planSlug,
        providerSubscriptionId: preapprovalId ?? `cancelled-${sub.id}`,
        providerStatus: 'cancelled',
        status: 'cancelled',
    });

    hooks?.clearInMemorySubscription?.(userId);

    return {
        ok: true,
        message: 'Suscripción cancelada. Al finalizar el período vigente, tu perfil puede quedar pausado hasta activar Esencial o Pro nuevamente. SimpleSerenatas no cobra comisión por serenata.',
    };
}
