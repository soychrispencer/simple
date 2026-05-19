'use client';

import { useEffect, useState } from 'react';
import { ListingLocationEditor, PanelButton, PanelCard, PanelField, PanelNotice } from '@simple/ui';
import type { AddressBookEntry, ListingLocation } from '@simple/types';
import { createAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { RegionCommuneFields } from './region-commune-fields';
import {
    cleanSerenataAddress,
    FieldInput,
    FieldTextarea,
    FormFeedback,
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
    onSuccess,
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    contactPhone: string;
    onBack: () => void;
    onSuccess: () => void;
}) {
    const [quickMode, setQuickMode] = useState(true);
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
    const [submitted, setSubmitted] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const regions = LOCATION_REGIONS.map((region) => ({ value: region.id, label: region.name }));
    const communes = getCommunesForRegion(location.regionId ?? '').map((commune) => ({
        value: commune.id,
        label: commune.name,
    }));

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
            return;
        }
        setSlotsLoading(true);
        void serenatasApi.marketplaceAvailability(group.slug, day, service.id).then((response) => {
            setAvailableSlots(response.ok ? response.slots ?? [] : []);
            setSlotsLoading(false);
        });
    }, [eventDate, flexibleSchedule, group.slug, service.id]);

    async function submit() {
        const regionName = location.regionName?.trim() ?? '';
        const communeName = location.communeName?.trim() ?? '';
        const recipient = recipientName.trim() || 'Por confirmar';
        let address: string;
        let lat: number | null = null;
        let lng: number | null = null;

        if (quickMode) {
            if (!eventDate || (!flexibleSchedule && !eventTime) || !clientPhone.trim() || !communeName || !regionName) {
                setStatus({ loading: false, error: 'Completa fecha, comuna y teléfono de contacto.', ok: null });
                return;
            }
            address = cleanSerenataAddress(
                `Evento en ${communeName} (dirección por confirmar)`,
                communeName,
                regionName,
            );
        } else {
            const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
            address = cleanSerenataAddress(rawAddress, communeName, regionName);
            lat = location.geoPoint.latitude == null ? null : Number(location.geoPoint.latitude);
            lng = location.geoPoint.longitude == null ? null : Number(location.geoPoint.longitude);
            if (!eventDate || (!flexibleSchedule && !eventTime) || !clientPhone.trim() || !address || !communeName || !regionName) {
                setStatus({ loading: false, error: 'Completa fecha, dirección, comuna y teléfono de contacto.', ok: null });
                return;
            }
        }

        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.requestMarketplaceSerenata({
            providerGroupId: group.id,
            serviceId: service.id,
            recipientName: recipient,
            clientPhone: clientPhone.trim() || null,
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
            const conflict = (response.error ?? '').toLowerCase().includes('solapa')
                || (response.error ?? '').toLowerCase().includes('horario');
            setStatus({
                loading: false,
                error: conflict
                    ? (response.error ?? 'Ese horario no está disponible. Elige otro de la lista.')
                    : (response.error ?? 'No pudimos enviar la solicitud.'),
                ok: null,
            });
            return;
        }
        setStatus({ loading: false, error: null, ok: null });
        setSubmitted(true);
    }

    if (submitted) {
        return (
            <div className="grid gap-5">
                <PanelCard>
                    <PanelNotice tone="success">
                        Tu solicitud fue enviada a <strong>{group.name}</strong>. Te avisaremos cuando el grupo responda.
                    </PanelNotice>
                    <p className="mt-3 text-sm text-[var(--fg-muted)]">
                        Servicio: {service.name} · {service.durationMinutes} min
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <PanelButton onClick={onSuccess}>Ver mis serenatas</PanelButton>
                        <PanelButton variant="secondary" onClick={onBack}>Volver al grupo</PanelButton>
                    </div>
                </PanelCard>
            </div>
        );
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
            <PanelButton variant="ghost" onClick={onBack}>← Volver</PanelButton>
            <PanelCard>
                <h2 className="text-xl font-semibold text-[var(--fg)]">Solicitar serenata</h2>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    Tu solicitud irá directamente a <strong>{group.name}</strong> · {service.name} · {service.durationMinutes} min
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <PanelButton
                        variant={quickMode ? 'primary' : 'secondary'}
                        onClick={() => setQuickMode(true)}
                    >
                        Solicitud rápida
                    </PanelButton>
                    <PanelButton
                        variant={!quickMode ? 'primary' : 'secondary'}
                        onClick={() => setQuickMode(false)}
                    >
                        Dirección completa
                    </PanelButton>
                </div>
                {quickMode ? (
                    <p className="mt-2 text-xs text-[var(--fg-muted)]">
                        Envía fecha, comuna y contacto ahora. El dueño del grupo podrá confirmar la dirección exacta después.
                    </p>
                ) : null}
                <div className="mt-5 grid gap-4">
                    <PanelField label={quickMode ? 'Destinatario (opcional)' : 'Destinatario'}>
                        <FieldInput
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder={quickMode ? 'Nombre (puedes completar después)' : 'Nombre de la persona homenajeada'}
                        />
                    </PanelField>
                    <PanelField label="Teléfono de contacto">
                        <FieldInput value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+56 9 …" />
                    </PanelField>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <PanelField label="Fecha">
                            <FieldInput type="date" value={toInputDate(eventDate) ?? ''} min={toInputDate(today) ?? undefined} onChange={(e) => setEventDate(e.target.value)} />
                        </PanelField>
                        <PanelField label="Hora">
                            <FieldInput
                                type="time"
                                value={eventTime}
                                disabled={flexibleSchedule}
                                onChange={(e) => setEventTime(e.target.value)}
                            />
                        </PanelField>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--fg)]">
                        <input
                            type="checkbox"
                            checked={flexibleSchedule}
                            onChange={(e) => setFlexibleSchedule(e.target.checked)}
                        />
                        Aún no sé la hora (el grupo te propondrá horarios)
                    </label>
                    {!flexibleSchedule && availableSlots.length > 0 ? (
                        <PanelField label="Horarios disponibles">
                            <div className="flex flex-wrap gap-2">
                                {slotsLoading ? (
                                    <span className="text-sm text-[var(--fg-muted)]">Cargando horarios…</span>
                                ) : availableSlots.map((slot) => (
                                    <PanelButton
                                        key={slot}
                                        variant={eventTime === slot ? 'primary' : 'secondary'}
                                        onClick={() => setEventTime(slot)}
                                    >
                                        {slot}
                                    </PanelButton>
                                ))}
                            </div>
                        </PanelField>
                    ) : slotsLoading ? (
                        <p className="text-sm text-[var(--fg-muted)]">Buscando horarios disponibles…</p>
                    ) : null}
                    {quickMode ? (
                        <RegionCommuneFields
                            region={location.regionName ?? ''}
                            comuna={location.communeName ?? ''}
                            onRegionChange={(regionName) => setLocation((current) => ({ ...current, regionName, communeName: '' }))}
                            onComunaChange={(communeName) => setLocation((current) => ({ ...current, communeName }))}
                        />
                    ) : (
                        <ListingLocationEditor
                            title="Dirección del evento"
                            description="Selecciona la dirección donde será la serenata."
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
                            onSaveToAddressBook={() => void saveCurrentAddress()}
                            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                        />
                    )}
                    <PanelField label="Mensaje (opcional)">
                        <FieldTextarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </PanelField>
                    <FormFeedback status={status} />
                    <PanelButton disabled={status.loading} onClick={() => void submit()}>
                        Enviar solicitud
                    </PanelButton>
                </div>
            </PanelCard>
        </div>
    );
}
