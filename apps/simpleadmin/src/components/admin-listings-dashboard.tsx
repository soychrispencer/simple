'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconBuildingStore,
    IconCar,
    IconCheck,
    IconHome,
    IconPlayerPause,
    IconRefresh,
    IconSearch,
    IconUserSearch,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import {
    PanelButton,
    PanelCard,
    PanelEmptyState,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import {
    fetchAdminListings,
    updateAdminListingStatus,
    type AdminListingSnapshot,
    type AdminListingStatus,
    type AdminSessionUser,
} from '@/lib/api';

const VERTICAL_OPTIONS = [
    { value: 'all', label: 'Autos y Propiedades' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
];

const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activas' },
    { value: 'paused', label: 'Pausadas' },
    { value: 'draft', label: 'Borradores' },
    { value: 'sold', label: 'Vendidas / cerradas' },
    { value: 'archived', label: 'Archivadas' },
];

const MODERATION_STATUS_OPTIONS: Array<{ value: 'active' | 'paused' | 'draft' | 'sold' | 'archived'; label: string }> = [
    { value: 'active', label: 'Activa' },
    { value: 'paused', label: 'Pausada' },
    { value: 'draft', label: 'Borrador' },
    { value: 'sold', label: 'Vendida' },
    { value: 'archived', label: 'Archivada' },
];

const SECTION_LABELS: Record<string, string> = {
    sale: 'Venta',
    rent: 'Arriendo',
    auction: 'Subasta',
    project: 'Proyecto',
};

function statusBadge(status: AdminListingStatus): { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' } {
    if (status === 'active' || status === 'published') return { label: 'Activa', tone: 'success' };
    if (status === 'paused') return { label: 'Pausada', tone: 'warning' };
    if (status === 'sold' || status === 'rented') return { label: 'Cerrada', tone: 'info' };
    if (status === 'archived') return { label: 'Archivada', tone: 'neutral' };
    return { label: 'Borrador', tone: 'neutral' };
}

export function AdminListingsDashboard({ currentUser }: { currentUser: AdminSessionUser }) {
    const [items, setItems] = useState<AdminListingSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [vertical, setVertical] = useState<'all' | 'autos' | 'propiedades'>(() => (
        currentUser.role !== 'superadmin' && (currentUser.primaryVertical === 'autos' || currentUser.primaryVertical === 'propiedades')
            ? currentUser.primaryVertical
            : 'all'
    ));
    const [statusFilter, setStatusFilter] = useState('all');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setItems(await fetchAdminListings());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar las publicaciones.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        return items.filter((item) => {
            if (vertical !== 'all' && item.vertical !== vertical) return false;
            if (statusFilter !== 'all') {
                if (statusFilter === 'active' && item.status !== 'active' && item.status !== 'published') return false;
                if (statusFilter !== 'active' && item.status !== statusFilter) return false;
            }
            if (needle) {
                const text = `${item.title} ${item.ownerName} ${item.ownerEmail} ${item.href ?? ''} ${item.price ?? ''}`.toLowerCase();
                if (!text.includes(needle)) return false;
            }
            return true;
        });
    }, [deferredQuery, items, statusFilter, vertical]);

    const stats = useMemo(() => ({
        total: items.length,
        active: items.filter((item) => item.status === 'active' || item.status === 'published').length,
        pausedOrDraft: items.filter((item) => item.status === 'paused' || item.status === 'draft').length,
        autos: items.filter((item) => item.vertical === 'autos').length,
        propiedades: items.filter((item) => item.vertical === 'propiedades').length,
    }), [items]);

    const changeStatus = async (listingId: string, nextStatus: 'active' | 'paused' | 'draft' | 'sold' | 'archived') => {
        setBusyId(listingId);
        setError('');
        setFeedback('');
        try {
            const res = await updateAdminListingStatus(listingId, nextStatus);
            setItems((current) => current.map((item) => (
                item.id === listingId ? { ...item, status: res.status, updatedAt: Date.now() } : item
            )));
            setFeedback('Estado de la publicación actualizado.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cambiar el estado de la publicación.');
        } finally {
            setBusyId(null);
        }
    };

    const scopedVertical = currentUser.role !== 'superadmin' && currentUser.primaryVertical
        ? currentUser.primaryVertical
        : null;

    return (
        <div className="container-app panel-page space-y-5 py-6">
            <PanelPageHeader
                title="Publicaciones"
                description={scopedVertical
                    ? `Moderación de avisos en Simple${scopedVertical === 'autos' ? 'Autos' : 'Propiedades'}.`
                    : 'Revisión y moderación de avisos publicados en SimpleAutos y SimplePropiedades.'}
                actions={(
                    <PanelButton variant="secondary" onClick={() => void load()} disabled={loading}>
                        <IconRefresh size={16} /> Actualizar
                    </PanelButton>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PanelStatCard label="Total avisos" value={String(stats.total)} meta="En catálogo" icon={<IconBuildingStore size={17} />} />
                <PanelStatCard label="Activas" value={String(stats.active)} meta="Visibles al público" icon={<IconCheck size={17} />} />
                <PanelStatCard label="Pausadas / borrador" value={String(stats.pausedOrDraft)} meta="Fuera de vitrina" icon={<IconPlayerPause size={17} />} />
                <PanelStatCard
                    label="Distribución"
                    value={`${stats.autos} / ${stats.propiedades}`}
                    meta="Autos · Propiedades"
                    icon={stats.autos >= stats.propiedades ? <IconCar size={17} /> : <IconHome size={17} />}
                />
            </div>

            <PanelCard className="p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
                    <div className="relative">
                        <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar por título, slug, titular o correo..."
                            className="form-input pl-9"
                        />
                    </div>
                    <ModernSelect
                        value={vertical}
                        onChange={(value) => setVertical(value as 'all' | 'autos' | 'propiedades')}
                        options={VERTICAL_OPTIONS}
                        disabled={scopedVertical === 'autos' || scopedVertical === 'propiedades'}
                        ariaLabel="Filtrar por plataforma"
                    />
                    <ModernSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={STATUS_FILTER_OPTIONS}
                        ariaLabel="Filtrar por estado"
                    />
                </div>
            </PanelCard>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {feedback ? <PanelNotice tone="success">{feedback}</PanelNotice> : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(220px,1.5fr)_130px_110px_minmax(180px,1.2fr)_180px]">
                    <span>Publicación</span>
                    <span>Vertical</span>
                    <span>Estado</span>
                    <span>Titular</span>
                    <span className="text-right">Moderación</span>
                </PanelListHeader>

                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={5} /></PanelListRow>
                ) : filtered.length === 0 ? (
                    <PanelListRow className="p-6">
                        <PanelEmptyState title="Sin publicaciones" description="No hay avisos que coincidan con tu búsqueda." />
                    </PanelListRow>
                ) : (
                    filtered.map((item) => {
                        const badge = statusBadge(item.status);
                        const selectValue = item.status === 'published' ? 'active' : item.status === 'rented' ? 'sold' : item.status;
                        return (
                            <PanelListRow
                                key={item.id}
                                className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1.5fr)_130px_110px_minmax(180px,1.2fr)_180px] md:items-center"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--fg)]">{item.title}</p>
                                    <p className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">
                                        {SECTION_LABELS[item.section] ?? item.section}
                                        {item.price ? ` · ${item.price}` : ''}
                                        {item.href ? ` · /${item.href}` : ''}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                                        Actualizada {new Date(item.updatedAt).toLocaleDateString('es-CL')}
                                    </p>
                                </div>

                                <div>
                                    <PanelStatusBadge
                                        label={item.vertical === 'autos' ? 'Autos' : 'Propiedades'}
                                        tone="neutral"
                                        size="sm"
                                    />
                                </div>

                                <div>
                                    <PanelStatusBadge label={badge.label} tone={badge.tone} size="sm" />
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-[var(--fg)]">{item.ownerName}</p>
                                    <p className="truncate text-xs text-[var(--fg-muted)]">{item.ownerEmail || 'Sin correo'}</p>
                                    <Link
                                        href={`/?q=${encodeURIComponent(item.ownerEmail || item.ownerName)}&user=${encodeURIComponent(item.ownerId)}`}
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--fg)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--fg)]"
                                    >
                                        <IconUserSearch size={12} /> Abrir ficha
                                    </Link>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-36">
                                        <ModernSelect
                                            value={selectValue}
                                            onChange={(value) => void changeStatus(item.id, value as 'active' | 'paused' | 'draft' | 'sold' | 'archived')}
                                            options={MODERATION_STATUS_OPTIONS}
                                            disabled={busyId === item.id}
                                            ariaLabel={`Cambiar estado de ${item.title}`}
                                        />
                                    </div>
                                </div>
                            </PanelListRow>
                        );
                    })
                )}
            </PanelList>
        </div>
    );
}
