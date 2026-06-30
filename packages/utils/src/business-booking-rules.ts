export const DEFAULT_BOOKING_WINDOW_DAYS = 30;
export const DEFAULT_CANCELLATION_HOURS = 24;
export const MIN_BOOKING_WINDOW_DAYS = 1;
export const MAX_BOOKING_WINDOW_DAYS = 365;
export const MIN_CANCELLATION_HOURS = 0;
export const MAX_CANCELLATION_HOURS = 168;
export const MIN_RESPONSE_SLA_HOURS = 1;
export const MAX_RESPONSE_SLA_HOURS = 168;
export const DEFAULT_RESPONSE_SLA_HOURS = 24;

export type BusinessBookingRulesValue = {
    bookingWindowDays: number;
    cancellationHours: number;
    allowsRecurrentBooking?: boolean;
    slaHours?: number;
};

export function normalizeBookingWindowDays(value?: number | null): number {
    if (!Number.isFinite(value) || (value as number) < MIN_BOOKING_WINDOW_DAYS) {
        return DEFAULT_BOOKING_WINDOW_DAYS;
    }
    return Math.min(MAX_BOOKING_WINDOW_DAYS, Math.max(MIN_BOOKING_WINDOW_DAYS, Math.floor(value as number)));
}

export function normalizeCancellationHours(value?: number | null): number {
    if (!Number.isFinite(value) || (value as number) < MIN_CANCELLATION_HOURS) {
        return DEFAULT_CANCELLATION_HOURS;
    }
    return Math.min(MAX_CANCELLATION_HOURS, Math.max(MIN_CANCELLATION_HOURS, Math.floor(value as number)));
}

export function normalizeResponseSlaHours(value?: number | null): number {
    if (!Number.isFinite(value) || (value as number) < MIN_RESPONSE_SLA_HOURS) {
        return DEFAULT_RESPONSE_SLA_HOURS;
    }
    return Math.min(MAX_RESPONSE_SLA_HOURS, Math.max(MIN_RESPONSE_SLA_HOURS, Math.floor(value as number)));
}

export function defaultBusinessBookingRules(): BusinessBookingRulesValue {
    return {
        bookingWindowDays: DEFAULT_BOOKING_WINDOW_DAYS,
        cancellationHours: DEFAULT_CANCELLATION_HOURS,
        allowsRecurrentBooking: true,
        slaHours: DEFAULT_RESPONSE_SLA_HOURS,
    };
}

export function businessBookingRulesFromRecord(
    record: Partial<BusinessBookingRulesValue> | null | undefined,
): BusinessBookingRulesValue {
    return {
        bookingWindowDays: normalizeBookingWindowDays(record?.bookingWindowDays),
        cancellationHours: normalizeCancellationHours(record?.cancellationHours),
        allowsRecurrentBooking: record?.allowsRecurrentBooking ?? true,
        slaHours: normalizeResponseSlaHours(record?.slaHours),
    };
}

export function businessBookingRulesEqual(
    left: BusinessBookingRulesValue,
    right: BusinessBookingRulesValue,
    options?: { includeRecurrent?: boolean; includeSla?: boolean },
): boolean {
    if (left.bookingWindowDays !== right.bookingWindowDays) return false;
    if (left.cancellationHours !== right.cancellationHours) return false;
    if (options?.includeRecurrent && (left.allowsRecurrentBooking ?? true) !== (right.allowsRecurrentBooking ?? true)) {
        return false;
    }
    if (options?.includeSla && normalizeResponseSlaHours(left.slaHours) !== normalizeResponseSlaHours(right.slaHours)) {
        return false;
    }
    return true;
}

export function maxBookingInputDate(bookingWindowDays: number, from = new Date()): string {
    const max = new Date(from);
    max.setDate(max.getDate() + normalizeBookingWindowDays(bookingWindowDays));
    return max.toISOString().slice(0, 10);
}

export function validateBookingWindowDate(
    eventDate: Date,
    bookingWindowDays: number,
    from = new Date(),
): string | null {
    const windowDays = normalizeBookingWindowDays(bookingWindowDays);
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const max = new Date(start);
    max.setDate(max.getDate() + windowDays);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    if (eventDay < start) return 'La fecha del evento debe ser futura.';
    if (eventDay > max) return `Solo puedes reservar hasta ${windowDays} días de anticipación.`;
    return null;
}

export function validateCancellationLead(hoursUntilEvent: number, cancellationHours: number): string | null {
    const minHours = normalizeCancellationHours(cancellationHours);
    if (hoursUntilEvent < minHours) {
        return `La cancelación debe hacerse con al menos ${minHours} horas de anticipación.`;
    }
    return null;
}
