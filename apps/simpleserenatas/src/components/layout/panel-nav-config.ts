'use client';

import type { ComponentType, CSSProperties } from 'react';
import {
    IconBell,
    IconBellRinging,
    IconCalendar,
    IconCreditCard,
    IconHome,
    IconMailbox,
    IconMessageCircle,
    IconPlus,
    IconRoute,
    IconSettings,
    IconUser,
    IconUsersGroup,
    IconWallet,
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

/**
 * Reglas de acceso por ruta. Si una ruta no está aquí explícitamente,
 * se considera abierta para cualquier usuario autenticado (perfil, inicio, etc.).
 *
 * El admin siempre tiene acceso a todo el panel.
 */
// ═══════════════════════════════════════════════════════════════════════════════
// REGLAS DE ACCESO POR ROL - SimpleSerenatas
// ═══════════════════════════════════════════════════════════════════════════════
// Organización por perfil:
// - CLIENTE: Experiencia simple - solicitar y ver sus serenatas
// - MÚSICO: Perfil profesional - invitaciones, disponibilidad, agenda
// - COORDINADOR: Operativo - pickup solicitudes, grupos, rutas, finanzas
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_ROLE_ACCESS: Record<string, SerenatasUserRole[]> = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLIENTE - Flujo simple de solicitud
    // ═══════════════════════════════════════════════════════════════════════════════
    '/solicitar': ['client'],                    // Wizard de solicitud
    '/mis-serenatas': ['client'],                // Historial de serenatas del cliente
    '/tracking': ['client', 'coordinator', 'musician'], // Seguimiento (ruta canónica única)
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MÚSICO - Perfil profesional
    // ═══════════════════════════════════════════════════════════════════════════════
    '/invitaciones': ['musician'], // Invitaciones del músico
    '/perfil/configuracion/disponibilidad': ['musician'],
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COORDINADOR - Operaciones (requiere suscripción activa)
    // ═══════════════════════════════════════════════════════════════════════════════
    '/solicitudes': ['coordinator'],             // Serenatas asignadas + captura directa (subrutas /nueva, /:id, /:id/editar)
    '/cuadrilla': ['coordinator'],              // Gestión de músicos
    '/mapa': ['coordinator'],                   // Rutas y optimización
    '/finanzas': ['coordinator'],               // Ingresos y pagos
    '/grupos': ['coordinator'],                 // Grupos de trabajo
    '/suscripcion': ['musician', 'coordinator', 'admin'],
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CHAT — MVP coordinador: fuera de foco (WhatsApp sigue siendo canal); reactivar en SERENATAS_POST_MVP.md
    '/chat': ['client', 'musician'],
};

// ============================================================================
// NAVEGACIÓN SIMPLIFICADA - Solo esencial
// ============================================================================

const PANEL_NAV_ITEMS: SerenatasPanelNavItem[] = [
    // 1. INICIO (todos)
    { href: '/inicio', label: 'Inicio', icon: IconHome, roles: ['client', 'musician', 'coordinator', 'admin'], mobileRoles: ['client', 'musician', 'coordinator', 'admin'] },
    
    // 2. SOLICITAR (cliente)
    { href: '/solicitar', label: 'Solicitar', icon: IconPlus, roles: ['client'], mobileRoles: ['client'] },
    
    // 3. SOLICITUDES/INVITACIONES (coordinador/musico)
    { href: '/solicitudes', label: 'Solicitudes', icon: IconBell, roles: ['coordinator'], mobileRoles: ['coordinator'] },
    { href: '/invitaciones', label: 'Invitaciones', icon: IconBellRinging, roles: ['musician'], mobileRoles: ['musician'] },
    
    // 4. NOTIFICACIONES (todos)
    { href: '/notificaciones', label: 'Notificaciones', icon: IconMailbox, roles: ['client', 'musician', 'coordinator', 'admin'] },
    
    // 5. MI CUENTA (footer - todos)
    { href: '/perfil', label: 'Mi Cuenta', icon: IconUser, roles: ['client', 'musician', 'coordinator', 'admin'], mobileRoles: ['client', 'musician', 'coordinator', 'admin'], isFooter: true },
];

/**
 * Resuelve la barra inferior móvil por rol. La app es operativa:
 * cuatro accesos frecuentes, no todas las funciones.
 */
function mobileBarHrefsForRole(role?: string): readonly string[] {
    // Simplificado: máximo 4 items
    if (role === 'client') {
        return ['/inicio', '/solicitar', '/notificaciones', '/perfil'];
    }
    if (role === 'musician') {
        return ['/inicio', '/invitaciones', '/notificaciones', '/perfil'];
    }
    if (role === 'coordinator' || role === 'admin') {
        return ['/inicio', '/solicitudes', '/notificaciones', '/perfil'];
    }
    return ['/inicio', '/perfil'];
}

function cleanHref(href: string): string {
    return href.split('#')[0]?.split('?')[0] ?? href;
}

function pathMatchesRule(pathname: string, rulePrefix: string): boolean {
    const normalized = cleanHref(pathname);
    if (normalized === rulePrefix) return true;
    return normalized.startsWith(`${rulePrefix}/`);
}

/**
 * Determina si una ruta es accesible para un rol dado. Si no hay regla, está abierta.
 * `admin` siempre puede entrar.
 */
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
    // Si no hay rol definido o es 'client', mostrar items de cliente
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

/** Rutas que no están en la barra inferior: menú hamburguesa en móvil. */
export function getSerenatasOverflowNavItems(role?: string): SerenatasPanelNavItem[] {
    const allowed = getSerenatasPanelNavItems(role);
    const inBottomBar = new Set<string>(mobileBarHrefsForRole(role));
    return allowed.filter((item) => !inBottomBar.has(item.href));
}

export function isSerenatasNavActive(pathname: string, href: string): boolean {
    const normalized = cleanHref(href);
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
}
