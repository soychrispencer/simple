'use client';

import { useState, useRef, useEffect } from 'react';
import { IconCalendar, IconMapPin, IconRocket, IconShare3, IconCopy, IconBrandWhatsapp, IconBrandInstagram, IconLink, IconCheck } from '@tabler/icons-react';
import { PanelStatusBadge, PanelButton, PanelIconButton, getPanelButtonClassName, getPanelButtonStyle } from '../index';
import ListingImageCarousel from './shared/listing-image-carousel';
import ListingPriceBlock from './shared/listing-price-block';
import ListingMetaTags from './shared/listing-meta-tags';
import ListingEngagementRow from './shared/listing-engagement-row';
import ListingOwnerActions from './shared/listing-owner-actions';
import { ownerStatusPalette } from './shared/utils';
import type { OwnerListingCardProps } from './types';

export default function OwnerListingCard(props: OwnerListingCardProps) {
    const {
        id,
        href,
        title,
        price,
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

    const handleBoost = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onBoost) onBoost(id);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onShare) onShare(id);
    };

    // Desktop boost button (with text) - uses global primary style
    const boostButton = (
        <button
            type="button"
            disabled={!onBoost}
            onClick={handleBoost}
            className={getPanelButtonClassName({ size: 'sm' }) + ' hidden sm:flex'}
            style={getPanelButtonStyle('primary')}
        >
            <IconRocket size={16} className="mr-1" />
            Impulsar
        </button>
    );

    // Vertical boost button (with text, always shows) - for grid view
    const boostButtonVertical = (
        <button
            type="button"
            disabled={!onBoost}
            onClick={handleBoost}
            className={getPanelButtonClassName({ size: 'sm' }) + ' h-9 px-3'}
            style={getPanelButtonStyle('primary')}
        >
            <IconRocket size={16} className="mr-1" />
            Impulsar
        </button>
    );

    // Mobile boost button (icon only) - for horizontal list view
    const boostButtonMobile = (
        <button
            type="button"
            disabled={!onBoost}
            onClick={handleBoost}
            className={getPanelButtonClassName({ size: 'sm' }) + ' sm:hidden h-9 w-9 p-0'}
            style={getPanelButtonStyle('primary')}
            aria-label="Impulsar"
        >
            <IconRocket size={16} />
        </button>
    );

    // Share menu dropdown component
    const ShareMenuDropdown = ({ isMobile }: { isMobile: boolean }) => {
        const [open, setOpen] = useState(false);
        const [copied, setCopied] = useState(false);
        const ref = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            if (!open) return;
            const close = (e: MouseEvent) => {
                if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
            };
            document.addEventListener('mousedown', close);
            return () => document.removeEventListener('mousedown', close);
        }, [open]);

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
            <div ref={ref} className="relative">
                {isMobile ? (
                    <button
                        type="button"
                        onClick={handleClick}
                        className={getPanelButtonClassName({ size: 'sm' }) + ' h-9 w-9 p-0'}
                        style={getPanelButtonStyle('secondary')}
                        aria-label="Compartir"
                    >
                        <IconShare3 size={18} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleClick}
                        className={getPanelButtonClassName({ size: 'sm' }) + ' h-9 px-3'}
                        style={getPanelButtonStyle('secondary')}
                    >
                        <IconShare3 size={18} className="mr-1" />
                        Compartir
                    </button>
                )}
                {open && hasShareOptions && (
                    <div
                        className="absolute right-0 bottom-full z-50 mb-1 w-48 overflow-hidden rounded-xl border py-1 shadow-lg"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shareOptions?.onCopyLink && (
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                                style={{ color: 'var(--fg)' }}
                            >
                                {copied ? <IconCheck size={14} className="text-green-500" /> : <IconCopy size={14} />}
                                <span>{copied ? 'Copiado' : 'Copiar link'}</span>
                            </button>
                        )}
                        {shareOptions?.onShareWhatsapp && (
                            <button
                                type="button"
                                onClick={handleWhatsapp}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                                style={{ color: 'var(--fg)' }}
                            >
                                <IconBrandWhatsapp size={14} className="text-green-500" />
                                <span>WhatsApp</span>
                            </button>
                        )}
                        {shareOptions?.onShareInstagram && (
                            <button
                                type="button"
                                onClick={handleInstagram}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                                style={{ color: 'var(--fg)' }}
                            >
                                <IconBrandInstagram size={14} className="text-pink-500" />
                                <span>Instagram</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const activate = () => {
        if (onClick) onClick(id);
        else if (typeof window !== 'undefined') window.location.href = href;
    };

    if (mode === 'list') {
        return (
            <article
                role="button"
                tabIndex={0}
                onClick={activate}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') activate();
                }}
                className="group/card relative grid cursor-pointer gap-3 rounded-2xl border p-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] sm:p-4 sm:gap-4 grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr_auto]"
                style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    borderLeftWidth: 3,
                    borderLeftColor: palette.borderColor,
                }}
            >
                <div className="relative h-full">
                    <ListingImageCarousel
                        images={images}
                        title={title}
                        seed={id}
                        accent={accent}
                        aspectClassName="w-full h-full sm:aspect-[4/3] aspect-[3/4]"
                        rounded="rounded-xl"
                    />
                    <div className="absolute left-2 top-2 z-10">
                        <PanelStatusBadge label={palette.label} tone={palette.tone} variant="solid" size="xs" />
                    </div>
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-2 h-full">
                    <div className="space-y-1.5">
                        <h3 className="line-clamp-1 text-[15px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>
                            {title}
                        </h3>
                        <ListingPriceBlock price={price} size="md" />
                        <div className="hidden sm:block">
                            <ListingMetaTags tags={metaTags} max={5} size="xs" />
                        </div>
                        <div className="sm:hidden">
                            <ListingMetaTags tags={metaTags} max={2} size="xs" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                            <IconMapPin size={10} />
                            <span className="truncate">{location}</span>
                        </span>
                        <ListingEngagementRow engagement={engagement} layout="row" dense />
                    </div>
                    <div className="flex sm:hidden items-center justify-end gap-1.5">
                        <ShareMenuDropdown isMobile />
                        {boostButtonMobile}
                        <ListingOwnerActions
                            primary={primaryAction}
                            secondary={secondaryActions}
                            busyActionKey={busyActionKey}
                        />
                    </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1.5 col-start-3 row-start-1 justify-end">
                    <div className="flex items-center gap-1.5">
                        <ShareMenuDropdown isMobile={false} />
                        {boostButton}
                        <ListingOwnerActions
                            primary={primaryAction}
                            secondary={secondaryActions}
                            busyActionKey={busyActionKey}
                        />
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={activate}
            onKeyDown={(e) => {
                if (e.key === 'Enter') activate();
            }}
            className="group/card relative flex h-full flex-col cursor-pointer rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
            style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                borderLeftWidth: 3,
                borderLeftColor: palette.borderColor,
            }}
        >
            <div className="relative">
                <ListingImageCarousel
                    images={images}
                    title={title}
                    seed={id}
                    accent={accent}
                    aspectClassName={accent === 'propiedades' ? 'aspect-[3/2]' : 'aspect-[4/3]'}
                    rounded="rounded-t-2xl"
                />
                <div className="absolute left-2.5 top-2.5 z-10">
                    <PanelStatusBadge label={palette.label} tone={palette.tone} variant="solid" size="sm" className="shadow-sm" />
                </div>
            </div>

            {/* Metrics row below image for vertical view */}
            <div className="px-4 pt-3">
                <div className="flex justify-center">
                    <ListingEngagementRow engagement={engagement} layout="row" dense />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4 pt-2">
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
                    className="mt-auto flex items-center justify-center gap-2 border-t pt-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-1">
                        <ShareMenuDropdown isMobile />
                        {boostButtonVertical}
                        <ListingOwnerActions
                            primary={primaryAction}
                            secondary={secondaryActions}
                            busyActionKey={busyActionKey}
                        />
                    </div>
                </div>
            </div>
        </article>
    );
}
