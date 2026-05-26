'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { ThemeToggleButton } from '@simple/ui/theme';
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
                    <button
                        type="button"
                        className="btn btn-primary inline-flex h-10 px-4 text-sm font-semibold sm:hidden"
                        onClick={onLogin}
                    >
                        Iniciar sesión
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost hidden h-10 px-4 text-sm font-medium sm:inline-flex"
                        onClick={onLogin}
                    >
                        Iniciar sesión
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary hidden h-10 px-4 text-sm font-semibold sm:inline-flex"
                        onClick={onRegister}
                    >
                        Crear cuenta
                    </button>
                </>
            }
            renderMobileMenu={(closeMenu) => (
                <>
                    <button
                        type="button"
                        className="btn btn-primary mb-2 h-10 w-full text-sm font-semibold"
                        onClick={() => {
                            closeMenu();
                            onLogin();
                        }}
                    >
                        Iniciar sesión
                    </button>
                    <div className="my-2 border-t border-border" role="presentation" />
                    {publicLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            onClick={closeMenu}
                            className="flex items-center gap-2 rounded-button px-2.5 py-2 text-sm text-fg-secondary transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                            {l.label}
                        </Link>
                    ))}
                </>
            )}
        />
    );
}
