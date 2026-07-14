export const MI_NEGOCIO_TABS = ['datos', 'apariencia', 'direcciones', 'horarios', 'repertorio', 'grupos', 'configuraciones'] as const;

export type MiNegocioTab = (typeof MI_NEGOCIO_TABS)[number];

const LEGACY_TAB_ALIASES: Record<string, MiNegocioTab> = {
    perfil: 'datos',
    'medios-pago': 'configuraciones',
    cobros: 'configuraciones',
    disponibilidad: 'horarios',
    /** Catálogo movido a /panel/mis-servicios — alias evita romper normalización. */
    servicios: 'datos',
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
            return 'Datos del negocio';
        case 'apariencia':
            return 'Apariencia';
        case 'direcciones':
            return 'Direcciones';
        case 'horarios':
            return 'Horario';
        case 'repertorio':
            return 'Repertorio';
        case 'grupos':
            return 'Grupos';
        case 'configuraciones':
            return 'Configuraciones';
    }
}
