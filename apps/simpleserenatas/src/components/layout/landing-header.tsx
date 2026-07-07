'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { ThemeToggleButton } from '@simple/ui/theme';
import { PanelButton } from '@simple/ui/panel';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { clearSavedMariachisCache, syncSavedMariachisFromApi } from '@/lib/saved-mariachis';

type PublicLink = { href: string; label: string };

/** Sin pestañas de audiencia en header (Inicio / explorar van en menú móvil del panel). */
export const defaultPublicLinks: PublicLink[] = [];

/** Enlaces del marketplace en menú móvil (panel y ficha pública). */
export const serenatasExploreNavLinks: PublicLink[] = [
    { href: '/', label: 'Inicio' },
    { href: '/mariachis', label: 'Explorar mariachis' },
];

type LandingHeaderProps = {
    onLogin: () => void;
    onRegister: () => void;
    publicLinks?: PublicLink[];
};

export function LandingHeader({ onLogin, onRegister, publicLinks = defaultPublicLinks }: LandingHeaderProps) {
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
            rightSlot={
                <>
                    <ThemeToggleButton variant="header-chip" SunIcon={IconSun} MoonIcon={IconMoon} />
                    <PanelButton
                        type="button"
                        variant="accent"
                        className="inline-flex h-10 px-4 sm:hidden"
                        onClick={onLogin}
                    >
                        Iniciar sesión
                    </PanelButton>
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
                        className="hidden h-10 px-4 sm:inline-flex"
                        onClick={onRegister}
                    >
                        {copy.headerCta}
                    </PanelButton>
                </>
            }
            renderMobileMenu={(closeMenu) => (
                <>
                    <PanelButton
                        type="button"
                        variant="accent"
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
                        variant="secondary"
                        className="mb-2 h-10 w-full"
                        onClick={() => {
                            closeMenu();
                            onRegister();
                        }}
                    >
                        {copy.headerCta}
                    </PanelButton>
                    <div className="my-2 border-t border-border" role="presentation" />
                    {publicLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            onClick={closeMenu}
                            className="flex items-center gap-2 rounded-button px-2.5 py-2 text-sm text-fg-secondary transition-colors hover:bg-(--bg-subtle)"
                        >
                            {l.label}
                        </Link>
                    ))}
                </>
            )}
        />
    );
}
