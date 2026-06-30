import { isProduction } from '../env.js';
import { getEmailBrandProfile } from './email-brand.js';
import { ensureEmailLogoCache } from './email-brand-logo.js';
import {
    buildActionEmailPackage,
    buildActionEmailText,
    escapeHtml,
} from './email-template.js';
import {
    getUserNotificationPrefs,
    shouldSendAgendaEmail,
    shouldSendRequestsEmail,
    type UserNotificationPrefs,
} from './user-notification-prefs.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { formatAuthFromAddress, getAuthMailerTransporter, isAuthEmailConfigured } from './auth-email.js';

function agendaAppUrl(): string {
    return (process.env.AGENDA_APP_URL ?? 'http://localhost:3004').replace(/\/$/, '');
}

function panelUrl(path = '/panel/agenda'): string {
    return `${agendaAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function sendAgendaActionEmail(
    to: string,
    subject: string,
    input: {
        preheader: string;
        eyebrow: string;
        headline: string;
        body: string;
        buttonLabel: string;
        actionUrl: string;
        footnote: string;
    },
): Promise<'sent' | 'skipped_dev'> {
    const transporter = getAuthMailerTransporter();
    const brand = getEmailBrandProfile(agendaAppUrl());
    await ensureEmailLogoCache();

    if (!transporter) {
        if (isProduction) {
            throw new Error('Agenda email delivery is not configured');
        }
        console.info(`[agenda-email] (dev) ${subject} → ${to}: ${input.actionUrl}`);
        return 'skipped_dev';
    }

    const mail = buildActionEmailPackage({
        brand,
        preheader: input.preheader,
        eyebrow: input.eyebrow,
        headline: input.headline,
        bodyHtml: `<p style="margin:0;">${escapeHtml(input.body)}</p>`,
        buttonLabel: input.buttonLabel,
        actionUrl: input.actionUrl,
        footnote: input.footnote,
    });

    const info = await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to,
        subject: `SimpleAgenda: ${subject}`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline: input.headline,
            body: input.body,
            buttonLabel: input.buttonLabel,
            actionUrl: input.actionUrl,
            footnote: input.footnote,
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });

    if (info.rejected?.length) {
        throw new Error(`Correo rechazado por el servidor SMTP: ${info.response ?? 'sin detalle'}`);
    }

    return 'sent';
}

export async function sendAgendaProfessionalNewBookingEmail(
    prefs: UserNotificationPrefs,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendRequestsEmail(prefs)) {
        console.debug('[agenda-email] new booking skipped (prefs)', { userId: prefs.userId });
        return;
    }
    await sendAgendaActionEmail(prefs.email, input.title, {
        preheader: input.message,
        eyebrow: 'Nueva reserva',
        headline: input.title,
        body: input.message,
        buttonLabel: 'Ver en el panel',
        actionUrl: panelUrl(input.panelPath ?? '/panel/agenda'),
        footnote: 'También verás este aviso en la campana del panel. Puedes desactivarlo en Mi negocio → Configuraciones.',
    });
    await touchUserLastNotificationAt(prefs.userId, 'email');
    await logUserNotificationDelivery(prefs.userId, 'email', 'professional_new_booking', input.title);
}

export async function sendAgendaProfessionalNewBookingEmailForUser(
    userId: string,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;
    await sendAgendaProfessionalNewBookingEmail(prefs, input);
}

export async function sendAgendaProfessionalCancellationEmail(
    prefs: UserNotificationPrefs,
    input: { clientName: string; dateLabel: string; reason?: string | null },
): Promise<void> {
    if (!shouldSendAgendaEmail(prefs)) {
        console.debug('[agenda-email] cancellation skipped (prefs)', { userId: prefs.userId });
        return;
    }
    const title = 'Un paciente canceló su cita';
    const reasonSuffix = input.reason ? ` Motivo: ${input.reason}` : '';
    const message = `${input.clientName} canceló la cita del ${input.dateLabel}.${reasonSuffix}`;
    await sendAgendaActionEmail(prefs.email, title, {
        preheader: message,
        eyebrow: 'Cancelación',
        headline: title,
        body: message,
        buttonLabel: 'Ver agenda',
        actionUrl: panelUrl('/panel/agenda'),
        footnote: 'Puedes desactivar estos avisos en Mi negocio → Configuraciones.',
    });
    await touchUserLastNotificationAt(prefs.userId, 'email');
    await logUserNotificationDelivery(prefs.userId, 'email', 'professional_cancellation', title);
}

export async function sendAgendaProfessionalCancellationEmailForUser(
    userId: string,
    input: { clientName: string; dateLabel: string; reason?: string | null },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;
    await sendAgendaProfessionalCancellationEmail(prefs, input);
}

export function isAgendaEmailConfigured(): boolean {
    return isAuthEmailConfigured();
}
