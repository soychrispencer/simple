'use client';

import { type ReactNode } from 'react';
import { IconClock, IconEye } from '@tabler/icons-react';
import { formatListingPrice } from '@simple/utils';
import { PanelBlockHeader } from '../panel/panel-primitives';

export type PublicListingDetailPriceCardProps = {
    price: string;
    publishedAgo: string;
    views: number;
    className?: string;
    children?: ReactNode;
};

export default function PublicListingDetailPriceCard({
    price,
    publishedAgo,
    views,
    className,
    children,
}: PublicListingDetailPriceCardProps) {
    return (
        <div className={['public-listing-detail-price-card', className].filter(Boolean).join(' ')}>
            <PanelBlockHeader title="Precio" className="public-listing-detail-price-card__header" />
            <p className="public-listing-detail-price-card__amount">{formatListingPrice(price)}</p>
            <div className="public-listing-detail-price-card__meta">
                <p>
                    <IconClock size={16} />
                    Publicado {publishedAgo}
                </p>
                <p>
                    <IconEye size={16} />
                    {views.toLocaleString('es-CL')} visualizaciones
                </p>
            </div>
            {children}
        </div>
    );
}
