'use client';

import type { ComponentType } from 'react';
import {
    IconHome,
    IconPlus,
    IconUsersGroup,
    IconMusic,
    IconBell,
    IconCalendar,
    IconMap,
    IconUser,
    IconBriefcase,
} from '@tabler/icons-react';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { type AppMode, ownerFeaturesEnabled, hasClientProfile, hasWorkProfile } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { panelSectionHref, sectionFromPanelPath } from '@/lib/panel-routes';
import {
    type MarketplacePanelNavItem,
    type MarketplacePanelRole,
    type PanelNotification,
} from '@simple/marketplace-header';
import { toPanelNotification } from '@/lib/serenata-notifications';

export type PanelNavItem = {
    id: Section;
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
    badge?: string;
};

export type PrimaryActionConfig = {
    label: string;
    href: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
    show: boolean;
};

export function getPrimaryActionConfig(mode: AppMode, profiles: Profiles): PrimaryActionConfig {
    if (mode === 'client') {
        return { label: 'Contratar serenata', href: panelSectionHref('grupos'), icon: IconUsersGroup, show: true };
    }
    if (ownerFeaturesEnabled(profiles)) {
        return { label: 'Ver solicitudes', href: panelSectionHref('solicitudes'), icon: IconBell, show: true };
    }
    return { label: 'Ver invitaciones', href: panelSectionHref('invitations'), icon: IconUsersGroup, show: true };
}

export function getPanelNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    const items: PanelNavItem[] = [
        { id: 'home', href: panelSectionHref('home'), label: 'Mi panel', icon: IconHome },
    ];

    if (mode === 'client') {
        items.push({ id: 'grupos', href: panelSectionHref('grupos'), label: 'Mariachis', icon: IconUsersGroup });
        items.push({ id: 'serenatas', href: panelSectionHref('serenatas'), label: 'Mis Serenatas', icon: IconMusic });
        items.push({ id: 'profile', href: panelSectionHref('profile'), label: 'Mi cuenta', icon: IconUser });
        return items;
    }

    const isOwner = ownerFeaturesEnabled(profiles);

    if (isOwner) {
        items.push({ id: 'solicitudes', href: panelSectionHref('solicitudes'), label: 'Solicitudes', icon: IconBell });
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
        items.push({ id: 'map', href: panelSectionHref('map'), label: 'Mapa', icon: IconMap });
        items.push({ id: 'mi-negocio', href: panelSectionHref('mi-negocio'), label: 'Mi Negocio', icon: IconBriefcase });
    } else if (profiles.musician) {
        items.push({ id: 'invitations', href: panelSectionHref('invitations'), label: 'Invitaciones', icon: IconUsersGroup });
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
    }

    items.push({ id: 'profile', href: panelSectionHref('profile'), label: 'Mi cuenta', icon: IconUser });

    return items;
}

/**
 * Tabs visibles en bottom nav móvil (máx. 4 + perfil aparte).
 * Admin: Mapa no cabe como quinta pestaña — va en sheet «Más» (`getMobileOverflowNavItems`).
 */
export function getMobileBottomNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    if (mode === 'client') {
        return getPanelNavItems(mode, profiles).filter((t) => ['home', 'grupos', 'serenatas', 'profile'].includes(t.id));
    }
    if (ownerFeaturesEnabled(profiles)) {
        return getPanelNavItems(mode, profiles).filter((t) =>
            ['home', 'solicitudes', 'mi-negocio', 'agenda', 'profile'].includes(t.id),
        );
    }
    return getPanelNavItems(mode, profiles).filter((t) => ['home', 'invitations', 'agenda', 'profile'].includes(t.id));
}

/** Secciones del panel admin accesibles desde «Más» en bottom nav móvil (p. ej. Mapa). */
export function getMobileOverflowNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    if (mode !== 'work' || !ownerFeaturesEnabled(profiles)) return [];
    return getPanelNavItems(mode, profiles).filter((t) => t.id === 'map');
}

export function getModeSwitchItems(profiles: Profiles): { key: AppMode; label: string }[] {
    const items: { key: AppMode; label: string }[] = [];
    if (hasClientProfile(profiles)) items.push({ key: 'client', label: 'Cliente' });
    if (hasWorkProfile(profiles)) items.push({ key: 'work', label: ownerFeaturesEnabled(profiles) ? 'Negocio' : 'Músico' });
    return items;
}

export function mapModeToMarketplaceRole(mode: AppMode, profiles: Profiles): MarketplacePanelRole {
    if (mode === 'work' && ownerFeaturesEnabled(profiles)) return 'user';
    return 'user';
}

export function getMarketplaceNavItems(mode: AppMode, profiles: Profiles): MarketplacePanelNavItem[] {
    return getPanelNavItems(mode, profiles).map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        badge: item.badge,
    }));
}

export function isPanelNavActive(pathname: string, href: string, currentSection?: string | null): boolean {
    try {
        const url = new URL(href, 'http://localhost');
        const hrefSection = sectionFromPanelPath(url.pathname) ?? url.searchParams.get('section');
        if (hrefSection && currentSection) {
            if (hrefSection === 'mi-negocio' && (currentSection === 'mi-negocio' || currentSection === 'servicios' || currentSection === 'groups')) {
                return true;
            }
            return hrefSection === currentSection;
        }
        if (pathname === url.pathname) return true;
    } catch {
        // ignore malformed href
    }
    return false;
}

export async function fetchNotifications(): Promise<PanelNotification[]> {
    try {
        const response = await serenatasApi.notifications();
        if (!response.ok) return [];
        return response.items.map(toPanelNotification);
    } catch {
        return [];
    }
}

export function panelModeLabel(mode: AppMode): string {
    return mode === 'work' ? 'Operación' : 'Cliente';
}
