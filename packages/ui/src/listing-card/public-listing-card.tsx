'use client';

import { useState } from 'react';
import { IconTag } from '@tabler/icons-react';
import { formatListingPrice } from '@simple/utils';
import MarketplaceReelListingCard from './marketplace-reel-listing-card';
import { buildReelSpecsFromMetaTags } from './shared/build-reel-specs';
import { defaultCtaByVariant, variantBadgeLabel } from './shared/utils';
import type { MarketplaceReelChip } from './marketplace-reel-listing-card';
import type { PublicListingCardProps } from './types';

export default function PublicListingCard(props: PublicListingCardProps) {
    const {
        id,
        href,
        title,
        price,
        variant,
        mode,
        accent = 'autos',
        images,
        location,
        metaTags,
        seller,
        badges = [],
        ctaLabel,
        isSaved = false,
        onSave,
        onClick,
    } = props;

    const [savedState, setSavedState] = useState(isSaved);

    const activate = () => {
        if (onClick) onClick(id);
        else if (typeof window !== 'undefined') window.location.href = href;
    };

    const chips: MarketplaceReelChip[] = [
        { label: variantBadgeLabel(variant), icon: <IconTag size={10} /> },
        ...badges.map((badge) => ({
            label: badge.label,
            tone: badge.tone === 'warning' || badge.tone === 'accent' ? 'accent' as const : 'neutral' as const,
        })),
    ];

    const priceLabel = price.caption && /^(UF|USD)$/i.test(price.caption.trim())
        ? formatListingPrice(`${price.caption} ${price.amount}`)
        : formatListingPrice(`$${price.amount}`);
    const priceOriginal = price.original != null
        ? (price.caption && /^(UF|USD)$/i.test(price.caption.trim())
            ? formatListingPrice(`${price.caption} ${price.original}`)
            : formatListingPrice(`$${price.original}`))
        : undefined;

    return (
        <MarketplaceReelListingCard
            mode={mode}
            accent={accent}
            href={href}
            title={title}
            price={priceLabel}
            priceOriginal={priceOriginal}
            location={location}
            images={images.map((image) => image.src)}
            specs={buildReelSpecsFromMetaTags(metaTags, accent)}
            chips={chips}
            sellerName={seller.name}
            sellerAvatarUrl={seller.avatarUrl}
            sellerProfileHref={seller.profileHref}
            ctaLabel={ctaLabel ?? defaultCtaByVariant(variant)}
            isSaved={savedState}
            onSave={onSave
                ? async (event) => {
                    event.stopPropagation();
                    const result = await onSave(id);
                    if (result && typeof result.saved === 'boolean') setSavedState(result.saved);
                }
                : undefined}
            onNavigate={activate}
            onSellerNavigate={seller.profileHref
                ? () => {
                    if (typeof window !== 'undefined') window.location.href = seller.profileHref!;
                }
                : undefined}
            shareText={title}
            className={mode === 'grid' ? 'h-full' : undefined}
        />
    );
}
