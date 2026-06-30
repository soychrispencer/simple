export const MAX_BOOKING_TERMS_LENGTH = 12000;

export function normalizeBookingTermsText(value?: string | null): string {
    return (value ?? '').trim().slice(0, MAX_BOOKING_TERMS_LENGTH);
}

export function bookingTermsFromRecord(
    record: { bookingTermsText?: string | null; encuadre?: string | null } | null | undefined,
): string {
    return normalizeBookingTermsText(record?.bookingTermsText ?? record?.encuadre);
}

export function serializeBookingTermsWrite(value?: string | null): { bookingTermsText: string | null } {
    const normalized = normalizeBookingTermsText(value);
    return { bookingTermsText: normalized || null };
}
