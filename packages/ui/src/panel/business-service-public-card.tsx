'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    formatOperatorServicePrice,
    formatBusinessServiceModality,
    resolveOperatorServiceCategoryLabel,
    resolveAppMediaUrl,
    type OperatorServicePricingMode,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelCard } from './panel-card.js';
import { PanelStatusBadge } from './panel-primitives.js';
import {
    BUSINESS_CATALOG_IMAGE_FRAME_CLASS,
    BUSINESS_CATALOG_IMAGE_MEDIA_CLASS,
} from './business-catalog-image-styles.js';

export type BusinessServicePublicCardData = {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    /** Portada o avatar del negocio cuando el servicio no tiene imagen propia. */
    imageFallbackUrl?: string | null;
    category: string;
    pricingMode: OperatorServicePricingMode;
    price?: string | null;
    promoPrice?: string | null;
    currency?: string;
    durationMinutes?: number | null;
    isOnline?: boolean;
    isPresential?: boolean;
    providerName?: string | null;
    providerHref?: string | null;
    locationLabel?: string | null;
    badge?: string | null;
};

function resolveServiceCardImage(item: Pick<BusinessServicePublicCardData, 'imageUrl' | 'imageFallbackUrl'>) {
    return resolveAppMediaUrl(item.imageUrl) ?? resolveAppMediaUrl(item.imageFallbackUrl) ?? null;
}

export function BusinessServicePublicCard({
    item,
    vertical,
    href,
}: {
    item: BusinessServicePublicCardData;
    vertical: PublicProfileVertical;
    href?: string | null;
}) {
    const imageSrc = resolveServiceCardImage(item);
    const priceLabel = formatOperatorServicePrice({
        pricingMode: item.pricingMode,
        price: item.price ?? null,
        promoPrice: item.promoPrice ?? null,
        currency: item.currency,
    });
    const categoryLabel = resolveOperatorServiceCategoryLabel(vertical, item.category);
    const modalityLabel = formatBusinessServiceModality(item);
    const cardLinked = Boolean(href);
    const card = (
        <PanelCard size="md" className="flex h-full flex-col gap-4 p-4">
            <div className={`relative aspect-[4/3] w-full ${BUSINESS_CATALOG_IMAGE_FRAME_CLASS}`}>
                {imageSrc ? (
                    <Image src={imageSrc} alt={item.name} fill className={BUSINESS_CATALOG_IMAGE_MEDIA_CLASS} sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-fg-muted">Sin imagen</div>
                )}
                {item.badge ? (
                    <div className="absolute left-3 top-3">
                        <PanelStatusBadge label={item.badge} tone="info" size="sm" />
                    </div>
                ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3 pt-0.5">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{categoryLabel}</p>
                    <h3 className="text-base font-semibold text-fg">{item.name}</h3>
                    {item.description ? <p className="line-clamp-2 text-sm leading-6 text-fg-secondary">{item.description}</p> : null}
                </div>
                <div className="mt-auto space-y-2">
                    <p className="text-lg font-semibold text-fg">{priceLabel}</p>
                    {modalityLabel ? <p className="text-xs text-fg-muted">{modalityLabel}</p> : null}
                    {item.durationMinutes ? <p className="text-xs text-fg-muted">Duración aprox. {item.durationMinutes} min</p> : null}
                    {item.providerName ? (
                        <p className="text-sm text-fg-secondary">
                            {item.providerHref && !cardLinked ? (
                                <Link href={item.providerHref} className="underline-offset-2 hover:underline">{item.providerName}</Link>
                            ) : (
                                <span>{item.providerName}</span>
                            )}
                            {item.locationLabel ? ` · ${item.locationLabel}` : ''}
                        </p>
                    ) : null}
                </div>
            </div>
        </PanelCard>
    );

    if (href) {
        return <Link href={href} className="block h-full transition-opacity hover:opacity-95">{card}</Link>;
    }
    return card;
}
