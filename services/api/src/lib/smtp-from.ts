/**
 * Remitente transaccional unificado (dominio padre Simple).
 * `SMTP_FROM` define el email (p. ej. noreply@simpleplataforma.app); el nombre
 * visible puede variar por vertical (SimpleSerenatas, SimpleAutos, etc.).
 */

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/** Extrae la dirección de correo de `SMTP_FROM` (con o sin nombre visible). */
export function parseSmtpFromEmail(smtpFrom = asString(process.env.SMTP_FROM)): string {
    if (!smtpFrom) return '';
    const bracketed = smtpFrom.match(/<([^<>]+)>/);
    if (bracketed?.[1]) return bracketed[1].trim();
    return smtpFrom;
}

/** `Nombre visible <email@SMTP_FROM>` — el email siempre sale de `SMTP_FROM`. */
export function formatEmailFromAddress(displayName: string, smtpFrom = asString(process.env.SMTP_FROM)): string {
    const email = parseSmtpFromEmail(smtpFrom);
    const name = displayName.trim() || 'Simple';
    return email ? `${name} <${email}>` : name;
}
