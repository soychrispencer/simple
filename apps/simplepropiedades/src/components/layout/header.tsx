'use client';

import { useMemo } from 'react';
import { MarketplaceHeader, type MarketplacePublicLink } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@simple/utils';

const publicLinks: MarketplacePublicLink[] = [
    { href: '/ventas', label: 'Comprar' },
    { href: '/arriendos', label: 'Arrendar' },
    { href: '/proyectos', label: 'Proyectos' },
    { href: '/simulador-hipotecario', label: 'Simulador' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/descubre', label: 'Descubre', isNew: true },
];

export function Header() {
    const savedListings = useMemo(
        () => ({ clearCache: clearSavedListingsCache, syncFromApi: syncSavedListingsFromApi }),
        []
    );

    return (
        <MarketplaceHeader
            brandAppId="simplepropiedades"
            publicLinks={publicLinks}
            getPanelNavItems={getPanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            savedListings={savedListings}
        />
    );
}
