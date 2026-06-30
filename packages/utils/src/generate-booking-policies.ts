import { apiFetch } from './api-client.js';

export type GenerateBookingPoliciesInput = {
    vertical?: 'agenda' | 'serenatas' | 'autos' | 'propiedades';
    profession?: string;
    displayName?: string;
    businessName?: string;
    clientLabel?: string;
    cancellationHours?: number;
    bookingWindowDays?: number;
    existingText?: string;
};

export type GenerateBookingPoliciesResponse = {
    ok: boolean;
    text?: string;
    error?: string;
};

export async function generateBusinessBookingPolicies(
    input: GenerateBookingPoliciesInput,
): Promise<GenerateBookingPoliciesResponse> {
    const { data } = await apiFetch<GenerateBookingPoliciesResponse>(
        '/api/account/generate-booking-policies',
        {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        },
    );
    return data ?? { ok: false, error: 'No pudimos generar las políticas.' };
}
