import type { Serenata } from '@/lib/serenatas-api';

export const DEFAULT_SERENATA_TIMEZONE = 'America/Santiago';

/** Fecha calendario actual (YYYY-MM-DD) en la zona indicada. */
export function todayYmdInTimezone(timezone = DEFAULT_SERENATA_TIMEZONE): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/** @deprecated Usar `todayYmdInTimezone`. */
export function todayYmdInChile(): string {
    return todayYmdInTimezone(DEFAULT_SERENATA_TIMEZONE);
}

function eventDateYmd(eventDate: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return eventDate;
    const date = new Date(eventDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

export function isEventOnOrAfterToday(
    eventDate: string,
    timezone = DEFAULT_SERENATA_TIMEZONE,
    todayYmd = todayYmdInTimezone(timezone),
): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd >= todayYmd;
}

export function isEventBeforeToday(
    eventDate: string,
    timezone = DEFAULT_SERENATA_TIMEZONE,
    todayYmd = todayYmdInTimezone(timezone),
): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd < todayYmd;
}

/** Estados que siguen abiertos tras la fecha del evento hasta cierre manual. */
export const CLOSURE_PENDING_STATUSES = ['scheduled', 'accepted_pending_group'] as const satisfies readonly Serenata['status'][];

export function needsClosure(item: Serenata, timezone = DEFAULT_SERENATA_TIMEZONE): boolean {
    if (!CLOSURE_PENDING_STATUSES.includes(item.status as (typeof CLOSURE_PENDING_STATUSES)[number])) {
        return false;
    }
    return isEventBeforeToday(item.eventDate, timezone);
}

/** Programada y con fecha de evento hoy o futura. */
export function isUpcomingScheduled(item: Serenata, timezone = DEFAULT_SERENATA_TIMEZONE): boolean {
    return item.status === 'scheduled' && isEventOnOrAfterToday(item.eventDate, timezone);
}

export function resolveSerenataBusinessTimezone(
    mariachi?: { timezone?: string | null } | null,
): string {
    return mariachi?.timezone?.trim() || DEFAULT_SERENATA_TIMEZONE;
}
