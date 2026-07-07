'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { useAuth } from '@simple/auth';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { type AppMode, resolveAppModeFromProfiles } from '@/lib/app-mode';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { fetchNotifications, getMarketplaceNavItems, getPrimaryActionConfig, isPanelNavActive, markAllPanelNotificationsRead, markNotificationReadAndRefresh } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications as fetchMessagePanelNotifications } from '@/lib/panel-notifications';
import { useSerenataOptional } from '@/context/serenata-context';
import { sectionFromPanelPath } from '@/lib/panel-routes';
import { clearSavedMariachisCache, syncSavedMariachisFromApi } from '@/lib/saved-mariachis';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { serenatasPublicNavLinks } from '@/components/layout/landing-header';

type PublicLink = { href: string; label: string };

type SerenatasChromeHeaderProps = {
    publicLinks?: PublicLink[];
    homeHref?: string;
    /** Panel: modo y perfiles ya cargados en contexto. */
    mode?: AppMode;
    profiles?: Profiles;
    /** Ocultar CTA principal (p. ej. landing). */
    showPrimaryAction?: boolean;
};

export function SerenatasChromeHeader({
    publicLinks = serenatasPublicNavLinks,
    homeHref = '/',
    mode: modeProp,
    profiles: profilesProp,
    showPrimaryAction = true,
}: SerenatasChromeHeaderProps) {
    const copy = resolveOperatorLandingCopy('serenatas');
    const pathname = usePathname() ?? '/';
    const { isLoggedIn, authLoading, user } = useAuth();
    const serenataCtx = useSerenataOptional();
    const logoutAndGoHome = useLogoutAndGoHome();
    const [profiles, setProfiles] = useState<Profiles | null>(
        profilesProp ?? serenataCtx?.profiles ?? null,
    );
    const [mode, setMode] = useState<AppMode>(modeProp ?? serenataCtx?.mode ?? 'client');

    const resolvedProfiles = profilesProp ?? serenataCtx?.profiles ?? profiles;
    const modeReady = modeProp ?? serenataCtx?.mode ?? mode;

    useEffect(() => {
        if (profilesProp) setProfiles(profilesProp);
    }, [profilesProp]);

    useEffect(() => {
        if (modeProp) setMode(modeProp);
    }, [modeProp]);

    useEffect(() => {
        if (serenataCtx?.profiles) {
            setProfiles(serenataCtx.profiles);
            setMode(serenataCtx.mode);
        }
    }, [serenataCtx?.mode, serenataCtx?.profiles]);

    useEffect(() => {
        if (!isLoggedIn || profilesProp || serenataCtx?.profiles) return;
        let cancelled = false;
        void serenatasApi.profiles().then((response) => {
            if (cancelled || !response.ok) return;
            const nextProfiles = response.profiles;
            setProfiles(nextProfiles);
            setMode(resolveAppModeFromProfiles(nextProfiles));
        });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, profilesProp, serenataCtx?.profiles, user?.id]);

    const currentSection = sectionFromPanelPath(pathname);
    const panelNavActive = useCallback(
        (navPathname: string, href: string) => isPanelNavActive(navPathname, href, currentSection),
        [currentSection],
    );

    const primaryAction = useMemo(() => {
        if (!resolvedProfiles) {
            return { label: '', href: '/', icon: undefined, show: false } as const;
        }
        return getPrimaryActionConfig(modeReady, resolvedProfiles, pathname);
    }, [modeReady, pathname, resolvedProfiles]);

    const savedMariachis = useMemo(
        () => ({ clearCache: clearSavedMariachisCache, syncFromApi: syncSavedMariachisFromApi }),
        [],
    );

    const isSuspended = user?.status === 'suspended';
    const isPanelRoute = pathname.startsWith('/panel');

    if (authLoading) {
        return isPanelRoute ? <ChromeHeaderPlaceholder /> : null;
    }

    if (!isLoggedIn) {
        return (
            <MarketplaceHeader
                brandAppId="simpleserenatas"
                homeHref={homeHref}
                publicLinks={publicLinks}
                getPanelNavItems={() => []}
                isPanelNavActive={() => false}
                fetchPanelNotifications={async () => []}
                showPrimaryAction={showPrimaryAction}
                guestRegisterLabel={copy.headerCta}
            />
        );
    }

    if (!resolvedProfiles) {
        return isPanelRoute ? <ChromeHeaderPlaceholder /> : null;
    }

    return (
        <MarketplaceHeader
            brandAppId="simpleserenatas"
            homeHref={homeHref}
            onLogout={logoutAndGoHome}
            publicLinks={publicLinks}
            getPanelNavItems={() => getMarketplaceNavItems(modeReady, resolvedProfiles)}
            isPanelNavActive={panelNavActive}
            fetchPanelNotifications={async () => {
                const [messageItems, serenataItems] = await Promise.all([
                    fetchMessagePanelNotifications(),
                    fetchNotifications(),
                ]);
                const merged = [...messageItems, ...serenataItems];
                merged.sort((a, b) => b.createdAt - a.createdAt);
                return merged.slice(0, 8);
            }}
            onNotificationOpened={(item) => markNotificationReadAndRefresh(item.id)}
            onMarkAllNotificationsRead={() => markAllPanelNotificationsRead()}
            panelLinkPrefetch={false}
            savedListings={savedMariachis}
            primaryActionLabel={primaryAction.label}
            primaryActionHref={primaryAction.href}
            primaryActionIcon={primaryAction.icon}
            showPrimaryAction={showPrimaryAction && !isSuspended && primaryAction.show}
            guestRegisterLabel={copy.headerCta}
        />
    );
}

function ChromeHeaderPlaceholder() {
    return (
        <div
            className="h-16 shrink-0 border-b border-border bg-(--bg)"
            aria-hidden
        />
    );
}
