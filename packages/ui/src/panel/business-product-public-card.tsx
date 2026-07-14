'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    formatOperatorProductPrice,
    resolveAppMediaUrl,
    resolveOperatorProductCategoryLabel,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelStatusBadge } from './panel-primitives.js';
import {
    BUSINESS_CATALOG_IMAGE_FRAME_CLASS,
    BUSINESS_CATALOG_IMAGE_MEDIA_CLASS,
} from './business-catalog-image-styles.js';

export type BusinessProductPublicCardData = {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    imageFallbackUrl?: string | null;
    category: string;
    price: string;
    promoPrice?: string | null;
    currency?: string;
    stock?: number | null;
    sku?: string | null;
    providerName?: string | null;
    providerHref?: string | null;
    locationLabel?: string | null;
    consultHref?: string | null;
};

function resolveProductCardImage(item: Pick<BusinessProductPublicCardData, 'imageUrl' | 'imageFallbackUrl'>) {
    return resolveAppMediaUrl(item.imageUrl) ?? resolveAppMediaUrl(item.imageFallbackUrl) ?? null;
}

export function BusinessProductPublicCard({
    item,
    vertical,
    showConsult = true,
    href,
}: {
    item: BusinessProductPublicCardData;
    vertical: PublicProfileVertical;
    showConsult?: boolean;
    href?: string;
}) {
    const imageSrc = resolveProductCardImage(item);
    const priceLabel = formatOperatorProductPrice({
        price: item.price,
        promoPrice: item.promoPrice ?? null,
        currency: item.currency,
    });
    const categoryLabel = resolveOperatorProductCategoryLabel(vertical, item.category);
    const hasPromo = Boolean(item.promoPrice);
    const consultHref = item.consultHref ?? item.providerHref ?? null;
    const titleNode = href ? (
        <Link href={href} className="text-base font-semibold text-fg hover:underline">{item.name}</Link>
    ) : (
        <h3 className="text-base font-semibold text-fg">{item.name}</h3>
    );

    return (
        <PanelCard size="md" className="flex h-full flex-col gap-4 p-4">
            <div className={`relative aspect-[4/3] w-full ${BUSINESS_CATALOG_IMAGE_FRAME_CLASS}`}>
                {href ? (
                    <Link href={href} className="absolute inset-0 z-1" aria-label={item.name} />
                ) : null}
                {imageSrc ? (
                    <Image src={imageSrc} alt={item.name} fill className={BUSINESS_CATALOG_IMAGE_MEDIA_CLASS} sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-fg-muted">Sin imagen</div>
                )}
                {hasPromo ? (
                    <div className="absolute left-3 top-3 z-2">
                        <PanelStatusBadge label="Oferta" tone="info" size="sm" />
                    </div>
                ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3 pt-0.5">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{categoryLabel}</p>
                    {titleNode}
                    {item.description ? <p className="line-clamp-2 text-sm leading-6 text-fg-secondary">{item.description}</p> : null}
                </div>
                <div className="mt-auto space-y-2">
                    <p className="text-lg font-semibold text-fg">{priceLabel}</p>
                    {item.stock != null ? <p className="text-xs text-fg-muted">{item.stock > 0 ? `${item.stock} en stock` : 'Sin stock'}</p> : null}
                    {item.sku ? <p className="text-xs text-fg-muted">SKU: {item.sku}</p> : null}
                    {item.providerName ? (
                        <p className="text-sm text-fg-secondary">
                            {item.providerHref ? (
                                <Link href={item.providerHref} className="underline-offset-2 hover:underline">{item.providerName}</Link>
                            ) : (
                                <span>{item.providerName}</span>
                            )}
                            {item.locationLabel ? ` · ${item.locationLabel}` : ''}
                        </p>
                    ) : null}
                    {showConsult && consultHref ? (
                        <Link
                            href={consultHref}
                            className="inline-flex h-9 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg-muted"
                        >
                            Consultar
                        </Link>
                    ) : null}
                </div>
            </div>
        </PanelCard>
    );
}
