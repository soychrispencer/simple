'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionCatalogResponse } from '@simple/utils';
import { resolvePanelBillingFromCatalog, type PanelBillingAccess } from './business-setup.js';

export function useMarketplacePanelBilling(
    subscriptionHref: string,
    fetchCatalog: () => Promise<SubscriptionCatalogResponse | null>,
    userId?: string,
) {
    const [state, setState] = useState<{
        userId: string | null;
        billing: PanelBillingAccess | null;
        loading: boolean;
    }>({ userId: null, billing: null, loading: true });

    useEffect(() => {
        if (!userId) {
            setState({ userId: null, billing: null, loading: false });
            return;
        }
        let cancelled = false;
        let latestRequestId = 0;
        setState((current) => current.userId === userId
            ? { ...current, loading: true }
            : { userId, billing: null, loading: true });
        const refresh = async () => {
            const requestId = ++latestRequestId;
            try {
                const catalog = await fetchCatalog();
                if (!cancelled && requestId === latestRequestId) {
                    setState({
                        userId,
                        billing: resolvePanelBillingFromCatalog(catalog, subscriptionHref),
                        loading: false,
                    });
                }
            } catch {
                if (!cancelled && requestId === latestRequestId) {
                    setState({ userId, billing: null, loading: false });
                }
            } finally {
                if (!cancelled && requestId === latestRequestId) {
                    setState((current) => current.userId === userId ? { ...current, loading: false } : current);
                }
            }
        };
        const handleWorkspaceActivityChange = () => {
            void refresh();
        };

        void refresh();
        window.addEventListener('simple:workspace-activity-changed', handleWorkspaceActivityChange);
        return () => {
            cancelled = true;
            window.removeEventListener('simple:workspace-activity-changed', handleWorkspaceActivityChange);
        };
    }, [subscriptionHref, fetchCatalog, userId]);

    return state.userId === (userId ?? null)
        ? { billing: state.billing, loading: state.loading }
        : { billing: null, loading: Boolean(userId) };
}
