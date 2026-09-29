import { isProduction } from '../env.js';
import { getAgendaEmailBrand } from './email-brand.js';
import { ensureEmailLogoCache } from './email-brand-logo.js';
import {
    buildActionEmailPackage,
    buildActionEmailText,
    escapeHtml,
} from './email-template.js';
import {
    formatAuthFromAddress,
    getAuthMailerTransporter,
} from './auth-email.js';
import {
    getUserNotificationPrefs,
    shouldSendAccountEmail,
} from './user-notification-prefs.js';

export type AgendaTrialEmailKind = 'trial_d7' | 'trial_d3' | 'trial_d1' | 'trial_expired';

const COPY: Record<AgendaTrialEmailKind, {
    subject: string;
    headline: string;
    body: string;
    button: string;
}> = {
    trial_d7: {
        subject: 'Te quedan 7 días de prueba en Simple Agenda',
        headline: 'Quedan 7 días de tu prueba',
        body: 'Sigue recibiendo reservas, recordatorios y cobros sin interrupciones. Activa Pro cuando quieras continuar después de la prueba.',
        button: 'Ver planes',
    },
    trial_d3: {
        subject: 'Quedan 3 días de tu prueba en Simple Agenda',
        headline: 'Tu prueba termina en 3 días',
        body: 'Al terminar la prueba, el panel se restringe y tu link público deja de recibir reservas hasta que actives Pro.',
        button: 'Activar Pro',
    },
    trial_d1: {
        subject: 'Mañana termina tu prueba en Simple Agenda',
        headline: 'Último día de prueba mañana',
        body: 'Activa Pro ahora para no perder el acceso a tu agenda, clientes y perfil público.',
        button: 'Activar Pro',
    },
    trial_expired: {
        subject: 'Tu prueba en Simple Agenda terminó',
        headline: 'La prueba de 30 días terminó',
        body: 'Tu panel está restringido y tu perfil público ya no recibe reservas. Activa Pro para retomar todo donde lo dejaste.',
        button: 'Activar Pro',
    },
};

function subscriptionUrl(): string {
    const base = (process.env.AGENDA_APP_URL || 'https://simpleagenda.app').replace(/\/$/, '');
    return `${base}/panel/mi-cuenta/suscripcion`;
}

export async function sendAgendaTrialEmail(input: {
    email: string;
    name: string;
    userId: string;
    kind: AgendaTrialEmailKind;
}): Promise<'sent' | 'skipped' | 'failed'> {
    const prefs = await getUserNotificationPrefs(input.userId);
    if (prefs && !shouldSendAccountEmail(prefs)) {
        return 'skipped';
    }

    await ensureEmailLogoCache();
    const brand = getAgendaEmailBrand();
    const copy = COPY[input.kind];
    const actionUrl = subscriptionUrl();
    const transporter = getAuthMailerTransporter();

    if (!transporter) {
        if (isProduction) {
            console.error('[agenda-trial-email] SMTP no configurado');
            return 'failed';
        }
        console.info(`[agenda-trial-email] ${input.kind} → ${input.email}: ${actionUrl}`);
        return 'sent';
    }

    const greeting = input.name?.trim() ? `Hola ${input.name.trim()},` : 'Hola,';
    const bodyHtml = `<p style="margin:0 0 12px;">${escapeHtml(greeting)}</p><p style="margin:0;">${escapeHtml(copy.body)}</p>`;
    const mail = buildActionEmailPackage({
        brand,
        preheader: copy.subject,
        eyebrow: 'Suscripción',
        headline: copy.headline,
        bodyHtml,
        buttonLabel: copy.button,
        actionUrl,
        footnote: 'Si ya activaste Pro, puedes ignorar este correo.',
    });

    try {
        await transporter.sendMail({
            from: formatAuthFromAddress(brand),
            to: input.email,
            subject: copy.subject,
            text: buildActionEmailText({
                appName: brand.appName,
                headline: copy.headline,
                body: `${greeting} ${copy.body}`,
                buttonLabel: copy.button,
                actionUrl,
                footnote: 'Si ya activaste Pro, puedes ignorar este correo.',
                supportEmail: brand.supportEmail,
            }),
            html: mail.html,
            attachments: mail.attachments,
        });
        return 'sent';
    } catch (err) {
        console.error('[agenda-trial-email] send failed', err);
        return 'failed';
    }
}
