'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '@simple/ui';
import { IconMapPin, IconRosetteDiscountCheck, IconStar } from '@tabler/icons-react';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import {
    bookingPolicySummary,
    formatGroupRating,
    groupDescriptionFallback,
    profileLocation,
    verificationBadgeLabel,
} from '@/lib/marketplace-group-display';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from './marketplace-group-media';
import { MarketplaceGroupZonesSummary } from './marketplace-group-zones';
import { money } from './shared';

function serviceMeta(service: ProviderGroupService) {
    const songs =
        (service.songsIncluded ?? 0) > 0
            ? ` · Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
            : '';
    return `${service.durationMinutes} min · ${service.musiciansCount} músico${service.musiciansCount === 1 ? '' : 's'}${songs}`;
}

export function MariachiProfileHero({ group }: { group: ProviderGroup }) {
    const rating = formatGroupRating(group);
    const verifiedLabel = verificationBadgeLabel(group);
    const policy = bookingPolicySummary(group);

    return (
        <PanelCard className="min-w-0 overflow-hidden !p-0">
            <div className="relative h-36 overflow-hidden sm:h-44">
                <MarketplaceGroupCover group={group} className="h-full min-h-full" />
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"
                    aria-hidden
                />
                {rating ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/90 px-2.5 py-0.5 text-xs font-semibold text-fg shadow-sm backdrop-blur-sm">
                        <IconStar size={12} className="text-amber-500" fill="currentColor" />
                        {rating}
                    </span>
                ) : null}
            </div>

            <div className="px-5 pb-5 pt-4 md:px-6">
                <div className="flex gap-4">
                    <MarketplaceGroupLogo group={group} size="profile" />
                    <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h1 className="break-words text-xl font-bold leading-tight text-fg sm:text-2xl">{group.name}</h1>
                            {verifiedLabel ? (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                    <IconRosetteDiscountCheck size={11} />
                                    {verifiedLabel}
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
                            <IconMapPin size={14} className="shrink-0" />
                            <span className="truncate">{profileLocation(group)}</span>
                        </p>
                    </div>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
                    {groupDescriptionFallback(group)}
                </p>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-bg-subtle/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Desde</p>
                        <p className="text-2xl font-bold leading-none text-fg">
                            {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted sm:justify-end">
                        <span>
                            <strong className="font-semibold text-fg">{group.activeServicesCount ?? 0}</strong>
                            {' '}
                            servicio{(group.activeServicesCount ?? 0) === 1 ? '' : 's'}
                        </span>
                        <span>{policy.sla}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Zonas de atención</p>
                    <div className="mt-1.5">
                        <MarketplaceGroupZonesSummary group={group} maxVisible={4} />
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

