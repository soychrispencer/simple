import * as nodemailer from 'nodemailer';
import { hasSmtpConfig, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } from './config';

let transporter: nodemailer.Transporter | null = null;

export function getTransport() {
  if (!hasSmtpConfig()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransport();
  if (!t) return { ok: false, error: 'SMTP no configurado' } as const;
  const info = await t.sendMail({ from: SMTP_FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
  return { ok: true, messageId: info.messageId } as const;
}


