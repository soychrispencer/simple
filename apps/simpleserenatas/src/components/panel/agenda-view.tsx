'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { PanelButton, PanelCard, PanelStatusBadge } from '@simple/ui';
import { IconCalendar, IconCheck, IconClock, IconCurrencyDollar, IconLoader2, IconMapPin, IconSearch, IconX, IconPencil } from '@tabler/icons-react';
import { type Serenata, type SerenataGroup, type SerenataPackage, serenatasApi } from '@/lib/serenatas-api';
import { EmptyBlock, FieldInput, formatDate, money, serenataStatusLabel, serenataStatusTone } from './shared';
import { SerenataCreateModal, SerenataForm } from './serenatas-view';

type AgendaFilter = 'all' | 'pending' | 'scheduled' | 'completed';

export function AgendaView({ date, setDate, items, groups, packages, refresh, onEdit }: { date: string; setDate: (date: string) => void; items: Serenata[]; groups: SerenataGroup[]; packages: SerenataPackage[]; refresh: () => Promise<void>; onEdit?: (id: string) => void }) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<AgendaFilter>('all');
    const [editingSerenata, setEditingSerenata] = useState<Serenata | null>(null);
    const scheduled = items.filter((item) => item.status === 'scheduled');
    const pending = items.filter((item) => item.status === 'pending' || item.status === 'accepted_pending_group' || item.status === 'payment_pending');
    const completed = items.filter((item) => item.status === 'completed');
    const activeItems = items.filter((item) => !['cancelled', 'rejected', 'expired'].includes(item.status));
    const expectedEarnings = activeItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const filteredItems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return items.filter((item) => {
            const matchesFilter = filter === 'all'
                || (filter === 'pending' ? pending.some((entry) => entry.id === item.id) : item.status === filter);
            const matchesQuery = !normalizedQuery
                || item.recipientName.toLowerCase().includes(normalizedQuery)
                || item.address.toLowerCase().includes(normalizedQuery)
                || (item.comuna ?? '').toLowerCase().includes(normalizedQuery);
            return matchesFilter && matchesQuery;
        });
    }, [filter, items, pending, query]);

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Agenda</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{items.length} serenatas programadas</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[180px_minmax(240px,340px)]">
                        <FieldInput type="date" value={date} onChange={(event) => setDate(event.target.value)} onBlur={() => void refresh()} />
                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--fg-muted)' }} />
                            <FieldInput className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar serenata..." />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <AgendaFilterButton active={filter === 'all'} label="Todas" count={items.length} onClick={() => setFilter('all')} />
                    <AgendaFilterButton active={filter === 'pending'} label="Pendientes" count={pending.length} onClick={() => setFilter('pending')} />
                    <AgendaFilterButton active={filter === 'scheduled'} label="Confirmadas" count={scheduled.length} onClick={() => setFilter('scheduled')} />
                    <AgendaFilterButton active={filter === 'completed'} label="Completadas" count={completed.length} onClick={() => setFilter('completed')} />
                </div>

                <PanelCard className="mt-6 min-h-[220px]">
                    {filteredItems.length === 0 ? (
                        <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                                <IconCalendar size={31} />
                            </div>
                            <EmptyBlock title="No hay serenatas en tu agenda" description={query ? 'Prueba con otra búsqueda o filtro.' : 'Cuando tengas serenatas, aparecerán aquí.'} />
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {filteredItems.map((item) => <AgendaTimelineItem key={item.id} item={item} refresh={refresh} onEdit={setEditingSerenata} />)}
                        </div>
                    )}
                </PanelCard>
            </div>

            <PanelCard className="content-start">
                <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Resumen</h3>
                <div className="mt-5 grid gap-5">
                    <AgendaSummaryRow icon={<IconCalendar size={20} />} label="Total" value={`${items.length} serenatas`} accent />
                    <AgendaSummaryRow icon={<IconCheck size={20} />} label="Confirmadas" value={String(scheduled.length)} />
                    <AgendaSummaryRow icon={<IconClock size={20} />} label="Pendientes" value={String(pending.length)} />
                    <div className="rounded-2xl p-4" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <IconCurrencyDollar size={18} />
                            Ganancias esperadas
                        </div>
                        <p className="mt-3 text-3xl font-bold">{money(expectedEarnings)}</p>
                    </div>
                </div>
            </PanelCard>

            {editingSerenata ? (
                <SerenataCreateModal onClose={() => setEditingSerenata(null)}>
                    <SerenataForm
                        title="Editar serenata"
                        item={editingSerenata}
                        groups={groups}
                        packages={packages}
                        refresh={refresh}
                        onDone={() => setEditingSerenata(null)}
                        onCancel={() => setEditingSerenata(null)}
                        modal
                    />
                </SerenataCreateModal>
            ) : null}
        </div>
    );
}

function AgendaTimelineItem({ item, refresh, onEdit }: { item: Serenata; refresh: () => Promise<void>; onEdit?: (item: Serenata) => void }) {
    const [loadingAction, setLoadingAction] = useState<'complete' | 'cancel' | null>(null);

    async function updateStatus(action: 'complete' | 'cancel') {
        setLoadingAction(action);
        const response = await serenatasApi.updateSerenataStatus(item.id, action);
        setLoadingAction(null);
        if (response.ok) await refresh();
    }

    return (
        <div className="grid gap-4 border-b py-4 last:border-b-0 md:grid-cols-[86px_minmax(0,1fr)_auto]" style={{ borderColor: 'var(--border)' }}>
            <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{item.eventTime}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{formatDate(item.eventDate)}</p>
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold" style={{ color: 'var(--fg)' }}>{item.recipientName}</p>
                    <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} size="sm" />
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{item.comuna ?? 'Sin comuna'} · {item.address}</p>
                {item.groupId ? <p className="mt-1 text-xs" style={{ color: 'var(--accent)' }}>Grupo asignado</p> : null}
            </div>
            <div className="text-left md:text-right">
                <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{money(item.price)}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{item.duration} min</p>
                <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                    {onEdit ? (
                        <PanelButton size="sm" variant="secondary" onClick={() => onEdit(item)}>
                            <IconPencil size={13} />
                            Editar
                        </PanelButton>
                    ) : null}
                    <a className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.lat && item.lng ? `${item.lat},${item.lng}` : item.address)}`} target="_blank" rel="noreferrer" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>
                        <IconMapPin size={14} />
                        Mapa
                    </a>
                    {item.status === 'scheduled' ? (
                        <>
                            <PanelButton size="sm" variant="secondary" disabled={loadingAction != null} onClick={() => void updateStatus('complete')}>
                                {loadingAction === 'complete' ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                Completar
                            </PanelButton>
                            <PanelButton size="sm" variant="secondary" disabled={loadingAction != null} onClick={() => void updateStatus('cancel')}>
                                {loadingAction === 'cancel' ? <IconLoader2 size={13} className="animate-spin" /> : <IconX size={13} />}
                                Cancelar
                            </PanelButton>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function AgendaFilterButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-11 items-center gap-3 rounded-2xl px-5 py-2 text-sm font-semibold transition-colors"
            style={{ background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--fg)' }}
        >
            {label}
            <span className="min-w-6 rounded-full px-2 py-0.5 text-center text-xs" style={{ background: active ? 'rgba(255,255,255,0.22)' : 'var(--bg-muted)', color: active ? '#fff' : 'var(--fg-muted)' }}>{count}</span>
        </button>
    );
}

function AgendaSummaryRow({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
    return (
        <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl" style={{ background: accent ? 'var(--accent-soft)' : 'transparent', color: accent ? 'var(--accent)' : 'var(--fg)' }}>
                {icon}
            </div>
            <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                <p className="mt-0.5 text-lg font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            </div>
        </div>
    );
}
