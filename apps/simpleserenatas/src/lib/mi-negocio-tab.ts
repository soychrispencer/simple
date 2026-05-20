export const MI_NEGOCIO_TABS = ['perfil', 'disponibilidad', 'servicios', 'grupos', 'configuraciones'] as const;

export type MiNegocioTab = (typeof MI_NEGOCIO_TABS)[number];

export function isMiNegocioTab(value: string | null | undefined): value is MiNegocioTab {
    return Boolean(value && MI_NEGOCIO_TABS.includes(value as MiNegocioTab));
}

export function miNegocioTabFromSearch(search: string): MiNegocioTab {
    try {
        const tab = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('tab');
        return isMiNegocioTab(tab) ? tab : 'perfil';
    } catch {
        return 'perfil';
    }
}

export function miNegocioTabLabel(tab: MiNegocioTab): string {
    switch (tab) {
        case 'perfil':
            return 'Perfil comercial';
        case 'disponibilidad':
            return 'Disponibilidad';
        case 'servicios':
            return 'Servicios';
        case 'grupos':
            return 'Grupos';
        case 'configuraciones':
            return 'Configuraciones';
    }
}
