export const MI_NEGOCIO_TABS = ['datos', 'servicios', 'disponibilidad', 'medios-pago', 'repertorio', 'grupos', 'configuraciones'] as const;

export type MiNegocioTab = (typeof MI_NEGOCIO_TABS)[number];

const LEGACY_TAB_ALIASES: Record<string, MiNegocioTab> = {
    perfil: 'datos',
    cobros: 'medios-pago',
};

export function isMiNegocioTab(value: string | null | undefined): value is MiNegocioTab {
    if (!value) return false;
    if (MI_NEGOCIO_TABS.includes(value as MiNegocioTab)) return true;
    return value in LEGACY_TAB_ALIASES;
}

export function normalizeMiNegocioTab(value: string | null | undefined): MiNegocioTab | null {
    if (!value) return null;
    if (MI_NEGOCIO_TABS.includes(value as MiNegocioTab)) return value as MiNegocioTab;
    return LEGACY_TAB_ALIASES[value] ?? null;
}

export function miNegocioTabFromSearch(search: string): MiNegocioTab {
    try {
        const tab = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('tab');
        return normalizeMiNegocioTab(tab) ?? 'datos';
    } catch {
        return 'datos';
    }
}

export function miNegocioTabLabel(tab: MiNegocioTab): string {
    switch (tab) {
        case 'datos':
            return 'Perfil público';
        case 'disponibilidad':
            return 'Disponibilidad';
        case 'servicios':
            return 'Servicios';
        case 'medios-pago':
            return 'Medios de pago';
        case 'repertorio':
            return 'Repertorio';
        case 'grupos':
            return 'Grupos';
        case 'configuraciones':
            return 'Configuraciones';
    }
}
