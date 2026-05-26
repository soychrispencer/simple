'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '@simple/ui/panel';
import { IconMapPin } from '@tabler/icons-react';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { GroupRatingDisplay } from '@/components/public/group-rating-display';
import {
    groupDescriptionFallback,
    hasCustomGroupDescription,
    isRecentlyCreatedGroup,
    normalizeGroupRating,
    profileLocation,
} from '@/lib/marketplace-group-display';
import { MariachiSaveButton } from '@/components/public/mariachi-save-button';
import { MarketplaceGroupLogo } from './marketplace-group-media';
import { MarketplaceGroupZonesSummary } from './marketplace-group-zones';
import { money } from './shared';

function serviceMeta(service: ProviderGroupService) {
    const songs =
        (service.songsIncluded ?? 0) > 0
            ? ` · Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
            : '';
    return `${service.durationMinutes} min · ${service.musiciansCount} músico${service.musiciansCount === 1 ? '' : 's'}${songs}`;
}

function MariachiProfileHeroStats({ group }: { group: ProviderGroup }) {
    const serviceCount = group.activeServicesCount ?? 0;
    const rating = normalizeGroupRating(group);
    const hasRating = rating.count > 0;
    const priceLabel = group.startingPrice ? money(group.startingPrice) : 'Consultar';

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-3 sm:px-5 md:px-6">
            <p className="text-xl font-bold tabular-nums leading-none text-fg">
                <span className="text-sm font-medium text-fg-muted">Desde </span>
                {priceLabel}
            </p>
            {hasRating ? <GroupRatingDisplay group={group} size="sm" /> : null}
            {serviceCount > 0 ? (
                <p className="text-sm text-fg-muted">
                    {serviceCount} servicio{serviceCount === 1 ? '' : 's'}
                </p>
            ) : null}
        </div>
    );
}

export function MariachiProfileHero({ group }: { group: ProviderGroup }) {
    const showNewBadge = isRecentlyCreatedGroup(group);
    const showDescription = hasCustomGroupDescription(group);

    return (
        <PanelCard className="min-w-0 overflow-hidden !p-0">
            <div className="relative aspect-[16/9] min-h-[14rem] overflow-hidden">
                {group.coverUrl ? (
                    <img
                        src={group.coverUrl}
                        alt={`Portada de ${group.name}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-accent-soft text-sm font-semibold text-accent">
                        Portada pendiente
                    </div>
                )}
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-black/0"
                    aria-hidden
                />
                {showNewBadge ? (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm sm:left-6 sm:top-6">
                        Nuevo
                    </span>
                ) : null}
                <MariachiSaveButton
                    providerGroupId={group.id}
                    variant="overlay"
                    className="absolute right-3 top-3 z-10 sm:right-6 sm:top-6"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                    <div className="flex min-w-0 items-end gap-3">
                        <MarketplaceGroupLogo group={group} size="profile" frameClassName="flex shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-white/90 bg-accent-soft font-bold text-accent shadow-md" />
                        <div className="min-w-0 pb-0.5">
                            <h1
                                className="truncate text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl"
                                title={group.name}
                            >
                                {group.name}
                            </h1>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-white/82">
                                <IconMapPin size={15} className="shrink-0" />
                                <span className="line-clamp-1">{profileLocation(group)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <MariachiProfileHeroStats group={group} />

            <div
                className={`grid gap-5 px-4 py-5 sm:px-5 md:px-6 ${showDescription ? 'md:grid-cols-2' : ''}`}
            >
                {showDescription ? (
                    <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-fg-muted">{groupDescriptionFallback(group)}</p>
                    </div>
                ) : null}
                <div className="min-w-0">
                    <p className="text-xs font-medium text-fg-muted">Cobertura</p>
                    <div className="mt-2">
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
    featuredServiceId,
}: {
    services: ProviderGroupService[];
    renderAction: (service: ProviderGroupService) => ReactNode;
    footer?: ReactNode;
    /** Resalta el paquete recomendado (p. ej. el de menor precio). */
    featuredServiceId?: string | null;
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
                <ul className="mt-5 grid gap-3 sm:gap-4">
                    {services.map((service) => {
                        const isFeatured = featuredServiceId === service.id;
                        return (
                        <li
                            key={service.id}
                            className={`overflow-hidden rounded-xl border bg-surface ${
                                isFeatured ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border'
                            }`}
                        >
                            <div className="space-y-1.5 p-4 sm:p-5">
                                <div className="flex min-w-0 items-start gap-2">
                                    <p
                                        className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-fg"
                                        title={service.name}
                                    >
                                        {service.name}
                                    </p>
                                    {isFeatured ? (
                                        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                                            Recomendado
                                        </span>
                                    ) : null}
                                </div>
                                {service.description ? (
                                    <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
                                        {service.description}
                                    </p>
                                ) : null}
                                <p className="text-xs leading-relaxed text-fg-muted">{serviceMeta(service)}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-border bg-bg-subtle/50 px-4 py-3 sm:px-5">
                                <p className="text-xl font-bold tabular-nums leading-none text-fg">
                                    {money(service.price)}
                                </p>
                                <div className="shrink-0">{renderAction(service)}</div>
                            </div>
                        </li>
                        );
                    })}
                </ul>
            )}
            {footer ? <div className="mt-4 border-t border-border pt-4 text-xs text-fg-muted">{footer}</div> : null}
        </PanelCard>
    );
}
