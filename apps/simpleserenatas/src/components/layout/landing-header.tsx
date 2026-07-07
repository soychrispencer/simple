'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { ThemeToggleButton } from '@simple/ui/theme';
import { PanelButton } from '@simple/ui/panel';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { clearSavedMariachisCache, syncSavedMariachisFromApi } from '@/lib/saved-mariachis';

type PublicLink = { href: string; label: string; description?: string; items?: PublicLink[] };

/** Navegación pública compartida (portada, catálogo y fichas). */
export const serenatasPublicNavLinks: PublicLink[] = [
    { href: '/mariachis', label: 'Mariachis' },
    { href: '/#como-funciona', label: 'Cómo funciona' },
    { href: '/#para-duenos', label: 'Publica tu grupo' },
];

/** @deprecated Usa serenatasPublicNavLinks */
export const serenatasExploreNavLinks = serenatasPublicNavLinks;

type LandingHeaderProps = {
    onLogin: () => void;
    onRegister: () => void;
    publicLinks?: PublicLink[];
};

export function LandingHeader({
    onLogin,
    onRegister,
    publicLinks = serenatasPublicNavLinks,
}: LandingHeaderProps) {
    const copy = resolveOperatorLandingCopy('serenatas');
    const savedMariachis = useMemo(
        () => ({ clearCache: clearSavedMariachisCache, syncFromApi: syncSavedMariachisFromApi }),
        [],
    );

    return (
        <MarketplaceHeader
            brandAppId="simpleserenatas"
            publicLinks={publicLinks}
            getPanelNavItems={() => []}
            isPanelNavActive={() => false}
            fetchPanelNotifications={async () => []}
            savedListings={savedMariachis}
            showPrimaryAction={false}
            guestRegisterLabel={copy.headerCta}
            rightSlot={
                <>
                    <ThemeToggleButton variant="header-chip" SunIcon={IconSun} MoonIcon={IconMoon} />
                    <PanelButton
                        type="button"
                        variant="ghost"
                        className="hidden h-10 px-4 sm:inline-flex"
                        onClick={onLogin}
                    >
                        Iniciar sesión
                    </PanelButton>
                    <PanelButton
                        type="button"
                        variant="accent"
                        className="h-10 px-4"
                        onClick={onRegister}
                    >
                        {copy.headerCta}
                    </PanelButton>
                </>
            }
            renderMobileMenu={(closeMenu) => (
                <>
                    {publicLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={closeMenu}
                            className="flex items-center gap-2 rounded-button px-2.5 py-2 text-sm text-fg-secondary transition-colors hover:bg-(--bg-subtle)"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="my-2 border-t border-border" role="presentation" />
                    <PanelButton
                        type="button"
                        variant="secondary"
                        className="mb-2 h-10 w-full"
                        onClick={() => {
                            closeMenu();
                            onLogin();
                        }}
                    >
                        Iniciar sesión
                    </PanelButton>
                    <PanelButton
                        type="button"
                        variant="accent"
                        className="h-10 w-full"
                        onClick={() => {
                            closeMenu();
                            onRegister();
                        }}
                    >
                        {copy.headerCta}
                    </PanelButton>
                </>
            )}
        />
    );
}
