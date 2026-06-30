'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import type { SubscriptionCatalogResponse } from '@simple/utils';
import { MARKETPLACE_MI_NEGOCIO_PRO_GATE } from './business-copy.js';
import { resolvePanelBillingFromCatalog } from './business-setup.js';
import { marketplaceMiNegocioHasProAccess, type MarketplacePanelRole } from './marketplace-mi-negocio-access.js';
import { PanelButton } from './panel-button.js';

export type MarketplaceMiNegocioProGateProps = {
    subscriptionHref: string;
    fetchCatalog: () => Promise<SubscriptionCatalogResponse | null>;
    role?: MarketplacePanelRole;
    children: React.ReactNode;
};

export function MarketplaceMiNegocioProGate({
    subscriptionHref,
    fetchCatalog,
    role = 'user',
    children,
}: MarketplaceMiNegocioProGateProps) {
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void fetchCatalog().then((catalog) => {
            if (cancelled) return;
            const billing = resolvePanelBillingFromCatalog(catalog, subscriptionHref);
            setLocked(!marketplaceMiNegocioHasProAccess(billing, role));
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [fetchCatalog, role, subscriptionHref]);

    if (loading) {
        return <div className="container-app panel-page min-h-[40vh] py-16" aria-busy="true" />;
    }

    if (locked) {
        return (
            <div className="container-app panel-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
                <div
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                    style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                >
                    <IconLock size={36} stroke={1.75} />
                </div>
                <h2 className="mb-3 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                    {MARKETPLACE_MI_NEGOCIO_PRO_GATE.title}
                </h2>
                <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    {MARKETPLACE_MI_NEGOCIO_PRO_GATE.description}
                </p>
                <Link href={subscriptionHref}>
                    <PanelButton type="button" className="h-11 px-8">
                        {MARKETPLACE_MI_NEGOCIO_PRO_GATE.cta}
                    </PanelButton>
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
