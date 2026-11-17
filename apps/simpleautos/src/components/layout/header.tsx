'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@simple/auth';
import { MarketplaceHeader, type MarketplacePublicLink } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { fetchSubscriptionCatalog } from '@/lib/payments';
import { clearSavedListingsCache, fetchCurrentAccountContext, syncSavedListingsFromApi } from '@simple/utils';
import { useMarketplacePanelBilling } from '@simple/ui/panel';

const publicLinks: MarketplacePublicLink[] = [
    {
        href: '/ventas',
        label: 'Vehículos',
        items: [
            { href: '/ventas', label: 'Explorar todo', description: 'Publicaciones con fotos y videos' },
            { href: '/ventas?section=sale', label: 'Comprar', description: 'Autos, motos y más en venta' },
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
];

export function Header() {
    const { user } = useAuth();
    const [panelAccountContext, setPanelAccountContext] = useState<{
        userId: string;
        role: string | null;
        isPersonal: boolean;
    } | null>(null);
    const { billing } = useMarketplacePanelBilling('/panel/mi-cuenta/suscripcion', fetchSubscriptionCatalog, user?.id);
    const savedListings = useMemo(
        () => ({ clearCache: clearSavedListingsCache, syncFromApi: syncSavedListingsFromApi }),
        []
    );
    useEffect(() => {
        if (!user?.id) {
            setPanelAccountContext(null);
            return;
        }
        const requestedUserId = user.id;
        let cancelled = false;
        setPanelAccountContext(null);
        void fetchCurrentAccountContext().then((context) => {
            if (cancelled || !context) return;
            const activeMembership = context.memberships.find((membership) => membership.isDefault);
            if (!activeMembership) return;
            setPanelAccountContext({
                userId: requestedUserId,
                role: activeMembership.role,
                isPersonal: context.account?.isPersonal ?? true,
            });
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, [user?.id]);
    const getRoleAwarePanelNavItems = useCallback(() => {
        if (!user?.id || panelAccountContext?.userId !== user.id) {
            return getPanelNavItems('agent', false, null);
        }
        return getPanelNavItems(
            panelAccountContext.role,
            panelAccountContext.isPersonal,
            billing?.accountKind ?? null,
        );
    }, [billing?.accountKind, panelAccountContext, user?.id]);

    return (
        <MarketplaceHeader
            brandAppId="simpleautos"
            publicLinks={publicLinks}
            getPanelNavItems={getRoleAwarePanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            savedListings={savedListings}
        />
    );
}
