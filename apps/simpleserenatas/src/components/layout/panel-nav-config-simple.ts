// ============================================================================
// NAVEGACIÓN SIMPLIFICADA - De 15 items a 5 items esenciales
// ============================================================================

import type { ComponentType, CSSProperties } from 'react';
import {
    IconBell,
    IconHome,
    IconPlus,
    IconUser,
    IconUsersGroup,
} from '@tabler/icons-react';

export type SerenatasPanelNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties; className?: string }>;
    badge?: string;
    roles: SerenatasUserRole[];
    mobileRoles?: SerenatasUserRole[];
    isFooter?: boolean;
};

export type SerenatasUserRole = 'client' | 'musician' | 'coordinator' | 'admin';

// ============================================================================
// REGLAS DE ACCESO SIMPLIFICADAS
// ============================================================================

const ROUTE_ROLE_ACCESS: Record<string, SerenatasUserRole[]> = {
    // Cliente
    '/solicitar': ['client'],
    '/cliente': ['client'],
    '/cliente/serenatas': ['client'],
    
    // Coordinador
    '/coordinador': ['coordinator'],
    '/solicitudes': ['coordinator'],
    '/solicitudes/nueva': ['coordinator'],
    '/cuenta/coordinador': ['coordinator'],
    
    // Músico
    '/musico': ['musician'],
    '/invitaciones': ['musician'],
    
    // Todos
    '/notificaciones': ['client', 'musician', 'coordinator'],
    '/cuenta': ['client', 'musician', 'coordinator'],
    '/serenata': ['client', 'musician', 'coordinator'], // Detalle con [id]
};

// ============================================================================
// NAVEGACIÓN: SOLO 5 ITEMS TOTAL
// ============================================================================

const PANEL_NAV_ITEMS: SerenatasPanelNavItem[] = [
    // 1. INICIO (todos)
    { 
        href: '/inicio', 
        label: 'Inicio', 
        icon: IconHome, 
        roles: ['client', 'musician', 'coordinator', 'admin'],
        mobileRoles: ['client', 'musician', 'coordinator', 'admin']
    },
    
    // 2. SOLICITAR (solo cliente)
    { 
        href: '/solicitar', 
        label: 'Solicitar', 
        icon: IconPlus, 
        roles: ['client'],
        mobileRoles: ['client']
    },
    
    // 3. SOLICITUDES (coordinador) / INVITACIONES (músico)
    { 
        href: '/solicitudes', 
        label: 'Solicitudes', 
        icon: IconUsersGroup, 
        roles: ['coordinator'],
        mobileRoles: ['coordinator']
    },
    { 
        href: '/invitaciones', 
        label: 'Invitaciones', 
        icon: UsersGroupIcon, 
        roles: ['musician'],
        mobileRoles: ['musician']
    },
    
    // 4. NOTIFICACIONES (todos)
    { 
        href: '/notificaciones', 
        label: 'Notificaciones', 
        icon: IconBell, 
        roles: ['client', 'musician', 'coordinator', 'admin'],
        mobileRoles: ['client', 'musician', 'coordinator', 'admin']
    },
    
    // 5. MI CUENTA (footer - todos)
    { 
        href: '/cuenta', 
        label: 'Mi Cuenta', 
        icon: IconUser, 
        roles: ['client', 'musician', 'coordinator', 'admin'],
        mobileRoles: ['client', 'musician', 'coordinator', 'admin'],
        isFooter: true 
    },
];

// Icono alternativo para músicos
function UsersGroupIcon(props: any) {
    return IconUsersGroup(props);
}

// ============================================================================
// MOBILE BAR SIMPLIFICADO: Máximo 4 items
// ============================================================================

function mobileBarHrefsForRole(role?: string): readonly string[] {
    if (role === 'client') {
        return ['/inicio', '/solicitar', '/notificaciones', '/cuenta'];
    }
    if (role === 'coordinator') {
        return ['/coordinador', '/solicitudes', '/notificaciones', '/cuenta'];
    }
    if (role === 'musician') {
        return ['/musico', '/invitaciones', '/notificaciones', '/cuenta'];
    }
    return ['/inicio', '/cuenta'];
}

// ============================================================================
// HELPERS (sin cambios funcionales)
// ============================================================================

function cleanHref(href: string): string {
    return href.split('#')[0]?.split('?')[0] ?? href;
}

function pathMatchesRule(pathname: string, rulePrefix: string): boolean {
    const normalized = cleanHref(pathname);
    if (normalized === rulePrefix) return true;
    return normalized.startsWith(`${rulePrefix}/`);
}

export function isRouteAllowedForRole(pathname: string, role: string | undefined): boolean {
    if (role === 'admin' || role === 'superadmin') return true;
    for (const [rule, allowed] of Object.entries(ROUTE_ROLE_ACCESS)) {
        if (pathMatchesRule(pathname, rule)) {
            if (!role) return false;
            return allowed.includes(role as SerenatasUserRole);
        }
    }
    return true;
}

export function filterNavItemsByRole(
    items: SerenatasPanelNavItem[],
    role: string | undefined
): SerenatasPanelNavItem[] {
    if (role === 'superadmin') role = 'admin';
    const effectiveRole = role || 'client';
    return items.filter((item) => item.roles.includes(effectiveRole as SerenatasUserRole));
}

export function getSerenatasPanelNavItems(role?: string): SerenatasPanelNavItem[] {
    return filterNavItemsByRole(PANEL_NAV_ITEMS, role);
}

export function getSerenatasMobileNavItems(role?: string): SerenatasPanelNavItem[] {
    const allowed = getSerenatasPanelNavItems(role);
    const byHref = new Map(allowed.map((item) => [item.href, item]));
    return mobileBarHrefsForRole(role)
        .map((href) => byHref.get(href))
        .filter((item): item is SerenatasPanelNavItem => item != null);
}

export function getSerenatasOverflowNavItems(role?: string): SerenatasPanelNavItem[] {
    const allowed = getSerenatasPanelNavItems(role);
    const inBottomBar = new Set<string>(mobileBarHrefsForRole(role));
    return allowed.filter((item) => !inBottomBar.has(item.href));
}

export function isSerenatasNavActive(pathname: string, href: string): boolean {
    const normalized = cleanHref(href);
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
}
