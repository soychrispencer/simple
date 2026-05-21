'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { useAuth } from '@simple/auth';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import {
    type AppMode,
    resolveAppModeFromProfiles,
    persistAppMode,
} from '@/lib/app-mode';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import {
    fetchNotifications,
    getMarketplaceNavItems,
    getModeSwitchItems,
    getPrimaryActionConfig,
    isPanelNavActive,
} from '@/components/panel/panel-nav-config';
import { sectionFromPanelPath } from '@/lib/panel-routes';
import { ProfileSwitcher } from '@/components/panel/profile-switcher';

type PublicLink = { href: string; label: string };

type SerenatasChromeHeaderProps = {
    publicLinks?: PublicLink[];
    homeHref?: string;
    /** Panel: modo y perfiles ya cargados en contexto. */
    mode?: AppMode;
    profiles?: Profiles;
    onModeChange?: (next: AppMode) => void;
    /** Ocultar CTA principal (p. ej. landing). */
    showPrimaryAction?: boolean;
};

export function SerenatasChromeHeader({
    publicLinks = [],
    homeHref = '/',
    mode: modeProp,
    profiles: profilesProp,
    onModeChange,
    showPrimaryAction = true,
}: SerenatasChromeHeaderProps) {
    const pathname = usePathname() ?? '/';
    const { isLoggedIn, authLoading, user } = useAuth();
    const logoutAndGoHome = useLogoutAndGoHome();
    const [profiles, setProfiles] = useState<Profiles | null>(profilesProp ?? null);
    const [mode, setMode] = useState<AppMode>(modeProp ?? 'client');

    const profilesReady = profilesProp ?? profiles;
    const modeReady = modeProp ?? mode;

    useEffect(() => {
        if (profilesProp) setProfiles(profilesProp);
    }, [profilesProp]);

    useEffect(() => {
        if (modeProp) setMode(modeProp);
    }, [modeProp]);

    useEffect(() => {
        if (!isLoggedIn || profilesProp) return;
        let cancelled = false;
        void serenatasApi.profiles().then((response) => {
            if (cancelled || !response.ok) return;
            const nextProfiles = response.profiles;
            setProfiles(nextProfiles);
            setMode(resolveAppModeFromProfiles(nextProfiles, { syncStorage: true }));
        });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, profilesProp, user?.id]);

    const handleModeChange = useCallback(
        (next: AppMode) => {
            persistAppMode(next);
            if (onModeChange) {
                onModeChange(next);
            } else {
                setMode(next);
            }
        },
        [onModeChange],
    );

    const currentSection = sectionFromPanelPath(pathname);
    const panelNavActive = useCallback(
        (navPathname: string, href: string) => isPanelNavActive(navPathname, href, currentSection),
        [currentSection],
    );

    const switchItems = useMemo(
        () => (profilesReady ? getModeSwitchItems(profilesReady) : []),
        [profilesReady],
    );

    const primaryAction = useMemo(
        () => getPrimaryActionConfig(modeReady, profilesReady!),
        [modeReady, profilesReady],
    );

    const isSuspended = user?.status === 'suspended';

    if (authLoading) {
        return (
            <header className="border-b border-border bg-surface">
                <div className="container-app flex h-16 items-center">
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-bg-subtle" />
                </div>
            </header>
        );
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
            />
        );
    }

    if (!profilesReady) {
        return (
            <header className="border-b border-border bg-surface">
                <div className="container-app flex h-16 items-center justify-end gap-2">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-bg-subtle" />
                </div>
            </header>
        );
    }

    return (
        <MarketplaceHeader
            brandAppId="simpleserenatas"
            homeHref={homeHref}
            onLogout={logoutAndGoHome}
            publicLinks={publicLinks}
            getPanelNavItems={() => getMarketplaceNavItems(modeReady, profilesReady)}
            isPanelNavActive={panelNavActive}
            fetchPanelNotifications={() => fetchNotifications()}
            centerSlot={
                switchItems.length > 1 ? (
                    <ProfileSwitcher items={switchItems} active={modeReady} onChange={handleModeChange} />
                ) : null
            }
            primaryActionLabel={primaryAction.label}
            primaryActionHref={primaryAction.href}
            primaryActionIcon={primaryAction.icon}
            showPrimaryAction={showPrimaryAction && !isSuspended && primaryAction.show}
            renderMobileMenu={(closeMenu) => (
                <>
                    {switchItems.length > 1 ? (
                        <div className="mb-3 px-1">
                            <ProfileSwitcher
                                items={switchItems}
                                active={modeReady}
                                onChange={handleModeChange}
                                compact
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn-ghost mb-2 h-10 w-full text-sm font-medium"
                        onClick={() => {
                            closeMenu();
                            window.dispatchEvent(new Event('simple:panel-mobile-open'));
                        }}
                    >
                        Abrir menú del panel
                    </button>
                </>
            )}
        />
    );
}
