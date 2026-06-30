/**
 * Zona horaria IANA por subdivisión (estado/provincia).
 * Países con una sola zona usan COUNTRY_DEFAULT_TIMEZONE en location-timezone.ts.
 */

/** México — 4 husos horarios según estado (INEGI / IANA). */
export const MX_STATE_TIMEZONE: Record<string, string> = {
    BCN: 'America/Tijuana',
    BCS: 'America/Mazatlan',
    SON: 'America/Hermosillo',
    SIN: 'America/Mazatlan',
    NAY: 'America/Mazatlan',
    CHH: 'America/Chihuahua',
    ROO: 'America/Cancun',
};

/** Estados Unidos — zona principal por estado (estados con varias zonas usan la más poblada). */
export const US_STATE_TIMEZONE: Record<string, string> = {
    AK: 'America/Anchorage',
    AL: 'America/Chicago',
    AR: 'America/Chicago',
    AZ: 'America/Phoenix',
    CA: 'America/Los_Angeles',
    CO: 'America/Denver',
    CT: 'America/New_York',
    DC: 'America/New_York',
    DE: 'America/New_York',
    FL: 'America/New_York',
    GA: 'America/New_York',
    HI: 'Pacific/Honolulu',
    IA: 'America/Chicago',
    ID: 'America/Boise',
    IL: 'America/Chicago',
    IN: 'America/Indiana/Indianapolis',
    KS: 'America/Chicago',
    KY: 'America/New_York',
    LA: 'America/Chicago',
    MA: 'America/New_York',
    MD: 'America/New_York',
    ME: 'America/New_York',
    MI: 'America/Detroit',
    MN: 'America/Chicago',
    MO: 'America/Chicago',
    MS: 'America/Chicago',
    MT: 'America/Denver',
    NC: 'America/New_York',
    ND: 'America/Chicago',
    NE: 'America/Chicago',
    NH: 'America/New_York',
    NJ: 'America/New_York',
    NM: 'America/Denver',
    NV: 'America/Los_Angeles',
    NY: 'America/New_York',
    OH: 'America/New_York',
    OK: 'America/Chicago',
    OR: 'America/Los_Angeles',
    PA: 'America/New_York',
    RI: 'America/New_York',
    SC: 'America/New_York',
    SD: 'America/Chicago',
    TN: 'America/Chicago',
    TX: 'America/Chicago',
    UT: 'America/Denver',
    VA: 'America/New_York',
    VT: 'America/New_York',
    WA: 'America/Los_Angeles',
    WI: 'America/Chicago',
    WV: 'America/New_York',
    WY: 'America/Denver',
};

/** España — Canarias vs península. */
export const ES_REGION_TIMEZONE: Record<string, string> = {
    CN: 'Atlantic/Canary',
};

/** Argentina — mayoría Buenos Aires; San Luis y otras excepciones. */
export const AR_REGION_TIMEZONE: Record<string, string> = {
    D: 'America/Argentina/San_Luis',
};

export function timezoneForRegion(countryCode: string, regionId?: string | null): string | null {
    const code = (countryCode ?? '').trim().toUpperCase();
    const region = (regionId ?? '').trim().toUpperCase();
    if (!region) return null;
    if (code === 'MX') return MX_STATE_TIMEZONE[region] ?? null;
    if (code === 'US') return US_STATE_TIMEZONE[region] ?? null;
    if (code === 'ES') return ES_REGION_TIMEZONE[region] ?? null;
    if (code === 'AR') return AR_REGION_TIMEZONE[region] ?? null;
    return null;
}
