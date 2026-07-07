'use client';

import { useState, useRef } from 'react';
import { IconRocket, IconShare3, IconCopy, IconBrandWhatsapp, IconBrandInstagram, IconCheck, IconTag } from '@tabler/icons-react';
import { PanelStatusBadge } from '../panel/panel-primitives';
import ListingEngagementRow from './shared/listing-engagement-row';
import ListingOwnerActions from './shared/listing-owner-actions';
import ListingAnchoredMenu from './shared/listing-anchored-menu';
import { buildReelSpecsFromMetaTags } from './shared/build-reel-specs';
import { formatChileanPeso, ownerStatusPalette, variantBadgeLabel, defaultCtaByVariant } from './shared/utils';
import MarketplaceReelListingCard from './marketplace-reel-listing-card';
import type { MarketplaceReelChip } from './marketplace-reel-listing-card';
import type { OwnerListingCardProps } from './types';

export default function OwnerListingCard(props: OwnerListingCardProps) {
    const {
        id,
        href,
        title,
        price,
        variant,
        accent = 'autos',
        images,
        location,
        metaTags,
        status,
        statusLabel,
        engagement,
        primaryAction,
        secondaryActions,
        mode,
        onClick,
        busyActionKey,
        onShare,
        onBoost,
        shareOptions,
    } = props;

    const palette = ownerStatusPalette(status, statusLabel);

    const statusBadge = (
        <PanelStatusBadge
            label={palette.label}
            tone={palette.tone}
            variant="solid"
            size="sm"
            className="shadow-sm"
        />
    );

    const handleBoost = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onBoost) onBoost(id);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onShare) onShare(id);
    };

    // Vertical boost button — estilo reel (mismo CTA que el público)
    const boostReelButton = (
        <button
            type="button"
            disabled={!onBoost}
            onClick={handleBoost}
            className="marketplace-reel-cta min-w-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <IconRocket size={16} className="mr-1 inline shrink-0" />
            Impulsar
        </button>
    );

    // Share menu dropdown component
    const ShareMenuDropdown = () => {
        const [open, setOpen] = useState(false);
        const [copied, setCopied] = useState(false);
        const anchorRef = useRef<HTMLSpanElement | null>(null);

        const hasShareOptions = shareOptions && (shareOptions.onCopyLink || shareOptions.onShareWhatsapp || shareOptions.onShareInstagram);
        const canShare = hasShareOptions || onShare;

        if (!canShare) return null;

        const handleCopy = () => {
            if (shareOptions?.onCopyLink) {
                shareOptions.onCopyLink();
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        };

        const handleWhatsapp = () => {
            if (shareOptions?.onShareWhatsapp) {
                shareOptions.onShareWhatsapp();
                setOpen(false);
            }
        };

        const handleInstagram = () => {
            if (shareOptions?.onShareInstagram) {
                shareOptions.onShareInstagram();
                setOpen(false);
            }
        };

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (hasShareOptions) {
                setOpen((v) => !v);
            } else if (onShare) {
                onShare(id);
            }
        };

        return (
            <span ref={anchorRef} className="inline-flex shrink-0">
                <button
                    type="button"
                    onClick={handleClick}
                    className="marketplace-reel-card__icon-btn"
                    aria-label="Compartir"
                    aria-expanded={open}
                >
                    <IconShare3 size={18} />
                </button>
                <ListingAnchoredMenu
                    open={open && Boolean(hasShareOptions)}
                    anchorRef={anchorRef}
                    onClose={() => setOpen(false)}
                    placement="auto"
                    width={192}
                    ariaLabel="Compartir"
                >
                    {shareOptions?.onCopyLink && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleCopy}
                            className="listing-owner-menu-item flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                        >
                            {copied ? <IconCheck size={14} className="text-green-500" /> : <IconCopy size={14} />}
                            <span>{copied ? 'Copiado' : 'Copiar link'}</span>
                        </button>
                    )}
                    {shareOptions?.onShareWhatsapp && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleWhatsapp}
                            className="listing-owner-menu-item flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                        >
                            <IconBrandWhatsapp size={14} className="text-green-500" />
                            <span>WhatsApp</span>
                        </button>
                    )}
                    {shareOptions?.onShareInstagram && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleInstagram}
                            className="listing-owner-menu-item flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                        >
                            <IconBrandInstagram size={14} className="text-pink-500" />
                            <span>Instagram</span>
                        </button>
                    )}
                </ListingAnchoredMenu>
            </span>
        );
    };

    const activate = () => {
        if (onClick) onClick(id);
        else if (typeof window !== 'undefined') window.location.href = href;
    };

    const reelChips: MarketplaceReelChip[] = [
        { label: variantBadgeLabel(variant), icon: <IconTag size={10} /> },
    ];

    const reelFooterActions = mode === 'list' ? (
        <div className="flex w-full min-w-0 flex-col gap-2">
            <ListingEngagementRow engagement={engagement} layout="row" dense tone="panel" />
            <div className="flex items-center justify-end gap-1.5">
                <ShareMenuDropdown />
                {boostReelButton}
                <ListingOwnerActions
                    variant="reel"
                    secondary={secondaryActions}
                    busyActionKey={busyActionKey}
                    menuPlacement="auto"
                />
            </div>
        </div>
    ) : (
        <div className="flex w-full min-w-0 flex-col gap-2">
            <ListingEngagementRow engagement={engagement} layout="row" dense tone="reel" />
            <div className="marketplace-reel-card__actions w-full">
                <ShareMenuDropdown />
                {boostReelButton}
                <ListingOwnerActions
                    variant="reel"
                    secondary={secondaryActions}
                    busyActionKey={busyActionKey}
                    menuPlacement="auto"
                />
            </div>
        </div>
    );

    const reelCard = (
        <MarketplaceReelListingCard
            mode={mode}
            href={href}
            title={title}
            price={formatChileanPeso(price.amount)}
            priceOriginal={price.original != null ? formatChileanPeso(price.original) : undefined}
            location={location}
            images={images.map((image) => image.src)}
            specs={buildReelSpecsFromMetaTags(metaTags, accent)}
            chips={reelChips}
            sellerName=""
            ctaLabel={defaultCtaByVariant(variant)}
            onNavigate={activate}
            shareText={title}
            footerActions={reelFooterActions}
            className={mode === 'grid' ? 'h-full' : mode === 'list' ? 'marketplace-reel-card--owner-list' : undefined}
        />
    );

    if (mode === 'list') {
        return (
            <div
                className="relative w-full rounded-2xl"
                style={{ boxShadow: `inset 3px 0 0 ${palette.borderColor}` }}
            >
                {reelCard}
                <div className="pointer-events-none absolute right-2.5 top-2.5 z-20">
                    {statusBadge}
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {reelCard}
            <div className="pointer-events-none absolute right-2.5 top-2.5 z-20">
                {statusBadge}
            </div>
        </div>
    );
}
