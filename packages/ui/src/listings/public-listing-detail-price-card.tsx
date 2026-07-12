'use client';

import { type ReactNode } from 'react';
import { IconClock, IconEye } from '@tabler/icons-react';
import { formatListingPrice } from '@simple/utils';
import { PanelBlockHeader } from '../panel/panel-primitives';

export type PublicListingDetailPriceCardProps = {
    price: string;
    /** Precio lista (tachado) cuando hay oferta. */
    priceOriginal?: string | null;
    /** Descuento 1–99 para badge. */
    discountPercent?: number | null;
    publishedAgo: string;
    views: number;
    className?: string;
    children?: ReactNode;
};

export default function PublicListingDetailPriceCard({
    price,
    priceOriginal,
    discountPercent,
    publishedAgo,
    views,
    className,
    children,
}: PublicListingDetailPriceCardProps) {
    const hasOffer = Boolean(priceOriginal && priceOriginal.trim() && priceOriginal !== price);

    return (
        <div className={['public-listing-detail-price-card', hasOffer && 'public-listing-detail-price-card--offer', className].filter(Boolean).join(' ')}>
            <PanelBlockHeader
                title={hasOffer ? 'Precio oferta' : 'Precio'}
                className="public-listing-detail-price-card__header"
            />
            <div className="public-listing-detail-price-card__amount-row">
                <p className="public-listing-detail-price-card__amount">{formatListingPrice(price)}</p>
                {hasOffer && discountPercent && discountPercent > 0 ? (
                    <span className="public-listing-detail-price-card__discount">-{discountPercent}%</span>
                ) : null}
            </div>
            {hasOffer ? (
                <p className="public-listing-detail-price-card__original">
                    Antes <span>{formatListingPrice(priceOriginal!)}</span>
                </p>
            ) : null}
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
