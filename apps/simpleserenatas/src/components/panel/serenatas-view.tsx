'use client';

import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ListingLocationEditor } from '@simple/ui';
import { PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { applyAddressBookEntryToLocation, type AddressBookEntry, type ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { IconCheck, IconClock, IconLoader2, IconMapPin, IconPencil, IconPlus, IconUsers, IconX } from '@tabler/icons-react';
import { type MusicianDirectoryItem, type ProviderGroupMember, type Serenata, type SerenataGroup, type SerenataPackage, type SerenataPackageCode, serenatasApi } from '@/lib/serenatas-api';
import { isOwnerSolicitudesInbox, isPendingSerenataAction } from '@/lib/serenata-pending';
import { SerenataClosureActions } from './serenata-closure-actions';
import { MusicianAvailabilityBadge } from './musician-availability-toggle';
import { startSerenataCheckout } from '@/lib/payments';
import { PanelSheet } from './panel-sheet';
import {
    EmptyBlock,
    FieldInput,
    FieldSelect,
    FieldTextarea,
    FormFeedback,
    SerenataRow,
    cleanSerenataAddress,
    formatDate,
    formatShortSerenataDate,
    money,
    serenataLocation,
    serenataStatusLabel,
    serenataStatusTone,
    today,
    toInputDate,
    type FormStatus,
} from './shared';

type PanelActionProps = {
    action?: string | null;
    clearAction?: () => void;
};

const SERENATA_OCCASIONS = [
    'Cumpleaños',
    'Aniversario',
    'Reconciliación',
    'Bienvenida',
    'Despedida',
    'Graduación',
    'Matrimonio',
    'Pedida de matrimonio',
    'Quince años',
    'Día de la Madre',
    'Día del Padre',
    'Día del Amor',
    'Baby shower',
    'Homenaje',
    'Funeral',
    'Otro',
];

function requiredMusiciansForPackage(code: SerenataPackageCode | null) {
    if (code === 'duo') return 2;
    if (code === 'trio') return 3;
    if (code === 'cuarteto') return 4;
    if (code === 'quinteto') return 5;
    return 3;
}

export function MusicianSerenatasView({ serenatas }: { serenatas: Serenata[] }) {
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;
    const completedCount = serenatas.filter((item) => item.status === 'completed').length;

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="type-section-title text-fg">Serenatas en tus grupos</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Eventos asignados a grupos donde participas o fuiste invitado.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ClientMetric label="Asignadas" value={serenatas.length} />
                <ClientMetric label="Confirmadas" value={scheduledCount} />
                <ClientMetric label="Completadas" value={completedCount} />
            </div>

            <div className="mt-5 grid gap-3">
                {serenatas.length === 0
                    ? (
                        <EmptyBlock
                            title="Sin serenatas asignadas"
                            description="Cuando un grupo te incluya en una serenata programada, aparecerá aquí."
                        />
                    )
                    : serenatas.map((item) => <SerenataRow key={item.id} item={item} />)}
            </div>
        </PanelCard>
    );
}

function ClientPendingCancelPrompt({ item, refresh }: { item: Serenata; refresh: () => Promise<void> }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    if (item.status !== 'pending') return null;

    async function cancel() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.cancelClientSerenata(item.id);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos cancelar la solicitud.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Solicitud cancelada.' });
        await refresh();
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            <PanelButton variant="secondary" disabled={status.loading} onClick={() => void cancel()}>
                Cancelar solicitud
            </PanelButton>
            <FormFeedback status={status} />
        </div>
    );
}

function ClientSerenataConfirmPrompt({ item, refresh }: { item: Serenata; refresh: () => Promise<void> }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    if (item.status !== 'completed' || item.clientConfirmedAt) return null;

    async function confirm() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.confirmClientSerenata(item.id);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos confirmar la serenata.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Gracias por confirmar tu serenata.' });
        await refresh();
    }

    return (
        <div className="mt-3 rounded-xl border border-accent-border bg-accent-soft p-3">
            <p className="text-sm font-semibold text-fg">¿Se realizó la serenata?</p>
            <p className="mt-1 text-xs text-fg-muted">Confirma para cerrar el seguimiento de este evento.</p>
            <FormFeedback status={status} />
            <PanelButton className="mt-3 w-full" size="sm" disabled={status.loading} onClick={() => void confirm()}>
                {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                Confirmar que se realizó
            </PanelButton>
        </div>
    );
}

export function ClientSerenatasView({ serenatas, refresh, onContract }: { serenatas: Serenata[]; refresh: () => Promise<void>; onContract?: () => void } & PanelActionProps) {
    const pendingCount = serenatas.filter((item) => item.status === 'payment_pending' || item.status === 'pending' || item.status === 'accepted_pending_group').length;
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="type-section-title text-fg">Historial de serenatas</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Revisa el estado de las serenatas que contrataste desde tu cuenta.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ClientMetric label="Contratadas" value={serenatas.length} />
                <ClientMetric label="En proceso" value={pendingCount} />
                <ClientMetric label="Confirmadas" value={scheduledCount} />
            </div>

            <div className="mt-5 grid gap-3">
                {serenatas.length === 0
                    ? (
                        <div className="rounded-xl border border-border bg-bg-subtle p-5 text-center">
                            <EmptyBlock title="Sin serenatas contratadas" description="Cuando contrates una serenata, verás aquí su seguimiento." />
                            {onContract ? (
                                <PanelButton className="mt-4" onClick={onContract}>
                                    <IconPlus size={15} />
                                    Contratar serenata
                                </PanelButton>
                            ) : null}
                        </div>
                    )
                    : serenatas.map((item) => (
                        <div key={item.id}>
                            <SerenataRow item={item} context="client" />
                            <ClientPendingCancelPrompt item={item} refresh={refresh} />
                            <ClientSerenataConfirmPrompt item={item} refresh={refresh} />
                        </div>
                    ))}
            </div>
        </PanelCard>
    );
}

function ClientMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <p className="text-2xl font-semibold text-[var(--fg)]">{value}</p>
            <p className="text-sm text-fg-muted">{label}</p>
        </div>
    );
}

/** @deprecated Flujo por paquetes legacy; usar marketplace (`grupos` → solicitar). */
export function ContractSerenataView({
    onExploreGroups,
}: {
    contactPhone?: string;
    refresh?: () => Promise<void>;
    onExploreGroups?: () => void;
}) {
    return (
        <PanelCard>
            <PanelNotice tone="neutral">
                El contrato por paquetes ya no está disponible. Explora grupos de mariachis y envía tu solicitud
                directamente al grupo que elijas.
            </PanelNotice>
            {onExploreGroups ? (
                <PanelButton className="mt-4" onClick={onExploreGroups}>
                    Contratar serenata
                </PanelButton>
            ) : null}
        </PanelCard>
    );
}

type SerenataFilter = 'all' | Serenata['status'] | 'closed';
type SerenataOriginFilter = 'all' | Serenata['source'];
type SerenataMode = 'detail' | 'edit' | 'assignGroup';

export function SerenatasView({ serenatas, groups, musicians, selectedSerenataId, action, clearAction, refresh, isSolicitudesMode = false, onAgendaDeepLink }: { serenatas: Serenata[]; groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; selectedSerenataId?: string | null; refresh: () => Promise<void>; isSolicitudesMode?: boolean; onAgendaDeepLink?: (serenataId: string) => void } & PanelActionProps) {
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState<SerenataFilter>('all');
    const [originFilter, setOriginFilter] = useState<SerenataOriginFilter>('all');
    const [selectedId, setSelectedId] = useState<string | null>(serenatas[0]?.id ?? null);
    const [mode, setMode] = useState<SerenataMode>('detail');
    const [createOpen, setCreateOpen] = useState(false);
    const [packages, setPackages] = useState<SerenataPackage[]>([]);
    const inboxCount = serenatas.filter(isOwnerSolicitudesInbox).length;
    const selected = serenatas.find((item) => item.id === selectedId) ?? serenatas[0] ?? null;
    const filtered = serenatas.filter((item) => {
        const matchesStatus = filter === 'all'
            ? (isSolicitudesMode ? isOwnerSolicitudesInbox(item) : true)
            : (filter === 'closed'
                ? ['cancelled', 'rejected', 'expired'].includes(item.status)
                : filter === 'pending'
                    ? item.status === 'pending' || item.status === 'pending_open' || isPendingSerenataAction(item)
                    : item.status === filter);
        const matchesOrigin = originFilter === 'all' || item.source === originFilter;
        return matchesStatus && matchesOrigin;
    });
    const pendingCount = serenatas.filter((item) => item.status === 'pending' || item.status === 'pending_open' || isPendingSerenataAction(item)).length;
    const expiredCount = serenatas.filter((item) => item.status === 'expired').length;
    const needsGroupCount = serenatas.filter((item) => item.status === 'accepted_pending_group').length;
    const closedCount = serenatas.filter((item) => ['cancelled', 'rejected', 'expired'].includes(item.status)).length;
    const ownCount = serenatas.filter((item) => item.source === 'own_lead').length;
    const appCount = serenatas.filter((item) => item.source === 'platform_lead').length;

    useEffect(() => {
        if (serenatas.length === 0) {
            setSelectedId(null);
            setMode('detail');
            return;
        }
        if (!selectedId || !serenatas.some((item) => item.id === selectedId)) {
            setSelectedId(serenatas[0].id);
            setMode('detail');
        }
    }, [selectedId, serenatas]);

    useEffect(() => {
        const urlFilter = searchParams.get('filter');
        if (isSolicitudesMode && (urlFilter === 'scheduled' || urlFilter === 'completed')) {
            const serenataId = searchParams.get('serenata');
            if (serenataId && onAgendaDeepLink) {
                onAgendaDeepLink(serenataId);
            }
            return;
        }
        if (
            urlFilter === 'all'
            || urlFilter === 'pending'
            || urlFilter === 'pending_open'
            || urlFilter === 'accepted_pending_group'
            || urlFilter === 'closed'
            || (!isSolicitudesMode && (urlFilter === 'scheduled' || urlFilter === 'completed'))
        ) {
            setFilter(urlFilter);
        }
    }, [isSolicitudesMode, onAgendaDeepLink, searchParams]);

    useEffect(() => {
        if (!isSolicitudesMode || !selectedSerenataId || !onAgendaDeepLink) return;
        if (serenatas.some((item) => item.id === selectedSerenataId)) return;
        onAgendaDeepLink(selectedSerenataId);
    }, [isSolicitudesMode, onAgendaDeepLink, selectedSerenataId, serenatas]);

    useEffect(() => {
        if (action !== 'create') return;
        setCreateOpen(true);
        clearAction?.();
    }, [action, clearAction]);

    useEffect(() => {
        if (!selectedSerenataId || !serenatas.some((item) => item.id === selectedSerenataId)) return;
        setSelectedId(selectedSerenataId);
        setFilter('all');
        setOriginFilter('all');
        setMode('detail');
    }, [selectedSerenataId, serenatas]);

    useEffect(() => {
        let active = true;
        void serenatasApi.packages().then((response) => {
            if (active && response.ok) setPackages(response.items);
        });
        return () => {
            active = false;
        };
    }, []);

    return (
        <>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(380px,0.95fr)_minmax(560px,1.05fr)]">
                <PanelCard size="lg" className="min-w-0 xl:min-h-[680px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="type-section-title text-[var(--fg)]">{isSolicitudesMode ? 'Solicitudes' : 'Serenatas'}</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            {isSolicitudesMode
                                ? (inboxCount === 0
                                    ? 'No hay solicitudes por revisar'
                                    : `${filtered.length} solicitud${filtered.length === 1 ? '' : 'es'} por revisar`)
                                : `${serenatas.length} registros entre propias y aplicación`}
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <PanelField label="Estado">
                            <FieldSelect value={filter} onChange={(event) => setFilter(event.target.value as SerenataFilter)}>
                                <option value="all">
                                    {isSolicitudesMode ? `Por revisar (${inboxCount})` : `Todas (${serenatas.length})`}
                                </option>
                                <option value="pending">Pendientes ({pendingCount})</option>
                                {isSolicitudesMode ? <option value="expired">Expiradas ({expiredCount})</option> : null}
                                <option value="accepted_pending_group">Falta grupo ({needsGroupCount})</option>
                                {!isSolicitudesMode ? (
                                    <>
                                        <option value="scheduled">Programadas</option>
                                        <option value="completed">Completadas</option>
                                    </>
                                ) : null}
                                <option value="closed">Cerradas ({closedCount})</option>
                            </FieldSelect>
                        </PanelField>
                        <PanelField label="Origen">
                            <FieldSelect value={originFilter} onChange={(event) => setOriginFilter(event.target.value as SerenataOriginFilter)}>
                                <option value="all">Todo origen ({serenatas.length})</option>
                                <option value="own_lead">Propias ({ownCount})</option>
                                <option value="platform_lead">Aplicación ({appCount})</option>
                            </FieldSelect>
                        </PanelField>
                </div>

                <div className="mt-6 grid gap-4">
                    {filtered.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center border-border">
                            <EmptyBlock
                                title={isSolicitudesMode
                                    ? (filter === 'all' ? 'No hay solicitudes por revisar' : 'Sin solicitudes con este filtro')
                                    : 'Sin serenatas'}
                                description={isSolicitudesMode
                                    ? (filter === 'all'
                                        ? 'Las serenatas confirmadas aparecen en Agenda. Cuando llegue una nueva solicitud del marketplace, la verás aquí.'
                                        : 'Prueba otro estado u origen, o espera nuevas solicitudes del marketplace.')
                                    : 'Crea una serenata propia para empezar.'}
                            />
                            <PanelButton className="mt-6" onClick={() => setCreateOpen(true)}>
                                <IconPlus size={15} />
                                Nueva serenata
                            </PanelButton>
                        </div>
                    ) : (
                        <>
                            {filtered.map((item) => {
                                const needsGroup = item.status === 'accepted_pending_group' && !item.groupId;
                                return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(item.id);
                                        setMode(needsGroup ? 'assignGroup' : 'detail');
                                    }}
                                    className={`group w-full rounded-card border p-5 text-left transition-all hover:shadow-md ${
                                        selected?.id === item.id || needsGroup
                                            ? 'border-accent bg-accent-soft'
                                            : 'border-border bg-surface'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-base font-bold text-[var(--fg)]">{item.recipientName}</p>
                                                <SerenataSourceBadge source={item.source} size="sm" />
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                                                <span className="flex items-center gap-1.5">
                                                    <IconClock size={15} className="shrink-0" />
                                                    {formatShortSerenataDate(item)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <IconMapPin size={15} className="shrink-0" />
                                                    {item.comuna ?? 'Sin comuna'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-accent">{money(item.price)}</p>
                                            <div className="mt-2 flex flex-col items-end gap-2">
                                                <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} size="sm" />
                                                {needsGroup ? (
                                                    <span className="text-xs font-semibold text-accent">Asignar grupo →</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-border py-6 text-sm font-medium text-fg-muted transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
                            >
                                <IconPlus size={16} />
                                Nueva serenata
                            </button>
                        </>
                    )}
                </div>
                </PanelCard>

                {mode === 'assignGroup' && selected ? (
                <SerenataGroupAssignment item={selected} groups={groups} musicians={musicians} refresh={refresh} onDone={(item) => { setSelectedId(item.id); setMode('detail'); }} onCancel={() => setMode('detail')} />
            ) : mode === 'edit' && selected ? (
                <SerenataForm title="Editar serenata" item={selected} groups={groups} packages={packages} refresh={refresh} onDone={(item) => { setSelectedId(item.id); setMode('detail'); }} onCancel={() => setMode('detail')} />
            ) : selected ? (
                <SerenataDetail item={selected} groups={groups} refresh={refresh} onEdit={() => setMode('edit')} onAssignGroup={() => setMode('assignGroup')} onCreate={() => setCreateOpen(true)} />
            ) : (
                <PanelCard size="lg">
                    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
                        <EmptyBlock title="Sin serenatas" description="Selecciona una solicitud de la lista para ver su detalle." />
                    </div>
                </PanelCard>
            )}
            </div>

            {createOpen ? (
                <SerenataCreateModal onClose={() => setCreateOpen(false)}>
                    <SerenataForm
                        title="Nueva serenata"
                        groups={groups}
                        packages={packages}
                        refresh={refresh}
                        onDone={(item) => {
                            setSelectedId(item.id);
                            setMode('detail');
                            setCreateOpen(false);
                        }}
                        onCancel={() => setCreateOpen(false)}
                        modal
                    />
                </SerenataCreateModal>
            ) : null}
        </>
    );
}

function SerenataDetail({ item, groups, refresh, onEdit, onAssignGroup, onCreate }: { item: Serenata; groups: SerenataGroup[]; refresh: () => Promise<void>; onEdit: () => void; onAssignGroup: () => void; onCreate: () => void }) {
    const group = groups.find((entry) => entry.id === item.groupId);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const isPendingApp = isPendingSerenataAction(item);
    const needsGroup = item.status === 'accepted_pending_group' && !item.groupId;
    const commission = item.source === 'platform_lead' && item.price != null ? Math.round(item.price * 0.08 * 1.19) : null;
    const net = item.price != null && commission != null ? item.price - commission : item.price;

    async function respondOffer(action: 'accept' | 'reject') {
        setStatus({ loading: true, error: null, ok: null });
        const response = action === 'accept'
            ? await serenatasApi.acceptSerenataOffer(item.id)
            : await serenatasApi.rejectSerenataOffer(item.id);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos responder esta solicitud.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: action === 'accept' ? 'Serenata aceptada. Asigna un grupo para confirmarla.' : 'Solicitud rechazada.' });
        await refresh();
        if (action === 'accept') onAssignGroup();
    }

    return (
        <PanelCard size="lg" className={`min-w-0 xl:min-h-[680px] ${isPendingApp ? 'border-[color:var(--accent-border)]' : ''}`}>
            <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between border-border">
                <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} />
                        <SerenataSourceBadge source={item.source} />
                    </div>
                    <h2 className="break-words text-2xl font-bold lg:text-3xl text-[var(--fg)]">{item.recipientName}</h2>
                    <p className="mt-2 text-sm text-fg-muted">{item.eventType ?? 'Serenata'}{group ? ` · ${group.name}` : ''}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                    <p className="text-3xl font-bold lg:text-4xl text-accent">{money(item.price)}</p>
                    <p className="mt-1 text-sm text-fg-muted">por serenata</p>
                </div>
            </div>

            {isPendingApp ? (
                <div className="mt-5 rounded-card border p-4 border-accent-border bg-accent-soft">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--fg)]">Solicitud disponible</p>
                            <p className="mt-1 text-sm text-fg-secondary">
                                Acepta solo si puedes cubrir fecha, horario y comuna. Después debes asignar un grupo para confirmarla.
                            </p>
                        </div>
                        <div className="shrink-0">
                            <PanelStatusBadge tone="info" label="Responder ahora" />
                        </div>
                    </div>
                    <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
                        <MoneyMetric label="Precio" value={item.price} strong />
                        <MoneyMetric label="Comisión 8% + IVA" value={commission} />
                        <MoneyMetric label="Estimado neto" value={net} strong />
                    </div>
                </div>
            ) : null}

            {needsGroup ? (
                <div className="mt-5 rounded-card border p-4 border-accent-border bg-accent-soft">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--fg)]">Falta asignar grupo</p>
                            <p className="mt-1 text-sm text-fg-secondary">
                                La solicitud fue aceptada; confirma la serenata cuando selecciones el equipo que la cubrirá.
                            </p>
                        </div>
                        <PanelButton onClick={onAssignGroup}>
                            <IconUsers size={15} />
                            Asignar grupo
                        </PanelButton>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-6 py-6 md:grid-cols-2">
                <SerenataDetailMetric icon={IconClock} label="Fecha y hora" title={`${formatDate(item.eventDate)} a las ${item.eventTime}`} />
                <SerenataDetailMetric icon={IconMapPin} label="Ubicación" title={item.comuna ?? 'Sin comuna'} description={item.region ?? undefined} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">Dirección</p>
                    <p className="mt-2 text-sm text-fg-secondary">{item.address}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">Contacto de coordinación</p>
                    <p className="mt-2 text-sm text-fg-secondary">{item.clientPhone ?? 'Sin teléfono'}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">Duración</p>
                    <p className="mt-2 text-sm text-fg-secondary">{item.duration} minutos</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">Servicio contratado</p>
                    <p className="mt-2 text-sm text-fg-secondary">{item.eventType ?? item.packageCode ?? 'Sin servicio definido'}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">Grupo</p>
                    <p className="mt-2 text-sm text-fg-secondary">{group?.name ?? 'Sin grupo asignado'}</p>
                </div>
            </div>

            <div className="mt-6 rounded-card border p-4 border-border bg-bg-subtle">
                <p className="text-sm font-semibold text-[var(--fg)]">Origen</p>
                <p className="mt-2 text-sm text-fg-secondary">
                    {item.source === 'own_lead'
                        ? 'Serenata propia agregada por el grupo. Costo de plataforma: $0.'
                        : 'Serenata enviada por la aplicación. Comisión aplicable: 8% + IVA.'}
                </p>
            </div>

            {item.message ? (
                <div className="mt-6 rounded-card border p-4 border-border bg-bg-subtle">
                    <p className="text-sm font-semibold text-[var(--fg)]">Mensaje</p>
                    <p className="mt-2 text-sm text-fg-secondary">{item.message}</p>
                </div>
            ) : null}

            <FormFeedback status={status} />
            <div className="sticky bottom-3 z-10 mt-6 flex flex-col gap-3 rounded-card border p-3 shadow-sm md:static md:rounded-none md:border-0 md:border-t md:p-0 md:pt-5 md:shadow-none sm:flex-row border-border bg-surface">
                {isPendingApp ? (
                    <>
                        <PanelButton className="flex-1" disabled={status.loading} onClick={() => void respondOffer('accept')}>
                            <IconCheck size={15} />
                            Aceptar solicitud
                        </PanelButton>
                        <PanelButton className="flex-1" variant="secondary" disabled={status.loading} onClick={() => void respondOffer('reject')}>
                            <IconX size={15} />
                            Rechazar
                        </PanelButton>
                    </>
                ) : (
                    <>
                        <PanelButton className="flex-1" onClick={onEdit}>
                            <IconPencil size={15} />
                            Editar
                        </PanelButton>
                        <div className="flex w-full flex-1 flex-col gap-2">
                            <SerenataClosureActions item={item} refresh={refresh} size="default" />
                        </div>
                    </>
                )}
            </div>
        </PanelCard>
    );
}

function SerenataGroupAssignment({ item, groups, musicians, refresh, onDone, onCancel }: { item: Serenata; groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; refresh: () => Promise<void>; onDone: (item: Serenata) => void; onCancel: () => void }) {
    const [providerMembers, setProviderMembers] = useState<ProviderGroupMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(Boolean(item.providerGroupId));
    const providerMusicianIds = new Set(providerMembers.map((member) => member.musicianId));
    const eligibleMusicians = item.providerGroupId
        ? musicians.filter((musician) => providerMusicianIds.has(musician.id))
        : musicians;
    const marketplaceRequest = Boolean(item.providerGroupId);
    const sameDateGroups = groups.filter((group) => toInputDate(group.date) === toInputDate(item.eventDate));
    const initialGroupId = marketplaceRequest ? '' : sameDateGroups[0]?.id ?? groups[0]?.id ?? '';
    const sortedMusicians = [...eligibleMusicians].sort((a, b) => {
        const aAvailable = a.availableNow ? 0 : 1;
        const bAvailable = b.availableNow ? 0 : 1;
        if (aAvailable !== bAvailable) return aAvailable - bAvailable;
        const aMatch = a.comuna === item.comuna || a.region === item.region ? 0 : 1;
        const bMatch = b.comuna === item.comuna || b.region === item.region ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.name.localeCompare(b.name);
    });
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [mode, setMode] = useState<'existing' | 'new'>(marketplaceRequest ? 'new' : initialGroupId ? 'existing' : 'new');
    const [groupId, setGroupId] = useState(initialGroupId);
    const [name, setName] = useState(`Grupo ${formatDate(item.eventDate)} ${item.eventTime}`);
    const [selectedMusicians, setSelectedMusicians] = useState<string[]>(() => {
        const firstAvailable = sortedMusicians.find((musician) => musician.availableNow);
        return firstAvailable ? [firstAvailable.id] : [];
    });
    useEffect(() => {
        if (!item.providerGroupId) {
            setMembersLoading(false);
            return;
        }
        let cancelled = false;
        setMembersLoading(true);
        void serenatasApi.providerGroupMembers(item.providerGroupId).then((response) => {
            if (cancelled) return;
            const active = response.ok ? response.items.filter((member) => member.status === 'active') : [];
            setProviderMembers(active);
            if (active.length > 0) {
                setSelectedMusicians(active.map((member) => member.musicianId));
            }
            setMembersLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [item.providerGroupId]);
    useEffect(() => {
        setSelectedMusicians((current) => {
            const allowed = current.filter((id) => sortedMusicians.some((musician) => musician.id === id));
            if (allowed.length > 0) return allowed;
            const firstAvailable = sortedMusicians.find((musician) => musician.availableNow) ?? sortedMusicians[0];
            return firstAvailable ? [firstAvailable.id] : [];
        });
    }, [sortedMusicians.map((musician) => musician.id).join('|')]);
    const [message, setMessage] = useState(`Serenata para ${item.recipientName} el ${formatDate(item.eventDate)} a las ${item.eventTime}.`);
    const selectedGroup = groups.find((group) => group.id === groupId);
    const selectedGroupMemberCount = selectedGroup?.members.length ?? 0;
    const requiredMusicians = requiredMusiciansForPackage(item.packageCode);
    const selectedGroupTotal = selectedGroupMemberCount + selectedMusicians.length;
    const groupDateMismatch = selectedGroup?.date && toInputDate(selectedGroup.date) !== toInputDate(item.eventDate);

    function toggleMusician(id: string) {
        setSelectedMusicians((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
    }

    async function submit() {
        setStatus({ loading: true, error: null, ok: null });
        if (mode === 'existing' && !groupId) {
            setStatus({ loading: false, error: 'Selecciona un grupo existente o crea uno nuevo.', ok: null });
            return;
        }
        if (mode === 'new' && name.trim().length < 2) {
            setStatus({ loading: false, error: 'Escribe un nombre para el grupo.', ok: null });
            return;
        }
        if (mode === 'existing' && groupDateMismatch) {
            setStatus({ loading: false, error: 'El grupo seleccionado tiene una fecha distinta a la serenata.', ok: null });
            return;
        }
        if (mode === 'new' && selectedMusicians.length < requiredMusicians) {
            setStatus({ loading: false, error: `Este paquete requiere al menos ${requiredMusicians} músicos.`, ok: null });
            return;
        }
        if (mode === 'existing' && selectedGroupTotal < requiredMusicians) {
            setStatus({ loading: false, error: `El grupo seleccionado no suma suficientes músicos para este paquete (${selectedGroupTotal}/${requiredMusicians}).`, ok: null });
            return;
        }
        const response = await serenatasApi.assignSerenataGroup(item.id, {
            mode,
            groupId: mode === 'existing' ? groupId : null,
            name: mode === 'new' ? name.trim() : null,
            musicianIds: selectedMusicians,
            message: message.trim() || null,
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos asignar el grupo.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Grupo asignado. La serenata quedó confirmada.' });
        await refresh();
        onDone(response.item);
    }

    return (
        <PanelCard size="lg" className="xl:min-h-[680px]">
            <PanelBlockHeader
                title="Asignar grupo"
                description="Confirma qué grupo cubrirá esta serenata. Los músicos seleccionados recibirán una invitación."
                actions={<PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} />}
            />

            <div className="mt-5 rounded-card border p-4 border-border bg-bg-subtle">
                <div className="grid gap-4 md:grid-cols-3">
                    <SerenataDetailMetric icon={IconClock} label="Fecha y hora" title={`${formatDate(item.eventDate)} a las ${item.eventTime}`} />
                    <SerenataDetailMetric icon={IconMapPin} label="Comuna" title={item.comuna ?? 'Sin comuna'} description={item.region ?? undefined} />
                    <MoneyMetric label="Precio confirmado" value={item.price} strong />
                </div>
            </div>

            {marketplaceRequest ? (
                <PanelNotice tone="neutral" className="mt-5">
                    Solicitud del marketplace: arma una jornada operativa con integrantes activos de tu plantel
                    comercial. Solo puedes invitar músicos de ese grupo proveedor.
                </PanelNotice>
            ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setMode('existing')}
                        className={`rounded-card border p-4 text-left transition-colors ${
                            mode === 'existing' ? 'border-accent-border bg-accent-soft' : 'border-border bg-surface'
                        }`}
                    >
                        <p className="text-sm font-semibold text-fg">Usar jornada existente</p>
                        <p className="mt-1 text-xs text-fg-muted">Reutiliza un grupo operativo ya creado para otra serenata.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('new')}
                        className={`rounded-card border p-4 text-left transition-colors ${
                            mode === 'new' ? 'border-accent-border bg-accent-soft' : 'border-border bg-surface'
                        }`}
                    >
                        <p className="text-sm font-semibold text-fg">Nueva jornada para esta serenata</p>
                        <p className="mt-1 text-xs text-fg-muted">Crea la jornada e invita músicos en un solo paso.</p>
                    </button>
                </div>
            )}

            <div className="mt-5 grid gap-4">
                {mode === 'existing' && !marketplaceRequest ? (
                    <PanelField label="Jornada operativa">
                        <FieldSelect value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                            <option value="">Seleccionar grupo</option>
                            {sameDateGroups.length > 0 ? <optgroup label="Misma fecha">{sameDateGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.members.length} músicos</option>)}</optgroup> : null}
                            <optgroup label="Todos los grupos">
                                {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {formatDate(group.date)}</option>)}
                            </optgroup>
                        </FieldSelect>
                    </PanelField>
                ) : (
                    <PanelField label="Nombre de la jornada">
                        <FieldInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Grupo serenata viernes" />
                    </PanelField>
                )}

                {groupDateMismatch ? (
                    <PanelNotice tone="error">El grupo seleccionado no tiene la misma fecha que la serenata. Elige un grupo con fecha {formatDate(item.eventDate)} o crea uno nuevo.</PanelNotice>
                ) : null}

                <div className="rounded-card border p-4 border-border bg-surface">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--fg)]">Invitar músicos</p>
                            <p className="mt-1 text-xs text-fg-muted">
                                {mode === 'existing' && selectedGroupMemberCount > 0
                                    ? `El grupo seleccionado ya tiene ${selectedGroupMemberCount} músico${selectedGroupMemberCount === 1 ? '' : 's'}. Puedes sumar más.`
                                    : 'Selecciona al menos un músico para enviar invitación.'}
                            </p>
                        </div>
                        <PanelStatusBadge
                            tone={selectedGroupTotal >= requiredMusicians ? 'success' : 'warning'}
                            label={`${selectedGroupTotal}/${requiredMusicians} músicos requeridos`}
                            size="sm"
                        />
                    </div>
                    <div className="mt-4 grid max-h-[260px] gap-2 overflow-y-auto pr-1">
                        {sortedMusicians.length === 0 ? (
                            <PanelNotice>No hay músicos disponibles en el directorio todavía.</PanelNotice>
                        ) : sortedMusicians.map((musician) => {
                            const checked = selectedMusicians.includes(musician.id);
                            return (
                                <label
                                    key={musician.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                                        checked ? 'border-accent-border bg-accent-soft' : 'border-border bg-bg-subtle'
                                    }`}
                                >
                                    <input className="mt-1" type="checkbox" checked={checked} onChange={() => toggleMusician(musician.id)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-[var(--fg)]">{musician.name}</span>
                                        <span className="mt-1 block text-xs text-fg-muted">
                                            {(musician.instrument || musician.instruments[0] || 'Instrumento por confirmar')} · {musician.comuna ?? musician.region ?? 'Sin comuna'}
                                        </span>
                                    </span>
                                    <MusicianAvailabilityBadge availableNow={musician.availableNow} />
                                </label>
                            );
                        })}
                    </div>
                </div>

                <PanelField label="Mensaje para músicos">
                    <FieldTextarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
                </PanelField>
            </div>

            <FormFeedback status={status} />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <PanelButton className="flex-1" disabled={status.loading} onClick={() => void submit()}>
                    {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={15} />}
                    Confirmar grupo y agendar
                </PanelButton>
                <PanelButton className="flex-1" variant="secondary" disabled={status.loading} onClick={onCancel}>
                    Cancelar
                </PanelButton>
            </div>
        </PanelCard>
    );
}

function MoneyMetric({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) {
    return (
        <div className="min-w-0 rounded-xl border p-3 border-border bg-surface">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className={`${strong ? 'font-bold text-accent' : 'font-semibold text-fg'} mt-1 truncate text-base lg:text-lg`}>
                {money(value)}
            </p>
        </div>
    );
}

function SerenataSourceBadge({ source, size = 'md' }: { source: Serenata['source']; size?: 'sm' | 'md' }) {
    const isOwn = source === 'own_lead';
    return (
        <span
            className={`${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} rounded-full font-medium ${
                isOwn ? 'bg-bg-muted text-fg-muted' : 'bg-accent-soft text-accent'
            }`}
        >
            {isOwn ? 'Propia' : 'Aplicación'}
        </span>
    );
}

function SerenataDetailMetric({ icon: Icon, label, title, description }: { icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties; className?: string }>; label: string; title: string; description?: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon size={19} className="mt-0.5 shrink-0 text-fg-muted" />
            <div>
                <p className="text-sm text-fg-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--fg)]">{title}</p>
                {description ? <p className="mt-1 text-sm text-accent">{description}</p> : null}
            </div>
        </div>
    );
}

const SERENATA_FORM_MOBILE_STEPS = [
    { id: 1, label: 'Evento' },
    { id: 2, label: 'Servicio' },
    { id: 3, label: 'Lugar' },
] as const;

export function SerenataForm({ title, item, groups, packages, refresh, onDone, onCancel, modal = false }: { title: string; item?: Serenata; groups: SerenataGroup[]; packages: SerenataPackage[]; refresh: () => Promise<void>; onDone: (item: Serenata) => void; onCancel?: () => void; modal?: boolean }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [mobileStep, setMobileStep] = useState(1);
    const [recipientName, setRecipientName] = useState(item?.recipientName ?? '');
    const [clientPhone, setClientPhone] = useState(item?.clientPhone ?? '');
    const [eventDate, setEventDate] = useState(toInputDate(item?.eventDate) ?? today);
    const [eventTime, setEventTime] = useState(item?.eventTime ?? '21:00');
    const [packageCode, setPackageCode] = useState<SerenataPackageCode>(item?.packageCode ?? packages[0]?.code ?? 'trio');
    const [duration, setDuration] = useState(item?.duration ?? 45);
    const [price, setPrice] = useState(item?.price == null ? '' : String(item.price));
    const [eventType, setEventType] = useState(item?.eventType ?? 'Cumpleaños');
    const [groupId, setGroupId] = useState(item?.groupId ?? '');
    const [message, setMessage] = useState(item?.message ?? '');
    const [location, setLocation] = useState<ListingLocation>(() => serenataLocation(item));
    const regions = LOCATION_REGIONS.map((region) => ({ value: region.id, label: region.name }));
    const allCommunes = LOCATION_REGIONS.flatMap((region) => getCommunesForRegion(region.id).map((commune) => ({ value: commune.id, label: commune.name })));
    const communes = getCommunesForRegion(location.regionId ?? '').map((commune) => ({ value: commune.id, label: commune.name }));
    const selectedPackage = packages.find((entry) => entry.code === packageCode);

    useEffect(() => {
        if (!selectedPackage) return;
        if (!item || packageCode !== item.packageCode) {
            setDuration(selectedPackage.duration);
            setPrice(String(selectedPackage.price));
            setEventType(selectedPackage.label);
        }
    }, [item, selectedPackage, packageCode]);

    async function submit() {
        setStatus({ loading: true, error: null, ok: null });
        const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
        const address = cleanSerenataAddress(rawAddress, location.communeName, location.regionName);
        if (!recipientName.trim() || !address || !eventDate || !eventTime) {
            setStatus({ loading: false, error: 'Completa destinatario, dirección, fecha y hora.', ok: null });
            return;
        }
        if (!location.communeName || !location.regionName) {
            setStatus({ loading: false, error: 'Selecciona una dirección del autocompletar que incluya comuna y región.', ok: null });
            return;
        }
        const payload: Partial<Serenata> = {
            groupId: groupId || null,
            packageCode,
            recipientName: recipientName.trim(),
            clientPhone,
            address,
            comuna: location.communeName,
            region: location.regionName,
            lat: location.geoPoint.latitude == null ? null : String(location.geoPoint.latitude),
            lng: location.geoPoint.longitude == null ? null : String(location.geoPoint.longitude),
            eventDate,
            eventTime,
            duration,
            price: price ? Number(price) : null,
            eventType,
            message,
        };
        const response = item
            ? await serenatasApi.updateSerenata(item.id, payload)
            : await serenatasApi.createSerenata(payload);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos guardar la serenata.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: item ? 'Serenata actualizada.' : 'Serenata creada.' });
        await refresh();
        onDone(response.item);
    }

    return (
        <PanelCard size="lg" className={modal ? '' : 'xl:min-h-[680px]'}>
            <PanelBlockHeader
                title={title}
                description={item ? 'Actualiza los datos principales de esta serenata.' : 'Registra una serenata propia. Costo de plataforma para el grupo: $0.'}
                actions={item ? <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} /> : null}
            />
            <ol className="mt-4 flex gap-2 sm:hidden" aria-label="Pasos del formulario">
                {SERENATA_FORM_MOBILE_STEPS.map((step) => (
                    <li
                        key={step.id}
                        className={`flex-1 rounded-button border px-2 py-1.5 text-center text-xs font-medium ${
                            mobileStep === step.id
                                ? 'border-accent-border bg-accent-soft text-accent'
                                : 'border-border text-fg-muted'
                        }`}
                    >
                        {step.label}
                    </li>
                ))}
            </ol>
            <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${mobileStep === 1 ? '' : 'hidden sm:grid'}`}>
                <PanelField label="Destinatario"><FieldInput value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nombre" /></PanelField>
                <PanelField label="Contacto de coordinación"><FieldInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+56 9..." /></PanelField>
                <PanelField label="Fecha"><FieldInput type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></PanelField>
                <PanelField label="Hora"><FieldInput type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></PanelField>
            </div>
            <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${mobileStep === 2 ? '' : 'hidden sm:grid'}`}>
                <PanelField label="Servicio contratado">
                    <FieldSelect value={packageCode} onChange={(event) => setPackageCode(event.target.value as SerenataPackageCode)}>
                        <option value="">Seleccionar servicio</option>
                        {packages.map((entry) => (
                            <option key={entry.code} value={entry.code}>{entry.label} · {entry.musicians} músicos · {entry.duration} min</option>
                        ))}
                    </FieldSelect>
                </PanelField>
                <PanelField label="Duración"><FieldInput type="number" min={15} max={240} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></PanelField>
                <PanelField label="Tipo"><FieldInput value={eventType} onChange={(event) => setEventType(event.target.value)} /></PanelField>
                <PanelField label="Precio"><FieldInput type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} /></PanelField>
                <PanelField label="Grupo" className="sm:col-span-2">
                    <FieldSelect value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                        <option value="">Sin grupo</option>
                        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </FieldSelect>
                </PanelField>
            </div>
            <div className={mobileStep === 3 ? 'mt-4' : 'mt-4 hidden sm:block'}>
                <ListingLocationEditor
                    title="Dirección del evento"
                    description="Escribe y selecciona una sugerencia del buscador de direcciones."
                    simpleMode
                    location={location}
                    onChange={setLocation}
                    regions={regions}
                    communes={communes}
                    allCommunes={allCommunes}
                    addressBook={[]}
                    addressFirst
                    showAddressLine2={false}
                    showAreaFields={false}
                    showSourceSelector={false}
                    showVisibilityField={false}
                    showPublicPreviewCard={false}
                    showActionBar={false}
                    showSimpleVisibilityToggle={false}
                    showGoogleMapsLink
                    addressRequired
                    googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                />
                <div className="mt-3 rounded-card border border-border bg-bg-subtle p-3 text-sm text-fg-secondary">
                    <span className="font-semibold text-[var(--fg)]">Ubicación detectada:</span>{' '}
                    {location.addressLine1 || 'Sin dirección'}{location.communeName ? ` · ${location.communeName}` : ''}{location.regionName ? ` · ${location.regionName}` : ''}
                </div>
            </div>
            <PanelField className={`mt-3 ${mobileStep === 3 ? '' : 'hidden sm:block'}`} label="Mensaje"><FieldTextarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></PanelField>
            <FormFeedback status={status} />
            <div className="mt-4 flex flex-col gap-3 sm:hidden">
                {mobileStep > 1 ? (
                    <PanelButton variant="secondary" onClick={() => setMobileStep((s) => s - 1)}>
                        Atrás
                    </PanelButton>
                ) : null}
                {mobileStep < 3 ? (
                    <PanelButton onClick={() => setMobileStep((s) => s + 1)}>Siguiente</PanelButton>
                ) : (
                    <PanelButton disabled={status.loading} onClick={() => void submit()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : item ? <IconCheck size={15} /> : <IconPlus size={15} />}
                        {item ? 'Guardar cambios' : 'Crear serenata'}
                    </PanelButton>
                )}
                {onCancel && mobileStep === 1 ? (
                    <PanelButton variant="secondary" onClick={onCancel}>{item ? 'Cancelar edición' : 'Cerrar'}</PanelButton>
                ) : null}
            </div>
            <div className="mt-4 hidden flex-col gap-3 sm:flex sm:flex-row">
                <PanelButton className="flex-1" disabled={status.loading} onClick={() => void submit()}>
                    {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : item ? <IconCheck size={15} /> : <IconPlus size={15} />}
                    {item ? 'Guardar cambios' : 'Crear serenata'}
                </PanelButton>
                {onCancel ? <PanelButton className="flex-1" variant="secondary" onClick={onCancel}>{item ? 'Cancelar edición' : 'Cerrar'}</PanelButton> : null}
            </div>
        </PanelCard>
    );
}

export function SerenataCreateModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
    return (
        <PanelSheet onClose={onClose} ariaLabel="Nueva serenata">
            {children}
        </PanelSheet>
    );
}
