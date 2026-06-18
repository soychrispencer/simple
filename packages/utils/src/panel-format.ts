import {
    fmtCalendarDateYmd,
    fmtDateLong,
    fmtDateMedium,
    fmtDateShort,
    fmtDateTimeLong,
    fmtDateTimeShort,
    fmtDateTz,
    fmtTime,
} from './format.js';
import { normalizeTimezone, resolveDisplayTimezone } from './timezones.js';

export type PanelFormatters = {
    timezone: string;
    dateShort: (iso: string | Date) => string;
    dateMedium: (iso: string | Date) => string;
    dateLong: (iso: string | Date) => string;
    time: (iso: string | Date) => string;
    dateTimeShort: (iso: string | Date) => string;
    dateTz: (iso: string | Date) => string;
    dateTimeLong: (iso: string | Date) => string;
    /** Fecha calendario YYYY-MM-DD (eventos sin hora UTC). */
    calendarDate: (ymd: string) => string;
};

export function createPanelFormatters(timezone?: string | null): PanelFormatters {
    const tz = normalizeTimezone(timezone);
    return {
        timezone: tz,
        dateShort: (iso) => fmtDateShort(iso, tz),
        dateMedium: (iso) => fmtDateMedium(iso, tz),
        dateLong: (iso) => fmtDateLong(iso, tz),
        time: (iso) => fmtTime(iso, tz),
        dateTimeShort: (iso) => fmtDateTimeShort(iso, tz),
        dateTz: (iso) => fmtDateTz(iso, tz),
        dateTimeLong: (iso) => fmtDateTimeLong(iso, tz),
        calendarDate: (ymd) => fmtCalendarDateYmd(ymd, tz),
    };
}

export function resolvePanelFormatters(
    context: 'personal' | 'business',
    userTimezone?: string | null,
    businessTimezone?: string | null,
): PanelFormatters {
    return createPanelFormatters(resolveDisplayTimezone(context, userTimezone, businessTimezone));
}
