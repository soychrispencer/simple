'use client';

import { useMemo, useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconMapPin } from '@tabler/icons-react';
import { PanelIconButton } from '../index';
import ListingImageCarousel from './shared/listing-image-carousel';
import ListingBadgeStack from './shared/listing-badge-stack';
import ListingPriceBlock from './shared/listing-price-block';
import ListingMetaTags from './shared/listing-meta-tags';
import ListingSellerStrip from './shared/listing-seller-strip';
import ListingActionCluster from './shared/listing-action-cluster';
import { defaultCtaByVariant, variantBadgeLabel, variantBadgeTone } from './shared/utils';
import type { PublicListingCardProps } from './types';

function buildPrimaryBadges(props: PublicListingCardProps) {
    const primary = {
        label: variantBadgeLabel(props.variant),
        tone: variantBadgeTone(props.variant),
    };
    const extras = props.badges ?? [];
    return [primary, ...extras];
}

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
        ctaLabel,
        isSaved = false,
        onSave,
        onShare,
        onClick,
    } = props;

    const [savedState, setSavedState] = useState(isSaved);
    const [saving, setSaving] = useState(false);

    const effectiveCtaLabel = ctaLabel ?? defaultCtaByVariant(variant);
    const badges = useMemo(() => buildPrimaryBadges(props), [props]);

    const aspectClass = accent === 'propiedades' ? 'aspect-[3/2]' : 'aspect-[4/3]';

    const handleCardClick = () => {
        if (onClick) onClick(id);
        else if (typeof window !== 'undefined') window.location.href = href;
    };

    const handleCta = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) onClick(id);
        else if (typeof window !== 'undefined') window.location.href = href;
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSave || saving) return;
        setSaving(true);
        try {
            const result = await onSave(id);
            if (result && typeof result.saved === 'boolean') setSavedState(result.saved);
        } finally {
            setSaving(false);
        }
    };

    const handleShare = () => {
        onShare?.(id);
    };

    const saveButton = onSave ? (
        <PanelIconButton
            type="button"
            label={savedState ? 'Quitar de guardados' : 'Guardar'}
            variant="overlay"
            size="sm"
            onClick={handleSave}
            className="absolute right-2.5 top-2.5 z-10 h-9 w-9 rounded-full shadow-md"
        >
            {savedState ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
        </PanelIconButton>
    ) : null;

    if (mode === 'list') {
        return (
            <article
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCardClick();
                }}
                className="group/card relative grid cursor-pointer gap-3 rounded-2xl border p-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] sm:p-4 sm:gap-4 grid-cols-[120px_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_200px]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="relative self-stretch">
                    <ListingImageCarousel
                        images={images}
                        title={title}
                        seed={id}
                        accent={accent}
                        aspectClassName="aspect-[4/3] h-full min-h-[110px]"
                        rounded="rounded-xl"
                    />
                    <ListingBadgeStack badges={badges.slice(0, 2)} size="xs" />
                    {saveButton}
                </div>

                <div className="flex min-w-0 flex-col justify-center gap-2">
                    <ListingPriceBlock price={price} size="md" alignment="start" />
                    <h3
                        className="line-clamp-2 text-[14px] font-semibold leading-snug sm:text-[15px]"
                        style={{ color: 'var(--fg)' }}
                    >
                        {title}
                    </h3>
                    <ListingMetaTags tags={metaTags} max={4} size="xs" />
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />
                        <span className="truncate">{location}</span>
                    </div>
                </div>

                <div className="hidden flex-col items-end justify-center gap-3 xl:flex">
                    <ListingSellerStrip seller={seller} size="sm" />
                    <ListingActionCluster
                        ctaLabel={effectiveCtaLabel}
                        onCta={handleCta}
                        onShare={onShare ? handleShare : undefined}
                        stretchCta
                    />
                </div>

                <div className="col-span-full flex items-center justify-between gap-2 border-t pt-3 xl:hidden" style={{ borderColor: 'var(--border)' }}>
                    <ListingSellerStrip seller={seller} size="sm" />
                    <ListingActionCluster
                        ctaLabel={effectiveCtaLabel}
                        onCta={handleCta}
                        onShare={onShare ? handleShare : undefined}
                    />
                </div>
            </article>
        );
    }

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleCardClick();
            }}
            className="group/card relative flex h-full flex-col cursor-pointer rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div className="relative">
                <ListingImageCarousel
                    images={images}
                    title={title}
                    seed={id}
                    accent={accent}
                    aspectClassName={aspectClass}
                    rounded="rounded-t-2xl"
                />
                <ListingBadgeStack badges={badges} size="sm" />
                {saveButton}
            </div>

            <div className="flex flex-1 flex-col justify-center gap-2.5 p-4">
                <ListingPriceBlock price={price} size="hero" alignment="start" />
                <h3
                    className="line-clamp-2 text-[15px] font-semibold leading-snug"
                    style={{ color: 'var(--fg)' }}
                >
                    {title}
                </h3>
                <ListingMetaTags tags={metaTags} max={4} size="xs" />
                <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                    <IconMapPin size={12} />
                    <span className="truncate">{location}</span>
                </div>
                <div
                    className="mt-auto flex items-center justify-between gap-2 border-t pt-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <ListingSellerStrip seller={seller} size="sm" />
                    <ListingActionCluster
                        ctaLabel={effectiveCtaLabel}
                        onCta={handleCta}
                        onShare={onShare ? handleShare : undefined}
                    />
                </div>
            </div>
        </article>
    );
}
