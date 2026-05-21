'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconArrowLeft, IconCreditCard, IconLoader2 } from '@tabler/icons-react';
import { ListingLocationEditor, PanelButton, PanelCard, PanelField, PanelNotice } from '@simple/ui';
import type { AddressBookEntry, ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
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

export function MarketplaceRequestView({
    group,
    service,
    contactPhone,
    onBack,
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    contactPhone: string;
    onBack: () => void;
}) {
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

    async function submit() {
        const regionName = location.regionName?.trim() ?? '';
        const communeName = location.communeName?.trim() ?? '';
        const recipient = recipientName.trim();
        const phone = clientPhone.trim();
        const address = addressSummary;
        const lat = location.geoPoint.latitude == null ? null : Number(location.geoPoint.latitude);
        const lng = location.geoPoint.longitude == null ? null : Number(location.geoPoint.longitude);

        if (!recipient) {
            setStatus({ loading: false, error: 'Indica a quién va dirigida la serenata.', ok: null });
            return;
        }
        if (!phone) {
            setStatus({ loading: false, error: 'Indica un teléfono de contacto.', ok: null });
            return;
        }
        if (!eventDate) {
            setStatus({ loading: false, error: 'Selecciona la fecha del evento.', ok: null });
            return;
        }
        if (!flexibleSchedule) {
            if (slotsLoading) {
                setStatus({ loading: false, error: 'Espera que carguen los horarios disponibles.', ok: null });
                return;
            }
            if (!availableSlots.length) {
                setStatus({ loading: false, error: 'No hay horarios disponibles para esa fecha. Marca horario por definir o cambia la fecha.', ok: null });
                return;
            }
            if (!eventTime || !availableSlots.includes(eventTime)) {
                setStatus({ loading: false, error: 'Selecciona uno de los horarios disponibles.', ok: null });
                return;
            }
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

                        <PanelField label="Mensaje o dedicatoria" hint="Opcional. Sirve para orientar al grupo antes del evento.">
                            <FieldTextarea
                                rows={3}
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Ej: cumpleaños, aniversario, canción especial o indicaciones de sorpresa."
                            />
                        </PanelField>

                        <FormFeedback status={status} />
                        {pendingCreated && status.error ? (
                            <PanelButton variant="secondary" onClick={() => window.location.assign(panelSectionHref('serenatas'))}>
                                Ver Mis Serenatas
                            </PanelButton>
                        ) : null}

                        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
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
                    </div>
                </PanelCard>

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
            </div>
        </div>
    );
}
