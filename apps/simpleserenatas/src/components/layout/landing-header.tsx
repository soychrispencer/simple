'use client';

import { useMemo } from 'react';
import { MarketplaceHeader } from '@simple/marketplace-header';
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
    /** @deprecated MarketplaceHeader usa openAuth de useAuth. */
    onLogin?: () => void;
    /** @deprecated MarketplaceHeader usa openAuth de useAuth. */
    onRegister?: () => void;
    publicLinks?: PublicLink[];
};

export function LandingHeader({
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
            guestRegisterLabel={copy.headerCta}
        />
    );
}
