'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconHome } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell } from '@simple/ui/panel';
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

    const activeHref = useMemo(() => {
        const match = navItems.find((item) => {
            if (item.href === '/panel') return pathname === '/panel' || pathname === '/panel/';
            return pathname.startsWith(item.href);
        });
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
        >
            {children}
        </SharedPanelShell>
    );
}
