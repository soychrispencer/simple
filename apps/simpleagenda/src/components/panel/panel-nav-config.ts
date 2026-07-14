import {
    IconLayoutDashboard,
    IconCalendarEvent,
    IconUsers,
    IconUser,
    IconChartBar,
    IconBriefcase,
    IconMessageCircle,
    IconCash,
    IconRocket,
    IconListDetails,
    type Icon,
} from '@tabler/icons-react';

export type PanelRole = 'user' | 'admin' | 'superadmin';

export type PanelNavItem = {
    href: string;
    label: string;
    icon: Icon;
    badge?: string;
    roles?: PanelRole[];
};

/** Orden: panel → operación → inventario → mensajes → crecer → números → config (negocio + cuenta) */
function buildBaseItems(clientsLabel: string): PanelNavItem[] {
    return [
        { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
        { href: '/panel/agenda', label: 'Agenda', icon: IconCalendarEvent },
        { href: '/panel/clientes', label: clientsLabel, icon: IconUsers },
        { href: '/panel/mis-servicios', label: 'Mis servicios', icon: IconListDetails },
        { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
        { href: '/panel/publicidad', label: 'Publicidad', icon: IconRocket },
        { href: '/panel/finanzas', label: 'Finanzas', icon: IconCash },
        { href: '/panel/analytics', label: 'Estadísticas', icon: IconChartBar },
        { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },
        { href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },
    ];
}

export function getPanelNavItems(_role: PanelRole, clientsLabel = 'Clientes'): PanelNavItem[] {
    return buildBaseItems(clientsLabel);
}

export function isPanelNavActive(pathname: string, href: string): boolean {
    if (href === '/panel') return pathname === '/panel';
    if (href === '/panel/mi-cuenta') {
        return pathname === href || pathname.startsWith('/panel/mi-cuenta/');
    }
    if (href === '/panel/mis-servicios') {
        return pathname === href || pathname.startsWith(`${href}/`);
    }
    if (href === '/panel/mi-negocio') {
        return pathname === href || pathname.startsWith(`${href}/`);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function panelRoleLabel(role: PanelRole): string {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Profesional';
}
