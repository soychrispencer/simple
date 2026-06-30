'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    formatOperatorPackPrice,
    resolveAppMediaUrl,
    type OperatorServicePackRecord,
    type PublicOperatorProviderSummary,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelCard } from './panel-card.js';
import { PanelStatusBadge } from './panel-primitives.js';
import {
    BUSINESS_CATALOG_IMAGE_FRAME_CLASS,
    BUSINESS_CATALOG_IMAGE_MEDIA_CLASS,
} from './business-catalog-image-styles.js';

export type BusinessOperatorPackPublicCardData = OperatorServicePackRecord & {
    provider?: PublicOperatorProviderSummary | null;
};

export function BusinessOperatorPackPublicCard({
    item,
    vertical: _vertical,
    href,
}: {
    item: BusinessOperatorPackPublicCardData;
    vertical: PublicProfileVertical;
    href?: string | null;
}) {
    const imageSrc = resolveAppMediaUrl(item.imageUrl)
        ?? resolveAppMediaUrl(item.provider?.coverImageUrl)
        ?? resolveAppMediaUrl(item.provider?.avatarImageUrl);
    const priceLabel = formatOperatorPackPrice(item);
    const provider = item.provider;
    const cardLinked = Boolean(href);
    const card = (
        <PanelCard size="md" className="flex h-full flex-col gap-4 p-4">
            <div className={`relative aspect-[4/3] w-full ${BUSINESS_CATALOG_IMAGE_FRAME_CLASS}`}>
                {imageSrc ? (
                    <Image src={imageSrc} alt={item.name} fill className={BUSINESS_CATALOG_IMAGE_MEDIA_CLASS} sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-fg-muted">Pack</div>
                )}
                <div className="absolute left-3 top-3">
                    <PanelStatusBadge label="Pack" tone="info" size="sm" />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 pt-0.5">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                        {item.sessionsCount} {item.sessionsCount === 1 ? 'sesión' : 'sesiones'}
                        {item.validityDays ? ` · ${item.validityDays} días de validez` : ''}
                    </p>
                    <h3 className="text-base font-semibold text-fg">{item.name}</h3>
                    {item.description ? <p className="line-clamp-2 text-sm leading-6 text-fg-secondary">{item.description}</p> : null}
                </div>
                <div className="mt-auto space-y-2">
                    <p className="text-lg font-semibold text-fg">{priceLabel}</p>
                    {provider ? (
                        <p className="text-sm text-fg-secondary">
                            {href && !cardLinked ? (
                                <Link href={href} className="underline-offset-2 hover:underline">{provider.name}</Link>
                            ) : (
                                <span>{provider.name}</span>
                            )}
                            {provider.city ?? provider.region ? ` · ${provider.city ?? provider.region}` : ''}
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
