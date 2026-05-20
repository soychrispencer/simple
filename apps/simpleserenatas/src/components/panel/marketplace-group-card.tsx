'use client';

import { PanelButton, PanelCard } from '@simple/ui';
import { IconMapPin, IconRosetteDiscountCheck, IconStar } from '@tabler/icons-react';
import type { ProviderGroup } from '@/lib/serenatas-api';
import {
    extraServicesCount,
    formatGroupRating,
    groupDescriptionFallback,
    profileLocation,
    verificationBadgeLabel,
    zonesLabel,
} from '@/lib/marketplace-group-display';
import { money } from './shared';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from './marketplace-group-media';

function servicePreviewMeta(service: NonNullable<ProviderGroup['servicesPreview']>[number]) {
    return `${service.durationMinutes} min · ${service.musiciansCount} músico${service.musiciansCount === 1 ? '' : 's'}`;
}

export function MarketplaceGroupCard({
    group,
    onOpen,
}: {
    group: ProviderGroup;
    onOpen: (slug: string) => void;
}) {
    const rating = formatGroupRating(group);
    const verifiedLabel = verificationBadgeLabel(group);
    const extra = extraServicesCount(group);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Ver mariachi ${group.name}`}
            className="cursor-pointer rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => onOpen(group.slug)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(group.slug);
                }
            }}
        >
        <PanelCard className="overflow-hidden !p-0 transition-shadow hover:shadow-md">
            <div className="flex w-full flex-col">
                <MarketplaceGroupCover group={group} />
                <div className="flex grow flex-col gap-4 p-5">
                    <div className="-mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 items-end gap-3">
                            <MarketplaceGroupLogo group={group} />
                            <div className="min-w-0 pb-1">
                                <h3 className="truncate text-lg font-semibold text-fg">{group.name}</h3>
                                <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
                                    <IconMapPin size={14} className="shrink-0" />
                                    <span className="truncate">{profileLocation(group)}</span>
                                </p>
                            </div>
                        </div>
                        {verifiedLabel ? (
                            <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                                <IconRosetteDiscountCheck size={13} />
                                {verifiedLabel}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-fg">
                                {group.startingPrice ? `Desde ${money(group.startingPrice)}` : 'Servicios por publicar'}
                            </p>
                            <p className="mt-0.5 text-xs text-fg-muted">
                                {group.activeServicesCount ?? 0} servicio{(group.activeServicesCount ?? 0) === 1 ? '' : 's'} disponible{(group.activeServicesCount ?? 0) === 1 ? '' : 's'}
                                {extra > 0 ? ` · +${extra} más en ficha` : ''}
                            </p>
                        </div>
                        {rating ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-sm font-medium text-fg">
                                <IconStar size={14} className="text-amber-500" fill="currentColor" />
                                {rating}
                            </span>
                        ) : null}
                    </div>

                    <p className="line-clamp-2 text-sm text-fg-muted">{groupDescriptionFallback(group)}</p>

                    {group.servicesPreview && group.servicesPreview.length > 0 ? (
                        <div className="grid gap-2.5">
                            {group.servicesPreview.map((service) => (
                                <div
                                    key={service.id}
                                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-bg-subtle px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-fg">{service.name}</p>
                                        <p className="text-xs text-fg-muted">{servicePreviewMeta(service)}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold text-fg">{money(service.price)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-card border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg-muted">
                            Servicios pendientes de publicar.
                        </p>
                    )}

                    <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                        <p className="text-xs text-fg-muted">Atiende: {zonesLabel(group)}</p>
                        <PanelButton
                            className="w-full"
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpen(group.slug);
                            }}
                        >
                            Ver mariachi
                        </PanelButton>
                    </div>
                </div>
            </div>
        </PanelCard>
        </div>
    );
}

export function MarketplaceGroupCardSkeleton() {
    return (
        <PanelCard className="overflow-hidden !p-0">
            <div className="h-32 animate-pulse bg-bg-subtle" />
            <div className="space-y-4 p-5">
                <div className="-mt-12 flex gap-3">
                    <div className="size-20 shrink-0 animate-pulse rounded-card bg-bg-subtle" />
                    <div className="flex-1 space-y-2 pt-8">
                        <div className="h-5 w-2/3 animate-pulse rounded bg-bg-subtle" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-bg-subtle" />
                    </div>
                </div>
                <div className="h-6 w-1/3 animate-pulse rounded bg-bg-subtle" />
                <div className="h-10 animate-pulse rounded-card bg-bg-subtle" />
                <div className="h-10 animate-pulse rounded bg-bg-subtle" />
            </div>
        </PanelCard>
    );
}
