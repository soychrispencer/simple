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
    shouldSendInvitationEmail,
    shouldSendRequestsEmail,
    type UserNotificationPrefs,
} from './user-notification-prefs.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { formatAuthFromAddress, getAuthMailerTransporter, isAuthEmailConfigured } from './auth-email.js';

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

async function sendSerenatasActionEmail(
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
    const brand = getEmailBrandProfile(serenatasAppUrl());
    await ensureEmailLogoCache();

    if (!transporter) {
        if (isProduction) {
            throw new Error('Serenatas email delivery is not configured');
        }
        console.info(`[serenatas-email] (dev) ${subject} → ${to}: ${input.actionUrl}`);
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
        subject: `${brand.appName}: ${subject}`,
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

    console.info('[serenatas-email] sent', {
        subject,
        messageId: info?.messageId,
        to,
    });
    return 'sent';
}

export async function sendSerenataInvitationEmail(
    prefs: UserNotificationPrefs,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendInvitationEmail(prefs)) {
        console.debug('[serenatas-email] invitation skipped (prefs)', { userId: prefs.userId });
        return;
    }
    await sendSerenatasActionEmail(prefs.email, input.title, {
        preheader: input.message,
        eyebrow: 'Invitación',
        headline: input.title,
        body: input.message,
        buttonLabel: 'Ver invitación',
        actionUrl: panelUrl(input.panelPath ?? '/panel/invitations'),
        footnote: 'También verás este aviso en la campana del panel.',
    });
    await touchUserLastNotificationAt(prefs.userId, 'email');
    await logUserNotificationDelivery(prefs.userId, 'email', 'invitation', input.title);
}

export async function sendSerenataRequestEmail(
    prefs: UserNotificationPrefs,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendRequestsEmail(prefs)) {
        console.debug('[serenatas-email] requests skipped (prefs)', { userId: prefs.userId });
        return;
    }
    await sendSerenatasActionEmail(prefs.email, input.title, {
        preheader: input.message,
        eyebrow: 'Solicitud',
        headline: input.title,
        body: input.message,
        buttonLabel: 'Ver en el panel',
        actionUrl: panelUrl(input.panelPath ?? '/panel/solicitudes'),
        footnote: 'También verás este aviso en la campana del panel.',
    });
    await touchUserLastNotificationAt(prefs.userId, 'email');
    await logUserNotificationDelivery(prefs.userId, 'email', 'request', input.title);
}

export async function sendSerenataAgendaEmail(
    prefs: UserNotificationPrefs,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    if (!shouldSendAgendaEmail(prefs)) {
        console.debug('[serenatas-email] agenda skipped (prefs)', { userId: prefs.userId });
        return;
    }
    await sendSerenatasActionEmail(prefs.email, input.title, {
        preheader: input.message,
        eyebrow: 'Agenda',
        headline: input.title,
        body: input.message,
        buttonLabel: 'Abrir panel',
        actionUrl: panelUrl(input.panelPath ?? '/panel/agenda'),
        footnote: 'Puedes desactivar estos correos en Mi negocio → Configuraciones.',
    });
    await touchUserLastNotificationAt(prefs.userId, 'email');
    await logUserNotificationDelivery(prefs.userId, 'email', 'agenda', input.title);
}

export async function sendSerenataAgendaEmailForUser(
    userId: string,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;
    await sendSerenataAgendaEmail(prefs, input);
}

export async function sendSerenataInvitationEmailForUser(
    userId: string,
    input: { title: string; message: string; panelPath?: string },
): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs) return;
    await sendSerenataInvitationEmail(prefs, input);
}

export async function sendSerenataGuestGroupInviteEmail(
    to: string,
    input: {
        musicianName: string;
        groupName: string;
        ownerName: string;
        signupUrl: string;
        message?: string | null;
    },
): Promise<'sent' | 'skipped_dev'> {
    const body = [
        `${input.ownerName} te invita a unirte al grupo ${input.groupName} en Simple Serenatas.`,
        input.message?.trim() ? input.message.trim() : null,
        'Crea tu cuenta de músico con el botón de abajo para quedar en el grupo.',
    ].filter(Boolean).join(' ');

    return sendSerenatasActionEmail(to, `Invitación al grupo ${input.groupName}`, {
        preheader: `Únete a ${input.groupName}`,
        eyebrow: 'Invitación al grupo',
        headline: `Hola ${input.musicianName}`,
        body,
        buttonLabel: 'Registrarme como músico',
        actionUrl: input.signupUrl,
        footnote: 'Si ya tienes cuenta, inicia sesión y acepta la invitación en tu panel.',
    });
}

export function isSerenatasEmailConfigured(): boolean {
    return isAuthEmailConfigured();
}
