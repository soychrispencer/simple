'use client';

import type { ComponentType } from 'react';
import {
    IconLayoutDashboard,
    IconPlus,
    IconUsersGroup,
    IconMusic,
    IconBell,
    IconCalendar,
    IconMap,
    IconChartBar,
    IconUser,
    IconBriefcase,
    IconBookmark,
    IconMessageCircle,
} from '@tabler/icons-react';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { CLIENT_MARKETPLACE_HREF, isClientMarketplaceHref } from '@/lib/client-marketplace';
import { type AppMode, ownerFeaturesEnabled } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { panelSectionHref, sectionFromPanelPath } from '@/lib/panel-routes';
import { type MarketplacePanelNavItem, type PanelNotification } from '@simple/marketplace-header';
import { toPanelNotification } from '@/lib/serenata-notifications';
import { OWNER_ROLE_LABEL } from '@/lib/serenatas-terminology';

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
        { id: 'home', href: panelSectionHref('home'), label: 'Mi panel', icon: IconLayoutDashboard },
    ];

    if (mode === 'client') {
        items.push({ id: 'mariachis', href: CLIENT_MARKETPLACE_HREF, label: 'Explorar', icon: IconUsersGroup });
        items.push({ id: 'guardados', href: panelSectionHref('guardados'), label: 'Guardados', icon: IconBookmark });
        items.push({ id: 'serenatas', href: panelSectionHref('serenatas'), label: 'Mis serenatas', icon: IconMusic });
        items.push({ id: 'mensajes', href: panelSectionHref('mensajes'), label: 'Mensajes', icon: IconMessageCircle });
        items.push({ id: 'profile', href: panelSectionHref('profile'), label: 'Mi cuenta', icon: IconUser });
        return items;
    }

    const isOwner = ownerFeaturesEnabled(profiles);

    if (isOwner) {
        items.push({ id: 'solicitudes', href: panelSectionHref('solicitudes'), label: 'Solicitudes', icon: IconBell });
        items.push({ id: 'mensajes', href: panelSectionHref('mensajes'), label: 'Mensajes', icon: IconMessageCircle });
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
        items.push({ id: 'map', href: panelSectionHref('map'), label: 'Mapa', icon: IconMap });
        items.push({ id: 'finanzas', href: panelSectionHref('finanzas'), label: 'Finanzas', icon: IconChartBar });
        items.push({ id: 'estadisticas', href: panelSectionHref('estadisticas'), label: 'Estadísticas', icon: IconChartBar });
        items.push({ id: 'mi-negocio', href: panelSectionHref('mi-negocio'), label: 'Mi negocio', icon: IconBriefcase });
    } else if (profiles.musician) {
        items.push({ id: 'invitations', href: panelSectionHref('invitations'), label: 'Invitaciones', icon: IconUsersGroup });
        items.push({ id: 'mensajes', href: panelSectionHref('mensajes'), label: 'Mensajes', icon: IconMessageCircle });
        items.push({ id: 'agenda', href: panelSectionHref('agenda'), label: 'Agenda', icon: IconCalendar });
        items.push({ id: 'serenatas', href: panelSectionHref('serenatas'), label: 'Mis serenatas', icon: IconMusic });
    }

    items.push({ id: 'profile', href: panelSectionHref('profile'), label: 'Mi cuenta', icon: IconUser });

    return items;
}

/**
 * Tabs visibles en bottom nav móvil (5 ítems: acción principal + Mi cuenta al final).
 * El resto del panel queda en el menú lateral / hamburguesa del header.
 */
export function getMobileBottomNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    if (mode === 'client') {
        return getPanelNavItems(mode, profiles).filter((t) =>
            ['home', 'mariachis', 'guardados', 'serenatas', 'profile'].includes(t.id),
        );
    }
    if (ownerFeaturesEnabled(profiles)) {
        return getPanelNavItems(mode, profiles).filter((t) =>
            ['home', 'solicitudes', 'agenda', 'mi-negocio', 'profile'].includes(t.id),
        );
    }
    return getPanelNavItems(mode, profiles).filter((t) =>
        ['home', 'invitations', 'agenda', 'serenatas', 'profile'].includes(t.id),
    );
}

/** @deprecated El footer ya no usa «Más»; secciones extra vía drawer del header. */
export function getMobileOverflowNavItems(mode: AppMode, profiles: Profiles): PanelNavItem[] {
    const bottomIds = new Set(getMobileBottomNavItems(mode, profiles).map((t) => t.id));
    return getPanelNavItems(mode, profiles).filter((t) => !bottomIds.has(t.id));
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
    if (profiles.owner) return OWNER_ROLE_LABEL;
    if (profiles.musician) return 'Músico';
    if (profiles.client) return 'Cliente';
    return 'Usuario';
}
