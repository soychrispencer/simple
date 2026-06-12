'use client';

import { PanelSectionTabs as SharedPanelSectionTabs, type PanelSectionTabItem } from '@simple/ui/panel';

export function PanelSectionTabs({
    items,
    activeKey,
}: {
    items: PanelSectionTabItem[];
    activeKey: string;
}) {
    return <SharedPanelSectionTabs items={items} activeKey={activeKey} />;
}

export const businessSectionTabs: PanelSectionTabItem[] = [
    { key: 'pagina', label: 'Pagina publica', href: '/panel/mi-negocio' },
    { key: 'integraciones', label: 'Integraciones', href: '/panel/mi-negocio/integraciones' },
];

export const accountSectionTabs: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Datos personales', href: '/panel/mi-cuenta' },
    { key: 'direcciones', label: 'Direcciones', href: '/panel/mi-cuenta/direcciones' },
    { key: 'timezone', label: 'Zona horaria', href: '/panel/mi-cuenta/timezone' },
    { key: 'notificaciones', label: 'Notificaciones', href: '/panel/mi-cuenta/notificaciones' },
    { key: 'suscripcion', label: 'Suscripcion', href: '/panel/mi-cuenta/suscripcion' },
    { key: 'seguridad', label: 'Seguridad', href: '/panel/mi-cuenta/seguridad' },
];
