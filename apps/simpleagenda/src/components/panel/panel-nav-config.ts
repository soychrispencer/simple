import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconSettings,
    IconShield,
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

const BASE_ITEMS: PanelNavItem[] = [
    { href: '/panel', label: 'Inicio', icon: IconLayoutDashboard },
    { href: '/panel/agenda', label: 'Mi Agenda', icon: IconCalendar },
    { href: '/panel/clientes', label: 'Pacientes', icon: IconUsers },
    { href: '/panel/pagos', label: 'Cobros', icon: IconCreditCard },
    { href: '/panel/configuracion', label: 'Configuración', icon: IconSettings },
];

const ADMIN_ITEMS: PanelNavItem[] = [
    { href: '/panel/admin', label: 'Administración', icon: IconShield, roles: ['admin', 'superadmin'] },
];

export function getPanelNavItems(role: PanelRole): PanelNavItem[] {
    const items = [...BASE_ITEMS];
    if (role === 'admin' || role === 'superadmin') {
        items.push(...ADMIN_ITEMS);
    }
    return items;
}

export function isPanelNavActive(pathname: string, href: string): boolean {
    if (href === '/panel') return pathname === '/panel';
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function panelRoleLabel(role: PanelRole): string {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Profesional';
}
