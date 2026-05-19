'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton, PanelCard, PanelField } from '@simple/ui';
import { IconMapPin, IconStar } from '@tabler/icons-react';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { EmptyBlock, FieldSelect, FormFeedback, money, type FormStatus } from './shared';
import type { Section } from '@/context/serenata-context';

function regionIdFromName(name: string) {
    return LOCATION_REGIONS.find((r) => r.name === name)?.id ?? '';
}

export function GroupsMarketplaceView({
    setSection,
    onOpenGroup,
}: {
    setSection: (section: Section) => void;
    onOpenGroup: (slug: string) => void;
}) {
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [items, setItems] = useState<ProviderGroup[]>([]);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });

    const communes = useMemo(() => {
        const regionId = regionIdFromName(region);
        return regionId ? getCommunesForRegion(regionId) : [];
    }, [region]);

    useEffect(() => {
        let cancelled = false;
        setStatus({ loading: true, error: null, ok: null });
        void serenatasApi.marketplaceGroups({
            region: region || undefined,
            comuna: comuna || undefined,
        }).then((response) => {
            if (cancelled) return;
            if (!response.ok) {
                setStatus({ loading: false, error: response.error ?? 'No pudimos cargar los grupos.', ok: null });
                return;
            }
            setItems(response.items);
            setStatus({ loading: false, error: null, ok: 'Listo' });
        });
        return () => {
            cancelled = true;
        };
    }, [region, comuna]);

    return (
        <div className="grid gap-5">
            <PanelCard>
                <h2 className="text-xl font-semibold text-fg">Explora grupos de mariachis</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Elige un grupo, revisa sus servicios y solicita directamente al proveedor.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <PanelField label="Región">
                        <FieldSelect value={region} onChange={(e) => { setRegion(e.target.value); setComuna(''); }}>
                            <option value="">Todas</option>
                            {LOCATION_REGIONS.map((r) => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </FieldSelect>
                    </PanelField>
                    <PanelField label="Comuna">
                        <FieldSelect value={comuna} disabled={!region} onChange={(e) => setComuna(e.target.value)}>
                            <option value="">Todas</option>
                            {communes.map((c) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </FieldSelect>
                    </PanelField>
                </div>
                <FormFeedback status={status} />
            </PanelCard>

            {status.loading ? (
                <p className="text-sm text-fg-muted">Cargando grupos…</p>
            ) : items.length === 0 ? (
                <EmptyBlock title="Sin grupos en esta zona" description="Prueba otra comuna o vuelve más tarde." />
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {items.map((group) => (
                        <PanelCard key={group.id} className="flex min-h-[260px] flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent-soft text-accent">
                                    {group.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={group.logoUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-bold">{group.name.slice(0, 1).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-lg font-semibold text-fg">{group.name}</h3>
                                            {group.comunaBase ? (
                                                <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
                                                    <IconMapPin size={14} />
                                                    {group.comunaBase}
                                                    {group.region ? `, ${group.region}` : ''}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                                            {group.isVerified ? 'Verificado' : 'Nuevo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-fg">
                                        {group.startingPrice ? `Desde ${money(group.startingPrice)}` : 'Servicios por publicar'}
                                    </p>
                                    <p className="mt-1 text-xs text-fg-muted">
                                        {group.activeServicesCount ?? 0} servicio{group.activeServicesCount === 1 ? '' : 's'} disponible{group.activeServicesCount === 1 ? '' : 's'}
                                    </p>
                                </div>
                                <span className="flex items-center gap-1 text-sm text-fg-muted">
                                    <IconStar size={14} />
                                    {group.ratingCount > 0 ? `${group.ratingAverage.toFixed(1)} (${group.ratingCount})` : 'Reputación nueva'}
                                </span>
                            </div>
                            {group.description ? (
                                <p className="line-clamp-2 text-sm text-fg-muted">{group.description}</p>
                            ) : null}
                            {group.servicesPreview && group.servicesPreview.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {group.servicesPreview.map((service) => (
                                        <span key={service.id} className="rounded-full bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg-muted">
                                            {service.name} · {money(service.price)}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                            {group.serviceComunas.length > 0 ? (
                                <p className="text-xs text-fg-muted">
                                    Atiende: {group.serviceComunas.slice(0, 4).join(', ')}{group.serviceComunas.length > 4 ? ` +${group.serviceComunas.length - 4}` : ''}
                                </p>
                            ) : null}
                            <div className="mt-auto flex items-center justify-end">
                                <PanelButton onClick={() => onOpenGroup(group.slug)}>Ver grupo</PanelButton>
                            </div>
                        </PanelCard>
                    ))}
                </div>
            )}

            <PanelButton variant="secondary" onClick={() => setSection('serenatas')}>
                Ver mis serenatas
            </PanelButton>
        </div>
    );
}
