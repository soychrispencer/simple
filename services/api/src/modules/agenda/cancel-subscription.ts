import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import { cancelPreapproval } from '../mercadopago/service.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';
import { downgradeAgendaProfileAccess, getAgendaProfile, isAgendaProActive } from './plan-limits.js';

/**
 * Cancela Pro de Agenda: preapproval MP (si aplica) + suscripción DB + perfil free expirado.
 */
export async function cancelAgendaProSubscription(
    userId: string,
    hooks?: { clearInMemorySubscription?: (userId: string) => void },
): Promise<
    | { ok: true; message: string }
    | { ok: false; error: string; status: number }
> {
    const profile = await getAgendaProfile(userId);
    if (!profile) {
        return { ok: false, error: 'Perfil no encontrado.', status: 404 };
    }

    const sub = await loadCurrentSubscriptionFromDb(userId, 'agenda');
    const hasDbPro = Boolean(sub && sub.planSlug === 'pro');
    const hasProfilePro = isAgendaProActive(profile);

    if (!hasDbPro && !hasProfilePro) {
        return { ok: false, error: 'No tienes un plan Pro activo que cancelar.', status: 400 };
    }

    const preapprovalId = sub?.providerSubscriptionId ?? null;
    const skipMpCancel =
        !preapprovalId
        || isDevMercadoPagoPreapprovalId(preapprovalId)
        || preapprovalId.startsWith('admin-manual-')
        || preapprovalId.startsWith('cancelled-');

    if (!skipMpCancel) {
        try {
            await cancelPreapproval(preapprovalId);
        } catch (error) {
            console.warn('[agenda] MP cancel preapproval:', error);
            return {
                ok: false,
                error: 'No pudimos cancelar el cobro en Mercado Pago. Intenta de nuevo o contacta soporte.',
                status: 502,
            };
        }
    }

    if (sub && hasDbPro) {
        await persistUserSubscription({
            userId,
            accountId: sub.accountId,
            vertical: 'agenda',
            planSlug: 'pro',
            providerSubscriptionId: preapprovalId ?? `cancelled-${sub.id}`,
            providerStatus: 'cancelled',
            status: 'cancelled',
        });
    } else {
        await downgradeAgendaProfileAccess(userId);
    }

    hooks?.clearInMemorySubscription?.(userId);

    return {
        ok: true,
        message:
            'Suscripción cancelada. Ya no se renovará el cobro. Tu panel queda restringido hasta que actives Pro de nuevo; tu configuración se mantiene guardada.',
    };
}
