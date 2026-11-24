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

/**
 * Parsea una fecha/hora (string o Date) garantizando la zona horaria destino.
 * Si el string viene sin offset (ej: "2026-11-24T15:00" desde un <input type="datetime-local">),
 * se interpreta explícitamente en la zona horaria indicada (por defecto America/Santiago)
 * y devuelve el objeto Date UTC correspondiente, evitando que un servidor UTC asuma medianoche/hora UTC.
 */
export function parseDateTimeInTimezone(
    input: string | Date | null | undefined,
    timezone: string = DEFAULT_TIMEZONE,
): Date {
    if (!input) return new Date(NaN);
    if (input instanceof Date) return new Date(input.getTime());
    const str = String(input).trim();
    if (!str) return new Date(NaN);

    // Si ya trae información de zona (termina en 'Z' o tiene offset '+HH:mm' / '-HH:mm')
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
        return new Date(str);
    }

    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
    if (!match) return new Date(str);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    const second = Number(match[6] ?? 0);
    const ms = Number((match[7] ?? '0').padEnd(3, '0').slice(0, 3));

    const targetWallTime = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const tz = normalizeTimezone(timezone, DEFAULT_TIMEZONE);

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });

    const wallTimeAt = (instant: Date) => {
        const parts = formatter.formatToParts(instant);
        const val = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
        return Date.UTC(
            val('year'),
            val('month') - 1,
            val('day'),
            val('hour'),
            val('minute'),
            val('second'),
            instant.getUTCMilliseconds(),
        );
    };

    let candidate = targetWallTime;
    for (let i = 0; i < 4; i++) {
        const diff = targetWallTime - wallTimeAt(new Date(candidate));
        if (diff === 0) return new Date(candidate);
        candidate += diff;
    }
    return new Date(candidate);
}
