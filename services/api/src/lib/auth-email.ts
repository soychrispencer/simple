import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { isProduction, env } from '../env.js';
import { db } from '../db/index.js';
import { emailVerificationTokens } from '../db/schema.js';
import { asString } from '../modules/shared/index.js';
import { formatEmailFromAddress } from './smtp-from.js';
import { getEmailBrandProfile, type EmailBrandProfile } from './email-brand.js';
import { ensureEmailLogoCache } from './email-brand-logo.js';
import {
    buildActionEmailPackage,
    buildActionEmailText,
    escapeHtml,
    type ActionEmailPackage,
} from './email-template.js';
import {
    buildBookingEmailPackage,
    buildAppointmentReminderEmailPackage,
    fmtBookingDateTime,
    type BookingEmailData,
} from './booking-email.js';
import {
    getUserNotificationPrefs,
    getUserNotificationPrefsByEmail,
    shouldSendAccountEmail,
    shouldSendAgendaEmail,
} from './user-notification-prefs.js';

let passwordResetTransporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

const SESSION_SECRET = asString(env.SESSION_SECRET);
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 3;

function hashOpaqueToken(token: string): string {
    return createHash('sha256').update(`${SESSION_SECRET}:${token}`).digest('hex');
}

function buildPasswordResetUrl(origin: string, token: string): string {
    return `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

function buildEmailVerificationUrl(origin: string, token: string): string {
    const params = new URLSearchParams({
        token,
        returnTo: '/panel',
    });
    return `${origin}/auth/confirmar-correo?${params.toString()}`;
}

function isAuthEmailConfigured(): boolean {
    return Boolean(
        asString(process.env.SMTP_HOST)
        && asString(process.env.SMTP_FROM)
        && asString(process.env.SMTP_USER)
        && asString(process.env.SMTP_PASSWORD)
    );
}

export function getAuthMailerTransporter() {
    if (passwordResetTransporter !== undefined) return passwordResetTransporter;
    if (!isAuthEmailConfigured()) {
        passwordResetTransporter = null;
        return passwordResetTransporter;
    }
    passwordResetTransporter = nodemailer.createTransport({
        host: asString(process.env.SMTP_HOST),
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: asString(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: asString(process.env.SMTP_USER)
            ? {
                user: asString(process.env.SMTP_USER),
                pass: asString(process.env.SMTP_PASSWORD),
            }
            : undefined,
    });
    return passwordResetTransporter;
}


export function formatAuthFromAddress(brand: EmailBrandProfile): string {
    return formatEmailFromAddress(brand.appName);
}

async function brandForAuthEmail(origin: string): Promise<EmailBrandProfile> {
    await ensureEmailLogoCache();
    return getEmailBrandProfile(origin);
}

function buildAuthActionMail(
    brand: EmailBrandProfile,
    input: Omit<Parameters<typeof buildActionEmailPackage>[0], 'brand'>,
): ActionEmailPackage {
    const mail = buildActionEmailPackage({ brand, ...input });
    if (!mail.attachments.length) {
        console.warn('[auth-email] logo inline no disponible (reinicia la API)', { appId: brand.appId });
    }
    return mail;
}

/** Bloquea correos no críticos de cuenta (p. ej. bienvenida). Nunca usar en verify/reset. */
async function skipAccountEmail(userId: string | undefined, kind: string): Promise<boolean> {
    if (!userId) return false;
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs || shouldSendAccountEmail(prefs)) return false;
    console.debug('[auth-email] skipped (emailNotifyAccount off)', { kind, userId });
    return true;
}

async function skipAgendaEmail(clientEmail: string, kind: string): Promise<boolean> {
    const prefs = await getUserNotificationPrefsByEmail(clientEmail);
    if (!prefs || shouldSendAgendaEmail(prefs)) return false;
    console.debug('[auth-email] skipped (emailNotifyAgenda off)', { kind, email: clientEmail });
    return true;
}

function logAuthEmailDelivery(kind: string, brand: EmailBrandProfile, info: any): void {
    console.info(`[auth-email] ${kind} sent`, {
        appName: brand.appName,
        messageId: info?.messageId,
        accepted: Array.isArray(info?.accepted) ? info.accepted.length : 0,
        rejected: Array.isArray(info?.rejected) ? info.rejected.length : 0,
        response: info?.response,
    });
}

/**
 * Restablecimiento de contraseña: siempre se envía (seguridad crítica).
 * No respeta email_notify_account.
 */
async function sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    origin: string,
    _userId?: string,
): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = await brandForAuthEmail(origin);
    if (!transporter) {
        if (isProduction) {
            throw new Error('Password reset email delivery is not configured');
        }
        console.info(`Password reset link for ${email}: ${resetUrl}`);
        return;
    }
    const headline = 'Restablece tu contraseña';
    const body = 'Recibimos una solicitud para cambiar tu contraseña. Si fuiste tú, usa el botón para definir una nueva clave segura.';
    const footnote = 'Si no solicitaste este cambio, ignora este correo. Tu cuenta seguirá protegida.';
    const mail = buildAuthActionMail(brand, {
        preheader: `${brand.appName} · restablece tu contraseña`,
        eyebrow: 'Seguridad',
        headline: `Protege tu cuenta en ${brand.appName}`,
        bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(body)}</p><p style="margin:0;font-size:13px;color:#64748b;">El enlace expira en 24 horas.</p>`,
        buttonLabel: 'Restablecer contraseña',
        actionUrl: resetUrl,
        footnote,
    });
    const info = await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: restablece tu contraseña`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline,
            body,
            buttonLabel: 'Restablecer contraseña',
            actionUrl: resetUrl,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });
    logAuthEmailDelivery('password reset', brand, info);
}

/**
 * Verificación de correo: siempre se envía (activación de cuenta).
 * No respeta email_notify_account.
 */
async function sendEmailVerificationEmail(
    email: string,
    verificationUrl: string,
    origin: string,
    _userId?: string,
): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = await brandForAuthEmail(origin);
    if (!transporter) {
        if (isProduction) {
            throw new Error('Email verification delivery is not configured');
        }
        console.info(`Email verification link for ${email}: ${verificationUrl}`);
        return;
    }
    const headline = 'Confirma tu correo';
    const body = `Gracias por registrarte en ${brand.appName}. Solo falta confirmar que este correo es tuyo para activar tu cuenta y continuar.`;
    const footnote = 'Si no creaste esta cuenta, puedes ignorar este mensaje.';
    const mail = buildAuthActionMail(brand, {
        preheader: `Activa tu cuenta en ${brand.appName}`,
        eyebrow: 'Verificación',
        headline: `Te damos la bienvenida a ${brand.appName}`,
        bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(body)}</p><p style="margin:0;font-size:13px;color:#64748b;">El enlace es válido por 72 horas.</p>`,
        buttonLabel: 'Confirmar correo',
        actionUrl: verificationUrl,
        footnote,
    });
    const info = await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: confirma tu correo`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline,
            body,
            buttonLabel: 'Confirmar correo',
            actionUrl: verificationUrl,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });
    logAuthEmailDelivery('verification', brand, info);
    if (info.rejected?.length) {
        throw new Error(`Email verification rejected by SMTP provider: ${info.response ?? 'unknown response'}`);
    }
    if (!isProduction) {
        console.info(`[auth-email] (dev) Email verification link for ${email}: ${verificationUrl}`);
    }
}

async function sendPasswordChangedEmail(email: string, origin: string, userId?: string): Promise<void> {
    if (await skipAccountEmail(userId, 'password-changed')) return;
    const transporter = getAuthMailerTransporter();
    const brand = await brandForAuthEmail(origin);
    if (!transporter) {
        if (isProduction) {
            throw new Error('Password changed email delivery is not configured');
        }
        console.info(`Password changed notice for ${email} on ${brand.appName}`);
        return;
    }
    const headline = 'Contraseña actualizada';
    const body = `Tu contraseña de ${brand.appName} se cambió correctamente. Si no fuiste tú, contacta a soporte de inmediato.`;
    const footnote = 'Revisa tus dispositivos activos y vuelve a cambiar la clave si algo no cuadra.';
    const mail = buildAuthActionMail(brand, {
        preheader: `${brand.appName} · contraseña actualizada`,
        eyebrow: 'Seguridad',
        headline: 'Tu acceso fue actualizado',
        bodyHtml: `<p style="margin:0;">${escapeHtml(body)}</p>`,
        buttonLabel: 'Ir a la plataforma',
        actionUrl: origin,
        footnote,
    });
    const info = await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: cambio de contraseña confirmado`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline,
            body,
            buttonLabel: 'Abrir plataforma',
            actionUrl: origin,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });
    logAuthEmailDelivery('password changed', brand, info);
}

async function sendWelcomeEmail(email: string, name: string, origin: string, userId?: string): Promise<void> {
    if (await skipAccountEmail(userId, 'welcome')) return;
    const transporter = getAuthMailerTransporter();
    const brand = await brandForAuthEmail(origin);
    if (!transporter) {
        if (isProduction) {
            throw new Error('Welcome email delivery is not configured');
        }
        console.info(`Welcome email for ${email} on ${brand.appName}`);
        return;
    }
    const headline = '¡Cuenta activada!';
    const body = `Hola ${name}, tu correo quedó confirmado. Ya puedes usar ${brand.appName} con todas las funciones de tu perfil.`;
    const footnote = 'Si necesitas ayuda, escríbenos y te acompañamos.';
    const mail = buildAuthActionMail(brand, {
        preheader: `Bienvenido a ${brand.appName}`,
        eyebrow: 'Bienvenida',
        headline: `Todo listo en ${brand.appName}`,
        bodyHtml: `<p style="margin:0;">${escapeHtml(body)}</p>`,
        buttonLabel: 'Entrar ahora',
        actionUrl: origin,
        footnote,
    });
    const info = await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: bienvenido a tu cuenta`,
        text: buildActionEmailText({
            appName: brand.appName,
            headline,
            body,
            buttonLabel: 'Entrar ahora',
            actionUrl: origin,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: mail.html,
        attachments: mail.attachments,
    });
    logAuthEmailDelivery('welcome', brand, info);
}

async function sendBookingConfirmationEmail(clientEmail: string, data: BookingEmailData & { cancelUrl: string; appUrl: string }): Promise<void> {
    if (await skipAgendaEmail(clientEmail, 'booking-confirmation')) return;
    const transporter = getAuthMailerTransporter();
    if (!transporter) {
        if (isProduction) {
            throw new Error('Booking confirmation email delivery is not configured');
        }
        console.info(`[agenda] Booking confirmation for ${clientEmail}: ${data.cancelUrl}`);
        return;
    }
    const isPending = data.status === 'pending';
    const seriesCount = data.seriesDates && data.seriesDates.length > 1 ? data.seriesDates.length : 0;
    const subject = seriesCount > 0
        ? (isPending
            ? `Tu solicitud de ${seriesCount} sesiones con ${data.professionalName} fue recibida`
            : `Tus ${seriesCount} sesiones con ${data.professionalName} están confirmadas`)
        : (isPending
            ? `Tu solicitud de cita con ${data.professionalName} fue recibida`
            : `Tu cita con ${data.professionalName} está confirmada`);

    const dateStr = fmtBookingDateTime(data.startsAt, data.timezone);
    const seriesLines = seriesCount > 0 && data.seriesDates
        ? ['', `Sesiones reservadas (${seriesCount}):`, ...data.seriesDates.map((d, i) => `  ${i + 1}. ${fmtBookingDateTime(d, data.timezone)}`)]
        : [];
    const textBody = [
        subject,
        '',
        `Fecha y hora: ${dateStr}`,
        data.serviceName ? `Servicio: ${data.serviceName}` : '',
        `Modalidad: ${data.modality === 'presencial' ? 'Presencial' : 'Online'}`,
        ...seriesLines,
        '',
        `Para cancelar: ${data.cancelUrl}`,
        '',
        'SimpleAgenda',
    ].filter(Boolean).join('\n');

    await ensureEmailLogoCache();
    const mail = buildBookingEmailPackage(data);
    await transporter.sendMail({
        from: formatEmailFromAddress('SimpleAgenda'),
        to: clientEmail,
        subject,
        text: textBody,
        html: mail.html,
        attachments: mail.attachments,
    });
}

async function sendAppointmentReminderEmail(clientEmail: string, data: {
    clientName: string;
    professionalName: string;
    dateLabel: string;
    modality: string;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl: string;
    appUrl?: string;
}): Promise<void> {
    if (await skipAgendaEmail(clientEmail, 'appointment-reminder')) return;
    const transporter = getAuthMailerTransporter();
    if (!transporter) {
        if (isProduction) return;
        console.info(`[agenda] Reminder for ${clientEmail}: ${data.dateLabel}`);
        return;
    }
    const appUrl = data.appUrl ?? 'https://simpleagenda.app';
    const subject = `Recordatorio: tu cita con ${data.professionalName} es mañana`;
    const locationLine = data.modality === 'online'
        ? (data.meetingUrl ? `Enlace: ${data.meetingUrl}` : 'Modalidad: Online')
        : (data.location ? `Lugar: ${data.location}` : 'Modalidad: Presencial');
    const text = [
        subject,
        '',
        `Hola ${data.clientName},`,
        `Te recordamos que tienes una cita mañana: ${data.dateLabel}.`,
        locationLine,
        '',
        `Para cancelar: ${data.cancelUrl}`,
        '',
        'SimpleAgenda',
    ].join('\n');
    await ensureEmailLogoCache();
    const mail = buildAppointmentReminderEmailPackage({ ...data, appUrl });
    await transporter.sendMail({
        from: formatEmailFromAddress('SimpleAgenda'),
        to: clientEmail,
        subject,
        text,
        html: mail.html,
        attachments: mail.attachments,
    });
}

async function issueEmailVerification(userId: string, email: string, origin: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
    await db.insert(emailVerificationTokens).values({
        userId,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt,
    });
    await sendEmailVerificationEmail(
        email,
        buildEmailVerificationUrl(origin, rawToken),
        origin,
        userId,
    );
}
export {
    buildPasswordResetUrl,
    hashOpaqueToken,
    isAuthEmailConfigured,
    sendPasswordResetEmail,
    sendEmailVerificationEmail,
    sendPasswordChangedEmail,
    sendWelcomeEmail,
    sendBookingConfirmationEmail,
    sendAppointmentReminderEmail,
    issueEmailVerification,
};
export type { BookingEmailData };
