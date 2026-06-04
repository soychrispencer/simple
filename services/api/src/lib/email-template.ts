import type { EmailBrandProfile } from './email-brand.js';
import {
    getEmailLogoInlineAttachment,
    type EmailLogoInlineAttachment,
} from './email-brand-logo.js';

function buildEmailBrandHeaderHtml(brand: EmailBrandProfile, logoCid?: string): string {
    const logoSrc = logoCid ? `cid:${logoCid}` : null;
    const secondary = escapeHtml(brand.wordmarkSecondary);
    const siteUrl = escapeHtml(brand.siteUrl);
    const iconCell = logoSrc
        ? `<img src="${logoSrc}" width="36" height="36" alt="${escapeHtml(brand.appName)}" style="display:block;width:36px;height:36px;border:0;border-radius:9px;" />`
        : `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;background:${brand.accent};border-radius:9px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;line-height:36px;">S</td></tr></table>`;

    return `<tr>
                  <td align="center" style="padding:0 0 20px;">
                    <a href="${siteUrl}" style="text-decoration:none;display:inline-block;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td valign="middle" style="padding-right:10px;">
                            ${iconCell}
                          </td>
                          <td valign="middle" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1;">
                            <span style="font-size:17px;font-weight:600;letter-spacing:-0.02em;color:#0f172a;">Simple</span><span style="font-size:17px;font-weight:400;letter-spacing:-0.02em;color:${brand.accent};">${secondary}</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>`;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

type ActionEmailInput = {
    brand: EmailBrandProfile;
    /** Content-ID del PNG inline (nodemailer); Gmail no carga data: en img. */
    logoCid?: string;
    preheader?: string;
    eyebrow: string;
    headline: string;
    bodyHtml: string;
    buttonLabel: string;
    actionUrl: string;
    footnote: string;
    /** Contenido HTML extra debajo del CTA (tablas, avisos de pago, etc.). */
    extraHtml?: string;
};

export type ActionEmailPackage = {
    html: string;
    attachments: EmailLogoInlineAttachment[];
};

/** HTML + adjunto inline del logo (usar en sendMail). */
export function buildActionEmailPackage(input: ActionEmailInput): ActionEmailPackage {
    const attachment = getEmailLogoInlineAttachment(input.brand.appId);
    return {
        html: buildActionEmailHtml({
            ...input,
            logoCid: attachment?.cid ?? input.logoCid,
        }),
        attachments: attachment ? [attachment] : [],
    };
}

/** Correo con CTA principal (verificación, reset, bienvenida). */
export function buildActionEmailHtml(input: ActionEmailInput): string {
    const brand = input.brand;
    const preheader = escapeHtml(input.preheader ?? input.headline);
    const eyebrow = escapeHtml(input.eyebrow);
    const headline = escapeHtml(input.headline);
    const buttonLabel = escapeHtml(input.buttonLabel);
    const actionUrl = escapeHtml(input.actionUrl);
    const footnote = escapeHtml(input.footnote);
    const appName = escapeHtml(brand.appName);
    const tagline = escapeHtml(brand.tagline);
    const brandHeader = buildEmailBrandHeaderHtml(brand, input.logoCid);
    const supportEmail = escapeHtml(brand.supportEmail);
    const supportLabel = escapeHtml(brand.supportLabel);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;-webkit-text-size-adjust:100%;">
  <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;">
    <tr>
      <td align="center" style="padding:40px 18px 44px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          ${brandHeader}
          <tr>
            <td style="background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 46px rgba(15,23,42,0.07);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:5px;background:${brand.accent};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:34px 36px 22px;background:#ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                          <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${brand.accentSoft};color:${brand.accent};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${eyebrow}</span>
                          <p style="margin:18px 0 0;font-size:26px;line-height:1.22;font-weight:760;color:#111827;letter-spacing:-0.025em;">${headline}</p>
                          <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#6b7280;">${tagline}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 36px 34px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    <div style="font-size:15px;line-height:1.75;color:#374151;">${input.bodyHtml}</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 10px;">
                      <tr>
                        <td align="center" style="border-radius:14px;background:${brand.accent};box-shadow:0 12px 28px rgba(15,23,42,0.12);">
                          <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:15px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${buttonLabel}</a>
                        </td>
                      </tr>
                    </table>
                    ${input.extraHtml ?? ''}
                    <p style="margin:24px 0 0;padding:16px 18px;border-radius:14px;background:#f9fafb;font-size:13px;line-height:1.65;color:#6b7280;">${footnote}</p>
                    <p style="margin:18px 0 0;padding-top:18px;border-top:1px solid #eef0f3;font-size:12px;line-height:1.65;color:#9ca3af;">
                      Si el botón no funciona, copia este enlace en tu navegador:<br />
                      <a href="${actionUrl}" style="color:${brand.accent};word-break:break-all;text-decoration:underline;">${actionUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.65;color:#8b95a1;">
              Enviado por ${supportLabel} · <a href="mailto:${supportEmail}" style="color:#64748b;text-decoration:underline;">${supportEmail}</a><br />
              <span style="color:#aab2bd;">${appName} es parte del ecosistema Simple. El dominio de envío puede estar centralizado en SimplePlataforma para seguridad y continuidad.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildActionEmailText(input: {
    headline: string;
    body: string;
    buttonLabel: string;
    actionUrl: string;
    footnote: string;
    supportEmail: string;
    appName: string;
}): string {
    return [
        input.appName,
        input.headline,
        '',
        input.body,
        '',
        `${input.buttonLabel}: ${input.actionUrl}`,
        '',
        input.footnote,
        '',
        `Soporte: ${input.supportEmail}`,
    ].join('\n');
}

/** Bloque de filas clave-valor para correos de agenda u otros detalles. */
export function buildDetailTableHtml(rows: Array<{ label: string; value: string }>): string {
    const cells = rows
        .map(
            (row, index) => {
                const border = index < rows.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : '';
                return `<tr>
                  <td style="padding:14px 18px;${border}font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(row.label)}</p>
                    <p style="margin:4px 0 0;font-size:15px;line-height:1.45;color:#0f172a;">${escapeHtml(row.value)}</p>
                  </td>
                </tr>`;
            },
        )
        .join('');

    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#f8fafc;">${cells}</table>`;
}

export function buildStatusPillHtml(label: string, tone: 'success' | 'warning'): string {
    const styles =
        tone === 'success'
            ? 'background:#d1fae5;color:#065f46;'
            : 'background:#fef3c7;color:#92400e;';
    return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;${styles}font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(label)}</span>`;
}

export function buildInfoBoxHtml(input: { title: string; bodyHtml: string; tone: 'blue' | 'amber' | 'green' }): string {
    const palette =
        input.tone === 'blue'
            ? { bg: '#eff6ff', border: '#bfdbfe', title: '#1e40af', text: '#1d4ed8' }
            : input.tone === 'green'
              ? { bg: '#f0fdf4', border: '#bbf7d0', title: '#14532d', text: '#15803d' }
              : { bg: '#fffbeb', border: '#fde68a', title: '#92400e', text: '#78350f' };

    return `<div style="margin:20px 0;padding:16px 18px;background:${palette.bg};border:1px solid ${palette.border};border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${palette.title};">${escapeHtml(input.title)}</p>
      <div style="margin:0;font-size:13px;line-height:1.6;color:${palette.text};">${input.bodyHtml}</div>
    </div>`;
}

/** Envoltorio simple para texto plano vía mailer compartido. */
export function buildPlainTextEmailPackage(text: string, brand: EmailBrandProfile): ActionEmailPackage {
    const paragraphs = escapeHtml(text)
        .split('\n')
        .map((line) => (line.trim() ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${line}</p>` : ''))
        .join('');

    return buildActionEmailPackage({
        brand,
        eyebrow: 'Notificación',
        headline: brand.appName,
        bodyHtml: paragraphs,
        buttonLabel: `Abrir ${brand.appName}`,
        actionUrl: brand.siteUrl || 'https://simpleplataforma.app',
        footnote: 'Este es un mensaje automático. No respondas a este correo.',
    });
}

export function buildPlainTextEmailHtml(text: string, brand: EmailBrandProfile): string {
    return buildPlainTextEmailPackage(text, brand).html;
}
