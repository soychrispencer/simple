export type FormatMoneyOptions = {
    emptyLabel?: string;
};

/** Formato CLP unificado (panel, landing, tarjetas). */
export function formatMoney(value: number | null | undefined, options?: FormatMoneyOptions): string {
    const emptyLabel = options?.emptyLabel ?? 'Sin precio';
    if (value == null || Number.isNaN(value)) return emptyLabel;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatLandingMoney(value: number | null | undefined): string {
    return formatMoney(value, { emptyLabel: 'Por confirmar' });
}
