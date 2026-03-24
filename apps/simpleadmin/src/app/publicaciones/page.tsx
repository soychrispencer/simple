'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminListings, type AdminListingListItem } from '@/lib/api';
import { adminScopeLabel, normalizeAdminScope } from '@/lib/admin-scope';

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
        if (scope === 'plataforma') return [];
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

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Publicaciones</h1>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Inventario administrativo de {adminScopeLabel(scope).toLowerCase()}</p>
                </div>
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
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-[1.6fr_100px_140px_90px_120px] gap-4 px-4 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                    <span>Publicación</span>
                    <span>Vertical</span>
                    <span>Autor</span>
                    <span>Estado</span>
                    <span>Ruta</span>
                </div>
                {loading ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando publicaciones...</div>
                ) : scope === 'plataforma' ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>La capa plataforma no tiene publicaciones propias. Usa General, SimpleAutos o SimplePropiedades.</div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>No encontramos publicaciones para ese filtro.</div>
                ) : (
                    filtered.map((listing, index) => (
                        <div key={listing.id} className="grid grid-cols-[1.6fr_100px_140px_90px_120px] gap-4 px-4 py-3 items-center" style={{ background: 'var(--surface)', borderTop: index ? '1px solid var(--border)' : 'none' }}>
                            <div>
                                <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{listing.title}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.price || 'Sin precio'}</p>
                            </div>
                            <span className="text-xs px-1.5 py-0.5 rounded w-fit" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>{listing.vertical}</span>
                            <div>
                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{listing.ownerName}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.ownerEmail}</p>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{listing.status}</span>
                            <span className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{listing.href || 'Sin URL'}</span>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
