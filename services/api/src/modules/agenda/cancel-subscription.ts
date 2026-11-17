import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accountUsers } from '../../db/schema.js';
import { canManageAccountRole } from '../accounts/permissions.js';
import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import { cancelPreapproval } from '../mercadopago/service.js';
import { loadCurrentSubscriptionFromDb, persistUserSubscription } from '../subscriptions/persist-db.js';
import { downgradeAgendaProfileAccessById, getAgendaProfile, isAgendaProActive } from './plan-limits.js';
import { AGENDA_PRICING } from '@simple/utils';

/**
 * Cancela una suscripción de Agenda: preapproval MP + suscripción DB + perfil Gratis.
 */
export async function cancelAgendaProSubscription(
    userId: string,
    accountId: string,
    isPersonalAccount: boolean,
    hooks?: { clearInMemorySubscription?: (userId: string) => void },
    actingUserId?: string,
): Promise<
    | { ok: true; message: string }
    | { ok: false; error: string; status: number }
> {
    if (actingUserId) {
        const canManageNow = await db.transaction(async (tx) => {
            const [membership] = await tx.select({
                role: accountUsers.role,
                isDefault: accountUsers.isDefault,
            })
                .from(accountUsers)
                .where(and(
                    eq(accountUsers.accountId, accountId),
                    eq(accountUsers.userId, actingUserId),
                ))
                .limit(1)
                .for('update');
            return Boolean(membership?.isDefault && canManageAccountRole(membership.role));
        });
        if (!canManageNow) {
            return { ok: false, error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.', status: 403 };
        }
    }

    const profile = await getAgendaProfile(userId, accountId);
    const profileMatchesAccount = Boolean(
        profile && (profile.accountId === accountId || (!profile.accountId && isPersonalAccount)),
    );

    const sub = await loadCurrentSubscriptionFromDb(userId, 'agenda', accountId);
    const hasDbPro = Boolean(sub && (sub.planSlug === 'pro' || sub.planSlug === 'pro_plus'));
    const hasProfilePro = Boolean(profileMatchesAccount && profile && isAgendaProActive(profile));

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
    if (profileMatchesAccount && profile && !hasDbPro) {
        await downgradeAgendaProfileAccessById(profile.id);
    }

    hooks?.clearInMemorySubscription?.(userId);

    return {
        ok: true,
        message: `Suscripción cancelada. No se renovará el cobro. Tu cuenta pasa a Gratis y mantiene perfil público, datos y hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes; las canceladas también cuentan.`,
    };
}
