'use client';

import type { ComponentType } from 'react';
import {
    IconChartBar,
    IconFileText,
    IconBookmark,
    IconHome2,
    IconPlus,
    IconRocket,
    IconSettings,
    IconSparkles,
    IconMessageCircle,
    IconUsersGroup,
    IconTools,
} from '@tabler/icons-react';

export type PanelRole = 'user' | 'admin' | 'superadmin';
export type PanelVisibility = 'all' | 'admin_plus';

export type PanelNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
    visibility?: PanelVisibility;
    badge?: string;
};

const PANEL_NAV_ITEMS: PanelNavItem[] = [
    { href: '/panel', label: 'Mi Panel', icon: IconHome2 },
    { href: '/panel/publicaciones', label: 'Publicaciones', icon: IconFileText },
    { href: '/panel/publicar', label: 'Nueva publicación', icon: IconPlus },
    { href: '/panel/guardados', label: 'Guardados', icon: IconBookmark },
    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
    { href: '/panel/equipo', label: 'Equipo y leads', icon: IconUsersGroup, badge: 'PRO' },
    { href: '/panel/herramientas/simulador', label: 'Herramientas', icon: IconTools },
    { href: '/panel/configuracion', label: 'Mi Cuenta', icon: IconSettings },
    { href: '/panel/estadisticas', label: 'Estadísticas', icon: IconChartBar, visibility: 'admin_plus' },
    { href: '/panel/crm', label: 'CRM', icon: IconSparkles, badge: 'PRO' },
    { href: '/panel/publicidad', label: 'Publicidad', icon: IconRocket, visibility: 'admin_plus', badge: 'PRO' },
];

function canSee(itemVisibility: PanelVisibility | undefined, role: PanelRole): boolean {
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
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
}
