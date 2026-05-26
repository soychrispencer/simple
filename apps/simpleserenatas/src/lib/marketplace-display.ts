export function formatLandingMoney(value: number | null | undefined): string {
    if (!value) return 'Por confirmar';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}
