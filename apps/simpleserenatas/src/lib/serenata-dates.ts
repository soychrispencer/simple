import type { Serenata } from '@/lib/serenatas-api';

/** Zona horaria de referencia para fechas de evento en el panel. */
export const SERENATA_TIMEZONE = 'America/Santiago';

/** Fecha calendario actual (YYYY-MM-DD) en Chile. */
export function todayYmdInChile(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SERENATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function eventDateYmd(eventDate: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return eventDate;
    const date = new Date(eventDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

export function isEventOnOrAfterToday(eventDate: string, todayYmd = todayYmdInChile()): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd >= todayYmd;
}

export function isEventBeforeToday(eventDate: string, todayYmd = todayYmdInChile()): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd < todayYmd;
}

/** Estados que siguen abiertos tras la fecha del evento hasta cierre manual. */
export const CLOSURE_PENDING_STATUSES = ['scheduled', 'accepted_pending_group'] as const satisfies readonly Serenata['status'][];

export function needsClosure(item: Serenata): boolean {
    if (!CLOSURE_PENDING_STATUSES.includes(item.status as (typeof CLOSURE_PENDING_STATUSES)[number])) {
        return false;
    }
    return isEventBeforeToday(item.eventDate);
}

/** Programada y con fecha de evento hoy o futura. */
export function isUpcomingScheduled(item: Serenata): boolean {
    return item.status === 'scheduled' && isEventOnOrAfterToday(item.eventDate);
}
