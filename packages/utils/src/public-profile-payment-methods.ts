import { apiFetch } from './api-client.js';
import {
    serializeBusinessPaymentMethodsWrite,
    type BankTransferData,
    type BusinessPaymentMethodsValue,
} from './business-payment-methods.js';
import type { PublicProfileVertical } from './public-profile-settings.js';

/** Forma cruda devuelta por la API (bankTransferData anidado, no el shape del editor). */
export type BusinessPaymentMethodsRecord = {
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string;
    acceptsTransfer: boolean;
    acceptsMp: boolean;
    acceptsPaymentLink: boolean;
    paymentLinkUrl: string;
    bankTransferData: BankTransferData | null;
    mpConnected: boolean;
};

export type PublicProfilePaymentMethodsResponse = {
    ok: boolean;
    paymentMethods?: BusinessPaymentMethodsRecord;
    error?: string;
};

export async function fetchPublicProfilePaymentMethods(
    vertical: PublicProfileVertical,
): Promise<PublicProfilePaymentMethodsResponse> {
    const { data } = await apiFetch<PublicProfilePaymentMethodsResponse>(
        `/api/account/public-profile/payment-methods?vertical=${vertical}`,
        { method: 'GET' },
    );
    if (!data) {
        return { ok: false, error: 'No pudimos cargar tus medios de pago.' };
    }
    return data;
}

export async function updatePublicProfilePaymentMethods(
    vertical: PublicProfileVertical,
    value: BusinessPaymentMethodsValue,
): Promise<PublicProfilePaymentMethodsResponse> {
    const { data } = await apiFetch<PublicProfilePaymentMethodsResponse>(
        `/api/account/public-profile/payment-methods?vertical=${vertical}`,
        {
            method: 'PUT',
            body: JSON.stringify(serializeBusinessPaymentMethodsWrite(value)),
        },
    );
    if (!data) {
        return { ok: false, error: 'No pudimos guardar tus medios de pago.' };
    }
    return data;
}
