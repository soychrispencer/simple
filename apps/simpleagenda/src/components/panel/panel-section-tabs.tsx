export { PanelSectionTabs } from '@simple/ui/panel';
import { type PanelSectionTabItem } from '@simple/ui/panel';

export type AgendaPanelTab = PanelSectionTabItem;

export const businessSectionTabs: AgendaPanelTab[] = [
    { key: 'perfil', label: 'Perfil', href: '/panel/mi-negocio' },
    { key: 'servicios', label: 'Servicios', href: '/panel/mi-negocio/servicios' },
    { key: 'disponibilidad', label: 'Disponibilidad', href: '/panel/mi-negocio/disponibilidad' },
    { key: 'cobros', label: 'Cobros', href: '/panel/mi-negocio/cobros' },
    { key: 'link', label: 'Link público', href: '/panel/mi-negocio/link' },
];

export const accountSectionTabs: AgendaPanelTab[] = [
    { key: 'datos', label: 'Datos personales', href: '/panel/mi-cuenta' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-cuenta/direcciones' },
    { key: 'timezone', label: 'Zona horaria', href: '/panel/mi-cuenta/timezone' },
    { key: 'notificaciones', label: 'Notificaciones', href: '/panel/mi-cuenta/notificaciones' },
    { key: 'integraciones', label: 'Integraciones', href: '/panel/mi-cuenta/integraciones' },
    { key: 'suscripcion', label: 'Suscripción', href: '/panel/mi-cuenta/suscripcion' },
    { key: 'seguridad', label: 'Seguridad', href: '/panel/mi-cuenta/seguridad' },
];
