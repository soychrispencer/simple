'use client';

import { useEffect, useState } from 'react';
import { ListingLocationEditor } from '@simple/ui/location';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelField, PanelStatusBadge } from '@simple/ui/panel';
import type { ListingLocation } from '@simple/types';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { IconCheck, IconLoader2, IconPlus } from '@tabler/icons-react';
import { type Serenata, type SerenataGroup, type SerenataPackage, type SerenataPackageCode, serenatasApi } from '@/lib/serenatas-api';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';
import {
    FieldInput,
    FieldSelect,
    FieldTextarea,
    FormFeedback,
    cleanSerenataAddress,
    serenataLocation,
    serenataStatusLabel,
    serenataStatusTone,
    today,
    toInputDate,
    type FormStatus,
} from '../shared';
const SERENATA_FORM_MOBILE_STEPS = [
    { id: 1, label: 'Evento' },
    { id: 2, label: 'Servicio' },
    { id: 3, label: 'Lugar' },
] as const;

export function SerenataForm({ title, item, groups, packages, refresh, onDone, onCancel, modal = false }: { title: string; item?: Serenata; groups: SerenataGroup[]; packages: SerenataPackage[]; refresh: () => Promise<void>; onDone: (item: Serenata) => void; onCancel?: () => void; modal?: boolean }) {
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [mobileStep, setMobileStep] = useState(1);
    const [recipientName, setRecipientName] = useState(item?.recipientName ?? '');
    const [clientPhone, setClientPhone] = useState(item?.clientPhone ?? '');
    const [eventDate, setEventDate] = useState(toInputDate(item?.eventDate) ?? today);
    const [eventTime, setEventTime] = useState(item?.eventTime ?? '21:00');
    const [packageCode, setPackageCode] = useState<SerenataPackageCode>(item?.packageCode ?? packages[0]?.code ?? 'trio');
    const [duration, setDuration] = useState(item?.duration ?? 45);
    const [price, setPrice] = useState(item?.price == null ? '' : String(item.price));
    const [eventType, setEventType] = useState(item?.eventType ?? 'CumpleaÃ±os');
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
            setStatus({ loading: false, error: 'Completa destinatario, direcciÃ³n, fecha y hora.', ok: null });
            return;
        }
        if (!location.communeName || !location.regionName) {
            setStatus({ loading: false, error: 'Selecciona una direcciÃ³n del autocompletar que incluya comuna y regiÃ³n.', ok: null });
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
                <PanelField label="Contacto de coordinaciÃ³n"><FieldInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+56 9..." /></PanelField>
                <PanelField label="Fecha"><FieldInput type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></PanelField>
                <PanelField label="Hora"><FieldInput type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></PanelField>
            </div>
            <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${mobileStep === 2 ? '' : 'hidden sm:grid'}`}>
                <PanelField label="Servicio contratado">
                    <FieldSelect value={packageCode} onChange={(event) => setPackageCode(event.target.value as SerenataPackageCode)}>
                        <option value="">Seleccionar servicio</option>
                        {packages.map((entry) => (
                            <option key={entry.code} value={entry.code}>{entry.label} Â· {entry.musicians} mÃºsicos Â· {entry.duration} min</option>
                        ))}
                    </FieldSelect>
                </PanelField>
                <PanelField label="DuraciÃ³n"><FieldInput type="number" min={15} max={240} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></PanelField>
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
                    title="DirecciÃ³n del evento"
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
                    googleMapsApiKey={googleMapsApiKey}
                />
                <div className="mt-3 rounded-card border border-border bg-bg-subtle p-3 text-sm text-fg-secondary">
                    <span className="font-semibold text-[var(--fg)]">UbicaciÃ³n detectada:</span>{' '}
                    {location.addressLine1 || 'Sin direcciÃ³n'}{location.communeName ? ` Â· ${location.communeName}` : ''}{location.regionName ? ` Â· ${location.regionName}` : ''}
                </div>
            </div>
            <PanelField className={`mt-3 ${mobileStep === 3 ? '' : 'hidden sm:block'}`} label="Mensaje"><FieldTextarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></PanelField>
            <FormFeedback status={status} />
            <div className="mt-4 flex flex-col gap-3 sm:hidden">
                {mobileStep > 1 ? (
                    <PanelButton variant="secondary" onClick={() => setMobileStep((s) => s - 1)}>
                        AtrÃ¡s
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
