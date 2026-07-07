'use client';

import { useMemo } from 'react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@simple/utils';

const publicLinks = [
    { href: '/ventas', label: 'Comprar' },
    { href: '/arriendos', label: 'Arrendar' },
    { href: '/subastas', label: 'Subastas' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/descubre', label: 'Descubre', isNew: true },
    { href: '/precalificacion-financiamiento', label: 'Financiamiento' },
];

export function Header() {
    const savedListings = useMemo(
        () => ({ clearCache: clearSavedListingsCache, syncFromApi: syncSavedListingsFromApi }),
        []
    );

    return (
        <MarketplaceHeader
            brandAppId="simpleautos"
            publicLinks={publicLinks}
            getPanelNavItems={getPanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            savedListings={savedListings}
        />
    );
}
