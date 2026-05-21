'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelCard, PanelField } from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import {
    MARKETPLACE_SORT_OPTIONS,
    filterMarketplaceGroupsByName,
    sortMarketplaceGroups,
    type MarketplaceGroupSort,
} from '@/lib/marketplace-group-display';
import { EmptyBlock, FieldInput, FieldSelect, FormFeedback, type FormStatus } from './shared';
import { MarketplaceGroupCard, MarketplaceGroupCardSkeleton } from './marketplace-group-card';

function regionIdFromName(name: string) {
    return LOCATION_REGIONS.find((r) => r.name === name)?.id ?? '';
}

export function GroupsMarketplaceView({
    onOpenGroup,
}: {
    onOpenGroup: (slug: string) => void;
}) {
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<MarketplaceGroupSort>('recommended');
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
                setStatus({ loading: false, error: response.error ?? 'No pudimos cargar los mariachis.', ok: null });
                return;
            }
            setItems(response.items);
            setStatus({ loading: false, error: null, ok: null });
        });
        return () => {
            cancelled = true;
        };
    }, [region, comuna]);

    const visibleItems = useMemo(
        () => sortMarketplaceGroups(filterMarketplaceGroupsByName(items, search), sort),
        [items, search, sort],
    );

    return (
        <div className="grid min-w-0 gap-5">
            <PanelCard>
                <div className="grid gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <PanelField label="Buscar" className="min-w-0 flex-1">
                            <FieldInput
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Nombre o descripción del mariachi"
                            />
                        </PanelField>
                        <PanelField label="Ordenar" className="w-full shrink-0 sm:w-52">
                            <FieldSelect value={sort} onChange={(e) => setSort(e.target.value as MarketplaceGroupSort)}>
                                {MARKETPLACE_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </FieldSelect>
                        </PanelField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                {status.error ? <FormFeedback status={status} /> : null}
            </PanelCard>

            {status.loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <MarketplaceGroupCardSkeleton key={index} />
                    ))}
                </div>
            ) : visibleItems.length === 0 ? (
                <EmptyBlock
                    title={items.length === 0 ? 'Sin mariachis en esta zona' : 'Sin resultados'}
                    description={
                        items.length === 0
                            ? 'Prueba otra comuna o vuelve más tarde.'
                            : 'Prueba otro nombre o quita el filtro de búsqueda.'
                    }
                />
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleItems.map((group) => (
                        <MarketplaceGroupCard key={group.id} group={group} onOpen={onOpenGroup} />
                    ))}
                </div>
            )}
        </div>
    );
}
