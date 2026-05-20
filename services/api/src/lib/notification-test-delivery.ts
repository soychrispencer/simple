import { isProduction } from '../env.js';
import { getEmailBrandProfile } from './email-brand.js';
import { ensureEmailLogoCache } from './email-brand-logo.js';
import { buildActionEmailPackage, buildActionEmailText, escapeHtml } from './email-template.js';
import { formatAuthFromAddress, getAuthMailerTransporter } from './auth-email.js';
import { sendVerticalTemplate } from '../modules/whatsapp/service.js';
import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import {
    getUserNotificationPrefs,
    isSerenatasWhatsAppQuietHours,
    shouldSendSerenatasWhatsApp,
} from './user-notification-prefs.js';

const TEST_EMAIL_SUBJECT = 'Prueba de notificaciones';
const TEST_WA_TEMPLATE = 'simpleserenatas_invitacion_grupo';

function serenatasAppUrl(): string {
    return (
        process.env.SERENATAS_APP_URL
        ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS
        ?? 'http://localhost:3005'
    ).replace(/\/$/, '');
}

export async function sendNotificationTestEmail(userId: string, email: string, name: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getEmailBrandProfile(serenatasAppUrl());
    await ensureEmailLogoCache();
    const panelUrl = `${serenatasAppUrl()}/panel?account_tab=notifications`;
    const body = `Hola ${name || 'equipo'}, este es un correo de prueba desde ${brand.appName}. Si lo recibiste, el canal de correo funciona.`;

    if (!transporter) {
        if (isProduction) {
            throw new Error('Correo no configurado en el servidor');
        }
        console.info(`[notification-test] (dev) email → ${email}: ${panelUrl}`);
        await touchUserLastNotificationAt(userId, 'email');
        await logUserNotificationDelivery(userId, 'email', 'test', TEST_EMAIL_SUBJECT);
        return;
    }

    const mail = buildActionEmailPackage({
        brand,
        preheader: `${brand.appName} · prueba de correo`,
        eyebrow: 'Prueba',
        headline: 'Correo de prueba',
        bodyHtml: `<p style="margin:0;">${escapeHtml(body)}</p>`,
        buttonLabel: 'Abrir notificaciones',
        actionUrl: panelUrl,
        footnote: 'Puedes ignorar este mensaje; no implica ningún cambio en tu cuenta.',
    });

    await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: ${TEST_EMAIL_SUBJECT}`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline: 'Correo de prueba',
            body,
            buttonLabel: 'Abrir notificaciones',
            actionUrl: panelUrl,
            footnote: 'Puedes ignorar este mensaje.',
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });
    await touchUserLastNotificationAt(userId, 'email');
    await logUserNotificationDelivery(userId, 'email', 'test', TEST_EMAIL_SUBJECT);
}

export async function sendNotificationTestWhatsApp(userId: string): Promise<{ deferredQuietHours?: boolean }> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs || !shouldSendSerenatasWhatsApp(prefs) || !prefs.phone) {
        throw new Error(
            'Activa WhatsApp en al menos una categoría (Invitaciones, Agenda o Cuenta) y agrega un móvil chileno en Datos personales.',
        );
    }
    if (isSerenatasWhatsAppQuietHours()) {
        await touchUserLastNotificationAt(userId, 'whatsapp');
        await logUserNotificationDelivery(userId, 'whatsapp', 'test', 'Prueba (horario silencioso)');
        return { deferredQuietHours: true };
    }

    const panelUrl = `${serenatasAppUrl()}/panel?account_tab=notifications`;
    try {
        await sendVerticalTemplate(
            'serenatas',
            prefs.phone,
            TEST_WA_TEMPLATE,
            'es',
            [prefs.email.split('@')[0] || 'Hola', 'Prueba Simple Serenatas', panelUrl],
        );
    } catch (error) {
        if (!isProduction) {
            console.info('[notification-test] (dev) WhatsApp falló, simulando envío', { userId, error });
            await touchUserLastNotificationAt(userId, 'whatsapp');
            await logUserNotificationDelivery(userId, 'whatsapp', 'test', 'Prueba WhatsApp (simulado)');
            return {};
        }
        throw error;
    }
    await touchUserLastNotificationAt(userId, 'whatsapp');
    await logUserNotificationDelivery(userId, 'whatsapp', 'test', 'Prueba WhatsApp');
    return {};
}
