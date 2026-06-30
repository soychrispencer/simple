/**
 * Orígenes permitidos para CORS y validación de cookies cross-origin.
 * Extraído de index.ts para modularización incremental.
 */

const DEFAULT_CORS_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'https://simpleautos.app',
    'https://simpleserenatas.app',
    'https://simplepropiedades.app',
    'https://simpleagenda.app',
    'https://simpleadmin.app',
    'https://simpleplataforma.app',
    'https://admin.simpleplataforma.app',
    'https://www.simpleautos.app',
    'https://www.simplepropiedades.app',
    'https://www.simpleagenda.app',
    'https://www.simpleadmin.app',
    'https://www.simpleplataforma.app',
    'https://www.simpleserenatas.app',
] as const;

export function getAllowedOrigins(): Set<string> {
    const raw = process.env.CORS_ORIGINS;
    const extraOrigins = (raw ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return new Set([...DEFAULT_CORS_ORIGINS, ...extraOrigins]);
}

export const allowedOrigins = getAllowedOrigins();

export const defaultCorsOrigin = Array.from(allowedOrigins)[0] ?? 'http://localhost:3000';

export function isLocalOrigin(origin: string): boolean {
    return /^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);
}

export function isAllowedBrowserOrigin(origin: string, options?: { isProduction?: boolean }): boolean {
    if (!origin) return false;
    if (allowedOrigins.has(origin)) return true;
    const production = options?.isProduction ?? process.env.NODE_ENV === 'production';
    return !production && isLocalOrigin(origin);
}
