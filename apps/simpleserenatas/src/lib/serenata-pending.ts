import type { Serenata } from '@/lib/serenatas-api';

/** Estados que suelen requerir acción inmediata del dueño en home / alertas. */
export const ADMIN_ACTION_STATUSES = [
    'pending',
    'accepted_pending_group',
] as const satisfies readonly Serenata['status'][];

/** Bandeja principal de Solicitudes (acción inmediata). */
export const ADMIN_SOLICITUDES_INBOX_STATUSES = [
    'pending',
    'pending_open',
    'accepted_pending_group',
] as const satisfies readonly Serenata['status'][];

/** Filtro opcional “Cerradas” en Solicitudes. */
export const ADMIN_SOLICITUDES_TERMINAL_STATUSES = [
    'rejected',
    'expired',
    'cancelled',
] as const satisfies readonly Serenata['status'][];

/** Solo en Agenda (operación / histórico reciente). */
export const ADMIN_SOLICITUDES_AGENDA_STATUSES = [
    'scheduled',
    'completed',
] as const satisfies readonly Serenata['status'][];

/** Solicitud de app o marketplace directo al mariachi, pendiente de respuesta del dueño. */
export function isPendingSerenataAction(item: Serenata): boolean {
    if (item.source !== 'platform_lead' || item.status !== 'pending') return false;
    if (item.offerStatus === 'offered') return true;
    return Boolean(item.providerGroupId);
}

/** Marketplace pagado que requiere acción del dueño (alertas en vivo del panel). */
export function isOwnerMarketplaceActionAlert(item: Serenata): boolean {
    if (item.source !== 'platform_lead') return false;
    if (item.status === 'pending_open' || item.status === 'accepted_pending_group') return true;
    return isPendingSerenataAction(item);
}

/** Métrica unificada de “pendiente” en home del dueño (KPI + tarjetas). */
export function isOwnerHomePendingMetric(item: Serenata): boolean {
    if (ADMIN_ACTION_STATUSES.includes(item.status as (typeof ADMIN_ACTION_STATUSES)[number])) {
        return true;
    }
    return isPendingSerenataAction(item);
}

export function isOwnerSolicitudesInbox(item: Serenata): boolean {
    if (ADMIN_SOLICITUDES_INBOX_STATUSES.includes(item.status as (typeof ADMIN_SOLICITUDES_INBOX_STATUSES)[number])) {
        return true;
    }
    return isPendingSerenataAction(item);
}

/** Ítems que pueden mostrarse en Solicitudes (inbox + cerradas opcionales). */
export function appearsInOwnerSolicitudes(item: Serenata): boolean {
    if (isOwnerSolicitudesInbox(item)) return true;
    return ADMIN_SOLICITUDES_TERMINAL_STATUSES.includes(
        item.status as (typeof ADMIN_SOLICITUDES_TERMINAL_STATUSES)[number],
    );
}

export function isAdminAgendaOnlyStatus(status: Serenata['status']): boolean {
    return ADMIN_SOLICITUDES_AGENDA_STATUSES.includes(
        status as (typeof ADMIN_SOLICITUDES_AGENDA_STATUSES)[number],
    );
}
