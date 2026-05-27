'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminListings, type AdminListingListItem } from '@/lib/api';
import { adminScopeLabel, normalizeAdminScope } from '@/lib/admin-scope';
import { PanelEmptyState, PanelList, PanelListHeader, PanelListRow, PanelNotice, PanelPageHeader, PanelStatusBadge } from '@simple/ui/panel';

export default function PublicacionesPage() {
    return (
        <AdminProtectedPage>
            {() => <PublicacionesContent />}
        </AdminProtectedPage>
    );
}

function PublicacionesContent() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<AdminListingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('todas');
    const scope = normalizeAdminScope(searchParams.get('scope'));

    useEffect(() => {
        let active = true;
        const run = async () => {
            const next = await fetchAdminListings();
            if (!active) return;
            setItems(next);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    const scopedItems = useMemo(() => {
        if (scope === 'autos' || scope === 'propiedades') return items.filter((item) => item.vertical === scope);
        return items;
    }, [items, scope]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return scopedItems.filter((item) => {
            const matchesQuery = !normalized ||
                item.title.toLowerCase().includes(normalized) ||
                item.ownerName.toLowerCase().includes(normalized) ||
                item.ownerEmail.toLowerCase().includes(normalized);
            const matchesStatus = statusFilter === 'todas' || item.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [query, scopedItems, statusFilter]);

    const unsupportedScope = scope === 'agenda' || scope === 'serenatas';

    return (
        <div className="container-app panel-page py-7">
            <PanelPageHeader
                title="Publicaciones"
                description={`Inventario de anuncios para ${adminScopeLabel(scope).toLowerCase()} sin mezclar otras verticales.`}
                actions={
                    <div className="flex gap-2">
                        <div className="relative">
                            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." className="form-input pl-9 w-56 h-9 text-xs" />
                        </div>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-select w-36 h-9 text-xs">
                            <option value="todas">Todas</option>
                            <option value="draft">Draft</option>
                            <option value="active">Activas</option>
                            <option value="paused">Pausadas</option>
                            <option value="sold">Vendidas</option>
                            <option value="archived">Archivadas</option>
                        </select>
                    </div>
                }
            />

            {loading ? (
                <PanelNotice tone="neutral">Cargando publicaciones...</PanelNotice>
            ) : unsupportedScope ? (
                <PanelEmptyState
                    title="Sin publicaciones para esta vertical"
                    description="Este módulo opera publicaciones de Autos y Propiedades. Cambia la vertical para ver datos consistentes."
                />
            ) : filtered.length === 0 ? (
                <PanelEmptyState
                    description="No encontramos publicaciones para los filtros actuales."
                />
            ) : (
                <PanelList>
                    <PanelListHeader className="grid-cols-[minmax(260px,1.6fr)_110px_160px_100px_1fr]">
                        <span>Publicación</span>
                        <span>Vertical</span>
                        <span>Autor</span>
                        <span>Estado</span>
                        <span>Ruta</span>
                    </PanelListHeader>
                    {filtered.map((listing, index) => (
                        <PanelListRow key={listing.id} divider={index > 0}>
                            <div className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(260px,1.6fr)_110px_160px_100px_1fr] md:items-center">
                                <div>
                                    <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{listing.title}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.price || 'Sin precio'}</p>
                                </div>
                                <div>
                                    <PanelStatusBadge label={listing.vertical} tone="info" />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{listing.ownerName}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.ownerEmail}</p>
                                </div>
                                <div>
                                    <PanelStatusBadge label={listing.status} tone={listing.status === 'active' ? 'success' : 'neutral'} />
                                </div>
                                <span className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{listing.href || 'Sin URL'}</span>
                            </div>
                        </PanelListRow>
                    ))}
                </PanelList>
            )}
        </div>
    );
}
