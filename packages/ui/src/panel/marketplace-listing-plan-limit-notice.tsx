'use client';

import Link from 'next/link';
import { isMarketplaceListingPlanLimitError } from '@simple/utils';
import { PanelNotice } from './panel-primitives.js';

export type MarketplacePublishMessageNoticeProps = {
    message: string;
    subscriptionHref?: string;
    miNegocioHref?: string;
};

export function MarketplacePublishMessageNotice({
    message,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
    miNegocioHref = '/panel/mi-negocio',
}: MarketplacePublishMessageNoticeProps) {
    if (isMarketplaceListingPlanLimitError(message)) {
        return (
            <PanelNotice tone="warning">
                {message}{' '}
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

    return <PanelNotice>{message}</PanelNotice>;
}
