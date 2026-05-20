'use client';

import Link from 'next/link';
import { PanelCard } from '@simple/ui';
import { IconMapPin, IconRosetteDiscountCheck, IconStar } from '@tabler/icons-react';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import {
    bookingPolicySummary,
    cheapestService,
    contactAvailabilityLabel,
    formatGroupRating,
    formatPaymentMethods,
    groupDescriptionFallback,
    profileLocation,
    verificationBadgeLabel,
    zonesText,
} from '@/lib/marketplace-group-display';
import { panelGroupHref, panelSolicitarHref } from '@/lib/panel-routes';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from '@/components/panel/marketplace-group-media';
import { money } from '@/components/panel/shared';

export function MariachiProfileContent({
    group,
    services,
}: {
    group: ProviderGroup;
    services: ProviderGroupService[];
}) {
    const rating = formatGroupRating(group);
    const verifiedLabel = verificationBadgeLabel(group);
    const paymentMethods = formatPaymentMethods(group);
    const policy = bookingPolicySummary(group);
    const leadService = cheapestService(services);

    return (
        <div className="grid gap-5">
            <PanelCard className="overflow-hidden !p-0">
                <MarketplaceGroupCover group={group} className="h-48 sm:h-56" />
                <div className="p-5 md:p-6">
                    <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 items-end gap-4">
                            <MarketplaceGroupLogo group={group} size="lg" />
                            <div className="min-w-0 pb-1">
                                <h1 className="text-2xl font-bold text-fg sm:text-3xl">{group.name}</h1>
                                <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
                                    <IconMapPin size={15} className="shrink-0" />
                                    {profileLocation(group)}
                                </p>
                                {rating ? (
                                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-fg">
                                        <IconStar size={15} className="text-amber-500" fill="currentColor" />
                                        {rating}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        {verifiedLabel ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
                                <IconRosetteDiscountCheck size={15} />
                                {verifiedLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-5 max-w-3xl text-sm leading-6 text-fg-muted">{groupDescriptionFallback(group)}</p>
                    <div className="mt-5 grid gap-3 rounded-card border border-border bg-bg-subtle p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Desde</p>
                            <p className="mt-1 text-lg font-semibold text-fg">
                                {group.startingPrice ? money(group.startingPrice) : 'Consultar'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Servicios</p>
                            <p className="mt-1 text-lg font-semibold text-fg">{services.length}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Respuesta</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-fg">{policy.sla}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Reservas</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-fg">{policy.mode}</p>
                        </div>
                    </div>
                </div>
            </PanelCard>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                <PanelCard>
                    <h2 className="text-lg font-semibold text-fg">Servicios</h2>
                    {services.length === 0 ? (
                        <p className="mt-4 text-sm text-fg-muted">Este mariachi aún no publica servicios.</p>
                    ) : (
                        <div className="mt-4 grid gap-3">
                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className="grid gap-4 rounded-card border border-border bg-bg-subtle p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-fg">{service.name}</p>
                                        {service.description ? (
                                            <p className="mt-1 text-sm text-fg-muted">{service.description}</p>
                                        ) : null}
                                        <p className="mt-2 text-sm text-fg-muted">
                                            {service.musiciansCount} músico{service.musiciansCount === 1 ? '' : 's'} · {service.durationMinutes} min
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 md:items-end">
                                        <span className="text-lg font-bold text-fg">{money(service.price)}</span>
                                        <Link
                                            href={panelSolicitarHref({ groupSlug: group.slug, serviceId: service.id })}
                                            className="btn btn-primary text-center text-sm"
                                        >
                                            Solicitar
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                <PanelCard className="xl:sticky xl:top-6">
                    <h2 className="text-lg font-semibold text-fg">Contratar</h2>
                    <p className="mt-2 text-sm text-fg-muted">
                        Inicia sesión como cliente para enviar una solicitud a este mariachi.
                    </p>
                    <div className="mt-4 grid gap-4">
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Zonas</p>
                            {group.serviceComunas.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {group.serviceComunas.map((comuna) => (
                                        <span
                                            key={comuna}
                                            className="rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-xs text-fg"
                                        >
                                            {comuna}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-1 text-sm text-fg">{zonesText(group)}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Contacto</p>
                            <p className="mt-1 text-sm text-fg">{contactAvailabilityLabel(group)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Medios de pago</p>
                            <p className="mt-1 text-sm text-fg">
                                {paymentMethods.length > 0 ? paymentMethods.join(' · ') : 'Por confirmar'}
                            </p>
                        </div>
                        {leadService ? (
                            <Link
                                href={panelSolicitarHref({ groupSlug: group.slug, serviceId: leadService.id })}
                                className="btn btn-primary w-full text-center"
                            >
                                Solicitar desde {money(leadService.price)}
                            </Link>
                        ) : (
                            <Link href={panelGroupHref(group.slug)} className="btn btn-primary w-full text-center">
                                Ver en el panel
                            </Link>
                        )}
                        <Link href="/panel/mariachis" className="btn btn-ghost w-full text-center text-sm">
                            Explorar más mariachis
                        </Link>
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
