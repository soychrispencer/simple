export const FINANZAS_TABS = ['resumen', 'movimientos', 'musicos'] as const;

export type FinanzasTab = (typeof FINANZAS_TABS)[number];

const LEGACY_TAB_ALIASES: Record<string, FinanzasTab> = {
    /** Facturación Simple movida a Mi cuenta > Suscripción */
    cobros: 'resumen',
};

export function isFinanzasTab(value: string | null | undefined): value is FinanzasTab {
    if (!value) return false;
    if (FINANZAS_TABS.includes(value as FinanzasTab)) return true;
    return value in LEGACY_TAB_ALIASES;
}

export function normalizeFinanzasTab(value: string | null | undefined): FinanzasTab {
    if (!value) return 'resumen';
    if (FINANZAS_TABS.includes(value as FinanzasTab)) return value as FinanzasTab;
    return LEGACY_TAB_ALIASES[value] ?? 'resumen';
}

export function finanzasTabFromSearch(search: string): FinanzasTab {
    const tab = new URLSearchParams(search).get('tab');
    return normalizeFinanzasTab(tab);
}

export function finanzasTabLabel(tab: FinanzasTab): string {
    if (tab === 'resumen') return 'Resumen';
    if (tab === 'movimientos') return 'Movimientos';
    return 'Pagos músicos';
}
