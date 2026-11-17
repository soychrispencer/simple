/** Tasa general de IVA chileno expresada en puntos base. */
export const CHILE_VAT_RATE_BPS = 1_900;

/** Calcula el total con IVA a partir de un monto neto, redondeado al peso. */
export function addChileVat(netAmount: number): number {
    return Math.round(netAmount * (1 + CHILE_VAT_RATE_BPS / 10_000));
}
