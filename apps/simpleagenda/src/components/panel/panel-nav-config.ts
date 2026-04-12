import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconSettings,
    IconCoin,
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
    { href: '/panel/suscripciones', label: 'Suscripciones', icon: IconCoin },
    { href: '/panel/configuracion', label: 'Configuración', icon: IconSettings },
];

export function getPanelNavItems(_role: PanelRole): PanelNavItem[] {
    return [...BASE_ITEMS];
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
