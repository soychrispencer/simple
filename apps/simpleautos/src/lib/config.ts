// Centraliza configuración por entorno para mantener paridad dev=prod
export const NODE_ENV = process.env.NODE_ENV || 'development';

// App URLs
export const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

// Sesiones / cookies
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'sa_session';
export const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
export const SESSION_COOKIE_SAMESITE = (process.env.SESSION_COOKIE_SAMESITE || 'lax') as
  | 'lax'
  | 'strict'
  | 'none';
export const SESSION_COOKIE_SECURE =
  (process.env.SESSION_COOKIE_SECURE || '').toLowerCase() === 'true' && NODE_ENV === 'production';
export const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);

// Subidas
export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';

// Email (SMTP)
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
export const SMTP_SECURE = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@localhost';
export const EMAIL_DEBUG = (process.env.EMAIL_DEBUG || '').toLowerCase() === 'true';

export function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_PORT);
}


