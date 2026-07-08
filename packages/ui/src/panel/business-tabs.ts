import type { PanelSectionTabItem } from './panel-section-tabs.js';

export const MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Datos del negocio', href: '/panel/mi-negocio' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-negocio/apariencia' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Autos: incluye catálogo de productos (accesorios, repuestos, etc.). */
export const MARKETPLACE_AUTOS_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Datos del negocio', href: '/panel/mi-negocio' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-negocio/apariencia' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'productos', label: 'Productos', href: '/panel/mi-negocio/productos' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Agenda: datos del negocio + apariencia + marketplace + reservas directas. */
export const AGENDA_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Datos del negocio', href: '/panel/mi-negocio' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-negocio/apariencia' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Serenatas: misma estructura de sub-rutas que las demás verticales. */
export const SERENATAS_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Datos del negocio', href: '/panel/mi-negocio' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-negocio/apariencia' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-negocio/direcciones' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'repertorio', label: 'Repertorio', href: '/panel/mi-negocio/repertorio' },
    { key: 'grupos', label: 'Grupos', href: '/panel/mi-negocio/grupos' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];
