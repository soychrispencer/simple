'use client';

import { MarketplaceMiNegocioProGate } from '@simple/ui/panel';
import { fetchSubscriptionCatalog } from '@/lib/payments';

const SUBSCRIPTION_HREF = '/panel/mi-cuenta/suscripcion';

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
    return (
        <MarketplaceMiNegocioProGate
            subscriptionHref={SUBSCRIPTION_HREF}
            fetchCatalog={fetchSubscriptionCatalog}
            vertical="autos"
        >
            {children}
        </MarketplaceMiNegocioProGate>
    );
}
