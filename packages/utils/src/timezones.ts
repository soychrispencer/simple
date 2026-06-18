/** Zona horaria por defecto del producto (Chile). */
export const DEFAULT_TIMEZONE = 'America/Santiago';

/** Opciones con etiqueta legible para configuración de negocio (consulta, mariachi, etc.). */
export const BUSINESS_TIMEZONE_OPTIONS = [
    { value: 'America/Santiago', label: 'Santiago (Chile)' },
    { value: 'Europe/Berlin', label: 'Berlín (Alemania)' },
    { value: 'Europe/Madrid', label: 'Madrid (España)' },
    { value: 'America/Mexico_City', label: 'Ciudad de México (México)' },
    { value: 'America/Bogota', label: 'Bogotá (Colombia)' },
    { value: 'America/Lima', label: 'Lima (Perú)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (Argentina)' },
    { value: 'America/Montevideo', label: 'Montevideo (Uruguay)' },
    { value: 'America/Caracas', label: 'Caracas (Venezuela)' },
    { value: 'America/La_Paz', label: 'La Paz (Bolivia)' },
    { value: 'America/Quito', label: 'Quito (Ecuador)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (Brasil)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
    { value: 'Europe/London', label: 'Londres (Reino Unido)' },
    { value: 'UTC', label: 'UTC' },
] as const;

const BUSINESS_VALUE_SET = new Set<string>(BUSINESS_TIMEZONE_OPTIONS.map((o) => o.value));

export function isKnownTimezone(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (BUSINESS_VALUE_SET.has(trimmed)) return true;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: trimmed });
        return true;
    } catch {
        return false;
    }
}

export function normalizeTimezone(value: string | null | undefined, fallback = DEFAULT_TIMEZONE): string {
    const trimmed = value?.trim();
    if (!trimmed) return fallback;
    return isKnownTimezone(trimmed) ? trimmed : fallback;
}

export function detectBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

export function timezoneOptionLabel(value: string): string {
    const known = BUSINESS_TIMEZONE_OPTIONS.find((o) => o.value === value);
    return known?.label ?? value.replace(/_/g, ' ');
}

/**
 * TZ para mostrar fechas en el panel según contexto.
 * - personal: preferencia del usuario (vive en Alemania, ve el panel en su hora)
 * - business: hora operativa del negocio (reservas, disponibilidad)
 */
export function resolveDisplayTimezone(
    context: 'personal' | 'business',
    userTimezone?: string | null,
    businessTimezone?: string | null,
): string {
    if (context === 'business') {
        return normalizeTimezone(businessTimezone ?? userTimezone);
    }
    return normalizeTimezone(userTimezone);
}
