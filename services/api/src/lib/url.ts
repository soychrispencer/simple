export function serenatasAppBaseUrl(): string {
    return (
        process.env.SERENATAS_APP_URL
        ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS
        ?? 'http://localhost:3005'
    ).replace(/\/$/, '');
}
