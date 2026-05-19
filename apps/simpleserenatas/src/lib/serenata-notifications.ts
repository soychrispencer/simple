import type { PanelNotification } from '@simple/marketplace-header';
import type { SerenatasPanelNotification } from '@/lib/serenatas-api';

/** Tipo almacenado en DB (`serenata_notifications.type`). */
export type SerenataNotificationKind =
    | 'group_invitation'
    | 'provider_group_invitation'
    | 'provider_group_request'
    | 'platform_serenata_offer'
    | 'provider_group_application_approved'
    | 'provider_group_application_rejected'
    | 'client_serenata_accepted'
    | 'client_serenata_scheduled'
    | 'client_serenata_cancelled'
    | 'client_serenata_completed'
    | 'client_serenata_rejected'
    | 'client_serenata_expired'
    | 'provider_group_request_reminder'
    | 'provider_group_request_expired'
    | 'provider_group_request_cancelled'
    | 'serenata_closure_reminder'
    | string;

export function mapSerenataNotificationPanelType(kind: string): PanelNotification['type'] {
    switch (kind) {
        case 'group_invitation':
        case 'provider_group_invitation':
        case 'provider_group_application_approved':
        case 'provider_group_application_rejected':
            return 'message_thread';
        case 'platform_serenata_offer':
        case 'provider_group_request':
            return 'service_lead';
        default:
            if (kind.startsWith('client_')) return 'service_lead';
            return 'service_lead';
    }
}

export function serenataNotificationCategoryLabel(kind: string): string {
    switch (kind) {
        case 'group_invitation':
            return 'Invitación a jornada';
        case 'provider_group_invitation':
            return 'Invitación al plantel';
        case 'provider_group_request':
            return 'Nueva solicitud';
        case 'platform_serenata_offer':
            return 'Oferta de plataforma';
        case 'provider_group_application_approved':
            return 'Alta aprobada';
        case 'provider_group_application_rejected':
            return 'Alta rechazada';
        case 'client_serenata_accepted':
            return 'Solicitud aceptada';
        case 'client_serenata_scheduled':
            return 'Serenata confirmada';
        case 'client_serenata_cancelled':
            return 'Serenata cancelada';
        case 'client_serenata_completed':
            return 'Serenata completada';
        case 'client_serenata_rejected':
            return 'Solicitud rechazada';
        case 'client_serenata_expired':
            return 'Solicitud expirada';
        case 'provider_group_request_reminder':
            return 'Recordatorio SLA';
        case 'provider_group_request_expired':
            return 'Solicitud expirada';
        case 'provider_group_request_cancelled':
            return 'Solicitud cancelada';
        case 'serenata_closure_reminder':
            return 'Cierre pendiente';
        default:
            return 'Actualización';
    }
}

export function toPanelNotification(item: SerenatasPanelNotification): PanelNotification {
    const kind = item.kind ?? item.type;
    return {
        id: item.id,
        type: mapSerenataNotificationPanelType(kind),
        title: item.title,
        time: item.time,
        href: item.href,
        createdAt: item.createdAt,
        categoryLabel: serenataNotificationCategoryLabel(kind),
    };
}
