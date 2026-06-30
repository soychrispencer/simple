'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconArrowLeft, IconCheck, IconClock, IconCreditCard, IconLoader2 } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelField, PanelNotice } from '@simple/ui/panel';
import { ListingLocationEditor } from '@simple/ui/location';
import type { AddressBookEntry, ListingLocation } from '@simple/types';
import { bookingTermsFromRecord, createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS, maxBookingInputDate } from '@simple/utils';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import {
    CollapsibleRepertoireSection,
    SerenataFormDualStepFooter,
    SerenataFormModalShell,
    SerenataFormResponsiveLayout,
} from './serenata-form-layout';
import { startSerenataCheckout } from '@/lib/payments';
import { panelSectionHref } from '@/lib/panel-routes';
import { clearMarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { resolveMarketplaceRequestBlock } from '@/lib/marketplace-client-policy';
import { serviceEffectivePrice, serviceHasPromoPrice } from '@/lib/service-pricing';
import { useAuth } from '@simple/auth';
import { useSerenataProfiles } from '@/hooks/use-serenata-profiles';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';
import {
    cleanSerenataAddress,
    FieldDate,
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

function ServiceSummaryCard({
    group,
    service,
    compact = false,
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    compact?: boolean;
}) {
    const hasPromo = serviceHasPromoPrice(service);
    const displayPrice = serviceEffectivePrice(service);
    if (compact) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{service.name}</p>
                    <p className="truncate text-xs text-fg-muted">{group.name}</p>
                </div>
                <div className="shrink-0 text-right">
                    {hasPromo ? <p className="text-xs font-semibold text-fg-muted line-through">{money(service.price)}</p> : null}
                    <p className="text-lg font-bold text-accent">{money(displayPrice)}</p>
                </div>
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
                    <span className="text-right">
                        {hasPromo ? <span className="mr-2 text-sm font-semibold text-fg-muted line-through">{money(service.price)}</span> : null}
                        <span className="text-lg font-semibold text-accent">{money(displayPrice)}</span>
                    </span>
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
                Al confirmar el pago, enviamos la solicitud al dueño. Si el grupo no puede cubrirla, verás la respuesta en Mis serenatas.
            </PanelNotice>
        </PanelCard>
    );
}

export function MarketplaceRequestView({
    group,
    service,
    contactPhone,
    initialDate,
    onBack,
    variant = 'page',
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    contactPhone: string;
    initialDate?: string;
    onBack: () => void;
    variant?: 'page' | 'modal';
}) {
    const inModal = variant === 'modal';
    const { user, isLoggedIn } = useAuth();
    const { profiles, profilesReady } = useSerenataProfiles();
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const requestBlock = resolveMarketplaceRequestBlock(profiles, {
        isLoggedIn,
        profilesReady,
        userId: user?.id,
        group,
    });
    const [recipientName, setRecipientName] = useState('');
    const [clientPhone, setClientPhone] = useState(contactPhone);
    const [eventDate, setEventDate] = useState(() => initialRequestDate(initialDate));
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
    const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
    const [policyAgreed, setPolicyAgreed] = useState(false);
    const songsIncluded = service.songsIncluded ?? 0;
    const bookingTerms = useMemo(() => bookingTermsFromRecord(group), [group]);
    const requiresPolicyAcceptance = bookingTerms.length > 0;

    const timeSlotOptions = useMemo(() => {
        if (slotsLoading) {
            return [{ value: '', label: 'Cargando horarios…', disabled: true }];
        }
        if (availableSlots.length === 0) {
            return [{ value: '', label: 'Sin horarios disponibles', disabled: true }];
        }
        return availableSlots.map((slot) => ({ value: slot, label: slot }));
    }, [availableSlots, slotsLoading]);

    const maxEventDate = useMemo(
        () => maxBookingInputDate(group.bookingWindowDays ?? 30),
        [group.bookingWindowDays],
    );

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
        setPolicyAgreed(false);
        setStatus({ loading: false, error: null, ok: null });
    }, [group.id, service.id]);

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
        if (!requestBlock.allowed) {
            setStatus({ loading: false, error: requestBlock.reason, ok: null });
            return;
        }

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
        if (requiresPolicyAcceptance && !policyAgreed) {
            setStatus({ loading: false, error: 'Debes leer y aceptar las políticas y condiciones del grupo.', ok: null });
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
            policyAgreed: requiresPolicyAcceptance ? policyAgreed : undefined,
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
                error: checkout.error ?? 'La solicitud quedó pendiente, pero no pudimos iniciar el pago. Puedes retomarlo en Mis serenatas.',
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
                    <FieldDate
                        value={toInputDate(eventDate) ?? ''}
                        min={toInputDate(today) ?? undefined}
                        max={maxEventDate}
                        onChange={setEventDate}
                    />
                </PanelField>
                <PanelField label="Hora" required={!flexibleSchedule}>
                    <FieldSelect
                        value={eventTime}
                        options={timeSlotOptions}
                        placeholder="Seleccionar hora"
                        disabled={flexibleSchedule || slotsLoading || availableSlots.length === 0}
                        leadingIcon={<IconClock size={16} stroke={1.75} />}
                        onChange={(event) => setEventTime(event.target.value)}
                    />
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
                <CollapsibleRepertoireSection
                    providerGroupId={group.id}
                    serviceId={service.id}
                    songsIncluded={songsIncluded}
                    variant="client"
                    selectedIds={selectedSongIds}
                    onChange={setSelectedSongIds}
                />
            ) : null}
        </>
    );

    const addressFields = (
        <div className="min-w-0">
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
    );

    const policyFields = requiresPolicyAcceptance ? (
        <div className="space-y-3 rounded-xl border border-border bg-bg-subtle p-4">
            <div>
                <p className="text-sm font-semibold text-fg">Políticas y condiciones</p>
                <p className="mt-1 text-xs text-fg-muted">
                    Lee las condiciones del grupo antes de pagar y enviar la solicitud.
                </p>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-bg p-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">
                {bookingTerms}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
                <button
                    type="button"
                    onClick={() => setPolicyAgreed((current) => !current)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${policyAgreed ? 'border-accent bg-accent' : 'border-border bg-bg'}`}
                    aria-pressed={policyAgreed}
                >
                    {policyAgreed ? <IconCheck size={12} color="#fff" /> : null}
                </button>
                <span className="text-sm text-fg">
                    He leído y acepto las políticas y condiciones.
                </span>
            </label>
        </div>
    ) : null;

    const formBody = (
        <SerenataFormResponsiveLayout
            step={step}
            steps={REQUEST_STEPS}
            leftTitle="Datos del evento"
            rightTitle="Lugar del evento"
            leftSubtitle="Quién recibe la serenata, fecha, hora y mensaje."
            rightSubtitle="Dirección donde se realizará el evento."
            desktopIntro="Completa los dos bloques del formulario antes de pagar."
            leftColumn={eventFields}
            rightColumn={
                <div className="space-y-4">
                    {addressFields}
                    {step === 2 ? policyFields : null}
                </div>
            }
        />
    );

    const payFooter = (
        <SerenataFormDualStepFooter
            step={step}
            loading={status.loading}
            onBackStep={() => setStep(1)}
            onCancel={onBack}
            onContinue={goToStep2}
            onSubmit={() => void submit()}
            continueDisabled={slotsLoading}
            submitDisabled={status.loading || slotsLoading || pendingCreated || (requiresPolicyAcceptance && !policyAgreed)}
            submitLabel={status.loading ? 'Procesando...' : 'Pagar y solicitar'}
            submitIcon={<IconCreditCard size={16} />}
        />
    );

    if (!requestBlock.allowed) {
        return (
            <div className={inModal ? 'p-6' : 'grid min-w-0 gap-4'}>
                <PanelNotice tone="warning">{requestBlock.reason}</PanelNotice>
                <PanelButton variant="secondary" className="w-fit" onClick={onBack}>
                    Volver
                </PanelButton>
            </div>
        );
    }

    if (inModal) {
        return (
            <SerenataFormModalShell
                title="Solicitar serenata"
                subtitle={`${group.name} · pago seguro`}
                onClose={onBack}
                summary={
                    <div className="lg:hidden">
                        <ServiceSummaryCard group={group} service={service} compact />
                    </div>
                }
                footer={
                    <>
                        <FormFeedback status={status} />
                        {pendingCreated && status.error ? (
                            <PanelButton variant="secondary" onClick={() => window.location.assign(panelSectionHref('serenatas'))}>
                                Ver Mis serenatas
                            </PanelButton>
                        ) : null}
                        {payFooter}
                        <p className="text-center text-[11px] leading-snug text-fg-muted lg:block">
                            Al pagar, enviamos la solicitud al dueño. Si no puede cubrirla, lo verás en Mis serenatas.
                        </p>
                    </>
                }
            >
                <div className="hidden lg:block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Servicio</p>
                    <div className="mt-2">
                        <ServiceSummaryCard group={group} service={service} compact />
                    </div>
                    <div className="mt-5">{formBody}</div>
                </div>
                <div className="lg:hidden">{formBody}</div>
            </SerenataFormModalShell>
        );
    }

    return (
        <div className="grid min-w-0 gap-5">
            <PanelButton className="w-fit" variant="ghost" onClick={onBack}>
                <IconArrowLeft size={16} />
                Volver al grupo
            </PanelButton>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                <PanelCard size="lg">
                    <div>
                        <p className="text-lg font-semibold text-fg">Solicitar serenata</p>
                        <p className="mt-1 text-sm text-fg-muted">
                            Completa la información antes de pagar. El dueño confirmará si puede cubrir el evento.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {formBody}

                        <FormFeedback status={status} />
                        {pendingCreated && status.error ? (
                            <PanelButton variant="secondary" onClick={() => window.location.assign(panelSectionHref('serenatas'))}>
                                Ver Mis serenatas
                            </PanelButton>
                        ) : null}

                        <div className="border-t border-border pt-4">{payFooter}</div>
                    </div>
                </PanelCard>

                <ServiceSummaryCard group={group} service={service} />
            </div>
        </div>
    );
}

function initialRequestDate(value?: string) {
    const inputDate = toInputDate(value);
    if (!inputDate) return today;
    return inputDate < today ? today : inputDate;
}
