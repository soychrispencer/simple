'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '@simple/ui/panel';
import { IconClock, IconMapPin, IconMusic, IconRosetteDiscountCheck, IconStar, IconUsersGroup } from '@tabler/icons-react';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { GroupRatingDisplay } from '@/components/public/group-rating-display';
import {
    bookingPolicySummary,
    groupDescriptionFallback,
    normalizeGroupRating,
    profileLocation,
    verificationBadgeLabel,
} from '@/lib/marketplace-group-display';
import { MarketplaceGroupLogo } from './marketplace-group-media';
import { MarketplaceGroupZonesSummary } from './marketplace-group-zones';
import { money } from './shared';

const PROFILE_FALLBACK_COVER =
    'https://images.unsplash.com/photo-1764593821767-352919115758?auto=format&fit=crop&w=1400&q=82';

function serviceMeta(service: ProviderGroupService) {
    const songs =
        (service.songsIncluded ?? 0) > 0
            ? ` · Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
            : '';
    return `${service.durationMinutes} min · ${service.musiciansCount} músico${service.musiciansCount === 1 ? '' : 's'}${songs}`;
}

export function MariachiProfileHero({ group }: { group: ProviderGroup }) {
    const rating = normalizeGroupRating(group);
    const verifiedLabel = verificationBadgeLabel(group);
    const policy = bookingPolicySummary(group);

    return (
        <PanelCard className="min-w-0 overflow-hidden !p-0">
            <div className="relative h-[22rem] overflow-hidden sm:h-[24rem]">
                <img
                    src={group.coverUrl || PROFILE_FALLBACK_COVER}
                    alt={`Portada de ${group.name}`}
                    className="h-full w-full object-cover"
                />
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/35 to-black/15"
                    aria-hidden
                />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-neutral-950 shadow-sm">
                        <IconRosetteDiscountCheck size={14} className="text-[var(--accent)]" />
                        {verifiedLabel ?? 'Nuevo'}
                    </span>
                    {rating.count > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-black/62 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                            <GroupRatingDisplay group={group} size="sm" showCount onDark />
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/62 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                            <IconStar size={13} />
                            Sin valoraciones aún
                        </span>
                    )}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
                        <div className="flex min-w-0 gap-4">
                            <MarketplaceGroupLogo group={group} size="profile" />
                            <div className="min-w-0 pt-1">
                                <h1 className="break-words text-3xl font-bold leading-tight text-white sm:text-4xl">
                                    {group.name}
                                </h1>
                                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/78">
                                    <IconMapPin size={16} className="shrink-0" />
                                    <span className="truncate">{profileLocation(group)}</span>
                                </p>
                            </div>
                        </div>
                        <div className="rounded-card border border-white/18 bg-black/35 p-4 text-white shadow-lg backdrop-blur">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/64">Desde</p>
                            <p className="mt-1 text-3xl font-bold leading-none">
                                {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/72">
                                <span className="inline-flex items-center gap-1">
                                    <IconUsersGroup size={14} />
                                    {group.activeServicesCount ?? 0} servicio{(group.activeServicesCount ?? 0) === 1 ? '' : 's'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <IconClock size={14} />
                                    {policy.sla}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            {verifiedLabel ? (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                    <IconRosetteDiscountCheck size={11} />
                                    {verifiedLabel}
                                </span>
                            ) : null}
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                                <IconMusic size={11} />
                                Perfil comercial
                            </span>
                        </div>
                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted">
                            {groupDescriptionFallback(group)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-bg-subtle/80 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Zonas de atención</p>
                        <div className="mt-2">
                            <MarketplaceGroupZonesSummary group={group} maxVisible={4} />
                        </div>
                        <p className="mt-3 text-xs text-fg-muted">
                            {policy.mode}
                        </p>
                    </div>
                </div>
            </div>
        </PanelCard>
    );
}

export function MariachiProfileServicesList({
    services,
    renderAction,
    footer,
}: {
    services: ProviderGroupService[];
    renderAction: (service: ProviderGroupService) => ReactNode;
    footer?: ReactNode;
}) {
    return (
        <PanelCard>
            <h2 className="text-xl font-bold text-fg">Servicios para contratar</h2>
            <p className="mt-1 text-sm text-fg-muted">
                Elige un paquete y envía tu solicitud. El mariachi confirma disponibilidad y detalles.
            </p>
            {services.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted">Este mariachi aún no publica servicios.</p>
            ) : (
                <ul className="mt-5 grid gap-3">
                    {services.map((service) => (
                        <li
                            key={service.id}
                            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold text-fg">{service.name}</p>
                                {service.description ? (
                                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{service.description}</p>
                                ) : null}
                                <p className="mt-2 text-xs text-fg-muted">{serviceMeta(service)}</p>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:min-w-[9.5rem] sm:items-stretch">
                                <span className="text-xl font-bold tabular-nums text-fg">
                                    {money(service.price)}
                                </span>
                                {renderAction(service)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {footer ? <div className="mt-4 border-t border-border pt-4 text-xs text-fg-muted">{footer}</div> : null}
        </PanelCard>
    );
}
