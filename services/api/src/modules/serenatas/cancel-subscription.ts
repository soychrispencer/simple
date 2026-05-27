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
    if (!sub || sub.planSlug !== 'pro') {
        return { ok: false, error: 'No tienes una suscripción Pro activa.', status: 400 };
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
        planSlug: 'pro',
        providerSubscriptionId: preapprovalId ?? `cancelled-${sub.id}`,
        providerStatus: 'cancelled',
        status: 'cancelled',
    });

    hooks?.clearInMemorySubscription?.(userId);

    return {
        ok: true,
        message: 'Suscripción Pro cancelada. Vuelves al plan Gratis; la comisión en serenatas por Simple será 15% + IVA.',
    };
}
