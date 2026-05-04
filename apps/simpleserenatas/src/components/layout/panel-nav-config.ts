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
    '/tracking': ['client', 'coordinator'],    // Seguimiento en tiempo real
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MÚSICO - Perfil profesional
    // ═══════════════════════════════════════════════════════════════════════════════
    '/invitaciones': ['musician', 'coordinator'], // Invitaciones de coordinadores
    '/perfil/configuracion/disponibilidad': ['musician', 'coordinator'],
    '/perfil/configuracion/datos': ['musician', 'coordinator', 'client'],
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COORDINADOR - Operaciones (requiere suscripción activa)
    // ═══════════════════════════════════════════════════════════════════════════════
    '/solicitudes': ['coordinator'],             // Pickup de solicitudes disponibles
    '/cuadrilla': ['coordinator'],              // Gestión de músicos
    '/mapa': ['coordinator'],                   // Rutas y optimización
    '/finanzas': ['coordinator'],               // Ingresos y pagos
    '/grupos': ['coordinator'],                 // Grupos de trabajo
    '/suscripcion': ['coordinator'],            // Gestión de suscripción
    '/serenatas-manuales': ['coordinator'],     // Serenatas sin comisión
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CHAT - Acceso cruzado según contexto
    // ═══════════════════════════════════════════════════════════════════════════════
    '/chat': ['client', 'musician', 'coordinator'],
};

const PANEL_NAV_ITEMS: SerenatasPanelNavItem[] = [
    // ═══════════════════════════════════════════════════════════════════════════════
    // NAVEGACIÓN COMÚN
    // ═══════════════════════════════════════════════════════════════════════════════
    { href: '/inicio', label: 'Inicio', icon: IconHome, roles: ['client', 'musician', 'coordinator', 'admin'], mobileRoles: ['client', 'musician', 'coordinator', 'admin'] },
    { href: '/agenda', label: 'Agenda', icon: IconCalendar, roles: ['musician', 'coordinator', 'admin'], mobileRoles: ['musician', 'coordinator', 'admin'] },
    { href: '/notificaciones', label: 'Notificaciones', icon: IconBellRinging, roles: ['client', 'musician', 'coordinator', 'admin'] },

    // ═══════════════════════════════════════════════════════════════════════════════
    // CLIENTE - Flujo simple
    // ═══════════════════════════════════════════════════════════════════════════════
    { href: '/solicitar', label: 'Solicitar', icon: IconPlus, roles: ['client'], mobileRoles: ['client'] },
    { href: '/mis-serenatas', label: 'Mis Serenatas', icon: IconBell, roles: ['client'], mobileRoles: ['client'] },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MÚSICO - Perfil profesional
    // ═══════════════════════════════════════════════════════════════════════════════
    { href: '/invitaciones', label: 'Invitaciones', icon: IconMailbox, roles: ['musician', 'coordinator'], mobileRoles: ['musician'] },
    { href: '/perfil/configuracion/disponibilidad', label: 'Disponibilidad', icon: IconSettings, roles: ['musician', 'coordinator'] },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COORDINADOR - Panel de operaciones
    // ═══════════════════════════════════════════════════════════════════════════════
    { href: '/solicitudes', label: 'Solicitudes', icon: IconBell, roles: ['coordinator'], mobileRoles: ['coordinator'] },
    { href: '/cuadrilla', label: 'Cuadrilla', icon: IconUsersGroup, roles: ['coordinator'] },
    { href: '/grupos', label: 'Grupos', icon: IconUsersGroup, roles: ['coordinator'] },
    { href: '/mapa', label: 'Rutas', icon: IconRoute, roles: ['coordinator'], mobileRoles: ['coordinator'] },
    { href: '/finanzas', label: 'Finanzas', icon: IconWallet, roles: ['coordinator'] },
    { href: '/suscripcion', label: 'Suscripción', icon: IconCreditCard, roles: ['coordinator'] },
    { href: '/chat', label: 'Chat', icon: IconMessageCircle, roles: ['client', 'musician', 'coordinator'] },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MI CUENTA - Siempre al final del sidebar, separado visualmente
    // ═══════════════════════════════════════════════════════════════════════════════
    { href: '/perfil', label: 'Mi Cuenta', icon: IconUser, roles: ['client', 'musician', 'coordinator', 'admin'], mobileRoles: ['client', 'musician', 'coordinator', 'admin'], isFooter: true },
];

/**
 * Resuelve la barra inferior móvil por rol. La app es operativa:
 * cuatro accesos frecuentes, no todas las funciones.
 */
function mobileBarHrefsForRole(role?: string): readonly string[] {
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLIENTE - Experiencia simple: Inicio, Solicitar, Mis Serenatas, Mi Cuenta
    // ═══════════════════════════════════════════════════════════════════════════════
    if (role === 'client') return ['/inicio', '/solicitar', '/mis-serenatas', '/perfil'];
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MÚSICO - Perfil profesional: Inicio, Invitaciones, Agenda, Mi Cuenta
    // ═══════════════════════════════════════════════════════════════════════════════
    if (role === 'musician') return ['/inicio', '/invitaciones', '/agenda', '/perfil'];
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COORDINADOR - Panel de operaciones: Inicio, Solicitudes, Cuadrilla, Finanzas
    // ═══════════════════════════════════════════════════════════════════════════════
    if (role === 'coordinator' || role === 'admin' || role === 'superadmin') {
        return ['/inicio', '/solicitudes', '/cuadrilla', '/finanzas'];
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
