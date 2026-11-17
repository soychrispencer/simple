'use client';

import type { ComponentType } from 'react';
import {
    IconLayoutDashboard,
    IconChartBar,
    IconCash,
    IconListDetails,
    IconRocket,
    IconUser,
    IconMessageCircle,
    IconBuildingStore,
    IconAddressBook,
} from '@tabler/icons-react';
import { isMarketplaceLaunchMode } from '@simple/utils';
import type { PanelAccountKind } from '@simple/ui/panel';

export type PanelVisibility = 'all' | 'admin_plus' | 'professional_plus';

export type PanelNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
    visibility?: PanelVisibility;
    badge?: string;
    section?: string;
};

const PANEL_NAV_ITEMS: PanelNavItem[] = [
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/publicaciones', label: 'Mis publicaciones', icon: IconListDetails },
    { href: '/panel/contactos', label: 'Contactos', icon: IconAddressBook },
    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
    { href: '/panel/publicidad', label: 'Publicidad', icon: IconRocket },
    { href: '/panel/finanzas', label: 'Finanzas', icon: IconCash, visibility: 'admin_plus' },
    { href: '/panel/estadisticas', label: 'Estadísticas', icon: IconChartBar, visibility: 'professional_plus' },
    { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBuildingStore },
    { href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },
];

function canSee(
    itemVisibility: PanelVisibility | undefined,
    accountRole: string | null,
    isPersonalAccount: boolean,
    accountKind: PanelAccountKind | null,
): boolean {
    const isCompanyAgent = !isPersonalAccount && accountRole === 'agent';
    if (!itemVisibility || itemVisibility === 'all') return true;
    if (isCompanyAgent) return false;
    if (isMarketplaceLaunchMode()) return true;

    if (itemVisibility === 'admin_plus') {
        return !isPersonalAccount && (accountRole === 'owner' || accountRole === 'admin');
    }

    return (isPersonalAccount && accountKind === 'independent')
        || (!isPersonalAccount && (accountRole === 'owner' || accountRole === 'admin'));
}

export function getPanelNavItems(
    accountRole: string | null = null,
    isPersonalAccount = true,
    accountKind: PanelAccountKind | null = null,
): PanelNavItem[] {
    const isCompanyAgent = !isPersonalAccount && accountRole === 'agent';
    const agentWorkItems = new Set([
        '/panel',
        '/panel/publicaciones',
        '/panel/contactos',
        '/panel/mensajes',
        '/panel/mi-cuenta',
    ]);
    const visibleItems = isCompanyAgent
        ? PANEL_NAV_ITEMS.filter((item) => agentWorkItems.has(item.href))
        : PANEL_NAV_ITEMS;

    return visibleItems.filter((item) => canSee(
        item.visibility,
        accountRole,
        isPersonalAccount,
        accountKind,
    ));
}

function cleanPanelHref(href: string): string {
    return href.split('#')[0]?.split('?')[0] ?? href;
}

export function isPanelNavActive(pathname: string, href: string): boolean {
    const normalized = cleanPanelHref(href);
    if (normalized === '/panel') return pathname === '/panel';
    if (normalized === '/panel/mi-cuenta') {
        return pathname === normalized || pathname.startsWith('/panel/mi-cuenta/');
    }
    if (normalized === '/panel/mi-negocio') {
        return pathname === normalized || pathname.startsWith('/panel/mi-negocio/');
    }
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
}
