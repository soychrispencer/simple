import type { StructuredLocation } from '@simple/types';
import { timezoneForRegion } from './region-timezone-overrides.js';
import { DEFAULT_TIMEZONE } from './timezones.js';

const COUNTRY_DEFAULT_TIMEZONE: Record<string, string> = {
    CL: DEFAULT_TIMEZONE,
    MX: 'America/Mexico_City',
    AR: 'America/Argentina/Buenos_Aires',
    CO: 'America/Bogota',
    PE: 'America/Lima',
    ES: 'Europe/Madrid',
    DE: 'Europe/Berlin',
    US: 'America/New_York',
    VE: 'America/Caracas',
    EC: 'America/Guayaquil',
    UY: 'America/Montevideo',
    PY: 'America/Asuncion',
    BO: 'America/La_Paz',
    CR: 'America/Costa_Rica',
    PA: 'America/Panama',
    GT: 'America/Guatemala',
    HN: 'America/Tegucigalpa',
    SV: 'America/El_Salvador',
    NI: 'America/Managua',
    CU: 'America/Havana',
    GQ: 'Africa/Malabo',
    DO: 'America/Santo_Domingo',
    PR: 'America/Puerto_Rico',
};

/**
 * Zona horaria operativa según país y localidad.
 * Chile: excepciones Magallanes / Isla de Pascua.
 */
export function inferTimezoneFromOperatingLocality(
    region?: string | null,
    comuna?: string | null,
    countryCode = 'CL',
    regionId?: string | null,
): string {
    const country = (countryCode ?? 'CL').trim().toUpperCase();
    if (country === 'CL') {
        const r = (region ?? '').trim().toLowerCase();
        const c = (comuna ?? '').trim().toLowerCase();
        const haystack = `${r} ${c}`;

        if (
            haystack.includes('magallanes')
            || haystack.includes('antártica')
            || haystack.includes('antartica')
            || c.includes('punta arenas')
            || c.includes('puerto natales')
            || c.includes('cabo de hornos')
        ) {
            return 'America/Punta_Arenas';
        }

        if (haystack.includes('isla de pascua') || haystack.includes('easter')) {
            return 'Pacific/Easter';
        }

        return DEFAULT_TIMEZONE;
    }

    const regionTimezone = timezoneForRegion(country, regionId ?? region);
    if (regionTimezone) return regionTimezone;

    return COUNTRY_DEFAULT_TIMEZONE[country] ?? DEFAULT_TIMEZONE;
}

export function inferTimezoneFromStructuredLocation(
    location?: Partial<StructuredLocation> | null,
): string {
    if (!location) return DEFAULT_TIMEZONE;
    const countryCode = (location.countryCode ?? 'CL').trim().toUpperCase();
    const region = location.regionName ?? location.regionId ?? '';
    const locality = location.localityName ?? location.localityId ?? '';
    return inferTimezoneFromOperatingLocality(
        region,
        locality,
        countryCode,
        location.regionId,
    );
}

/** Etiqueta corta de zona para mostrar al cliente en reservas. */
export function timezoneShortLabel(timezone: string): string {
    try {
        const parts = new Intl.DateTimeFormat('es-CL', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        }).formatToParts(new Date());
        return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
    } catch {
        return timezone;
    }
}

export function timezoneLabelForLocation(location?: Partial<StructuredLocation> | null): string {
    const tz = inferTimezoneFromStructuredLocation(location);
    return timezoneShortLabel(tz);
}
