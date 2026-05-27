export const FINANZAS_TABS = ['resumen', 'movimientos', 'musicos', 'cobros'] as const;

export type FinanzasTab = (typeof FINANZAS_TABS)[number];

export function isFinanzasTab(value: string | null | undefined): value is FinanzasTab {
    return Boolean(value && (FINANZAS_TABS as readonly string[]).includes(value));
}

export function normalizeFinanzasTab(value: string | null | undefined): FinanzasTab {
    return isFinanzasTab(value) ? value : 'resumen';
}

export function finanzasTabFromSearch(search: string): FinanzasTab {
    const tab = new URLSearchParams(search).get('tab');
    return normalizeFinanzasTab(tab);
}

export function finanzasTabLabel(tab: FinanzasTab): string {
    if (tab === 'resumen') return 'Resumen';
    if (tab === 'movimientos') return 'Movimientos';
    if (tab === 'musicos') return 'Pagos músicos';
    return 'Cobros Simple';
}
