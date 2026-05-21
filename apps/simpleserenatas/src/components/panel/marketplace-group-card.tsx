'use client';

import { PanelButton } from '@simple/ui';
import { IconChevronRight, IconMapPin, IconMusic, IconRosetteDiscountCheck, IconStar } from '@tabler/icons-react';
import type { ProviderGroup } from '@/lib/serenatas-api';
import {
    extraServicesCount,
    formatGroupRating,
    groupDescriptionFallback,
    profileLocation,
    verificationBadgeLabel,
} from '@/lib/marketplace-group-display';
import { money } from './shared';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from './marketplace-group-media';
import { MarketplaceGroupZonePills } from './marketplace-group-zones';

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
    const serviceCount = group.activeServicesCount ?? group.servicesPreview?.length ?? 0;
    const hasServices = (group.servicesPreview?.length ?? 0) > 0;

    const open = () => onOpen(group.slug);

    return (
        <article
            className="group/card flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-accent/30"
        >
            <button
                type="button"
                className="flex min-h-0 flex-1 flex-col text-left focus:outline-none"
                aria-label={`Ver mariachi ${group.name}`}
                onClick={open}
            >
                <div className="relative h-28 shrink-0 overflow-hidden sm:h-32">
                    <MarketplaceGroupCover group={group} className="h-full min-h-full" />
                    <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent"
                        aria-hidden
                    />
                    {rating ? (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-sm backdrop-blur-sm">
                            <IconStar size={12} className="text-amber-500" fill="currentColor" />
                            {rating}
                        </span>
                    ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
                    <header className="flex gap-3">
                        <MarketplaceGroupLogo group={group} size="md" />
                        <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <h3 className="min-w-0 truncate text-base font-semibold leading-tight text-fg sm:text-lg">
                                    {group.name}
                                </h3>
                                {verifiedLabel ? (
                                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                        <IconRosetteDiscountCheck size={11} />
                                        {verifiedLabel}
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted sm:text-sm">
                                <IconMapPin size={13} className="shrink-0 text-fg-muted" />
                                <span className="truncate">{profileLocation(group)}</span>
                            </p>
                        </div>
                    </header>

                    <p className="line-clamp-2 text-sm leading-snug text-fg-muted">
                        {groupDescriptionFallback(group)}
                    </p>

                    <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-bg-subtle/80 px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Desde</p>
                            <p className="text-lg font-bold leading-none text-fg sm:text-xl">
                                {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
                            </p>
                        </div>
                        <p className="shrink-0 text-right text-xs text-fg-muted">
                            {serviceCount > 0
                                ? `${serviceCount} servicio${serviceCount === 1 ? '' : 's'}`
                                : 'Sin servicios'}
                            {extra > 0 ? (
                                <>
                                    <br />
                                    <span className="text-[11px]">+{extra} en ficha</span>
                                </>
                            ) : null}
                        </p>
                    </div>

                    {hasServices ? (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                            {group.servicesPreview!.map((service) => (
                                <li
                                    key={service.id}
                                    className="flex items-center justify-between gap-3 bg-surface px-3 py-2 first:bg-bg-subtle/40"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-fg">{service.name}</p>
                                        <p className="text-[11px] text-fg-muted">{servicePreviewMeta(service)}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                                        {money(service.price)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-fg-muted">
                            <IconMusic size={16} className="shrink-0 opacity-60" />
                            Servicios pendientes de publicar
                        </div>
                    )}

                    <div className="mt-auto pt-1">
                        <MarketplaceGroupZonePills group={group} />
                    </div>
                </div>
            </button>

            <div className="border-t border-border px-4 py-3">
                <PanelButton
                    variant="accent"
                    size="sm"
                    className="w-full"
                    onClick={(event) => {
                        event.stopPropagation();
                        open();
                    }}
                >
                    Ver mariachi
                    <IconChevronRight size={16} className="opacity-80" />
                </PanelButton>
            </div>
        </article>
    );
}

export function MarketplaceGroupCardSkeleton() {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
            <div className="h-28 animate-pulse bg-bg-subtle sm:h-32" />
            <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
                <div className="flex gap-3">
                    <div className="size-14 shrink-0 animate-pulse rounded-card bg-bg-subtle" />
                    <div className="flex-1 space-y-2 pt-1">
                        <div className="h-5 w-3/5 animate-pulse rounded bg-bg-subtle" />
                        <div className="h-3.5 w-2/5 animate-pulse rounded bg-bg-subtle" />
                    </div>
                </div>
                <div className="h-10 animate-pulse rounded bg-bg-subtle" />
                <div className="h-16 animate-pulse rounded-xl bg-bg-subtle" />
                <div className="h-14 animate-pulse rounded-xl bg-bg-subtle" />
                <div className="flex gap-1.5">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-bg-subtle" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-bg-subtle" />
                </div>
            </div>
            <div className="border-t border-border px-4 py-3">
                <div className="h-9 animate-pulse rounded-xl bg-bg-subtle" />
            </div>
        </div>
    );
}
