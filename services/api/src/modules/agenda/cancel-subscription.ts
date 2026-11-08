import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import { cancelPreapproval } from '../mercadopago/service.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';
import { downgradeAgendaProfileAccess, getAgendaProfile, isAgendaProActive } from './plan-limits.js';
import { AGENDA_PRICING } from '@simple/utils';

/**
 * Cancela una suscripción de Agenda: preapproval MP + suscripción DB + perfil Gratis.
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
    const hasDbPro = Boolean(sub && (sub.planSlug === 'pro' || sub.planSlug === 'pro_plus'));
    const hasProfilePro = isAgendaProActive(profile);

    if (!hasDbPro && !hasProfilePro) {
        return { ok: false, error: 'No tienes un plan pagado activo que cancelar.', status: 400 };
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
            planSlug: sub.planSlug as 'pro' | 'pro_plus',
            billingCycle: sub.billingCycle,
            providerSubscriptionId: preapprovalId ?? `cancelled-${sub.id}`,
            providerStatus: 'cancelled',
            status: 'cancelled',
        });
    }
    await downgradeAgendaProfileAccess(userId);

    hooks?.clearInMemorySubscription?.(userId);

    return {
        ok: true,
        message: `Suscripción cancelada. No se renovará el cobro. Tu cuenta pasa a Gratis y mantiene perfil público, datos y hasta ${AGENDA_PRICING.free.monthlyBookings} reservas creadas al mes; las canceladas también cuentan.`,
    };
}
