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
    IconChartBar,
    IconBrandWhatsapp,
    IconUser,
    IconBriefcase,
    IconBookmark,
} from '@tabler/icons-react';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { CLIENT_MARKETPLACE_HREF, isClientMarketplaceHref } from '@/lib/client-marketplace';
import { type AppMode, ownerFeaturesEnabled } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { panelSectionHref, sectionFromPanelPath } from '@/lib/panel-routes';
import { type MarketplacePanelNavItem, type PanelNotification } from '@simple/marketplace-header';
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

export function getPrimaryActionConfig(
    mode: AppMode,
    profiles: Profiles,
    pathname?: string,
): PrimaryActionConfig {
    if (ownerFeaturesEnabled(profiles)) {
        return {
            label: 'Agenda',
            href: panelSectionHref('agenda'),
            icon: IconCalendar,
            show: true,
        };
    }
    if (mode === 'client') {
        if (pathname && isClientMarketplaceHref(pathname)) {
            return {
                label: 'Mis serenatas',
                href: panelSectionHref('serenatas'),
                icon: IconMusic,
                show: true,
            };
        }
        return { label: 'Explorar mariachis', href: CLIENT_MARKETPLACE_HREF, icon: IconUsersGroup, show: true };
    }
    return { label: 'Ver invitaciones', href: panelSectionHref('invitations'), icon: IconUsersGroup, show: true };
}

export function getPanelNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    const items: PanelNavItem[] = [
        { id: 'home', href: panelSectionHref('home'), label: 'Mi panel', icon: IconHome },
    ];

    if (mode === 'client') {
        items.push({ id: 'mariachis', href: CLIENT_MARKETPLACE_HREF, label: 'Explorar', icon: IconUsersGroup });
        items.push({ id: 'guardados', href: panelSectionHref('guardados'), label: 'Guardados', icon: IconBookmark });
        items.push({ id: 'serenatas', href: panelSectionHref('serenatas'), label: 'Mis serenatas', icon: IconMusic });
        items.push({ id: 'profile', href: panelSectionHref('profile'), label: 'Mi cuenta', icon: IconUser });
        return items;
    }

    const isOwner = ownerFeaturesEnabled(profiles);

    if (isOwner) {
        items.push({ id: 'solicitudes', href: panelSectionHref('solicitudes'), label: 'Solicitudes', icon: IconBell });
        if (profiles.musician) {
            items.push({ id: 'invitations', href: panelSectionHref('invitations'), label: 'Invitaciones', icon: IconUsersGroup });
        }
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
        items.push({ id: 'map', href: panelSectionHref('map'), label: 'Mapa', icon: IconMap });
        items.push({ id: 'finanzas', href: panelSectionHref('finanzas'), label: 'Finanzas', icon: IconChartBar, badge: 'Pro' });
        items.push({ id: 'chat', href: panelSectionHref('chat'), label: 'Chat', icon: IconBrandWhatsapp, badge: 'Pro' });
        items.push({ id: 'mi-negocio', href: panelSectionHref('mi-negocio'), label: 'Mi negocio', icon: IconBriefcase });
    } else if (profiles.musician) {
        items.push({ id: 'invitations', href: panelSectionHref('invitations'), label: 'Invitaciones', icon: IconUsersGroup });
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
        items.push({ id: 'serenatas', href: panelSectionHref('serenatas'), label: 'Mis serenatas', icon: IconMusic });
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
        return getPanelNavItems(mode, profiles).filter((t) =>
            ['home', 'mariachis', 'guardados', 'serenatas', 'profile'].includes(t.id),
        );
    }
    if (ownerFeaturesEnabled(profiles)) {
        const tabIds = ['home', 'solicitudes', 'mi-negocio', 'agenda', 'profile'];
        if (profiles.musician) tabIds.splice(2, 0, 'invitations');
        return getPanelNavItems(mode, profiles).filter((t) => tabIds.includes(t.id));
    }
    return getPanelNavItems(mode, profiles).filter((t) => ['home', 'invitations', 'agenda', 'serenatas', 'profile'].includes(t.id));
}

/** Secciones del panel dueño accesibles desde «Más» en bottom nav móvil (p. ej. Mapa). */
export function getMobileOverflowNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    if (mode !== 'work' || !ownerFeaturesEnabled(profiles)) return [];
    return getPanelNavItems(mode, profiles).filter((t) => t.id === 'map' || t.id === 'finanzas' || t.id === 'chat');
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
            if (
                (hrefSection === 'mariachis' || hrefSection === 'grupos')
                && (currentSection === 'mariachis' || currentSection === 'grupos')
            ) {
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

export async function fetchNotifications(inAppEnabled = true): Promise<PanelNotification[]> {
    if (!inAppEnabled) return [];
    try {
        const response = await serenatasApi.notifications();
        if (!response.ok) return [];
        return response.items.filter((item) => item.isRead !== true).map(toPanelNotification);
    } catch {
        return [];
    }
}

export function notifyPanelNotificationsChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('simple:panel-notifications-changed'));
}

export async function markNotificationReadAndRefresh(notificationId: string): Promise<void> {
    try {
        await serenatasApi.markNotificationRead(notificationId);
        notifyPanelNotificationsChanged();
    } catch {
        // ignore — la navegación sigue aunque falle el marcado
    }
}

export async function markAllPanelNotificationsRead(): Promise<void> {
    try {
        await serenatasApi.markAllNotificationsRead();
        notifyPanelNotificationsChanged();
    } catch {
        // ignore
    }
}

/** Etiqueta del tipo de cuenta en sidebar y cabecera del panel. */
export function panelAccountTypeLabel(profiles: Profiles): string {
    if (profiles.owner) return 'Dueño';
    if (profiles.musician) return 'Músico';
    if (profiles.client) return 'Cliente';
    return 'Usuario';
}
