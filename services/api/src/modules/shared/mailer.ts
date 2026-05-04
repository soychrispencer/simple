/**
 * Mailer transaccional compartido.
 *
 * Envoltorio mínimo sobre nodemailer + variables `SMTP_*` ya documentadas en
 * `services/api/.env*.example`. Se usa para correos cortos de eventos
 * (pago confirmado, suscripción activada, etc.) en verticales como serenatas.
 *
 * Si las variables no están configuradas, las llamadas son `no-op` (resuelven
 * con `{ ok: false, skipped: true }`). Esto permite usarlo en desarrollo
 * local sin SMTP.
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null | undefined = undefined;

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isMailerConfigured(): boolean {
    return Boolean(asString(process.env.SMTP_HOST) && asString(process.env.SMTP_FROM));
}

function getTransporter(): Transporter | null {
    if (cachedTransporter !== undefined) return cachedTransporter;
    if (!isMailerConfigured()) {
        cachedTransporter = null;
        return cachedTransporter;
    }
    cachedTransporter = nodemailer.createTransport({
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
    return cachedTransporter;
}

export type SendTransactionalEmailInput = {
    to: string;
    subject: string;
    /** Cuerpo en texto plano (siempre incluído). */
    text: string;
    /** Cuerpo HTML opcional (si se omite, se usa `text` envuelto). */
    html?: string;
    /** Nombre visible del remitente. Default: "Simple". */
    fromName?: string;
};

export type SendTransactionalEmailResult =
    | { ok: true; messageId: string }
    | { ok: false; skipped: true; reason: 'not_configured' }
    | { ok: false; skipped: false; error: string };

/**
 * Envía un correo transaccional. Nunca lanza: errores se devuelven como
 * `{ ok: false }` para no romper el flujo principal de negocio.
 */
export async function sendTransactionalEmail(
    input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
    if (!input.to || !input.to.includes('@')) {
        return { ok: false, skipped: false, error: 'invalid_to' };
    }

    const transporter = getTransporter();
    if (!transporter) {
        return { ok: false, skipped: true, reason: 'not_configured' };
    }

    const smtpFrom = asString(process.env.SMTP_FROM);
    const fromName = input.fromName ?? 'Simple';
    const fromAddress = smtpFrom.includes('<')
        ? smtpFrom
        : `${fromName} <${smtpFrom}>`;

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html ?? `<pre style="font-family:inherit">${escapeHtml(input.text)}</pre>`,
        });
        return { ok: true, messageId: String(info.messageId ?? '') };
    } catch (error) {
        return {
            ok: false,
            skipped: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
