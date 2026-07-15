/**
 * Utilidades compartidas entre simuladores del ecosistema Simple.
 */

export type NivelRiesgoCarga = 'comoda' | 'ajustada' | 'alta';

export function formatCLP(valor: number): string {
    return valor.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    });
}

export function formatPct(valor: number, decimales = 1): string {
    return `${(valor * 100).toFixed(decimales)}%`;
}

export function formatUF(valor: number, decimales = 1): string {
    return `UF ${valor.toLocaleString('es-CL', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    })}`;
}

/** Amortización francesa: cuota fija con interés sobre saldo insoluto. */
export function cuotaFrancesa(monto: number, tasaPeriodo: number, n: number): number {
    if (n <= 0) return 0;
    if (tasaPeriodo <= 0) return monto / n;
    const factor = Math.pow(1 + tasaPeriodo, -n);
    return (monto * tasaPeriodo) / (1 - factor);
}

/** Conversión compuesta de tasa anual a mensual (no ÷12). */
export function anualATasaMensual(tasaAnual: number): number {
    return Math.pow(1 + tasaAnual, 1 / 12) - 1;
}

export function cargaBadgeClass(nivel: NivelRiesgoCarga): string {
    switch (nivel) {
        case 'comoda':
            return 'marketplace-flow-badge-success';
        case 'ajustada':
            return 'marketplace-flow-badge-warning';
        case 'alta':
            return 'marketplace-flow-badge-error';
    }
}

export function cargaMensaje(nivel: NivelRiesgoCarga): string {
    switch (nivel) {
        case 'comoda':
            return 'Carga cómoda';
        case 'ajustada':
            return 'Carga ajustada';
        case 'alta':
            return 'Carga alta';
    }
}
