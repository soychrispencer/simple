'use client';

import { useMemo } from 'react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@/lib/saved-listings';

const publicLinks = [
    { href: '/ventas', label: 'Comprar' },
    { href: '/arriendos', label: 'Arrendar' },
    { href: '/proyectos', label: 'Proyectos' },
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
