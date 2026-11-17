'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
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
        label: 'Propiedades',
        items: [
            { href: '/ventas', label: 'Comprar', description: 'Casas, deptos y terrenos en venta' },
            { href: '/arriendos', label: 'Arrendar', description: 'Arriendos disponibles' },
            { href: '/proyectos', label: 'Proyectos', description: 'Inversión desde plano' },
            { href: '/alianzas-inmobiliarias', label: 'Para inmobiliarias', description: 'Publicación y comercialización en alianza' },
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
                label: 'Simulador de crédito hipotecario',
                description: 'Estima dividendo, CAE referencial y capacidad de pago',
            },
            {
                href: '/servicios/venta-asistida',
                label: 'Gestión para propietarios',
                description: 'Publicación, atención de interesados y apoyo al cierre',
            },
        ],
    },
    { href: '/descubre', label: 'Descubre', isNew: true },
];

export function Header() {
    const pathname = usePathname();
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
            brandAppId="simplepropiedades"
            publicLinks={publicLinks}
            desktopNavigationAt={pathname === '/alianzas-inmobiliarias' ? 'xl' : 'md'}
            getPanelNavItems={getRoleAwarePanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            savedListings={savedListings}
        />
    );
}
