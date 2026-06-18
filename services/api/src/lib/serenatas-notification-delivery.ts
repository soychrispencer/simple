import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import {
    getUserNotificationPrefs,
    getUserNotificationPrefsBatch,
} from './user-notification-prefs.js';
import {
    sendSerenataAgendaEmail,
    sendSerenataInvitationEmail,
    sendSerenataRequestEmail,
} from './serenatas-email.js';

const SERENATA_TIMEZONE = 'America/Santiago';

function eventDateYmd(eventDate: Date | string): string | null {
    if (typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return eventDate;
    const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SERENATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

export async function deliverSerenataInvitation(
    userId: string,
    input: {
        title: string;
        message: string;
        groupName: string;
        recipientName?: string;
        panelPath?: string;
    },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;

    await sendSerenataInvitationEmail(prefs, {
        title: input.title,
        message: input.message,
        panelPath: input.panelPath,
    }).catch((error) => {
        console.error('[serenatas-notification] invitation email failed', { userId, error });
    });
}

export async function deliverSerenataInvitationBatch(
    items: Array<{
        userId: string;
        title: string;
        message: string;
        groupName: string;
        recipientName?: string;
        panelPath?: string;
    }>,
): Promise<void> {
    if (items.length === 0) return;
    const prefsMap = await getUserNotificationPrefsBatch(items.map((i) => i.userId));

    await Promise.all(items.map(async (item) => {
        const prefs = prefsMap.get(item.userId);
        if (!prefs) return;
        await sendSerenataInvitationEmail(prefs, {
            title: item.title,
            message: item.message,
            panelPath: item.panelPath,
        }).catch((error) => {
            console.error('[serenatas-notification] invitation email failed', { userId: item.userId, error });
        });
    }));
}

/** Solicitudes / estado de serenatas (cliente o dueño): correo bajo prefs de solicitudes. */
export async function deliverSerenataRequestNotification(
    userId: string,
    input: {
        title: string;
        message: string;
        panelPath?: string;
        eventDate?: Date | string;
        eventLabel?: string;
        recipientName?: string;
    },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;

    await sendSerenataRequestEmail(prefs, {
        title: input.title,
        message: input.message,
        panelPath: input.panelPath,
    }).catch((error) => {
        console.error('[serenatas-notification] request email failed', { userId, error });
    });
}

/** Agenda operativa: cierres post-evento y recordatorios de calendario (correo bajo prefs de agenda). */
export async function deliverSerenataAgendaNotification(
    userId: string,
    input: {
        title: string;
        message: string;
        panelPath?: string;
        eventDate?: Date | string;
        eventLabel?: string;
        recipientName?: string;
    },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;

    await sendSerenataAgendaEmail(prefs, {
        title: input.title,
        message: input.message,
        panelPath: input.panelPath,
    }).catch((error) => {
        console.error('[serenatas-notification] agenda email failed', { userId, error });
    });
}

export type AssignGroupSideEffects = {
    invitations: Array<{ userId: string; groupName: string }>;
    clientAgenda?: {
        userId: string;
        title: string;
        message: string;
        eventDate?: Date | string;
        eventLabel?: string;
    };
};

/** Ejecuta correo tras commit de assign-group (no bloquea la respuesta HTTP). */
export function flushAssignGroupSideEffects(sideEffects?: AssignGroupSideEffects): void {
    if (!sideEffects) return;
    if (sideEffects.invitations.length > 0) {
        void deliverSerenataInvitationBatch(sideEffects.invitations.map((row) => ({
            userId: row.userId,
            title: 'Nueva invitación',
            message: `Te invitaron al grupo ${row.groupName}.`,
            groupName: row.groupName,
            panelPath: '/panel/invitations',
        })));
    }
    if (sideEffects.clientAgenda) {
        void deliverSerenataRequestNotification(sideEffects.clientAgenda.userId, {
            title: sideEffects.clientAgenda.title,
            message: sideEffects.clientAgenda.message,
            panelPath: '/panel/serenatas',
            eventDate: sideEffects.clientAgenda.eventDate,
            eventLabel: sideEffects.clientAgenda.eventLabel,
        });
    }
}

export async function deliverSerenataPaymentPendingNotification(
    userId: string,
    input: {
        title: string;
        message: string;
        serenataLabel: string;
        recipientName?: string;
        panelPath?: string;
    },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;

    await sendSerenataRequestEmail(prefs, {
        title: input.title,
        message: input.message,
        panelPath: input.panelPath ?? '/panel',
    }).catch((error) => {
        console.error('[serenatas-notification] payment-pending email failed', { userId, error });
    });
}

// Re-export for email delivery logging used by serenatas-email
export { touchUserLastNotificationAt, logUserNotificationDelivery };
