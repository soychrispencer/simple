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
    type Icon,
} from '@tabler/icons-react';

export type PanelNavItem = {
    href: string;
    label: string;
    icon: Icon;
    badge?: string;
};

/** Orden: panel → operación → mensajes → crecer → números → configuración del negocio y la cuenta */
function buildBaseItems(clientsLabel: string): PanelNavItem[] {
    return [
        { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
        { href: '/panel/agenda', label: 'Agenda', icon: IconCalendarEvent },
        { href: '/panel/clientes', label: clientsLabel, icon: IconUsers },
        { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
        { href: '/panel/publicidad', label: 'Publicidad', icon: IconRocket },
        { href: '/panel/finanzas', label: 'Finanzas', icon: IconCash },
        { href: '/panel/analytics', label: 'Estadísticas', icon: IconChartBar },
        { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },
        { href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },
    ];
}
export function getPanelNavItems(
    clientsLabel = 'Clientes',
    accountRole?: string | null,
    isPersonalAccount = true,
): PanelNavItem[] {
    const items = buildBaseItems(clientsLabel);
    if (isPersonalAccount || accountRole !== 'agent') return items;

    const agentWorkItems = new Set([
        '/panel',
        '/panel/agenda',
        '/panel/clientes',
        '/panel/mensajes',
        '/panel/mi-negocio',
        '/panel/mi-cuenta',
    ]);
    return items.filter((item) => agentWorkItems.has(item.href));
}

export function isPanelNavActive(pathname: string, href: string): boolean {
    if (href === '/panel') return pathname === '/panel';
    if (href === '/panel/mi-cuenta') {
        return pathname === href || pathname.startsWith('/panel/mi-cuenta/');
    }
    if (href === '/panel/mi-negocio') {
        return pathname === href
            || pathname.startsWith(`${href}/`)
            || pathname === '/panel/mis-servicios'
            || pathname.startsWith('/panel/mis-servicios/');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}
