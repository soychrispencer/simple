'use client';



import type { ComponentType } from 'react';

import {

    IconLayoutDashboard,

    IconChartBar,

    IconCash,

    IconFileText,

    IconPlus,

    IconRocket,

    IconUser,

    IconMessageCircle,

    IconBriefcase,

} from '@tabler/icons-react';

import { isMarketplaceLaunchMode } from '@simple/utils';



export type PanelRole = 'user' | 'admin' | 'superadmin';

export type PanelVisibility = 'all' | 'admin_plus';



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

    { href: '/panel/publicaciones', label: 'Mis publicaciones', icon: IconFileText },

    { href: '/panel/publicar', label: 'Nueva publicación', icon: IconPlus },

    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },

    { href: '/panel/mi-negocio', label: 'Mi negocio', icon: IconBriefcase },

    { href: '/panel/publicidad', label: 'Publicidad', icon: IconRocket },

    { href: '/panel/finanzas', label: 'Finanzas', icon: IconCash, visibility: 'admin_plus' },

    { href: '/panel/estadisticas', label: 'Estadísticas', icon: IconChartBar, visibility: 'admin_plus' },

    { href: '/panel/mi-cuenta', label: 'Mi cuenta', icon: IconUser },

];



function canSee(itemVisibility: PanelVisibility | undefined, role: PanelRole): boolean {

    if (isMarketplaceLaunchMode() && itemVisibility === 'admin_plus') return true;

    if (!itemVisibility || itemVisibility === 'all') return true;

    return role === 'admin' || role === 'superadmin';

}



export function getPanelNavItems(role: PanelRole): PanelNavItem[] {

    return PANEL_NAV_ITEMS.filter((item) => canSee(item.visibility, role));

}



export function panelRoleLabel(role: PanelRole): string {

    if (role === 'superadmin') return 'Superadmin';

    if (role === 'admin') return 'Admin';

    return 'Usuario';

}



export function panelPlanLabel(role: PanelRole): string {

    if (role === 'superadmin') return 'Empresa';

    if (role === 'admin') return 'Pro';

    return 'Gratis';

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


