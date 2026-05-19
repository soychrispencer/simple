'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard } from '@simple/ui';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { EmptyBlock, FormFeedback, money, type FormStatus } from './shared';

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
                setStatus({ loading: false, error: groupResponse.error ?? 'Grupo no encontrado', ok: null });
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
            setStatus({ loading: false, error: null, ok: 'Listo' });
        });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (status.loading) {
        return <p className="text-sm text-fg-muted">Cargando grupo…</p>;
    }

    if (!group) {
        return (
            <div className="grid gap-4">
                <EmptyBlock title="Grupo no disponible" description={status.error ?? 'Intenta con otro grupo.'} />
                <PanelButton variant="secondary" onClick={onBack}>Volver</PanelButton>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <PanelButton variant="ghost" onClick={onBack}>← Volver a mariachis</PanelButton>
            <PanelCard className="overflow-hidden !p-0">
                <div
                    className="h-36 w-full bg-cover bg-center bg-accent-soft"
                    style={group.coverUrl ? { backgroundImage: `url(${group.coverUrl})` } : undefined}
                />
                <div className="p-5">
                    <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-4">
                            <div className="flex size-20 items-center justify-center overflow-hidden rounded-card border-4 border-surface bg-accent-soft font-bold text-accent shadow-sm">
                                {group.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={group.logoUrl} alt="" className="h-full w-full object-cover" />
                                ) : group.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="pb-1">
                                <h2 className="text-2xl font-bold text-fg">{group.name}</h2>
                                <p className="mt-1 text-sm text-fg-muted">
                                    {[group.comunaBase, group.region].filter(Boolean).join(' · ') || 'Grupo de mariachis'}
                                </p>
                            </div>
                        </div>
                        <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
                            {group.isVerified ? 'Verificado' : 'Nuevo'}
                        </span>
                    </div>
                    {group.description ? (
                        <p className="mt-4 max-w-3xl text-sm text-fg-muted">{group.description}</p>
                    ) : null}
                    {group.serviceComunas.length > 0 ? (
                        <p className="mt-3 text-sm text-fg-muted">
                            Atiende: {group.serviceComunas.join(', ')}
                        </p>
                    ) : null}
                </div>
            </PanelCard>

            <PanelCard>
                <h3 className="text-lg font-semibold text-fg">Servicios</h3>
                <FormFeedback status={status} />
                {services.length === 0 ? (
                    <p className="mt-4 text-sm text-fg-muted">Este grupo aún no publica servicios.</p>
                ) : (
                    <div className="mt-4 grid gap-3">
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-semibold text-fg">{service.name}</p>
                                    {service.description ? (
                                        <p className="mt-1 text-sm text-fg-muted">{service.description}</p>
                                    ) : null}
                                    <p className="mt-1 text-sm text-fg-muted">
                                        {service.musiciansCount} músicos · {service.durationMinutes} min
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-fg">{money(service.price)}</span>
                                    <PanelButton onClick={() => onRequest(group, service)}>Solicitar</PanelButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
