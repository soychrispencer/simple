'use client';

import { useAuth } from '@simple/auth';
import { MarketplaceMiNegocioProGate } from '@simple/ui/panel';
import { fetchSubscriptionCatalog } from '@/lib/payments';
import type { PanelRole } from '@/components/panel/panel-nav-config';

const SUBSCRIPTION_HREF = '/panel/mi-cuenta/suscripcion';

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const role = (user?.role ?? 'user') as PanelRole;

    return (
        <MarketplaceMiNegocioProGate
            subscriptionHref={SUBSCRIPTION_HREF}
            fetchCatalog={fetchSubscriptionCatalog}
            role={role}
            vertical="autos"
        >
            {children}
        </MarketplaceMiNegocioProGate>
    );
}
