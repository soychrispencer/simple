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

function MariachiProfileHeroStats({
    group,
    policy,
    variant,
}: {
    group: ProviderGroup;
    policy: ReturnType<typeof bookingPolicySummary>;
    variant: 'overlay' | 'surface';
}) {
    const serviceCount = group.activeServicesCount ?? 0;
    const priceClass = variant === 'overlay' ? 'text-white' : 'text-fg';
    const mutedClass = variant === 'overlay' ? 'text-white/72' : 'text-fg-muted';
    const labelClass = variant === 'overlay' ? 'text-white/64' : 'text-fg-muted';

    return (
        <>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>Desde</p>
            <p className={`mt-0.5 text-2xl font-bold leading-tight sm:text-3xl ${priceClass}`}>
                {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
            </p>
            <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${mutedClass}`}>
                <span className="inline-flex items-center gap-1">
                    <IconUsersGroup size={14} className="shrink-0" />
                    {serviceCount} servicio{serviceCount === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1">
                    <IconClock size={14} className="shrink-0" />
                    {policy.sla}
                </span>
            </div>
        </>
    );
}

export function MariachiProfileHero({ group }: { group: ProviderGroup }) {
    const rating = normalizeGroupRating(group);
    const verifiedLabel = verificationBadgeLabel(group);
    const policy = bookingPolicySummary(group);

    return (
        <PanelCard className="min-w-0 overflow-hidden !p-0">
            <div className="relative h-44 overflow-hidden sm:h-52 md:h-[22rem] lg:h-[24rem]">
                <img
                    src={group.coverUrl || PROFILE_FALLBACK_COVER}
                    alt={`Portada de ${group.name}`}
                    className="h-full w-full object-cover"
                />
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"
                    aria-hidden
                />
                <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 sm:left-6 sm:top-6 sm:gap-2">
                    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-neutral-950 shadow-sm sm:px-3 sm:text-xs">
                        <IconRosetteDiscountCheck size={13} className="shrink-0 text-[var(--accent)]" />
                        <span className="truncate">{verifiedLabel ?? 'Nuevo'}</span>
                    </span>
                    {rating.count > 0 ? (
                        <span className="inline-flex max-w-full items-center rounded-full bg-black/62 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-3 sm:text-xs">
                            <GroupRatingDisplay group={group} size="sm" showCount onDark />
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/62 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-3 sm:text-xs">
                            <IconStar size={12} className="shrink-0" />
                            Sin valoraciones
                        </span>
                    )}
                </div>

                {/* Móvil: solo nombre sobre la portada */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:hidden">
                    <div className="flex min-w-0 items-end gap-3">
                        <MarketplaceGroupLogo group={group} size="md" frameClassName="flex shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-white/90 bg-accent-soft font-bold text-accent shadow-md size-14 text-lg" />
                        <div className="min-w-0 pb-0.5">
                            <h1 className="line-clamp-2 break-words text-xl font-bold leading-snug text-white">
                                {group.name}
                            </h1>
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-white/80">
                                <IconMapPin size={14} className="shrink-0" />
                                <span className="line-clamp-1">{profileLocation(group)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop: nombre + precio en overlay */}
                <div className="absolute inset-x-0 bottom-0 hidden p-5 sm:p-6 md:block">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
                        <div className="flex min-w-0 gap-4">
                            <MarketplaceGroupLogo group={group} size="profile" />
                            <div className="min-w-0 pt-1">
                                <h1 className="break-words text-3xl font-bold leading-tight text-white lg:text-4xl">
                                    {group.name}
                                </h1>
                                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/78">
                                    <IconMapPin size={16} className="shrink-0" />
                                    <span className="truncate">{profileLocation(group)}</span>
                                </p>
                            </div>
                        </div>
                        <div className="rounded-card border border-white/18 bg-black/35 p-4 text-white shadow-lg backdrop-blur">
                            <MariachiProfileHeroStats group={group} policy={policy} variant="overlay" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Móvil: precio y stats legibles fuera del overlay */}
            <div className="border-b border-border bg-surface px-4 py-3 md:hidden">
                <MariachiProfileHeroStats group={group} policy={policy} variant="surface" />
            </div>

            <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5 md:px-6">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Perfil comercial</p>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                        {groupDescriptionFallback(group)}
                    </p>
                </div>
                <div className="rounded-xl border border-border bg-bg-subtle/80 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Zonas de atención</p>
                    <div className="mt-2">
                        <MarketplaceGroupZonesSummary group={group} maxVisible={4} />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-fg-muted">{policy.mode}</p>
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
        <PanelCard className="min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-fg sm:text-xl">Servicios para contratar</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
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
