import { apiFetch } from './api-client.js';
import { bookingTermsFromRecord, normalizeBookingTermsText } from './business-booking-terms.js';
import type { PublicProfileVertical } from './public-profile-settings.js';

export type PublicProfileBookingTermsResponse = {
    ok: boolean;
    bookingTermsText?: string | null;
    error?: string;
};

export async function fetchPublicProfileBookingTerms(
    vertical: PublicProfileVertical,
): Promise<PublicProfileBookingTermsResponse> {
    const { data } = await apiFetch<PublicProfileBookingTermsResponse>(
        `/api/account/public-profile/booking-terms?vertical=${vertical}`,
        { credentials: 'include' },
    );
    return data ?? { ok: false, error: 'No pudimos cargar las políticas.' };
}

export async function updatePublicProfileBookingTerms(
    vertical: PublicProfileVertical,
    bookingTermsText: string,
): Promise<PublicProfileBookingTermsResponse> {
    const { data } = await apiFetch<PublicProfileBookingTermsResponse>(
        `/api/account/public-profile/booking-terms?vertical=${vertical}`,
        {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingTermsText: normalizeBookingTermsText(bookingTermsText) }),
        },
    );
    return data ?? { ok: false, error: 'No pudimos guardar las políticas.' };
}

export { bookingTermsFromRecord };
