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

    const saveButtonHorizontal = onSave ? (
        <PanelIconButton
            type="button"
            label={savedState ? 'Quitar de guardados' : 'Guardar'}
            variant="overlay"
            size="sm"
            onClick={handleSave}
            className="z-10 h-9 w-9 rounded-full shadow-md"
        >
            {savedState ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
        </PanelIconButton>
    ) : null;

    const actionProps = {
        ctaLabel: effectiveCtaLabel,
        listingTitle: title,
        listingHref: href,
        onCta: handleCta,
        onShare: onShare ? handleShare : undefined,
        onToggleSave: onSave ? handleSave : undefined,
        isSaved: savedState,
        onViewProfile: seller.profileHref
            ? (e: React.MouseEvent) => {
                e.stopPropagation();
                if (typeof window !== 'undefined' && seller.profileHref) {
                    window.location.href = seller.profileHref;
                }
            }
            : undefined,
    };

    if (mode === 'list') {
        return (
            <article
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCardClick();
                }}
                className="group/card relative grid cursor-pointer gap-3 rounded-2xl border p-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] sm:p-4 sm:gap-4 grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr_auto]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="self-start relative col-start-1 row-start-1 h-full">
                    <ListingImageCarousel
                        images={images}
                        title={title}
                        seed={id}
                        accent={accent}
                        aspectClassName="w-full h-full sm:aspect-[4/3] aspect-[3/4]"
                        rounded="rounded-xl"
                    />
                    <ListingBadgeStack badges={badges.slice(0, 2)} size="xs" />
                    {onSave ? (
                        <div className="absolute right-1.5 top-1.5 z-10 sm:hidden">
                            <PanelIconButton
                                type="button"
                                label={savedState ? 'Quitar de guardados' : 'Guardar'}
                                variant="overlay"
                                size="sm"
                                onClick={handleSave}
                                className="h-8 w-8 rounded-full shadow-md"
                            >
                                {savedState ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} />}
                            </PanelIconButton>
                        </div>
                    ) : null}
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-1 col-start-2 row-start-1 h-full">
                    <div className="flex flex-col gap-1">
                        <h3
                            className="line-clamp-1 text-[15px] font-semibold leading-snug"
                            style={{ color: 'var(--fg)' }}
                        >
                            {title}
                        </h3>
                        <ListingPriceBlock price={price} size="md" alignment="start" showSecondary={false} />
                        <div className="hidden sm:block">
                            <ListingMetaTags tags={metaTags} max={5} size="xs" />
                        </div>
                        <div className="sm:hidden">
                            <ListingMetaTags tags={metaTags} max={2} size="xs" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            <IconMapPin size={10} />
                            <span className="truncate">{location}</span>
                        </div>
                    </div>
                    <div className="flex sm:hidden items-center justify-end gap-1.5">
                        <ListingSellerStrip seller={seller} size="md" />
                        <ListingActionCluster {...actionProps} />
                    </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1.5 col-start-3 row-start-1 justify-start">
                    {saveButtonHorizontal}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1.5">
                        <ListingSellerStrip seller={seller} size="md" />
                        <ListingActionCluster {...actionProps} />
                    </div>
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

            <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-1 flex-col justify-center gap-2.5 text-center">
                    <ListingPriceBlock price={price} size="hero" alignment="center" />
                    <h3
                        className="line-clamp-2 text-[15px] font-semibold leading-snug"
                        style={{ color: 'var(--fg)' }}
                    >
                        {title}
                    </h3>
                    <div className="flex justify-center">
                        <ListingMetaTags tags={metaTags} max={4} size="xs" />
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />
                        <span className="truncate">{location}</span>
                    </div>
                </div>
                <div
                    className="mt-4 flex items-center justify-center gap-3 border-t pt-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <ListingSellerStrip seller={seller} size="sm" />
                    <ListingActionCluster {...actionProps} />
                </div>
            </div>
        </article>
    );
}
