import type { PanelSectionTabItem } from './panel-section-tabs.js';

export const MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Agenda: perfil público + apariencia + marketplace + reservas directas. */
export const AGENDA_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-negocio/apariencia' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Serenatas: misma estructura conceptual; navegación por query `?tab=`. */
export const SERENATAS_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio?tab=direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio?tab=horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio?tab=servicios' },
    { key: 'repertorio', label: 'Repertorio', href: '/panel/mi-negocio?tab=repertorio' },
    { key: 'grupos', label: 'Grupos', href: '/panel/mi-negocio?tab=grupos' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio?tab=configuraciones' },
];
