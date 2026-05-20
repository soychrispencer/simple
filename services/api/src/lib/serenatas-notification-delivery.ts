import { sendVerticalTemplate } from '../modules/whatsapp/service.js';
import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import {
    getUserNotificationPrefs,
    getUserNotificationPrefsBatch,
    isSerenatasWhatsAppQuietHours,
    shouldSendSerenatasWhatsApp,
    type UserNotificationPrefs,
} from './user-notification-prefs.js';
import {
    sendSerenataAgendaEmail,
    sendSerenataInvitationEmail,
    sendSerenataRequestEmail,
} from './serenatas-email.js';

/** Template Meta: simpleserenatas_invitacion_grupo — params: nombre, grupo, enlace panel */
const WA_INVITATION_TEMPLATE = 'simpleserenatas_invitacion_grupo';
/** Template Meta: simpleserenatas_reserva_hoy — params: nombre, destinatario/evento, enlace panel */
const WA_BOOKING_TODAY_TEMPLATE = 'simpleserenatas_reserva_hoy';
/** Template Meta: simpleserenatas_pago_pendiente — params: nombre, destinatario, enlace pago */
const WA_PAYMENT_PENDING_TEMPLATE = 'simpleserenatas_pago_pendiente';

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

function serenatasAppUrl(): string {
    return (
        process.env.SERENATAS_APP_URL
        ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS
        ?? 'http://localhost:3005'
    ).replace(/\/$/, '');
}

function panelUrl(path = '/panel'): string {
    return `${serenatasAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function sendSerenatasWhatsAppUrgent(
    prefs: UserNotificationPrefs,
    templateName: string,
    bodyParams: string[],
    context: string,
): Promise<void> {
    if (!prefs.phone) return;
    if (isSerenatasWhatsAppQuietHours()) {
        console.debug('[serenatas-notification] WhatsApp deferred (quiet hours)', { context, userId: prefs.userId });
        return;
    }
    try {
        await sendVerticalTemplate('serenatas', prefs.phone, templateName, 'es', bodyParams);
        await touchUserLastNotificationAt(prefs.userId, 'whatsapp');
        await logUserNotificationDelivery(prefs.userId, 'whatsapp', context, templateName);
    } catch (error) {
        console.error(`[serenatas-notification] WhatsApp ${context} failed`, { userId: prefs.userId, error });
    }
}

async function maybeSendInvitationWhatsApp(
    prefs: UserNotificationPrefs,
    input: { recipientName: string; groupName: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendSerenatasWhatsApp(prefs, 'invitation')) return;
    const path = input.panelPath ?? '/panel/invitations';
    await sendSerenatasWhatsAppUrgent(
        prefs,
        WA_INVITATION_TEMPLATE,
        [input.recipientName || 'Hola', input.groupName, panelUrl(path)],
        'invitation',
    );
}

async function maybeSendBookingTodayWhatsApp(
    prefs: UserNotificationPrefs,
    input: { recipientName: string; eventLabel: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendSerenatasWhatsApp(prefs, 'agenda')) return;
    const path = input.panelPath ?? '/panel/agenda';
    await sendSerenatasWhatsAppUrgent(
        prefs,
        WA_BOOKING_TODAY_TEMPLATE,
        [input.recipientName || 'Hola', input.eventLabel, panelUrl(path)],
        'booking-today',
    );
}

async function maybeSendPaymentPendingWhatsApp(
    prefs: UserNotificationPrefs,
    input: { recipientName: string; serenataLabel: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendSerenatasWhatsApp(prefs, 'requests')) return;
    const path = input.panelPath ?? '/panel';
    await sendSerenatasWhatsAppUrgent(
        prefs,
        WA_PAYMENT_PENDING_TEMPLATE,
        [input.recipientName || 'Hola', input.serenataLabel, panelUrl(path)],
        'payment-pending',
    );
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

    await Promise.all([
        sendSerenataInvitationEmail(prefs, {
            title: input.title,
            message: input.message,
            panelPath: input.panelPath,
        }).catch((error) => {
            console.error('[serenatas-notification] invitation email failed', { userId, error });
        }),
        maybeSendInvitationWhatsApp(prefs, {
            recipientName: input.recipientName ?? prefs.email,
            groupName: input.groupName,
            panelPath: input.panelPath,
        }),
    ]);
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
        await Promise.all([
            sendSerenataInvitationEmail(prefs, {
                title: item.title,
                message: item.message,
                panelPath: item.panelPath,
            }).catch((error) => {
                console.error('[serenatas-notification] invitation email failed', { userId: item.userId, error });
            }),
            maybeSendInvitationWhatsApp(prefs, {
                recipientName: item.recipientName ?? prefs.email,
                groupName: item.groupName,
                panelPath: item.panelPath,
            }),
        ]);
    }));
}

function maybeScheduleBookingTodayWhatsApp(
    prefs: UserNotificationPrefs,
    input: {
        eventDate?: Date | string;
        eventLabel?: string;
        recipientName?: string;
        panelPath?: string;
        title: string;
    },
    tasks: Promise<void>[],
): void {
    if (!input.eventDate) return;
    const today = eventDateYmd(new Date());
    const eventDay = eventDateYmd(input.eventDate);
    if (!today || !eventDay || today !== eventDay) return;
    tasks.push(maybeSendBookingTodayWhatsApp(prefs, {
        recipientName: input.recipientName ?? prefs.email,
        eventLabel: input.eventLabel ?? input.title,
        panelPath: input.panelPath,
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

    const tasks: Promise<void>[] = [
        sendSerenataRequestEmail(prefs, {
            title: input.title,
            message: input.message,
            panelPath: input.panelPath,
        }).catch((error) => {
            console.error('[serenatas-notification] request email failed', { userId, error });
        }),
    ];
    maybeScheduleBookingTodayWhatsApp(prefs, input, tasks);
    await Promise.all(tasks);
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

    const tasks: Promise<void>[] = [
        sendSerenataAgendaEmail(prefs, {
            title: input.title,
            message: input.message,
            panelPath: input.panelPath,
        }).catch((error) => {
            console.error('[serenatas-notification] agenda email failed', { userId, error });
        }),
    ];
    maybeScheduleBookingTodayWhatsApp(prefs, input, tasks);
    await Promise.all(tasks);
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

/** Ejecuta correo/WhatsApp tras commit de assign-group (no bloquea la respuesta HTTP). */
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

    await Promise.all([
        sendSerenataRequestEmail(prefs, {
            title: input.title,
            message: input.message,
            panelPath: input.panelPath ?? '/panel',
        }).catch((error) => {
            console.error('[serenatas-notification] payment-pending email failed', { userId, error });
        }),
        maybeSendPaymentPendingWhatsApp(prefs, {
            recipientName: input.recipientName ?? prefs.email,
            serenataLabel: input.serenataLabel,
            panelPath: input.panelPath ?? '/panel',
        }),
    ]);
}
