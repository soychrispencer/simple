'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelFilterChip } from '@simple/ui/panel';
import { IconCalendar, IconCheck, IconClock, IconCurrencyDollar, IconMapPin, IconPlus, IconSearch, IconPencil } from '@tabler/icons-react';
import { needsClosure } from '@/lib/serenata-dates';
import { type Profiles, type Serenata, type SerenataGroup, type SerenataPackage } from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { EmptyBlock, FieldDate, FieldInput, money, SerenataAgendaCard, toInputDate } from './shared';
import { SerenataClosureActions, SerenataPastDateNotice } from './serenata-closure-actions';
import { SerenataSetlistPanel } from './serenata-setlist-panel';
import { SerenataCreateModal, SerenataForm } from './serenatas-view';

type AgendaFilter = 'all' | 'pending' | 'scheduled' | 'completed' | 'to_close';

export function AgendaView({
    mode,
    ownerFeaturesEnabled: ownerFeatures,
    profiles,
    date,
    setDate,
    items,
    groups,
    packages,
    refresh,
    refreshAgenda,
    agendaLoading,
    onEdit,
    action,
    clearAction,
    closurePendingTotal = 0,
}: {
    mode: AppMode;
    ownerFeaturesEnabled: boolean;
    profiles: Profiles;
    date: string;
    setDate: (date: string) => void;
    items: Serenata[];
    groups: SerenataGroup[];
    packages: SerenataPackage[];
    refresh: () => Promise<void>;
    refreshAgenda?: () => Promise<void>;
    agendaLoading?: boolean;
    onEdit?: (id: string) => void;
    action?: string | null;
    clearAction?: () => void;
    closurePendingTotal?: number;
}) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<AgendaFilter>(mode === 'work' && !ownerFeatures ? 'scheduled' : 'all');
    const [editingSerenata, setEditingSerenata] = useState<Serenata | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        if (!ownerFeatures || action !== 'create') return;
        setCreateOpen(true);
        clearAction?.();
    }, [action, clearAction, ownerFeatures]);

    async function handleSerenataSaved(item: Serenata) {
        const eventYmd = toInputDate(item.eventDate);
        if (eventYmd) setDate(eventYmd);
        await refresh();
        await refreshAgenda?.();
    }
    const scheduled = items.filter((item) => item.status === 'scheduled');
    const pending = items.filter((item) => item.status === 'pending' || item.status === 'accepted_pending_group' || item.status === 'payment_pending');
    const completed = items.filter((item) => item.status === 'completed');
    const toClose = items.filter(needsClosure);
    const earningsItems = ownerFeatures
        ? items.filter((item) => item.status === 'scheduled' || item.status === 'completed')
        : items.filter((item) => !['cancelled', 'rejected', 'expired'].includes(item.status));
    const expectedEarnings = earningsItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const filteredItems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return items.filter((item) => {
            const matchesFilter = filter === 'all'
                || (filter === 'pending' ? pending.some((entry) => entry.id === item.id) : false)
                || (filter === 'to_close' ? needsClosure(item) : false)
                || (filter !== 'pending' && filter !== 'to_close' ? item.status === filter : false);
            const matchesQuery = !normalizedQuery
                || item.recipientName.toLowerCase().includes(normalizedQuery)
                || item.address.toLowerCase().includes(normalizedQuery)
                || (item.comuna ?? '').toLowerCase().includes(normalizedQuery);
            return matchesFilter && matchesQuery;
        });
    }, [filter, items, pending, query]);

    return (
        <div className="grid gap-5">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {ownerFeatures ? (
                        <PanelButton className="shrink-0" onClick={() => setCreateOpen(true)}>
                            <IconPlus size={15} />
                            Agregar serenata
                        </PanelButton>
                    ) : null}
                    <div className="grid w-full min-w-0 max-w-full gap-3 sm:ml-auto sm:max-w-xl sm:grid-cols-[180px_minmax(0,1fr)]">
                        <FieldDate
                            value={date}
                            onChange={setDate}
                            disabled={agendaLoading}
                            aria-label="Fecha de la agenda"
                        />
                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={18} />
                            <FieldInput className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar serenata..." />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <PanelFilterChip active={filter === 'all'} label="Todas" count={items.length} onClick={() => setFilter('all')} />
                    <PanelFilterChip active={filter === 'pending'} label="Pendientes" count={pending.length} onClick={() => setFilter('pending')} />
                    <PanelFilterChip active={filter === 'scheduled'} label="Confirmadas" count={scheduled.length} onClick={() => setFilter('scheduled')} />
                    <PanelFilterChip active={filter === 'completed'} label="Completadas" count={completed.length} onClick={() => setFilter('completed')} />
                    {ownerFeatures ? (
                        <PanelFilterChip
                            active={filter === 'to_close'}
                            label="Por cerrar"
                            count={toClose.length}
                            badgeTotal={closurePendingTotal > toClose.length ? closurePendingTotal : undefined}
                            onClick={() => setFilter('to_close')}
                        />
                    ) : null}
                </div>

                <PanelCard className="mt-6 min-h-55">
                    {filteredItems.length === 0 ? (
                        <div className="flex min-h-42.5 flex-col items-center justify-center text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-bg-subtle text-fg">
                                <IconCalendar size={31} />
                            </div>
                            <EmptyBlock
                                title="No hay serenatas en tu agenda"
                                description={
                                    query
                                        ? 'Prueba con otra búsqueda o filtro.'
                                        : ownerFeatures
                                            ? 'Registra una serenata propia o revisa otra fecha.'
                                            : 'Cuando tengas serenatas, aparecerán aquí.'
                                }
                            />
                            {ownerFeatures ? (
                                <PanelButton className="mt-4" onClick={() => setCreateOpen(true)}>
                                    <IconPlus size={15} />
                                    Agregar serenata
                                </PanelButton>
                            ) : null}
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {filteredItems.map((item) => (
                                <AgendaTimelineItem
                                    key={item.id}
                                    item={item}
                                    ownerFeaturesEnabled={ownerFeatures}
                                    refresh={refresh}
                                    onEdit={ownerFeatures ? setEditingSerenata : undefined}
                                />
                            ))}
                            {ownerFeatures ? (
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(true)}
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-border py-5 text-sm font-medium text-fg-muted transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
                                >
                                    <IconPlus size={16} />
                                    Agregar serenata
                                </button>
                            ) : null}
                        </div>
                    )}
                </PanelCard>
            </div>

            <PanelCard className="content-start">
                <h3 className="text-base font-semibold text-fg">Resumen</h3>
                <div className="mt-5 grid gap-5">
                    <AgendaSummaryRow icon={<IconCalendar size={20} />} label="Total" value={`${items.length} serenatas`} accent />
                    <AgendaSummaryRow icon={<IconCheck size={20} />} label="Confirmadas" value={String(scheduled.length)} />
                    <AgendaSummaryRow icon={<IconClock size={20} />} label="Pendientes" value={String(pending.length)} />
                    {ownerFeatures ? (
                        <div className="rounded-2xl bg-accent-soft p-4 text-accent">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <IconCurrencyDollar size={18} />
                                Ganancias esperadas
                            </div>
                            <p className="mt-3 text-3xl font-bold">{money(expectedEarnings)}</p>
                        </div>
                    ) : (
                        <AgendaSummaryRow icon={<IconCalendar size={20} />} label="Eventos del día" value={`${filteredItems.length} en agenda`} accent />
                    )}
                </div>
            </PanelCard>

            {editingSerenata ? (
                <SerenataCreateModal onClose={() => setEditingSerenata(null)}>
                    <SerenataForm
                        title="Editar serenata"
                        item={editingSerenata}
                        groups={groups}
                        refresh={refresh}
                        onDone={async (item) => {
                            await handleSerenataSaved(item);
                            setEditingSerenata(null);
                        }}
                        onCancel={() => setEditingSerenata(null)}
                        modal
                    />
                </SerenataCreateModal>
            ) : null}

            {createOpen ? (
                <SerenataCreateModal onClose={() => setCreateOpen(false)}>
                    <SerenataForm
                        title="Nueva serenata"
                        groups={groups}
                        refresh={refresh}
                        onDone={async (item) => {
                            await handleSerenataSaved(item);
                            setCreateOpen(false);
                        }}
                        onCancel={() => setCreateOpen(false)}
                        modal
                    />
                </SerenataCreateModal>
            ) : null}
        </div>
        </div>
    );
}

function AgendaTimelineItem({
    item,
    ownerFeaturesEnabled: ownerFeatures,
    refresh,
    onEdit,
}: {
    item: Serenata;
    ownerFeaturesEnabled: boolean;
    refresh: () => Promise<void>;
    onEdit?: (item: Serenata) => void;
}) {
    const mapQuery = item.lat && item.lng ? `${item.lat},${item.lng}` : item.address;

    return (
        <SerenataAgendaCard
            item={item}
            showPrice={ownerFeatures}
            actions={
                <>
                    {onEdit ? (
                        <PanelButton size="sm" variant="secondary" onClick={() => onEdit(item)}>
                            <IconPencil size={13} />
                            Editar
                        </PanelButton>
                    ) : null}
                    <a
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-fg"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <IconMapPin size={14} />
                        Mapa
                    </a>
                    {ownerFeatures ? <SerenataClosureActions item={item} refresh={refresh} inline /> : null}
                </>
            }
            footer={
                ownerFeatures ? (
                    <SerenataPastDateNotice item={item} />
                ) : (
                    <SerenataSetlistPanel serenata={item} mode="musician" refresh={refresh} />
                )
            }
        />
    );
}

function AgendaSummaryRow({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
    return (
        <div className="flex items-center gap-4">
            <div
                className={`flex size-12 items-center justify-center rounded-xl ${
                    accent ? 'bg-accent-soft text-accent' : 'text-fg'
                }`}
            >
                {icon}
            </div>
            <div>
                <p className="text-sm text-fg-muted">{label}</p>
                <p className="mt-0.5 text-lg font-semibold text-fg">{value}</p>
            </div>
        </div>
    );
}
