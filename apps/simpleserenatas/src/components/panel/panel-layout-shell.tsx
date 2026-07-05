'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconHome } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell, PanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight, createPanelAccountNavItem } from '@simple/ui/layout';
import {
    IconLayoutDashboard,
    IconBell,
    IconCalendar,
    IconMap,
    IconChartBar,
    IconUser,
    IconBriefcase,
    IconMessageCircle,
    IconCash,
} from '@tabler/icons-react';

const STORAGE_COLLAPSED = 'simpleserenatas:panel:collapsed';
const PRIMARY_HREF = '/panel/agenda';

const MOBILE_TABS = [
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/serenatas', label: 'Solicitudes', icon: IconBell },
    { href: PRIMARY_HREF, label: 'Agenda', icon: IconCalendar },
    { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },
    createPanelAccountNavItem(IconUser),
] as const;

function isDedicatedPanelNavActive(pathname: string, href: string): boolean {
    if (href === '/panel') return pathname === '/panel' || pathname === '/panel/';
    if (href === '/panel/mi-cuenta') {
        return pathname === href || pathname.startsWith('/panel/mi-cuenta/');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Panel shell simplificado para rutas dedicadas (/panel/mi-negocio/*).
 * No depende de SerenataProvider — solo usa useAuth() y pathname.
 */
export function PanelLayoutShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname() ?? '';

    const navItems = useMemo(() => {
        const items = [
            { id: 'home', href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
            { id: 'solicitudes', href: '/panel/serenatas', label: 'Solicitudes', icon: IconBell },
            { id: 'mensajes', href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
            { id: 'agenda', href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
            { id: 'map', href: '/panel/map', label: 'Mapa', icon: IconMap },
            { id: 'finanzas', href: '/panel/finanzas', label: 'Finanzas', icon: IconCash },
            { id: 'estadisticas', href: '/panel/estadisticas', label: 'Estadísticas', icon: IconChartBar },
            { id: 'mi-negocio', href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },
            { id: 'mi-cuenta', href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },
        ];
        return items.map(({ href, ...rest }) => ({ ...rest, href }));
    }, []);

    const bottomNavItems = useMemo(
        () =>
            applyBottomNavPrimaryHighlight(
                MOBILE_TABS.map((item) => ({
                    ...item,
                    active: isDedicatedPanelNavActive(pathname, item.href),
                })),
                PRIMARY_HREF,
            ),
        [pathname],
    );

    const activeHref = useMemo(() => {
        const match = navItems.find((item) => isDedicatedPanelNavActive(pathname, item.href));
        return match?.href ?? '/panel/mi-negocio';
    }, [navItems, pathname]);

    const userName = user?.name?.trim() || 'Usuario';

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: 'Dueño', avatar: user?.avatar }}
            roleLabel="Dueño"
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/"
            footerLabel="Ir al inicio"
            footerIcon={IconHome}
            activeHref={activeHref}
            isVerified={user?.status === 'verified'}
            bottomNav={<PanelBottomNav items={bottomNavItems} LinkComponent={Link} />}
        >
            {children}
        </SharedPanelShell>
    );
}
