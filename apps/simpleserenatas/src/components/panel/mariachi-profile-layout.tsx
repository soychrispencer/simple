'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '@simple/ui/panel';
import { IconMapPin } from '@tabler/icons-react';
import type { ProviderGroup, ProviderGroupService, ProviderGroupServicePack, ProviderGroupServicePromotion } from '@/lib/serenatas-api';
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
import { serviceEffectivePrice, serviceHasPromoPrice } from '@/lib/service-pricing';
import {
    formatPromotionDates,
    formatPromotionDiscountLabel,
    packHasPromoPrice,
    packEffectivePrice,
} from '@/lib/serenata-catalog-display';
import { formatBusinessServiceModality } from '@simple/utils';

function serviceMeta(service: ProviderGroupService) {
    const songs =
        (service.songsIncluded ?? 0) > 0
            ? ` · Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
            : '';
    const modality = formatBusinessServiceModality(service);
    const base = `${service.durationMinutes} min · ${service.musiciansCount} músico${service.musiciansCount === 1 ? '' : 's'}${songs}`;
    return modality ? `${base} · ${modality}` : base;
}

function ServicePrice({ service, className = '' }: { service: ProviderGroupService; className?: string }) {
    if (!serviceHasPromoPrice(service)) {
        return <span className={className}>{money(service.price)}</span>;
    }
    return (
        <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
            <span className="text-sm font-semibold text-fg-muted line-through">{money(service.price)}</span>
            <span>{money(serviceEffectivePrice(service))}</span>
        </span>
    );
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
            <div className="relative aspect-video min-h-[14rem] overflow-hidden">
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
                            <p className="mt-1 text-sm font-semibold text-white/88">Mariachi</p>
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
                                    <ServicePrice service={service} />
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

export function MariachiProfilePromotionsList({
    promotions,
}: {
    promotions: ProviderGroupServicePromotion[];
}) {
    if (promotions.length === 0) return null;
    return (
        <PanelCard className="min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-fg sm:text-xl">Ofertas activas</h2>
            <ul className="mt-4 grid gap-3">
                {promotions.map((promo) => {
                    const datesLabel = formatPromotionDates(promo);
                    return (
                        <li
                            key={promo.id}
                            className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                                    {formatPromotionDiscountLabel(promo)}
                                </span>
                                <p className="text-base font-semibold text-fg">{promo.label}</p>
                            </div>
                            {promo.description ? (
                                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{promo.description}</p>
                            ) : null}
                            {datesLabel ? <p className="mt-2 text-xs text-fg-muted">{datesLabel}</p> : null}
                        </li>
                    );
                })}
            </ul>
        </PanelCard>
    );
}

function PackPrice({ pack }: { pack: ProviderGroupServicePack }) {
    if (!packHasPromoPrice(pack)) {
        return <span>{money(pack.price)}</span>;
    }
    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-fg-muted line-through">{money(pack.price)}</span>
            <span>{money(packEffectivePrice(pack))}</span>
        </span>
    );
}

export function MariachiProfilePacksList({
    packs,
}: {
    packs: ProviderGroupServicePack[];
}) {
    if (packs.length === 0) return null;
    return (
        <PanelCard className="min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-fg sm:text-xl">Packs y bonos</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                Compra varias serenatas con un solo pago y úsalas cuando las necesites.
            </p>
            <ul className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
                {packs.map((pack) => (
                    <li
                        key={pack.id}
                        className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                        {pack.imageUrl ? (
                            <div className="aspect-[16/9] w-full overflow-hidden bg-bg-subtle">
                                <img src={pack.imageUrl} alt={pack.name} className="h-full w-full object-cover" />
                            </div>
                        ) : null}
                        <div className="space-y-1.5 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                                {pack.sessionsCount} serenata{pack.sessionsCount === 1 ? '' : 's'}
                                {pack.validityDays ? ` · ${pack.validityDays} días de validez` : ''}
                            </p>
                            <p className="text-base font-semibold text-fg">{pack.name}</p>
                            {pack.description ? (
                                <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">{pack.description}</p>
                            ) : null}
                            <p className="pt-1 text-xl font-bold tabular-nums text-fg">
                                <PackPrice pack={pack} />
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </PanelCard>
    );
}
