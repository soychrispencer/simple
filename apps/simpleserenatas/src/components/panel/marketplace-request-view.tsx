'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconArrowLeft, IconCreditCard, IconLoader2, IconX } from '@tabler/icons-react';
import { ListingLocationEditor, PanelButton, PanelCard, PanelField, PanelNotice } from '@simple/ui';
import type { AddressBookEntry, ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { serenatasApi, type ProviderGroup, type ProviderGroupService, type RepertoireSong } from '@/lib/serenatas-api';
import { RepertoireSongPicker } from './repertoire-song-picker';
import { startSerenataCheckout } from '@/lib/payments';
import { panelSectionHref } from '@/lib/panel-routes';
import { clearMarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';
import {
    cleanSerenataAddress,
    FieldInput,
    FieldSelect,
    FieldTextarea,
    FormFeedback,
    money,
    serenataLocation,
    today,
    toInputDate,
    type FormStatus,
} from './shared';

const REQUEST_STEPS = [
    { id: 1 as const, label: 'Evento' },
    { id: 2 as const, label: 'Lugar y pago' },
];

function ModalCloseButton({ onClose }: { onClose: () => void }) {
    return (
        <button
            type="button"
            className="shrink-0 rounded-xl bg-bg-subtle p-2 text-fg-muted transition-colors hover:text-fg"
            onClick={onClose}
            aria-label="Cerrar"
        >
            <IconX size={18} />
        </button>
    );
}

function RequestStepIndicator({ step }: { step: 1 | 2 }) {
    return (
        <ol className="flex gap-2" aria-label="Pasos de la solicitud">
            {REQUEST_STEPS.map((item, index) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                    <li
                        key={item.id}
                        className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                            active
                                ? 'border-accent-border bg-accent-soft text-accent'
                                : done
                                  ? 'border-border bg-bg-subtle text-fg'
                                  : 'border-border text-fg-muted'
                        }`}
                    >
                        <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                active ? 'bg-accent text-[var(--button-primary-color)]' : 'bg-bg-subtle text-fg-muted'
                            }`}
                        >
                            {item.id}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {index < REQUEST_STEPS.length - 1 ? (
                            <span className="ml-auto hidden text-fg-muted sm:inline" aria-hidden>
                                →
                            </span>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

function ServiceSummaryCard({
    group,
    service,
    compact = false,
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    compact?: boolean;
}) {
    if (compact) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{service.name}</p>
                    <p className="truncate text-xs text-fg-muted">{group.name}</p>
                </div>
                <p className="shrink-0 text-lg font-bold text-accent">{money(service.price)}</p>
            </div>
        );
    }

    return (
        <PanelCard className="xl:sticky xl:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">Servicio seleccionado</p>
            <h3 className="mt-2 text-xl font-semibold text-fg">{service.name}</h3>
            <p className="mt-1 text-sm text-fg-muted">{group.name}</p>
            <div className="mt-5 grid gap-3 rounded-card border border-border bg-bg-subtle p-4">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-fg-muted">Precio</span>
                    <span className="text-lg font-semibold text-accent">{money(service.price)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-fg-muted">Duración</span>
                    <span className="text-sm font-medium text-fg">{service.durationMinutes} min</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-fg-muted">Músicos</span>
                    <span className="text-sm font-medium text-fg">{service.musiciansCount}</span>
                </div>
            </div>
            <PanelNotice tone="neutral" className="mt-4">
                Al confirmar el pago, enviamos la solicitud al dueño. Si el grupo no puede cubrirla, verás la respuesta en Mis Serenatas.
            </PanelNotice>
        </PanelCard>
    );
}

export function MarketplaceRequestView({
    group,
    service,
    contactPhone,
    onBack,
    variant = 'page',
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    contactPhone: string;
    onBack: () => void;
    variant?: 'page' | 'modal';
}) {
    const inModal = variant === 'modal';
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const [recipientName, setRecipientName] = useState('');
    const [clientPhone, setClientPhone] = useState(contactPhone);
    const [eventDate, setEventDate] = useState(today);
    const [eventTime, setEventTime] = useState('20:00');
    const [flexibleSchedule, setFlexibleSchedule] = useState(false);
    const [message, setMessage] = useState('');
    const [location, setLocation] = useState<ListingLocation>(() => serenataLocation());
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [pendingCreated, setPendingCreated] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [repertoire, setRepertoire] = useState<RepertoireSong[]>([]);
    const [repertoireLoading, setRepertoireLoading] = useState(false);
    const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
    const songsIncluded = service.songsIncluded ?? 0;

    const regions = LOCATION_REGIONS.map((region) => ({ value: region.id, label: region.name }));
    const communes = getCommunesForRegion(location.regionId ?? '').map((commune) => ({
        value: commune.id,
        label: commune.name,
    }));
    const addressSummary = useMemo(
        () => cleanSerenataAddress(
            [location.addressLine1, location.addressLine2].filter(Boolean).join(', '),
            location.communeName?.trim() ?? '',
            location.regionName?.trim() ?? '',
        ),
        [location.addressLine1, location.addressLine2, location.communeName, location.regionName],
    );

    useEffect(() => {
        void fetchAddressBook().then((response) => {
            setAddressBook(response.ok ? response.items : []);
            setAddressBookLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!contactPhone || clientPhone.trim()) return;
        setClientPhone(contactPhone);
    }, [clientPhone, contactPhone]);

    useEffect(() => {
        if (flexibleSchedule) {
            setAvailableSlots([]);
            setSlotsLoading(false);
            return;
        }
        const day = toInputDate(eventDate);
        if (!day) {
            setAvailableSlots([]);
            setEventTime('');
            return;
        }
        let cancelled = false;
        setSlotsLoading(true);
        void serenatasApi.marketplaceAvailability(group.slug, day, service.id).then((response) => {
            if (cancelled) return;
            const slots = response.ok ? response.slots ?? [] : [];
            setAvailableSlots(slots);
            setEventTime((current) => slots.includes(current) ? current : slots[0] ?? '');
            setSlotsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [eventDate, flexibleSchedule, group.slug, service.id]);

    useEffect(() => {
        setStep(1);
        setSelectedSongIds([]);
        setStatus({ loading: false, error: null, ok: null });
    }, [group.id, service.id]);

    useEffect(() => {
        if (songsIncluded <= 0) {
            setRepertoire([]);
            return;
        }
        let cancelled = false;
        setRepertoireLoading(true);
        void serenatasApi.marketplaceServiceRepertoire(group.id, service.id).then((response) => {
            if (cancelled) return;
            setRepertoire(response.ok ? response.items : []);
            setRepertoireLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [group.id, service.id, songsIncluded]);

    function validateStep1(): string | null {
        if (!recipientName.trim()) return 'Indica a quién va dirigida la serenata.';
        if (!clientPhone.trim()) return 'Indica un teléfono de contacto.';
        if (!eventDate) return 'Selecciona la fecha del evento.';
        if (!flexibleSchedule) {
            if (slotsLoading) return 'Espera que carguen los horarios disponibles.';
            if (!availableSlots.length) {
                return 'No hay horarios disponibles para esa fecha. Marca horario por definir o cambia la fecha.';
            }
            if (!eventTime || !availableSlots.includes(eventTime)) {
                return 'Selecciona uno de los horarios disponibles.';
            }
        }
        return null;
    }

    function goToStep2() {
        const stepError = validateStep1();
        if (stepError) {
            setStatus({ loading: false, error: stepError, ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: null });
        setStep(2);
    }

    async function submit() {
        const regionName = location.regionName?.trim() ?? '';
        const communeName = location.communeName?.trim() ?? '';
        const recipient = recipientName.trim();
        const phone = clientPhone.trim();
        const address = addressSummary;
        const lat = location.geoPoint.latitude == null ? null : Number(location.geoPoint.latitude);
        const lng = location.geoPoint.longitude == null ? null : Number(location.geoPoint.longitude);

        const stepError = validateStep1();
        if (stepError) {
            setStep(1);
            setStatus({ loading: false, error: stepError, ok: null });
            return;
        }
        if (!address || !communeName || !regionName) {
            setStatus({ loading: false, error: 'Completa la dirección, comuna y región del evento.', ok: null });
            return;
        }

        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.requestMarketplaceSerenata({
            providerGroupId: group.id,
            serviceId: service.id,
            recipientName: recipient,
            clientPhone: phone,
            address,
            comuna: communeName,
            region: regionName,
            lat,
            lng,
            eventDate: toInputDate(eventDate) ?? eventDate,
            eventTime: flexibleSchedule ? null : eventTime,
            flexibleSchedule,
            message: message.trim() || null,
            songSelections:
                songsIncluded > 0 && selectedSongIds.length > 0
                    ? selectedSongIds.map((repertoireSongId) => ({ repertoireSongId }))
                    : undefined,
        });
        if (!response.ok) {
            setStatus({
                loading: false,
                error: response.error ?? 'No pudimos crear la solicitud.',
                ok: null,
            });
            return;
        }

        setPendingCreated(true);
        clearMarketplaceRequestDraftRef();
        const returnUrl = `${window.location.origin}${panelSectionHref('serenatas')}`;
        const checkout = await startSerenataCheckout({
            serenataId: response.item.id,
            returnUrl,
        });
        if (!checkout.ok || !checkout.checkoutUrl) {
            setStatus({
                loading: false,
                error: checkout.error ?? 'La solicitud quedó pendiente, pero no pudimos iniciar el pago. Puedes retomarlo en Mis Serenatas.',
                ok: null,
            });
            return;
        }
        setStatus({ loading: true, error: null, ok: 'Redirigiendo al pago...' });
        window.location.assign(checkout.checkoutUrl);
    }

    async function saveCurrentAddress() {
        if (!location.regionName || !location.communeName || !location.addressLine1) return;
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
        if (result.ok) {
            const refreshed = await fetchAddressBook();
            if (refreshed.ok) setAddressBook(refreshed.items);
        }
    }

    const eventFields = (
        <>
            <PanelField label="A quién va dirigida" required>
                <FieldInput
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Nombre de la persona homenajeada"
                />
            </PanelField>

            <PanelField label="Teléfono de contacto" hint="Usamos el teléfono de tu cuenta; puedes cambiarlo para esta serenata." required>
                <FieldInput
                    value={clientPhone}
                    onChange={(event) => setClientPhone(event.target.value)}
                    placeholder="+56 9..."
                />
            </PanelField>

            <div className="grid gap-3 sm:grid-cols-2">
                <PanelField label="Fecha" required>
                    <FieldInput
                        type="date"
                        value={toInputDate(eventDate) ?? ''}
                        min={toInputDate(today) ?? undefined}
                        onChange={(event) => setEventDate(event.target.value)}
                    />
                </PanelField>
                <PanelField label="Hora" required={!flexibleSchedule}>
                    <FieldSelect
                        value={eventTime}
                        disabled={flexibleSchedule || slotsLoading || availableSlots.length === 0}
                        onChange={(event) => setEventTime(event.target.value)}
                    >
                        {slotsLoading ? (
                            <option value="">Cargando horarios...</option>
                        ) : availableSlots.length > 0 ? (
                            availableSlots.map((slot) => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))
                        ) : (
                            <option value="">Sin horarios disponibles</option>
                        )}
                    </FieldSelect>
                </PanelField>
            </div>

            <label className="flex items-start gap-2 text-sm text-fg">
                <input
                    className="mt-1"
                    type="checkbox"
                    checked={flexibleSchedule}
                    onChange={(event) => setFlexibleSchedule(event.target.checked)}
                />
                <span>
                    Aún no sé la hora exacta
                    <span className="block text-xs text-fg-muted">El dueño deberá proponerte horario antes de aceptar.</span>
                </span>
            </label>

            <PanelField label="Mensaje o dedicatoria" hint="Opcional. Sirve para orientar al grupo antes del evento.">
                <FieldTextarea
                    rows={inModal ? 2 : 3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ej: cumpleaños, aniversario, canción especial o indicaciones de sorpresa."
                />
            </PanelField>

            {songsIncluded > 0 ? (
                <div className="rounded-xl border border-border bg-bg-subtle/60 p-3">
                    {repertoireLoading ? (
                        <p className="text-sm text-fg-muted">Cargando repertorio…</p>
                    ) : (
                        <RepertoireSongPicker
                            songs={repertoire}
                            maxSelections={songsIncluded}
                            selectedIds={selectedSongIds}
                            onChange={setSelectedSongIds}
                        />
                    )}
                </div>
            ) : null}
        </>
    );

    const addressFields = (
        <div className="rounded-card border border-border p-4">
            <p className="text-sm font-semibold text-fg">Dirección del evento</p>
            <p className="mt-1 text-xs text-fg-muted">Selecciona una dirección guardada o escribe una nueva con sugerencias de Google Maps.</p>
            <div className="mt-4">
                <ListingLocationEditor
                    simpleMode
                    framed={false}
                    showHeader={false}
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
                    addressHintMode="minimal"
                    onSaveToAddressBook={() => void saveCurrentAddress()}
                    googleMapsApiKey={googleMapsApiKey}
                />
            </div>
        </div>
    );

    const actionButtons = inModal ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {step === 2 ? (
                <PanelButton variant="secondary" disabled={status.loading} onClick={() => setStep(1)}>
                    Atrás
                </PanelButton>
            ) : null}
            {step === 1 ? (
                <PanelButton
                    variant="primary"
                    className="w-full sm:w-auto"
                    disabled={slotsLoading}
                    onClick={goToStep2}
                >
                    Continuar
                </PanelButton>
            ) : (
                <PanelButton
                    variant="primary"
                    className="w-full sm:w-auto"
                    disabled={status.loading || slotsLoading || pendingCreated}
                    onClick={() => void submit()}
                >
                    {status.loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconCreditCard size={16} />}
                    {status.loading ? 'Procesando...' : 'Pagar y solicitar'}
                </PanelButton>
            )}
        </div>
    ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <PanelButton variant="secondary" disabled={status.loading} onClick={onBack}>
                Cancelar
            </PanelButton>
            <PanelButton
                variant="primary"
                className="w-full sm:w-auto"
                disabled={status.loading || slotsLoading || pendingCreated}
                onClick={() => void submit()}
            >
                {status.loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconCreditCard size={16} />}
                {status.loading ? 'Procesando...' : 'Pagar y solicitar'}
            </PanelButton>
        </div>
    );

    if (inModal) {
        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-lg font-semibold text-fg">Solicitar serenata</p>
                            <RequestStepIndicator step={step} />
                        </div>
                        <ModalCloseButton onClose={onBack} />
                    </div>
                    <ServiceSummaryCard group={group} service={service} compact />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
                    <p className="text-base font-semibold text-fg">
                        {step === 2 ? 'Lugar del evento' : 'Datos del evento'}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        {step === 2
                            ? 'Indica dónde será la serenata.'
                            : 'Quién, cuándo y detalles del homenaje.'}
                    </p>
                    <div className="mt-3 grid gap-3">
                        {step === 1 ? eventFields : addressFields}
                    </div>
                </div>

                <div className="shrink-0 space-y-2 border-t border-border bg-surface px-4 py-3 sm:px-5">
                    <FormFeedback status={status} />
                    {pendingCreated && status.error ? (
                        <PanelButton variant="secondary" onClick={() => window.location.assign(panelSectionHref('serenatas'))}>
                            Ver Mis Serenatas
                        </PanelButton>
                    ) : null}
                    {actionButtons}
                    {step === 2 ? (
                        <p className="text-center text-[11px] leading-snug text-fg-muted">
                            Al pagar, enviamos la solicitud al dueño. Si no puede cubrirla, lo verás en Mis Serenatas.
                        </p>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <PanelButton className="w-fit" variant="ghost" onClick={onBack}>
                <IconArrowLeft size={16} />
                Volver al grupo
            </PanelButton>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                <PanelCard size="lg">
                    <div>
                        <p className="text-lg font-semibold text-fg">Datos del evento</p>
                        <p className="mt-1 text-sm text-fg-muted">
                            Completa la información necesaria antes de pagar. El dueño recibirá la solicitud pagada y confirmará si puede cubrirla con su grupo.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {eventFields}
                        {addressFields}

                        <FormFeedback status={status} />
                        {pendingCreated && status.error ? (
                            <PanelButton variant="secondary" onClick={() => window.location.assign(panelSectionHref('serenatas'))}>
                                Ver Mis Serenatas
                            </PanelButton>
                        ) : null}

                        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
                            {actionButtons}
                        </div>
                    </div>
                </PanelCard>

                <ServiceSummaryCard group={group} service={service} />
            </div>
        </div>
    );
}
