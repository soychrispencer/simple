'use client';

import { PanelButton } from '@simple/ui/panel';
import { IconChevronRight, IconMap, IconMapPin, IconMusic, IconStarFilled } from '@tabler/icons-react';
import type { ProviderGroup } from '@/lib/serenatas-api';
import { GroupRatingDisplay } from '@/components/public/group-rating-display';
import {
    cardFeaturedService,
    extraServicesLabel,
    groupDescriptionFallback,
    isRecentlyCreatedGroup,
    normalizeGroupRating,
    profileLocation,
    zonesCoverageChip,
} from '@/lib/marketplace-group-display';
import { money } from './shared';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from './marketplace-group-media';

export function MarketplaceGroupCard({
    group,
    onOpen,
}: {
    group: ProviderGroup;
    onOpen: (slug: string) => void;
}) {
    const rating = normalizeGroupRating(group);
    const featured = cardFeaturedService(group);
    const coverage = zonesCoverageChip(group);
    const compactMoreServices = extraServicesLabel(group)?.replace(' más', '');
    const showNewBadge = isRecentlyCreatedGroup(group);

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
                <div className="relative aspect-video shrink-0 overflow-hidden">
                    <MarketplaceGroupCover group={group} className="h-full min-h-full" />
                    <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent"
                        aria-hidden
                    />
                    {showNewBadge ? (
                        <span className="absolute left-3 top-3 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-fg shadow-sm">
                            Nuevo
                        </span>
                    ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
                    <header className="flex gap-3">
                        <MarketplaceGroupLogo group={group} size="md" />
                        <div className="min-w-0 flex-1 pt-0.5">
                            <h3 className="min-w-0 truncate text-base font-semibold leading-tight text-fg sm:text-lg">
                                {group.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted sm:text-sm">
                                <IconMapPin size={13} className="shrink-0 text-fg-muted" />
                                <span className="truncate">{profileLocation(group)}</span>
                            </p>
                            <div className="mt-2 flex min-h-5 items-center">
                                {rating.count > 0 ? (
                                    <GroupRatingDisplay group={group} size="sm" />
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
                                        <IconStarFilled size={13} className="text-amber-500/60" aria-hidden />
                                        Sin valoraciones todavía
                                    </span>
                                )}
                            </div>
                        </div>
                    </header>

                    <p className="line-clamp-2 text-sm leading-snug text-fg-muted">
                        {groupDescriptionFallback(group)}
                    </p>

                    <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                                Cobertura
                            </p>
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
                                <IconMap size={15} className="shrink-0 text-accent" />
                                <span className="truncate" title={coverage?.title ?? 'Cobertura por confirmar'}>
                                    {coverage?.label ?? 'Por confirmar'}
                                </span>
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Desde</p>
                            <p className="mt-1 text-lg font-bold leading-none text-fg sm:text-xl">
                                {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
                            </p>
                        </div>
                    </div>

                    {featured ? (
                        <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                                    Servicio principal
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-fg">{featured.name}</p>
                                {featured.details ? (
                                    <p className="mt-1 text-[11px] text-fg-muted">{featured.details}</p>
                                ) : null}
                            </div>
                            {compactMoreServices ? (
                                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                                    {compactMoreServices}
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-fg-muted">
                            <IconMusic size={16} className="shrink-0 opacity-60" />
                            Servicios pendientes de publicar
                        </div>
                    )}
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
