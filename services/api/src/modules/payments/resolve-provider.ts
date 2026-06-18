export type PaymentProvider = 'mercadopago';

/** Checkout oficial: Mercado Pago para todos (sin discriminar por país de residencia). */
export function resolvePaymentProvider(_residenceCountryCode?: string | null): PaymentProvider {
    return 'mercadopago';
}

export function paymentProviderLabel(_provider: PaymentProvider): string {
    return 'Mercado Pago';
}
