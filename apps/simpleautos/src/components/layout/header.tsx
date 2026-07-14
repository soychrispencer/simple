'use client';

import { useMemo } from 'react';
import { MarketplaceHeader, type MarketplacePublicLink } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@simple/utils';

const publicLinks: MarketplacePublicLink[] = [
    {
        href: '/ventas',
        label: 'Vehículos',
        items: [
            { href: '/ventas', label: 'Comprar', description: 'Autos, motos y más en venta' },
            { href: '/arriendos', label: 'Arrendar', description: 'Arriendo de vehículos' },
            { href: '/subastas', label: 'Subastas', description: 'Subastas activas' },
        ],
    },
    { href: '/servicios', label: 'Servicios' },
    { href: '/productos', label: 'Productos' },
    {
        href: '/simulador-credito-automotriz',
        label: 'Herramientas',
        items: [
            {
                href: '/simulador-credito-automotriz',
                label: 'Simulador de crédito automotriz',
                description: 'Estima cuota, CAE referencial y capacidad de pago',
            },
            {
                href: '/servicios/venta-asistida',
                label: 'Venta asistida',
                description: 'Publicamos y gestionamos la venta por ti',
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
            brandAppId="simpleautos"
            publicLinks={publicLinks}
            getPanelNavItems={getPanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            savedListings={savedListings}
        />
    );
}
