'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionCatalogResponse } from '@simple/utils';
import { resolvePanelBillingFromCatalog, type PanelBillingAccess } from './business-setup.js';

export function useMarketplacePanelBilling(
    subscriptionHref: string,
    fetchCatalog: () => Promise<SubscriptionCatalogResponse | null>,
) {
    const [billing, setBilling] = useState<PanelBillingAccess | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void fetchCatalog().then((catalog) => {
            if (cancelled) return;
            setBilling(resolvePanelBillingFromCatalog(catalog, subscriptionHref));
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [subscriptionHref, fetchCatalog]);

    return { billing, loading };
}
