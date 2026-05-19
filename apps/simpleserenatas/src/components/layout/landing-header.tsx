'use client';

import Link from 'next/link';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { ThemeToggleButton } from '@simple/ui';

export const defaultPublicLinks = [
    { href: '/#para-clientes', label: 'Clientes' },
    { href: '/#musicos', label: 'Músicos' },
    { href: '/para-duenos', label: 'Dueños' },
    { href: '/#como-funciona', label: 'Cómo funciona' },
];

type PublicLink = { href: string; label: string };

type LandingHeaderProps = {
    onLogin: () => void;
    onRegister: () => void;
    publicLinks?: PublicLink[];
};

export function LandingHeader({ onLogin, onRegister, publicLinks = defaultPublicLinks }: LandingHeaderProps) {
    return (
        <MarketplaceHeader
            brandAppId="simpleserenatas"
            publicLinks={publicLinks}
            getPanelNavItems={() => []}
            isPanelNavActive={() => false}
            fetchPanelNotifications={async () => []}
            showPrimaryAction={false}
            rightSlot={
                <>
                    <ThemeToggleButton variant="header-chip" SunIcon={IconSun} MoonIcon={IconMoon} />
                    <button
                        type="button"
                        className="btn btn-ghost hidden h-10 px-4 text-sm font-medium sm:inline-flex"
                        onClick={onLogin}
                    >
                        Iniciar sesión
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary h-10 px-4 text-sm font-semibold"
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
                        className="btn btn-ghost mb-2 h-10 w-full text-sm font-medium"
                        onClick={() => {
                            closeMenu();
                            onLogin();
                        }}
                    >
                        Iniciar sesión
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary mb-2 h-10 w-full text-sm font-semibold"
                        onClick={() => {
                            closeMenu();
                            onRegister();
                        }}
                    >
                        Crear cuenta
                    </button>
                    <div className="my-2 border-t landing-border" role="presentation" />
                    {publicLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            onClick={closeMenu}
                            className="flex items-center gap-2 rounded-button px-2.5 py-2 text-sm landing-text-secondary transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                            {l.label}
                        </Link>
                    ))}
                </>
            )}
        />
    );
}
