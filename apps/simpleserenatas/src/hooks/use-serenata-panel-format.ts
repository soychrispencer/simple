'use client';

import { useMemo } from 'react';
import { createPanelFormatters, normalizeTimezone } from '@simple/utils';
import { useSerenata } from '@/context/serenata-context';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import type { Serenata } from '@/lib/serenatas-api';

function toInputDate(value?: string | null) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

/** Panel Serenatas: dueño ve fechas en TZ del mariachi (localidad); cliente en Mi cuenta. */
export function useSerenataPanelFormat(ownerFeatures = false) {
    const { accountUser } = useSerenata();
    const { mariachi } = useMyMariachi({ enabled: ownerFeatures });
    const tz = ownerFeatures
        ? normalizeTimezone(mariachi?.timezone)
        : normalizeTimezone(accountUser?.timezone);
    const formatters = useMemo(() => createPanelFormatters(tz), [tz]);

    return useMemo(() => ({
        ...formatters,
        formatDate: (value: string) => {
            const ymd = toInputDate(value);
            return ymd ? formatters.calendarDate(ymd) : formatters.dateMedium(value);
        },
        formatShortSerenataDate: (item: Pick<Serenata, 'eventDate' | 'eventTime'>) => {
            const ymd = toInputDate(item.eventDate);
            const dateLabel = ymd ? formatters.calendarDate(ymd) : formatters.dateMedium(item.eventDate);
            return `${item.eventTime ?? '—'} · ${dateLabel}`;
        },
    }), [formatters]);
}
