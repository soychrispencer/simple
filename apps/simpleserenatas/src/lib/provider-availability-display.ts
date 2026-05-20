import type { ProviderBookingMode, ProviderGroupAvailabilityRule } from '@/lib/serenatas-api';

export const AVAILABILITY_DAY_LABELS = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
] as const;

export const AVAILABILITY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function bookingModeLabel(mode: ProviderBookingMode | null | undefined): string {
    switch (mode) {
        case 'auto_if_available':
            return 'Automático si hay cupo';
        case 'auto_decline':
            return 'Automático o rechazar sin cupo';
        case 'manual':
        default:
            return 'Manual — revisar cada solicitud';
    }
}

export function formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime} – ${endTime}`;
}

export function sortAvailabilityRules(rules: ProviderGroupAvailabilityRule[]): ProviderGroupAvailabilityRule[] {
    return rules.slice().sort(
        (a, b) => AVAILABILITY_DAY_ORDER.indexOf(a.dayOfWeek as (typeof AVAILABILITY_DAY_ORDER)[number])
            - AVAILABILITY_DAY_ORDER.indexOf(b.dayOfWeek as (typeof AVAILABILITY_DAY_ORDER)[number]),
    );
}

export function hasActiveAvailabilityRules(rules: ProviderGroupAvailabilityRule[]): boolean {
    return rules.some((rule) => rule.isActive !== false);
}

function isFullDayBlock(start: Date, end: Date): boolean {
    return (
        start.getHours() === 0 && start.getMinutes() === 0
        && end.getHours() === 23 && end.getMinutes() >= 59
    );
}

export function formatBlockedSlotRange(startsAt: string, endsAt: string): string {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    const dateFmt = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (isFullDayBlock(start, end)) {
        if (sameDay) return dateFmt.format(start);
        return `${dateFmt.format(start)} — ${dateFmt.format(end)}`;
    }
    if (sameDay) {
        return `${dateFmt.format(start)} · ${timeFmt.format(start)}–${timeFmt.format(end)}`;
    }
    return `${dateFmt.format(start)} ${timeFmt.format(start)} — ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}
