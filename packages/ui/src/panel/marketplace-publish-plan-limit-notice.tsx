'use client';

import Link from 'next/link';
import type { PublicProfileVertical } from '@simple/utils';
import { PanelNotice } from './panel-primitives.js';
import {
    useMarketplacePublishPlanLimit,
    type MarketplacePublishPlanLimitState,
} from './use-marketplace-publish-plan-limit.js';

export type MarketplacePublishPlanLimitNoticeProps = {
    vertical: PublicProfileVertical;
    isEditing?: boolean;
    subscriptionHref?: string;
    miNegocioHref?: string;
    /** Para pruebas o estado inyectado desde el padre. */
    planLimit?: MarketplacePublishPlanLimitState;
};

function formatLimit(maxListings: number): string {
    return maxListings < 0 ? 'ilimitados' : String(maxListings);
}

export function MarketplacePublishPlanLimitNotice({
    vertical,
    isEditing = false,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
    miNegocioHref = '/panel/mi-negocio',
    planLimit: injectedPlanLimit,
}: MarketplacePublishPlanLimitNoticeProps) {
    const fetchedPlanLimit = useMarketplacePublishPlanLimit(vertical, subscriptionHref);
    const planLimit = injectedPlanLimit ?? fetchedPlanLimit;

    if (isEditing || planLimit.loading) return null;

    if (planLimit.atLimit) {
        return (
            <PanelNotice tone="warning">
                Tu plan {planLimit.planLabel} permite hasta {formatLimit(planLimit.maxListings)} avisos activos
                {' '}({planLimit.listingCount}/{formatLimit(planLimit.maxListings)}).{' '}
                <Link href={subscriptionHref} className="font-medium underline" style={{ color: 'var(--accent)' }}>
                    Ver planes
                </Link>
                {' · '}
                <Link href={miNegocioHref} className="font-medium underline" style={{ color: 'var(--accent)' }}>
                    Mi negocio
                </Link>
            </PanelNotice>
        );
    }

    if (planLimit.nearLimit && planLimit.slotsRemaining === 1) {
        return (
            <PanelNotice tone="info">
                Te queda 1 aviso en tu plan {planLimit.planLabel} ({planLimit.listingCount}/{formatLimit(planLimit.maxListings)}).
                {' '}
                <Link href={subscriptionHref} className="font-medium underline" style={{ color: 'var(--accent)' }}>
                    Ver planes
                </Link>
            </PanelNotice>
        );
    }

    return null;
}
