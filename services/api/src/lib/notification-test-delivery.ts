import { isProduction } from '../env.js';
import { getEmailBrandProfile } from './email-brand.js';
import { ensureEmailLogoCache } from './email-brand-logo.js';
import { buildActionEmailPackage, buildActionEmailText, escapeHtml } from './email-template.js';
import { formatAuthFromAddress, getAuthMailerTransporter } from './auth-email.js';
import { touchUserLastNotificationAt } from './notification-delivery-meta.js';
import { logUserNotificationDelivery } from './user-notification-log.js';
import { getUserNotificationPrefs, shouldSendAccountEmail } from './user-notification-prefs.js';

const TEST_EMAIL_SUBJECT = 'Prueba de notificaciones';

function appPanelUrl(): string {
    return (
        process.env.SERENATAS_APP_URL
        ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS
        ?? 'http://localhost:3005'
    ).replace(/\/$/, '');
}

export async function sendNotificationTestEmail(userId: string, email: string, name: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getEmailBrandProfile(appPanelUrl());
    await ensureEmailLogoCache();
    const panelUrl = `${appPanelUrl()}/panel?account_tab=notifications`;
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

export async function sendNotificationTestInApp(userId: string): Promise<void> {
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs || !shouldSendAccountEmail(prefs)) {
        throw new Error('Activa las notificaciones por correo en Mi cuenta → Notificaciones.');
    }
    await logUserNotificationDelivery(userId, 'in_app', 'test', 'Prueba de notificación');
}
