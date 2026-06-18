'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ListingLocationEditor } from '@simple/ui/location';
import { PanelButton, PanelCard, PanelField, PanelStatusBadge, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui/panel';
import { applyAddressBookEntryToLocation, type AddressBookEntry, type ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import {
    IconCheck,
    IconClock,
    IconCurrencyDollar,
    IconHourglass,
    IconBell,
    IconMapPin,
    IconMessage,
    IconMusic,
    IconPencil,
    IconPhone,
    IconStar,
    IconStarFilled,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { type MusicianDirectoryItem, type Serenata, type SerenataGroup, type SerenataMePlan, type SerenataPackage, serenatasApi } from '@/lib/serenatas-api';
import { buildSerenataGroupSelectOptions } from '@/lib/serenata-group-select';
import { SerenataRejectModal } from './serenata-reject-modal';
import { useSerenata } from '@/context/serenata-context';
import { SolicitudWaitTimer } from '../solicitud-wait-timer';
import { appearsInOwnerSolicitudes, isOwnerSolicitudesInbox, isPendingSerenataAction } from '@/lib/serenata-pending';
import {
    getSolicitudWaitState,
    pickMostUrgentSolicitudId,
    sortSolicitudesInbox,
} from '@/lib/solicitud-wait-time';
import { SerenataClosureActions } from '../serenata-closure-actions';
import { SerenataSetlistPanel } from '../serenata-setlist-panel';
import { ClientSerenataCancelPrompt } from '../client-serenata-cancel-prompt';
import { startSerenataCheckout } from '@/lib/payments';
import { panelMiNegocioHref, panelSectionHref } from '@/lib/panel-routes';
import { useSerenataPanelFormat } from '@/hooks/use-serenata-panel-format';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';
import { PanelSheet } from '../panel-sheet';
import {
    EmptyBlock,
    FieldSelect,
    FormFeedback,
    SerenataRow,
    cleanSerenataAddress,
    computeSerenataAppDeduction,
    formatSerenataListSummary,
    formatServiceSongsIncludedLabel,
    formatSerenataEventPlace,
    googleMapsUrl,
    ownerCanViewClientPhone,
    money,
    serenataLocation,
    serenataStatusLabel,
    serenataStatusTone,
    today,
    toInputDate,
    type FormStatus,
} from '../shared';
import { SerenataForm } from './serenata-form';

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

type SerenataFilter = 'all' | 'inbox' | 'needs_response' | Serenata['status'] | 'closed';
type SerenataOriginFilter = 'all' | Serenata['source'];
type SerenataMode = 'detail' | 'edit';

export function SerenatasView({ serenatas, groups, musicians, packages: packagesProp, selectedSerenataId, action, clearAction, refresh, isSolicitudesMode = false, onAgendaDeepLink }: { serenatas: Serenata[]; groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; packages?: SerenataPackage[]; selectedSerenataId?: string | null; refresh: () => Promise<void>; isSolicitudesMode?: boolean; onAgendaDeepLink?: (serenataId: string) => void } & PanelActionProps) {
    const fmt = useSerenataPanelFormat(true);
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState<SerenataFilter>(isSolicitudesMode ? 'inbox' : 'all');
    const [originFilter, setOriginFilter] = useState<SerenataOriginFilter>('all');
    const [selectedId, setSelectedId] = useState<string | null>(serenatas[0]?.id ?? null);
    const [mode, setMode] = useState<SerenataMode>('detail');
    const [packagesLocal, setPackagesLocal] = useState<SerenataPackage[]>(packagesProp ?? []);
    const [ownerPlan, setOwnerPlan] = useState<SerenataMePlan | null>(null);
    const [urgencyTick, setUrgencyTick] = useState(0);
    const packages = packagesProp ?? packagesLocal;
    const inboxCount = serenatas.filter(isOwnerSolicitudesInbox).length;
    const allSolicitudesCount = serenatas.filter(appearsInOwnerSolicitudes).length;
    const alertCount = serenatas.filter(isPendingSerenataAction).length;
    const selected = serenatas.find((item) => item.id === selectedId) ?? serenatas[0] ?? null;
    const filtered = serenatas.filter((item) => {
        const matchesStatus = filter === 'needs_response'
            ? isPendingSerenataAction(item)
            : filter === 'inbox'
              ? (isSolicitudesMode ? isOwnerSolicitudesInbox(item) : true)
              : filter === 'all'
                ? (isSolicitudesMode ? appearsInOwnerSolicitudes(item) : true)
                : (filter === 'closed'
                  ? ['cancelled', 'rejected', 'expired'].includes(item.status)
                  : filter === 'pending'
                      ? item.status === 'pending' || item.status === 'pending_open' || isPendingSerenataAction(item)
                      : item.status === filter);
        const matchesOrigin = originFilter === 'all' || item.source === originFilter;
        return matchesStatus && matchesOrigin;
    });
    const filteredSorted = useMemo(() => {
        void urgencyTick;
        return isSolicitudesMode ? sortSolicitudesInbox(filtered) : filtered;
    }, [filtered, isSolicitudesMode, urgencyTick]);
    const mostUrgentId = useMemo(() => {
        void urgencyTick;
        return isSolicitudesMode ? pickMostUrgentSolicitudId(filteredSorted) : null;
    }, [filteredSorted, isSolicitudesMode, urgencyTick]);
    const pendingCount = serenatas.filter((item) => item.status === 'pending' || item.status === 'pending_open' || isPendingSerenataAction(item)).length;
    const expiredCount = serenatas.filter((item) => item.status === 'expired').length;
    const needsGroupCount = serenatas.filter((item) => item.status === 'accepted_pending_group').length;
    const closedCount = serenatas.filter((item) => ['cancelled', 'rejected', 'expired'].includes(item.status)).length;
    const ownCount = serenatas.filter((item) => item.source === 'own_lead').length;
    const appCount = serenatas.filter((item) => item.source === 'platform_lead').length;

    const { solicitudesPendingCount } = useSerenata();

    const solicitudesListCaption = useMemo(() => {
        if (!isSolicitudesMode) return `${serenatas.length} registros entre propias y aplicación`;
        if (filter === 'needs_response') {
            return filtered.length === 0
                ? 'Ninguna solicitud con alerta activa'
                : `${filtered.length} con alerta activa`;
        }
        if (filter === 'accepted_pending_group') {
            return `${filtered.length} sin grupo asignado`;
        }
        if (filter === 'expired') {
            return `${filtered.length} expirada${filtered.length === 1 ? '' : 's'}`;
        }
        if (filter === 'closed') {
            return `${filtered.length} cerrada${filtered.length === 1 ? '' : 's'}`;
        }
        return inboxCount === 0
            ? 'No hay solicitudes por revisar'
            : `${filtered.length} solicitud${filtered.length === 1 ? '' : 'es'} por revisar`;
    }, [filter, filtered.length, inboxCount, isSolicitudesMode, serenatas.length]);

    useEffect(() => {
        if (!isSolicitudesMode || alertCount === 0) return;
        const timer = window.setInterval(() => setUrgencyTick((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [alertCount, isSolicitudesMode]);

    useEffect(() => {
        let cancelled = false;
        void serenatasApi.mePlan().then((response) => {
            if (!cancelled && response.ok) setOwnerPlan(response);
        });
        return () => {
            cancelled = true;
        };
    }, []);

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
            || urlFilter === 'inbox'
            || urlFilter === 'needs_response'
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
        if (!selectedSerenataId || !serenatas.some((item) => item.id === selectedSerenataId)) return;
        setSelectedId(selectedSerenataId);
        setFilter(isSolicitudesMode ? 'inbox' : 'all');
        setOriginFilter('all');
        setMode('detail');
    }, [isSolicitudesMode, selectedSerenataId, serenatas]);

    useEffect(() => {
        if (packagesProp) return;
        let active = true;
        void serenatasApi.packages().then((response) => {
            if (active && response.ok) setPackagesLocal(response.items);
        });
        return () => {
            active = false;
        };
    }, [packagesProp]);

    return (
        <>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(380px,0.95fr)_minmax(560px,1.05fr)]">
                <PanelCard size="lg" className="min-w-0 xl:min-h-[680px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="type-section-title text-(--fg)">{isSolicitudesMode ? 'Solicitudes' : 'Serenatas'}</h2>
                        <p className="mt-1 text-sm text-fg-muted">{solicitudesListCaption}</p>
                    </div>
                    {isSolicitudesMode && solicitudesPendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent sm:self-auto">
                            <IconBell size={14} className="animate-pulse" />
                            {solicitudesPendingCount} por responder
                        </span>
                    ) : null}
                </div>

                {isSolicitudesMode ? (
                    <div className="mt-5">
                        <PanelField label="Mostrar">
                            <FieldSelect value={filter} onChange={(event) => setFilter(event.target.value as SerenataFilter)}>
                                <option value="inbox">Por revisar ({inboxCount})</option>
                                <option value="all">Todas ({allSolicitudesCount})</option>
                                <option value="needs_response">Con alerta ({alertCount})</option>
                                <option value="accepted_pending_group">Sin grupo ({needsGroupCount})</option>
                                <option value="expired">Expiradas ({expiredCount})</option>
                                <option value="closed">Cerradas ({closedCount})</option>
                            </FieldSelect>
                        </PanelField>
                    </div>
                ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <PanelField label="Estado">
                            <FieldSelect value={filter} onChange={(event) => setFilter(event.target.value as SerenataFilter)}>
                                <option value="all">Todas ({serenatas.length})</option>
                                <option value="pending">Pendientes ({pendingCount})</option>
                                <option value="accepted_pending_group">Sin grupo ({needsGroupCount})</option>
                                <option value="scheduled">Programadas</option>
                                <option value="completed">Completadas</option>
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
                )}

                <div className="mt-6 grid gap-4">
                    {filteredSorted.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center border-border">
                            <EmptyBlock
                                title={isSolicitudesMode
                                    ? (filter === 'needs_response'
                                        ? 'Ninguna solicitud con alerta activa'
                                        : filter === 'inbox'
                                          ? 'No hay solicitudes por revisar'
                                          : filter === 'all'
                                            ? 'No hay solicitudes en esta bandeja'
                                            : 'Sin solicitudes con este filtro')
                                    : 'Sin serenatas'}
                                description={isSolicitudesMode
                                    ? (filter === 'needs_response'
                                        ? 'Las que requieren respuesta urgente aparecen aquí cuando el cliente ya pagó.'
                                        : filter === 'inbox'
                                          ? 'Las serenatas confirmadas aparecen en Agenda. Cuando llegue una nueva solicitud del marketplace, la verás aquí.'
                                          : filter === 'all'
                                            ? 'Incluye por revisar, sin grupo, expiradas y cerradas. Las confirmadas están en Agenda.'
                                            : 'Prueba otro filtro o espera nuevas solicitudes del marketplace.')
                                    : 'Sin serenatas con este filtro.'}
                            />
                        </div>
                    ) : (
                        <>
                            {filteredSorted.map((item) => {
                                const needsGroup = item.status === 'accepted_pending_group' && !item.groupId;
                                const showWaitTimer = isPendingSerenataAction(item);
                                const waitState = showWaitTimer ? getSolicitudWaitState(item) : null;
                                const isMostUrgent = item.id === mostUrgentId && showWaitTimer;
                                const urgentCardClass = isMostUrgent
                                    ? waitState?.urgency === 'danger'
                                        ? 'solicitud-card--urgent-danger'
                                        : waitState?.urgency === 'warning'
                                          ? 'solicitud-card--urgent-warning'
                                          : 'solicitud-card--urgent'
                                    : '';
                                return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(item.id);
                                        setMode('detail');
                                    }}
                                    className={`group w-full rounded-card border p-5 text-left transition-all hover:shadow-md ${
                                        selected?.id === item.id
                                            ? 'border-accent bg-accent-soft'
                                            : needsGroup
                                              ? 'border-accent-border bg-surface'
                                              : 'border-border bg-surface'
                                    } ${urgentCardClass}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-base font-bold text-(--fg)">{item.recipientName}</p>
                                                <SerenataSourceBadge source={item.source} size="sm" />
                                            </div>
                                            <p className="mt-1.5 truncate text-sm text-fg-secondary">
                                                {formatSerenataListSummary(item)}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                                                <span className="flex items-center gap-1.5">
                                                    <IconClock size={15} className="shrink-0" />
                                                    {fmt.formatShortSerenataDate(item)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <IconMapPin size={15} className="shrink-0" />
                                                    {item.comuna ?? 'Sin comuna'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                            {showWaitTimer ? (
                                                <SolicitudWaitTimer item={item} />
                                            ) : (
                                                <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} size="sm" />
                                            )}
                                            <p className="text-lg font-bold text-accent">{money(item.price)}</p>
                                            {needsGroup ? (
                                                <span className="text-xs font-semibold text-accent">Sin grupo</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                        </>
                    )}
                </div>
                </PanelCard>

                {mode === 'edit' && selected ? (
                <SerenataForm title="Editar serenata" item={selected} groups={groups} refresh={refresh} onDone={(item) => { setSelectedId(item.id); setMode('detail'); }} onCancel={() => setMode('detail')} />
            ) : selected ? (
                <SerenataDetail item={selected} groups={groups} ownerPlan={ownerPlan} refresh={refresh} onEdit={() => setMode('edit')} />
            ) : (
                <PanelCard size="lg">
                    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
                        <EmptyBlock title="Sin serenatas" description="Selecciona una solicitud de la lista para ver su detalle." />
                    </div>
                </PanelCard>
            )}
            </div>

        </>
    );
}

function SerenataDetail({ item, groups, ownerPlan, refresh, onEdit }: { item: Serenata; groups: SerenataGroup[]; ownerPlan: SerenataMePlan | null; refresh: () => Promise<void>; onEdit: () => void }) {
    const assignedGroup = groups.find((entry) => entry.id === item.groupId);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [pickedGroupId, setPickedGroupId] = useState(item.groupId ?? '');
    const [groupPickError, setGroupPickError] = useState<string | null>(null);
    const [groupSaving, setGroupSaving] = useState(false);
    const [serviceSongsIncluded, setServiceSongsIncluded] = useState<number | null>(item.songsIncludedAtBooking ?? null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const isPendingApp = isPendingSerenataAction(item);
    const showGroupPicker = isPendingApp || item.status === 'accepted_pending_group';
    const groupOptions = useMemo(() => buildSerenataGroupSelectOptions(item, groups), [item, groups]);

    useEffect(() => {
        setPickedGroupId(item.groupId ?? '');
        setGroupPickError(null);
        setRejectModalOpen(false);
    }, [item.id, item.groupId]);

    useEffect(() => {
        if (item.songsIncludedAtBooking != null) {
            setServiceSongsIncluded(item.songsIncludedAtBooking);
            return;
        }
        if (!item.providerGroupId || !item.selectedServiceId) {
            setServiceSongsIncluded(0);
            return;
        }
        let cancelled = false;
        void serenatasApi.providerGroupServices(item.providerGroupId).then((response) => {
            if (cancelled || !response.ok) return;
            const service = response.items.find((entry) => entry.id === item.selectedServiceId);
            setServiceSongsIncluded(service?.songsIncluded ?? 0);
        });
        return () => {
            cancelled = true;
        };
    }, [item.id, item.providerGroupId, item.selectedServiceId, item.songsIncludedAtBooking]);
    void ownerPlan;
    const commissionBps = 0;
    const commissionVatBps = 0;
    const appDeduction = item.source === 'platform_lead' && item.price != null
        ? computeSerenataAppDeduction(item.price, commissionBps, commissionVatBps)
        : null;
    const commission = appDeduction?.commissionClp ?? null;
    const net = appDeduction?.netClp ?? item.price;
    const eventPlace = formatSerenataEventPlace(item);
    const showClientPhone = ownerCanViewClientPhone(item);

    async function persistGroupSelection(nextGroupId: string) {
        if (!nextGroupId) return true;
        setGroupSaving(true);
        setGroupPickError(null);
        const response = await serenatasApi.updateSerenata(item.id, { groupId: nextGroupId });
        setGroupSaving(false);
        if (!response.ok) {
            setGroupPickError(response.error ?? 'No pudimos asignar el grupo.');
            return false;
        }
        await refresh();
        return true;
    }

    async function handleGroupChange(nextGroupId: string) {
        setPickedGroupId(nextGroupId);
        setGroupPickError(null);
        if (item.status === 'accepted_pending_group' && nextGroupId) {
            await persistGroupSelection(nextGroupId);
        }
    }

    async function acceptOffer() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.acceptSerenataOffer(item.id);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos responder esta solicitud.', ok: null });
            return;
        }
        let okMessage = 'Solicitud aceptada. Asigna un grupo cuando puedas para confirmarla en agenda.';
        if (pickedGroupId) {
            const assigned = await persistGroupSelection(pickedGroupId);
            okMessage = assigned
                ? 'Listo: solicitud aceptada, grupo asignado y serenata confirmada en tu agenda.'
                : 'Solicitud aceptada, pero no pudimos asignar el grupo elegido. Elige otro grupo e inténtalo de nuevo.';
        }
        setStatus({ loading: false, error: null, ok: okMessage });
        await refresh();
    }

    async function confirmReject(reason: string) {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.rejectSerenataOffer(item.id, { reason });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos rechazar esta solicitud.', ok: null });
            return;
        }
        setRejectModalOpen(false);
        setStatus({ loading: false, error: null, ok: 'Solicitud rechazada. El cliente recibirá el motivo indicado.' });
        await refresh();
    }

    const serviceLabel = item.eventType ?? item.packageCode ?? 'Serenata';
    const collectionLabel = formatSerenataCollectionMethod(item);

    return (
        <PanelCard size="lg" className={`min-w-0 xl:min-h-[680px] ${isPendingApp ? 'border-[color:var(--accent-border)]' : ''}`}>
            <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} />
                        <SerenataSourceBadge source={item.source} />
                    </div>
                    <h2 className="break-words text-2xl font-bold text-fg lg:text-3xl">{item.recipientName}</h2>
                    <p className="mt-2 text-sm text-fg-muted">{serviceLabel}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                    <p className="text-3xl font-bold text-accent lg:text-4xl">{money(item.price)}</p>
                    <p className="mt-1 text-sm text-fg-muted">por serenata</p>
                </div>
            </div>

            {isPendingApp ? (
                <div className="mt-6 rounded-card border border-accent-border bg-accent-soft p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-fg">Solicitud pagada</p>
                        <SolicitudWaitTimer item={item} />
                    </div>
                    <div className={`mt-5 grid min-w-0 gap-4 ${commission != null && commission > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                        <MoneyMetric label="Precio" value={item.price} strong />
                        {commission != null && commission > 0 ? (
                            <MoneyMetric label="Comisión plataforma" value={commission} />
                        ) : null}
                        <MoneyMetric label="Estimado neto" value={net} strong />
                    </div>
                </div>
            ) : null}

            <div className={`flex flex-col gap-8 ${isPendingApp ? 'mt-8' : 'mt-6'}`}>
                <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
                    <SerenataDetailMetric
                        icon={IconClock}
                        label="Fecha y hora"
                        title={`${fmt.formatDate(item.eventDate)} a las ${item.eventTime}`}
                    />
                    <SerenataDetailMetric
                        icon={IconMapPin}
                        label="Lugar del evento"
                        title={eventPlace.street}
                        description={eventPlace.zone}
                        action={
                            <a
                                href={googleMapsUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                            >
                                <IconMapPin size={14} />
                                Ver en mapa
                            </a>
                        }
                    />
                    <SerenataDetailMetric icon={IconHourglass} label="Duración" title={`${item.duration} minutos`} />
                    {collectionLabel ? (
                        <SerenataDetailMetric icon={IconCurrencyDollar} label="Forma de pago" title={collectionLabel} />
                    ) : null}
                    <SerenataDetailMetric
                        icon={IconMusic}
                        label="Canciones del servicio"
                        title={
                            serviceSongsIncluded == null
                                ? 'Cargando…'
                                : formatServiceSongsIncludedLabel(serviceSongsIncluded)
                        }
                    />
                </div>

                {showClientPhone ? (
                    <SerenataDetailMetric icon={IconPhone} label="Contacto solicitante" title={item.clientPhone ?? 'Sin teléfono'} />
                ) : null}

                {showGroupPicker ? (
                    <SerenataDetailGroupPicker
                        value={pickedGroupId}
                        options={groupOptions}
                        disabled={status.loading || groupSaving}
                        error={groupPickError}
                        onChange={(next) => void handleGroupChange(next)}
                    />
                ) : (
                    <SerenataDetailMetric
                        icon={IconUsers}
                        label="Grupo"
                        title={assignedGroup?.name ?? 'Sin grupo asignado'}
                    />
                )}

                {item.message ? (
                    <div className="rounded-card border border-border bg-bg-subtle p-5">
                        <SerenataDetailMetric icon={IconMessage} label="Mensaje" title={item.message} />
                    </div>
                ) : null}

                {item.providerGroupId ? (
                    <SerenataSetlistPanel serenata={item} mode="owner" refresh={refresh} embedded />
                ) : null}
            </div>

            <SerenataRejectModal
                open={rejectModalOpen}
                recipientName={item.recipientName}
                loading={status.loading}
                onClose={() => {
                    if (status.loading) return;
                    setRejectModalOpen(false);
                }}
                onConfirm={(reason) => void confirmReject(reason)}
            />

            <FormFeedback status={status} />
            <div className="sticky bottom-3 z-10 mt-8 flex flex-col gap-3 rounded-card border p-4 shadow-sm md:static md:rounded-none md:border-0 md:border-t md:p-0 md:pt-6 md:shadow-none sm:flex-row border-border bg-surface">
                {isPendingApp ? (
                    <>
                        <PanelButton className="flex-1" disabled={status.loading} onClick={() => void acceptOffer()}>
                            <IconCheck size={15} />
                            {pickedGroupId ? 'Aceptar y confirmar' : 'Aceptar solicitud'}
                        </PanelButton>
                        <PanelButton
                            className="flex-1"
                            variant="secondary"
                            disabled={status.loading}
                            onClick={() => setRejectModalOpen(true)}
                        >
                            <IconX size={15} />
                            Rechazar
                        </PanelButton>
                    </>
                ) : item.status === 'accepted_pending_group' ? (
                    <PanelButton className="flex-1" variant="secondary" onClick={onEdit}>
                        <IconPencil size={15} />
                        Editar
                    </PanelButton>
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

function MoneyMetric({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) {
    return (
        <div className="min-w-0 rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className={`${strong ? 'font-bold text-accent' : 'font-semibold text-fg'} mt-2 truncate text-base lg:text-lg`}>
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

function SerenataDetailMetric({
    icon: Icon,
    label,
    title,
    description,
    action,
}: {
    icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties; className?: string }>;
    label: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start gap-4">
            <Icon size={20} stroke={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-fg-muted">{label}</p>
                    {action}
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug text-fg">{title}</p>
                {description ? <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{description}</p> : null}
            </div>
        </div>
    );
}

function SerenataDetailGroupPicker({
    value,
    options,
    disabled,
    error,
    onChange,
}: {
    value: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    error: string | null;
    onChange: (next: string) => void;
}) {
    const groupsHref = panelMiNegocioHref('grupos');
    return (
        <div className="flex items-start gap-4">
            <IconUsers size={20} stroke={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg-muted">Grupo</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <FieldSelect
                        value={value}
                        options={options}
                        disabled={disabled}
                        placeholder="Sin grupo (asignar después)"
                        onChange={(event) => onChange(event.target.value)}
                        className="min-w-0 flex-1"
                    />
                    <Link
                        href={groupsHref}
                        prefetch={false}
                        className={getPanelButtonClassName({ size: 'sm', className: 'shrink-0 justify-center sm:w-auto w-full' })}
                        style={getPanelButtonStyle('secondary')}
                    >
                        Ir a Grupos
                    </Link>
                </div>
                {error ? <p className="mt-1.5 text-xs text-(--color-danger-text,#b91c1c)">{error}</p> : null}
            </div>
        </div>
    );
}

