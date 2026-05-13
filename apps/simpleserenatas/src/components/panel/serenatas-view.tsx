'use client';

import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { ListingLocationEditor } from '@simple/ui';
import { PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { applyAddressBookEntryToLocation, type AddressBookEntry, type ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { IconCheck, IconClock, IconLoader2, IconMapPin, IconPencil, IconPlus, IconUsers, IconX } from '@tabler/icons-react';
import { type MusicianDirectoryItem, type Serenata, type SerenataGroup, type SerenataPackage, type SerenataPackageCode, serenatasApi } from '@/lib/serenatas-api';
import { startSerenataCheckout } from '@/lib/payments';
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

export function ClientSerenatasView({ serenatas, onContract }: { serenatas: Serenata[]; refresh: () => Promise<void>; onContract?: () => void } & PanelActionProps) {
    const pendingCount = serenatas.filter((item) => item.status === 'payment_pending' || item.status === 'pending' || item.status === 'accepted_pending_group').length;
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Historial de serenatas</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
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
                        <div className="rounded-xl border p-5 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <EmptyBlock title="Sin serenatas contratadas" description="Cuando contrates una serenata, verás aquí su seguimiento." />
                            {onContract ? (
                                <PanelButton className="mt-4" onClick={onContract}>
                                    <IconPlus size={15} />
                                    Contratar una serenata
                                </PanelButton>
                            ) : null}
                        </div>
                    )
                    : serenatas.map((item) => <SerenataRow key={item.id} item={item} context="client" />)}
            </div>
        </PanelCard>
    );
}

export function ContractSerenataView({ contactPhone = '', refresh }: { contactPhone?: string; refresh: () => Promise<void> }) {
    const [packages, setPackages] = useState<SerenataPackage[]>([]);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<SerenataPackage | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadPackages() {
            const response = await serenatasApi.packages();
            if (cancelled) return;
            if (response.ok) setPackages(response.items);
            setLoadingPackages(false);
        }
        void loadPackages();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadAddressBook() {
            const response = await fetchAddressBook();
            if (cancelled) return;
            if (response.ok) setAddressBook(response.items);
            setLoadingAddresses(false);
        }
        void loadAddressBook();
        return () => {
            cancelled = true;
        };
    }, []);

    async function refreshAddressBook() {
        const response = await fetchAddressBook();
        if (response.ok) setAddressBook(response.items);
    }

    return (
        <div className="grid gap-5">
            {loadingPackages ? (
                <PanelCard>
                    <PanelNotice>Cargando paquetes disponibles.</PanelNotice>
                </PanelCard>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {packages.map((item) => (
                    <PanelCard key={item.code} className="relative flex h-full flex-col">
                        {item.badge ? (
                            <span className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                {item.badge}
                            </span>
                        ) : null}
                        <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                            <IconUsers size={22} />
                        </div>
                        <div className="mt-4 flex-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>{item.musicians} músicos · {item.duration} min</p>
                            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--fg)' }}>{item.label}</h2>
                            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{item.description}</p>
                            <div className="mt-4 grid gap-2">
                                {item.bullets.map((bullet) => (
                                    <div key={bullet} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        <IconCheck size={14} style={{ color: 'var(--accent)' }} />
                                        <span>{bullet}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-xs" style={{ color: 'var(--fg-muted)' }}>{item.idealFor}</p>
                            <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{money(item.price)}</p>
                        </div>
                        <PanelButton className="mt-5 w-full" onClick={() => setSelectedPackage(item)}>
                            <IconPlus size={15} />
                            Elegir {item.musicians === 3 ? 'trío' : item.musicians === 4 ? 'cuarteto' : item.musicians === 5 ? 'premium' : 'dúo'}
                        </PanelButton>
                    </PanelCard>
                ))}
            </div>

            {selectedPackage ? (
                <SerenataCreateModal onClose={() => setSelectedPackage(null)}>
                    <ClientSerenataRequestForm
                        serenataPackage={selectedPackage}
                        contactPhone={contactPhone}
                        addressBook={addressBook}
                        addressBookLoading={loadingAddresses}
                        refreshAddressBook={refreshAddressBook}
                        refresh={refresh}
                        onDone={() => setSelectedPackage(null)}
                        modal
                    />
                </SerenataCreateModal>
            ) : null}
        </div>
    );
}

function ClientMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

function ClientSerenataRequestForm({
    serenataPackage,
    contactPhone,
    addressBook,
    addressBookLoading,
    refreshAddressBook,
    refresh,
    onDone,
    modal = false,
}: {
    serenataPackage: SerenataPackage;
    contactPhone?: string;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    refreshAddressBook: () => Promise<void>;
    refresh: () => Promise<void>;
    onDone?: () => void;
    modal?: boolean;
}) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [addressStatus, setAddressStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [occasion, setOccasion] = useState('Cumpleaños');
    const [customOccasion, setCustomOccasion] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [clientPhone, setClientPhone] = useState(contactPhone ?? '');
    const [eventDate, setEventDate] = useState(today);
    const [eventTime, setEventTime] = useState('21:00');
    const [message, setMessage] = useState('');
    const [location, setLocation] = useState<ListingLocation>(() => serenataLocation());
    const regions = LOCATION_REGIONS.map((region) => ({ value: region.id, label: region.name }));
    const communes = getCommunesForRegion(location.regionId ?? '').map((commune) => ({ value: commune.id, label: commune.name }));
    const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
    const address = cleanSerenataAddress(rawAddress, location.communeName, location.regionName);
    const resolvedOccasion = occasion === 'Otro' ? customOccasion.trim() : occasion;

    useEffect(() => {
        if (!contactPhone || clientPhone.trim()) return;
        setClientPhone(contactPhone);
    }, [clientPhone, contactPhone]);

    useEffect(() => {
        if (addressBookLoading || addressBook.length === 0 || location.addressLine1) return;
        const defaultAddress = addressBook.find((item) => item.isDefault) ?? addressBook[0];
        setLocation((current) => applyAddressBookEntryToLocation(defaultAddress, current));
    }, [addressBook, addressBookLoading, location.addressLine1]);

    function validateStep(targetStep: 1 | 2 | 3) {
        if (targetStep >= 1) {
            if (!eventDate) return 'Selecciona la fecha del evento.';
            if (!eventTime) return 'Selecciona la hora del evento.';
            if (!address) return 'Ingresa la dirección del evento.';
            if (!location.regionName || !location.communeName) return 'Selecciona región y comuna del evento.';
        }
        if (targetStep >= 2) {
            if (!recipientName.trim()) return 'Indica a quién va dirigida la serenata.';
            if (!resolvedOccasion) return 'Indica la ocasión para que el músico sepa a qué va.';
            if (!clientPhone.trim()) return 'Ingresa el WhatsApp de coordinación.';
        }
        return null;
    }

    function nextStep() {
        const error = validateStep(step);
        if (error) {
            setStatus({ loading: false, error, ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: null });
        setStep((current) => current === 1 ? 2 : 3);
    }

    async function submit() {
        const error = validateStep(3);
        if (error) {
            setStatus({ loading: false, error, ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
        const address = cleanSerenataAddress(rawAddress, location.communeName, location.regionName);
        const requestMessage = [
            `Ocasión: ${resolvedOccasion}`,
            message.trim() ? `Mensaje: ${message.trim()}` : null,
        ].filter(Boolean).join('\n');
        const response = await serenatasApi.requestSerenata({
            recipientName: recipientName.trim(),
            clientPhone: clientPhone.trim(),
            address,
            comuna: location.communeName,
            region: location.regionName,
            lat: location.geoPoint.latitude == null ? null : String(location.geoPoint.latitude),
            lng: location.geoPoint.longitude == null ? null : String(location.geoPoint.longitude),
            eventDate,
            eventTime,
            packageCode: serenataPackage.code,
            message: requestMessage,
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos contratar la serenata.', ok: null });
            return;
        }
        const checkout = await startSerenataCheckout({
            serenataId: response.item.id,
            returnUrl: `${window.location.origin}/?section=serenatas`,
        });
        if (!checkout.ok || !checkout.checkoutUrl) {
            setStatus({ loading: false, error: checkout.error ?? 'La serenata quedó creada, pero no pudimos iniciar el pago.', ok: null });
            await refresh();
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Redirigiendo al pago seguro...' });
        window.location.assign(checkout.checkoutUrl);
    }

    async function saveCurrentAddress() {
        setAddressStatus({ loading: true, error: null, ok: null });
        if (!address || !location.regionName || !location.communeName) {
            setAddressStatus({ loading: false, error: 'Selecciona una dirección completa antes de guardarla.', ok: null });
            return;
        }
        const result = await createAddressBookEntry({
            kind: 'personal',
            label: location.label?.trim() || location.addressLine1 || 'Dirección de evento',
            countryCode: location.countryCode,
            regionId: location.regionId,
            regionName: location.regionName,
            communeId: location.communeId,
            communeName: location.communeName,
            neighborhood: location.neighborhood,
            addressLine1: location.addressLine1,
            addressLine2: location.addressLine2,
            postalCode: location.postalCode,
            arrivalInstructions: location.arrivalInstructions,
            geoPoint: location.geoPoint,
            isDefault: addressBook.length === 0,
        });
        if (!result.ok) {
            setAddressStatus({ loading: false, error: result.error ?? 'No pudimos guardar la dirección.', ok: null });
            return;
        }
        await refreshAddressBook();
        setAddressStatus({ loading: false, error: null, ok: 'Dirección guardada en Mi Cuenta.' });
    }

    return (
        <PanelCard size="lg" className={modal ? 'max-w-3xl' : 'lg:min-h-[680px]'}>
            <PanelBlockHeader
                title={`Contratar ${serenataPackage.label}`}
                description={`${serenataPackage.musicians} músicos · ${serenataPackage.duration} min · ${money(serenataPackage.price)}`}
            />
            <ContractStepIndicator step={step} />

            {step === 1 ? (
                <div className="mt-5 grid gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <PanelField label="Fecha"><FieldInput type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></PanelField>
                        <PanelField label="Hora"><FieldInput type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></PanelField>
                    </div>
                    <ListingLocationEditor
                        title="Dirección del evento"
                        description="Escribe y selecciona una sugerencia de Google Maps."
                        simpleMode
                        location={location}
                        onChange={setLocation}
                        regions={regions}
                        communes={communes}
                        addressBook={addressBook}
                        addressBookLoading={addressBookLoading}
                        addressFirst
                        showAddressLine2={false}
                        showAreaFields
                        showSourceSelector={false}
                        showVisibilityField={false}
                        showPublicPreviewCard={false}
                        showActionBar={false}
                        showSimpleVisibilityToggle={false}
                        showGoogleMapsLink
                        addressRequired
                        onSaveToAddressBook={saveCurrentAddress}
                        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    />
                    <FormFeedback status={addressStatus} />
                </div>
            ) : null}

            {step === 2 ? (
                <div className="mt-5 grid gap-4">
                    <PanelField label="A quién va dirigida">
                        <FieldInput value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nombre de la persona homenajeada" />
                    </PanelField>
                    <PanelField label="Ocasión">
                        <FieldSelect value={occasion} onChange={(event) => setOccasion(event.target.value)}>
                            {SERENATA_OCCASIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </FieldSelect>
                    </PanelField>
                    {occasion === 'Otro' ? (
                        <PanelField label="Describe la ocasión">
                            <FieldInput value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} placeholder="Ej: Pedida de matrimonio, sorpresa familiar..." />
                        </PanelField>
                    ) : null}
                    <PanelField label="Mensaje para cantar o dedicar">
                        <FieldTextarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ej: Para mi mamá Ana, con mucho cariño..." />
                    </PanelField>
                    <PanelField label="Contacto de coordinación">
                        <FieldInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+56 9..." />
                    </PanelField>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Usamos este WhatsApp para coordinar con quien contrata. No tiene que ser el número de la persona sorprendida.
                    </p>
                </div>
            ) : null}

            {step === 3 ? (
                <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>Revisa antes de contratar</p>
                    <div className="mt-4 grid gap-3 text-sm">
                        <ContractSummaryRow label="Paquete" value={`${serenataPackage.label} · ${serenataPackage.musicians} músicos`} />
                        <ContractSummaryRow label="Precio" value={money(serenataPackage.price)} strong />
                        <ContractSummaryRow label="Pago" value="Pagar ahora para enviar a coordinadores" strong />
                        <ContractSummaryRow label="Evento" value={`${formatDate(eventDate)} · ${eventTime}`} />
                        <ContractSummaryRow label="Dirección" value={address || 'Sin dirección'} />
                        <ContractSummaryRow label="Dirigida a" value={recipientName || 'Sin destinatario'} />
                        <ContractSummaryRow label="Contacto" value={clientPhone || 'Sin teléfono'} />
                        <ContractSummaryRow label="Ocasión" value={resolvedOccasion || 'Sin ocasión'} />
                    </div>
                </div>
            ) : null}

            <FormFeedback status={status} />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                {step > 1 ? (
                    <PanelButton variant="secondary" disabled={status.loading} onClick={() => setStep((current) => current === 3 ? 2 : 1)}>
                        Volver
                    </PanelButton>
                ) : <span />}
                {step < 3 ? (
                    <PanelButton onClick={nextStep}>Continuar</PanelButton>
                ) : (
                    <PanelButton disabled={status.loading} onClick={() => void submit()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlus size={15} />}
                        Pagar y contratar
                    </PanelButton>
                )}
            </div>
        </PanelCard>
    );
}

function ContractStepIndicator({ step }: { step: 1 | 2 | 3 }) {
    const steps = ['Fecha y dirección', 'Destinatario', 'Confirmar y pago'];
    return (
        <div className="mt-5 grid grid-cols-3 gap-2">
            {steps.map((label, index) => {
                const active = step === index + 1;
                const done = step > index + 1;
                return (
                    <div
                        key={label}
                        className="rounded-xl border px-3 py-2 text-center text-xs font-semibold"
                        style={{
                            borderColor: active || done ? 'var(--accent-border)' : 'var(--border)',
                            background: active || done ? 'var(--accent-soft)' : 'var(--surface)',
                            color: active || done ? 'var(--accent)' : 'var(--fg-muted)',
                        }}
                    >
                        {label}
                    </div>
                );
            })}
        </div>
    );
}

function ContractSummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <span className={strong ? 'font-semibold' : ''} style={{ color: strong ? 'var(--accent)' : 'var(--fg)' }}>{value}</span>
        </div>
    );
}

type SerenataFilter = 'all' | Serenata['status'] | 'closed';
type SerenataOriginFilter = 'all' | Serenata['source'];
type SerenataMode = 'detail' | 'edit' | 'assignGroup';

export function SerenatasView({ serenatas, groups, musicians, selectedSerenataId, action, clearAction, refresh, isSolicitudesMode = false }: { serenatas: Serenata[]; groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; selectedSerenataId?: string | null; refresh: () => Promise<void>; isSolicitudesMode?: boolean } & PanelActionProps) {
    const [filter, setFilter] = useState<SerenataFilter>('all');
    const [originFilter, setOriginFilter] = useState<SerenataOriginFilter>('all');
    const [selectedId, setSelectedId] = useState<string | null>(serenatas[0]?.id ?? null);
    const [mode, setMode] = useState<SerenataMode>('detail');
    const [createOpen, setCreateOpen] = useState(false);
    const [packages, setPackages] = useState<SerenataPackage[]>([]);
    const selected = serenatas.find((item) => item.id === selectedId) ?? serenatas[0] ?? null;
    const filtered = serenatas.filter((item) => {
        if (isSolicitudesMode) return true; // Already filtered by refresh in SerenatasApp
        const matchesStatus = filter === 'all'
            || (filter === 'closed' ? ['cancelled', 'rejected', 'expired'].includes(item.status) : item.status === filter);
        const matchesOrigin = originFilter === 'all' || item.source === originFilter;
        return matchesStatus && matchesOrigin;
    });
    const pendingCount = serenatas.filter((item) => item.status === 'pending').length;
    const needsGroupCount = serenatas.filter((item) => item.status === 'accepted_pending_group').length;
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;
    const completedCount = serenatas.filter((item) => item.status === 'completed').length;
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
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('serenatas-filter') : null;
        if (stored === 'pending') {
            setFilter('pending');
            window.localStorage.removeItem('serenatas-filter');
        }
    }, []);

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
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>{isSolicitudesMode ? 'Solicitudes' : 'Serenatas'}</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {isSolicitudesMode 
                                ? `${serenatas.length} solicitudes por revisar o asignar`
                                : `${serenatas.length} registros entre propias y aplicación`
                            }
                        </p>
                    </div>
                </div>

                {!isSolicitudesMode ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <PanelField label="Estado">
                            <FieldSelect value={filter} onChange={(event) => setFilter(event.target.value as SerenataFilter)}>
                                <option value="all">Todas ({serenatas.length})</option>
                                <option value="pending">Pendientes ({pendingCount})</option>
                                <option value="accepted_pending_group">Falta grupo ({needsGroupCount})</option>
                                <option value="scheduled">Programadas ({scheduledCount})</option>
                                <option value="completed">Completadas ({completedCount})</option>
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
                ) : null}

                <div className="mt-6 grid gap-4">
                    {filtered.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                            <EmptyBlock 
                                title={isSolicitudesMode ? 'Sin solicitudes pendientes' : 'Sin serenatas'} 
                                description={isSolicitudesMode ? 'Todo está al día. Las nuevas solicitudes aparecerán aquí.' : 'Crea una serenata propia para empezar.'} 
                            />
                            <PanelButton className="mt-6" onClick={() => setCreateOpen(true)}>
                                <IconPlus size={15} />
                                Nueva serenata
                            </PanelButton>
                        </div>
                    ) : (
                        <>
                            {filtered.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { setSelectedId(item.id); setMode('detail'); }}
                                    className="group w-full rounded-2xl border p-5 text-left transition-all hover:shadow-md"
                                    style={{
                                        borderColor: selected?.id === item.id ? 'var(--accent)' : 'var(--border)',
                                        background: selected?.id === item.id ? 'var(--accent-soft)' : 'var(--surface)',
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-base font-bold" style={{ color: 'var(--fg)' }}>{item.recipientName}</p>
                                                <SerenataSourceBadge source={item.source} size="sm" />
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
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
                                            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{money(item.price)}</p>
                                            <div className="mt-2">
                                                <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} size="sm" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-6 text-sm font-medium transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
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
    const isPendingApp = item.source === 'platform_lead' && item.status === 'pending' && item.offerStatus === 'offered';
    const needsGroup = item.status === 'accepted_pending_group' && !item.groupId;
    const commission = item.source === 'platform_lead' && item.price != null ? Math.round(item.price * 0.08 * 1.19) : null;
    const net = item.price != null && commission != null ? item.price - commission : item.price;

    async function updateStatus(action: 'complete' | 'cancel') {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateSerenataStatus(item.id, action);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos actualizar la serenata.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: action === 'complete' ? 'Serenata completada.' : 'Serenata cancelada.' });
        await refresh();
    }

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
            <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} />
                        <SerenataSourceBadge source={item.source} />
                    </div>
                    <h2 className="break-words text-2xl font-bold lg:text-3xl" style={{ color: 'var(--fg)' }}>{item.recipientName}</h2>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{item.eventType ?? 'Serenata'}{group ? ` · ${group.name}` : ''}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                    <p className="text-3xl font-bold lg:text-4xl" style={{ color: 'var(--accent)' }}>{money(item.price)}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>por serenata</p>
                </div>
            </div>

            {isPendingApp ? (
                <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Solicitud disponible</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
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
                <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Falta asignar grupo</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                El cliente ya tiene coordinador, pero la serenata se confirma cuando selecciones el grupo que la cubrirá.
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Dirección</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.address}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Contacto de coordinación</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.clientPhone ?? 'Sin teléfono'}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Duración</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.duration} minutos</p>
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Servicio contratado</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.eventType ?? item.packageCode ?? 'Sin servicio definido'}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Grupo</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{group?.name ?? 'Sin grupo asignado'}</p>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Origen</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                    {item.source === 'own_lead'
                        ? 'Serenata propia agregada por el coordinador. Costo de plataforma: $0.'
                        : 'Serenata enviada por la aplicación. Comisión aplicable: 8% + IVA.'}
                </p>
            </div>

            {item.message ? (
                <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Mensaje</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.message}</p>
                </div>
            ) : null}

            <FormFeedback status={status} />
            <div className="sticky bottom-3 z-10 mt-6 flex flex-col gap-3 rounded-2xl border p-3 shadow-sm md:static md:rounded-none md:border-0 md:border-t md:p-0 md:pt-5 md:shadow-none sm:flex-row" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                        {item.status === 'scheduled' && (
                            <>
                                <PanelButton className="flex-1" variant="secondary" disabled={status.loading} onClick={() => void updateStatus('complete')}>
                                    <IconCheck size={15} />
                                    Completar
                                </PanelButton>
                                <PanelButton className="flex-1" variant="secondary" disabled={status.loading} onClick={() => void updateStatus('cancel')}>
                                    <IconX size={15} />
                                    Cancelar
                                </PanelButton>
                            </>
                        )}
                    </>
                )}
            </div>
        </PanelCard>
    );
}

function SerenataGroupAssignment({ item, groups, musicians, refresh, onDone, onCancel }: { item: Serenata; groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; refresh: () => Promise<void>; onDone: (item: Serenata) => void; onCancel: () => void }) {
    const sameDateGroups = groups.filter((group) => toInputDate(group.date) === toInputDate(item.eventDate));
    const initialGroupId = sameDateGroups[0]?.id ?? groups[0]?.id ?? '';
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [mode, setMode] = useState<'existing' | 'new'>(initialGroupId ? 'existing' : 'new');
    const [groupId, setGroupId] = useState(initialGroupId);
    const [name, setName] = useState(`Grupo ${formatDate(item.eventDate)} ${item.eventTime}`);
    const [selectedMusicians, setSelectedMusicians] = useState<string[]>([]);
    const [message, setMessage] = useState(`Serenata para ${item.recipientName} el ${formatDate(item.eventDate)} a las ${item.eventTime}.`);
    const selectedGroup = groups.find((group) => group.id === groupId);
    const selectedGroupMemberCount = selectedGroup?.members.length ?? 0;
    const requiredMusicians = requiredMusiciansForPackage(item.packageCode);
    const selectedGroupTotal = selectedGroupMemberCount + selectedMusicians.length;
    const groupDateMismatch = selectedGroup?.date && toInputDate(selectedGroup.date) !== toInputDate(item.eventDate);
    const sortedMusicians = [...musicians].sort((a, b) => {
        const aMatch = a.comuna === item.comuna || a.region === item.region ? 0 : 1;
        const bMatch = b.comuna === item.comuna || b.region === item.region ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.name.localeCompare(b.name);
    });

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

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="grid gap-4 md:grid-cols-3">
                    <SerenataDetailMetric icon={IconClock} label="Fecha y hora" title={`${formatDate(item.eventDate)} a las ${item.eventTime}`} />
                    <SerenataDetailMetric icon={IconMapPin} label="Comuna" title={item.comuna ?? 'Sin comuna'} description={item.region ?? undefined} />
                    <MoneyMetric label="Precio confirmado" value={item.price} strong />
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setMode('existing')}
                    className="rounded-2xl border p-4 text-left transition-colors"
                    style={{ borderColor: mode === 'existing' ? 'var(--accent-border)' : 'var(--border)', background: mode === 'existing' ? 'var(--accent-soft)' : 'var(--surface)' }}
                >
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Usar grupo existente</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>Ideal si ya tienes un grupo armado para esa fecha.</p>
                </button>
                <button
                    type="button"
                    onClick={() => setMode('new')}
                    className="rounded-2xl border p-4 text-left transition-colors"
                    style={{ borderColor: mode === 'new' ? 'var(--accent-border)' : 'var(--border)', background: mode === 'new' ? 'var(--accent-soft)' : 'var(--surface)' }}
                >
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Crear grupo para esta serenata</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>Crea el grupo e invita músicos en un solo paso.</p>
                </button>
            </div>

            <div className="mt-5 grid gap-4">
                {mode === 'existing' ? (
                    <PanelField label="Grupo">
                        <FieldSelect value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                            <option value="">Seleccionar grupo</option>
                            {sameDateGroups.length > 0 ? <optgroup label="Misma fecha">{sameDateGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.members.length} músicos</option>)}</optgroup> : null}
                            <optgroup label="Todos los grupos">
                                {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {formatDate(group.date)}</option>)}
                            </optgroup>
                        </FieldSelect>
                    </PanelField>
                ) : (
                    <PanelField label="Nombre del grupo">
                        <FieldInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Grupo serenata viernes" />
                    </PanelField>
                )}

                {groupDateMismatch ? (
                    <PanelNotice tone="error">El grupo seleccionado no tiene la misma fecha que la serenata. Elige un grupo con fecha {formatDate(item.eventDate)} o crea uno nuevo.</PanelNotice>
                ) : null}

                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Invitar músicos</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {mode === 'existing' && selectedGroupMemberCount > 0
                                    ? `El grupo seleccionado ya tiene ${selectedGroupMemberCount} integrante${selectedGroupMemberCount === 1 ? '' : 's'}. Puedes sumar más.`
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
                                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors"
                                    style={{ borderColor: checked ? 'var(--accent-border)' : 'var(--border)', background: checked ? 'var(--accent-soft)' : 'var(--bg-subtle)' }}
                                >
                                    <input className="mt-1" type="checkbox" checked={checked} onChange={() => toggleMusician(musician.id)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold" style={{ color: 'var(--fg)' }}>{musician.name}</span>
                                        <span className="mt-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {(musician.instrument || musician.instruments[0] || 'Instrumento por confirmar')} · {musician.comuna ?? musician.region ?? 'Sin comuna'}
                                        </span>
                                    </span>
                                    {musician.availableNow ? <PanelStatusBadge tone="success" label="Disponible" size="sm" /> : null}
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
        <div className="min-w-0 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className={`${strong ? 'font-bold' : 'font-semibold'} mt-1 truncate text-base lg:text-lg`} style={{ color: strong ? 'var(--accent)' : 'var(--fg)' }}>
                {money(value)}
            </p>
        </div>
    );
}

function SerenataSourceBadge({ source, size = 'md' }: { source: Serenata['source']; size?: 'sm' | 'md' }) {
    const isOwn = source === 'own_lead';
    return (
        <span
            className={`${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} rounded-full font-medium`}
            style={{
                background: isOwn ? 'var(--bg-muted)' : 'var(--accent-soft)',
                color: isOwn ? 'var(--fg-muted)' : 'var(--accent)',
            }}
        >
            {isOwn ? 'Propia' : 'Aplicación'}
        </span>
    );
}

function SerenataDetailMetric({ icon: Icon, label, title, description }: { icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties; className?: string }>; label: string; title: string; description?: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon size={19} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
            <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                {description ? <p className="mt-1 text-sm" style={{ color: 'var(--accent)' }}>{description}</p> : null}
            </div>
        </div>
    );
}

export function SerenataForm({ title, item, groups, packages, refresh, onDone, onCancel, modal = false }: { title: string; item?: Serenata; groups: SerenataGroup[]; packages: SerenataPackage[]; refresh: () => Promise<void>; onDone: (item: Serenata) => void; onCancel?: () => void; modal?: boolean }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
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
            setStatus({ loading: false, error: 'Selecciona una dirección de Google Maps que incluya comuna y región.', ok: null });
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
                description={item ? 'Actualiza los datos principales de esta serenata.' : 'Registra una serenata propia. Costo de plataforma para el coordinador: $0.'}
                actions={item ? <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} /> : null}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PanelField label="Destinatario"><FieldInput value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nombre" /></PanelField>
                <PanelField label="Contacto de coordinación"><FieldInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+56 9..." /></PanelField>
                <PanelField label="Fecha"><FieldInput type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></PanelField>
                <PanelField label="Hora"><FieldInput type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></PanelField>
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
                <PanelField label="Grupo">
                    <FieldSelect value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                        <option value="">Sin grupo</option>
                        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </FieldSelect>
                </PanelField>
            </div>
            <div className="mt-4">
                <ListingLocationEditor
                    title="Dirección del evento"
                    description="Escribe y selecciona una sugerencia de Google Maps."
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
                <div className="mt-3 rounded-2xl border p-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--fg)' }}>Ubicación detectada:</span>{' '}
                    {location.addressLine1 || 'Sin dirección'}{location.communeName ? ` · ${location.communeName}` : ''}{location.regionName ? ` · ${location.regionName}` : ''}
                </div>
            </div>
            <PanelField className="mt-3" label="Mensaje"><FieldTextarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></PanelField>
            <FormFeedback status={status} />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Nueva serenata">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 cursor-default"
                style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)' }}
                onClick={onClose}
            />
            <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl sm:max-w-3xl sm:rounded-3xl">
                {children}
            </div>
        </div>
    );
}
