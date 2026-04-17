'use client';

import { IconAlertTriangle, IconMapPin } from '@tabler/icons-react';
import { PanelStatusBadge } from '../index';
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
        statusHint,
        engagement,
        primaryAction,
        secondaryActions,
        mode,
        onClick,
        busyActionKey,
    } = props;

    const palette = ownerStatusPalette(status, statusLabel);
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
                className="group/card relative grid cursor-pointer gap-3 rounded-2xl border p-3 transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] sm:p-4 sm:gap-4 grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr_auto]"
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
                        aspectClassName="aspect-[4/3]"
                        rounded="rounded-xl"
                        showArrows={false}
                        showDots={false}
                    />
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <PanelStatusBadge label={palette.label} tone={palette.tone} variant="solid" size="xs" />
                            {statusHint ? (
                                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                    <IconAlertTriangle size={12} />
                                    {statusHint}
                                </span>
                            ) : null}
                        </div>
                        <h3 className="line-clamp-1 text-[14px] font-semibold leading-snug sm:text-[15px]" style={{ color: 'var(--fg)' }}>
                            {title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <ListingPriceBlock price={price} size="md" showSecondary={false} />
                            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                <IconMapPin size={12} />
                                <span className="truncate">{location}</span>
                            </span>
                        </div>
                        <div className="hidden sm:block">
                            <ListingMetaTags tags={metaTags} max={3} size="xs" />
                        </div>
                        <ListingEngagementRow engagement={engagement} layout="row" dense />
                    </div>
                </div>

                <div className="col-span-full flex items-center justify-end gap-2 border-t pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0" style={{ borderColor: 'var(--border)' }}>
                    <ListingOwnerActions
                        primary={primaryAction}
                        secondary={secondaryActions}
                        busyActionKey={busyActionKey}
                    />
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
            className="group/card relative flex flex-col cursor-pointer rounded-2xl border transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
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
                    aspectClassName="aspect-[16/9]"
                    rounded="rounded-t-2xl"
                    showArrows={false}
                    showDots={false}
                />
                <div className="absolute left-2.5 top-2.5 z-10">
                    <PanelStatusBadge label={palette.label} tone={palette.tone} variant="solid" size="sm" className="shadow-sm" />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                    <h3 className="line-clamp-1 text-[15px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>
                        {title}
                    </h3>
                    <ListingPriceBlock price={price} size="md" showSecondary={false} />
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />
                        <span className="truncate">{location}</span>
                    </div>
                </div>

                <ListingMetaTags tags={metaTags} max={3} size="xs" />

                {statusHint ? (
                    <div
                        className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-muted)',
                            color: 'var(--fg-secondary)',
                        }}
                    >
                        <IconAlertTriangle size={13} />
                        <span>{statusHint}</span>
                    </div>
                ) : null}

                <ListingEngagementRow engagement={engagement} layout="grid" />

                <div
                    className="mt-auto flex items-center justify-between gap-2 border-t pt-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    {engagement.conversionsLabel ? (
                        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                            {engagement.conversionsLabel}
                        </span>
                    ) : <span />}
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
