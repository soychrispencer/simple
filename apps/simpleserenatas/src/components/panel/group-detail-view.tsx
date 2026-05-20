'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton, PanelCard } from '@simple/ui';
import { IconArrowLeft, IconMapPin, IconRosetteDiscountCheck, IconStar } from '@tabler/icons-react';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
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
import { EmptyBlock, FormFeedback, money, type FormStatus } from './shared';
import { MarketplaceGroupCover, MarketplaceGroupLogo } from './marketplace-group-media';

export function GroupDetailView({
    slug,
    onBack,
    onRequest,
}: {
    slug: string;
    onBack: () => void;
    onRequest: (group: ProviderGroup, service: ProviderGroupService) => void;
}) {
    const [group, setGroup] = useState<ProviderGroup | null>(null);
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });

    useEffect(() => {
        let cancelled = false;
        setStatus({ loading: true, error: null, ok: null });
        void serenatasApi.marketplaceGroupBySlug(slug).then(async (groupResponse) => {
            if (cancelled) return;
            if (!groupResponse.ok || !groupResponse.item) {
                setStatus({ loading: false, error: groupResponse.error ?? 'Mariachi no encontrado', ok: null });
                return;
            }
            setGroup(groupResponse.item);
            const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
            if (cancelled) return;
            if (!servicesResponse.ok) {
                setStatus({ loading: false, error: servicesResponse.error ?? 'No pudimos cargar servicios', ok: null });
                return;
            }
            setServices(servicesResponse.items);
            setStatus({ loading: false, error: null, ok: null });
        });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const leadService = useMemo(() => cheapestService(services), [services]);
    const rating = group ? formatGroupRating(group) : null;
    const verifiedLabel = group ? verificationBadgeLabel(group) : null;
    const paymentMethods = group ? formatPaymentMethods(group) : [];
    const policy = group ? bookingPolicySummary(group) : null;

    if (status.loading) {
        return <p className="text-sm text-fg-muted">Cargando mariachi…</p>;
    }

    if (!group) {
        return (
            <div className="grid gap-4">
                <EmptyBlock title="Mariachi no disponible" description={status.error ?? 'Intenta con otro mariachi.'} />
                <PanelButton variant="secondary" onClick={onBack}>Volver</PanelButton>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <PanelButton className="w-fit" variant="ghost" onClick={onBack}>
                <IconArrowLeft size={16} />
                Volver a mariachis
            </PanelButton>

            <PanelCard className="overflow-hidden !p-0">
                <MarketplaceGroupCover group={group} className="h-48" />
                <div className="p-5 md:p-6">
                    <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 items-end gap-4">
                            <MarketplaceGroupLogo group={group} size="lg" />
                            <div className="min-w-0 pb-1">
                                <h2 className="text-2xl font-bold text-fg">{group.name}</h2>
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
                                {group.startingPrice ? money(group.startingPrice) : 'Por publicar'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Servicios</p>
                            <p className="mt-1 text-lg font-semibold text-fg">{services.length}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Respuesta</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-fg">{policy?.sla}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Reservas</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-fg">{policy?.mode}</p>
                        </div>
                    </div>
                </div>
            </PanelCard>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                <PanelCard>
                    <h3 className="text-lg font-semibold text-fg">Servicios</h3>
                    {status.error ? <FormFeedback status={status} /> : null}
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
                                        <PanelButton onClick={() => onRequest(group, service)}>Solicitar este servicio</PanelButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                <PanelCard className="xl:sticky xl:top-6">
                    <h3 className="text-lg font-semibold text-fg">Perfil comercial</h3>
                    <div className="mt-4 grid gap-4">
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Base</p>
                            <p className="mt-1 text-sm text-fg">{profileLocation(group)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Zonas de atención</p>
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
                                <p className="mt-1 text-sm leading-6 text-fg">{zonesText(group)}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Contacto</p>
                            <p className="mt-1 text-sm text-fg">{contactAvailabilityLabel(group)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-fg-muted">Medios de pago</p>
                            <p className="mt-1 text-sm text-fg">
                                {paymentMethods.length > 0 ? paymentMethods.join(' · ') : 'Por confirmar con el mariachi'}
                            </p>
                        </div>
                        {leadService ? (
                            <PanelButton className="w-full" onClick={() => onRequest(group, leadService)}>
                                Solicitar desde {money(leadService.price)}
                            </PanelButton>
                        ) : null}
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
