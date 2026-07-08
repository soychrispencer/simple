'use client';

import { useMemo } from 'react';
import { MarketplaceHeader, type MarketplacePublicLink } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@simple/utils';

const publicLinks: MarketplacePublicLink[] = [
    {
        href: '/ventas',
        label: 'Propiedades',
        items: [
            { href: '/ventas', label: 'Comprar', description: 'Casas, deptos y terrenos en venta' },
            { href: '/arriendos', label: 'Arrendar', description: 'Arriendos disponibles' },
            { href: '/proyectos', label: 'Proyectos', description: 'Inversión desde plano' },
        ],
    },
    { href: '/servicios', label: 'Servicios' },
    { href: '/productos', label: 'Productos' },
    {
        href: '/simulador-hipotecario',
        label: 'Herramientas',
        items: [
            {
                href: '/simulador-hipotecario',
                label: 'Simulador hipotecario',
                description: 'Calcula dividendo, pie y plazo estimados',
            },
            {
                href: '/servicios/venta-asistida',
                label: 'Venta asistida',
                description: 'Gestión inmobiliaria — publicamos y vendemos por ti',
            },
        ],
    },
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
