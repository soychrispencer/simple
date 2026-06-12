import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconUser,
    IconCoin,
    IconChartBar,
    IconShare,
    IconBriefcase,
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
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
    { href: '/panel/clientes', label: 'Pacientes', icon: IconUsers },
    { href: '/panel/pagos', label: 'Cobros', icon: IconCoin },
    { href: '/panel/analytics', label: 'Estadísticas', icon: IconChartBar },
    { href: '/panel/referidos', label: 'Referidos', icon: IconShare },
    { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },
    { href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },
];

const ACCOUNT_PATHS = [
    '/panel/mi-cuenta',
    '/panel/mi-cuenta/notificaciones',
    '/panel/mi-cuenta/integraciones',
    '/panel/mi-cuenta/suscripcion',
];

function isAccountPath(pathname: string): boolean {
    return ACCOUNT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getPanelNavItems(_role: PanelRole): PanelNavItem[] {
    return [...BASE_ITEMS];
}

export function isPanelNavActive(pathname: string, href: string): boolean {
    if (href === '/panel') return pathname === '/panel';
    if (href === '/panel/mi-cuenta') return isAccountPath(pathname);
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
