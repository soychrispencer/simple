import type { PanelSectionTabItem } from './panel-section-tabs.js';
import { BUSINESS_PAYMENT_METHODS_PAGE } from './finance-copy.js';

export const MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'contacto', label: 'Contacto', href: '/panel/mi-negocio/contacto' },
    { key: 'redes', label: 'Redes sociales', href: '/panel/mi-negocio/redes' },
    { key: 'horarios', label: 'Horario', href: '/panel/mi-negocio/horarios' },
    { key: 'equipo', label: 'Equipo', href: '/panel/mi-negocio/equipo' },
];

/** Agenda: perfil público + marketplace + reservas directas. */
export const AGENDA_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'disponibilidad', label: 'Disponibilidad', href: '/panel/mi-negocio/disponibilidad' },
    { key: 'cobros', label: BUSINESS_PAYMENT_METHODS_PAGE.title, href: '/panel/mi-negocio/cobros' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio/configuraciones' },
];

/** Serenatas: misma estructura conceptual; navegación por query `?tab=`. */
export const SERENATAS_BUSINESS_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Perfil público', href: '/panel/mi-negocio' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio?tab=servicios' },
    { key: 'disponibilidad', label: 'Disponibilidad', href: '/panel/mi-negocio?tab=disponibilidad' },
    { key: 'medios-pago', label: BUSINESS_PAYMENT_METHODS_PAGE.title, href: '/panel/mi-negocio?tab=medios-pago' },
    { key: 'repertorio', label: 'Repertorio', href: '/panel/mi-negocio?tab=repertorio' },
    { key: 'grupos', label: 'Grupos', href: '/panel/mi-negocio?tab=grupos' },
    { key: 'configuraciones', label: 'Configuraciones', href: '/panel/mi-negocio?tab=configuraciones' },
];
