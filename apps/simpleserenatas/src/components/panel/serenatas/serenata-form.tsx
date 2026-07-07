'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListingLocationEditor } from '@simple/ui/location';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';
import type { ListingLocation } from '@simple/types';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { IconCheck, IconLoader2, IconPlus } from '@tabler/icons-react';
import {
    type ProviderGroupService,
    type Serenata,
    type SerenataGroup,
    serenatasApi,
} from '@/lib/serenatas-api';
import {
    CollapsibleRepertoireSection,
    SerenataFormCloseButton,
    SerenataFormDualStepFooter,
    SerenataFormModalShell,
    SerenataFormResponsiveLayout,
} from '../serenata-form-layout';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import {
    OWNER_COLLECTION_METHOD_OPTIONS,
    type OwnerCollectionMethod,
} from '@/lib/owner-collection-method';
import {
    buildSerenataGroupSelectOptionsForScope,
    selectableMusicianGroups,
} from '@/lib/serenata-group-select';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';
import { formatMoney } from '@/lib/marketplace-display';
import { serviceEffectivePrice } from '@/lib/service-pricing';
import {
    FieldDate,
    FieldInput,
    FieldSelect,
    FieldTextarea,
    FieldTime,
    FormFeedback,
    cleanSerenataAddress,
    serenataLocation,
    ownerCanViewClientPhone,
    serenataStatusLabel,
    serenataStatusTone,
    today,
    toInputDate,
    type FormStatus,
} from '../shared';

const FORM_STEPS = [
    { id: 1 as const, label: 'Evento' },
    { id: 2 as const, label: 'Detalles' },
];

export function SerenataForm({
    title,
    item,
    groups,
    refresh,
    onDone,
    onCancel,
    modal = false,
}: {
    title: string;
    item?: Serenata;
    groups: SerenataGroup[];
    refresh: () => Promise<void>;
    onDone: (item: Serenata) => void;
    onCancel?: () => void;
    modal?: boolean;
}) {
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const { mariachi, hasMariachi, loading: mariachiLoading } = useMyMariachi();
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [step, setStep] = useState<1 | 2>(1);
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [recipientName, setRecipientName] = useState(item?.recipientName ?? '');
    const [clientPhone, setClientPhone] = useState(item?.clientPhone ?? '');
    const [eventDate, setEventDate] = useState(toInputDate(item?.eventDate) ?? today);
    const [eventTime, setEventTime] = useState(item?.eventTime ?? '21:00');
    const [selectedServiceId, setSelectedServiceId] = useState(item?.selectedServiceId ?? '');
    const [duration, setDuration] = useState(item?.duration ?? 45);
    const [price, setPrice] = useState(item?.price == null ? '' : String(item.price));
    const [groupId, setGroupId] = useState(item?.groupId ?? '');
    const [message, setMessage] = useState(item?.message ?? '');
    const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
    const [pricingExpanded, setPricingExpanded] = useState(false);
    const [ownerCollectionMethod, setOwnerCollectionMethod] = useState(item?.ownerCollectionMethod ?? '');
    const [location, setLocation] = useState<ListingLocation>(() => serenataLocation(item));

    const regions = LOCATION_REGIONS.map((region) => ({ value: region.id, label: region.name }));
    const allCommunes = LOCATION_REGIONS.flatMap((region) =>
        getCommunesForRegion(region.id).map((commune) => ({ value: commune.id, label: commune.name })),
    );
    const communes = getCommunesForRegion(location.regionId ?? '').map((commune) => ({
        value: commune.id,
        label: commune.name,
    }));

    const activeServices = useMemo(
        () => services.filter((service) => service.isActive !== false && Number(service.price) > 0),
        [services],
    );

    const serviceOptions = useMemo(
        () => activeServices.map((service) => ({
            value: service.id,
            label: service.name,
        })),
        [activeServices],
    );

    const selectedService = useMemo(
        () => activeServices.find((service) => service.id === selectedServiceId) ?? null,
        [activeServices, selectedServiceId],
    );

    const songsIncluded = selectedService?.songsIncluded ?? 0;
    const showRepertoire = Boolean(mariachi?.id && selectedServiceId);

    const hasCustomPricing = useMemo(() => {
        if (!selectedService) return false;
        const eventPrice = price === '' ? null : Number(price);
        if (duration !== selectedService.durationMinutes) return true;
        if (eventPrice == null || !Number.isFinite(eventPrice)) return false;
        return eventPrice !== serviceEffectivePrice(selectedService);
    }, [duration, price, selectedService]);

    const effectivePrice = useMemo(() => {
        const parsed = price === '' ? null : Number(price);
        if (parsed != null && Number.isFinite(parsed)) return parsed;
        return selectedService ? serviceEffectivePrice(selectedService) : null;
    }, [price, selectedService]);

    const groupSelectScope = useMemo(
        () => ({
            providerGroupId: mariachi?.id ?? item?.providerGroupId ?? null,
            assignedGroupId: groupId || item?.groupId || null,
        }),
        [groupId, item?.groupId, item?.providerGroupId, mariachi?.id],
    );

    const selectableGroups = useMemo(
        () => selectableMusicianGroups(groups, groupSelectScope),
        [groupSelectScope, groups],
    );

    const groupOptions = useMemo(
        () => buildSerenataGroupSelectOptionsForScope(groups, groupSelectScope),
        [groupSelectScope, groups],
    );

    useEffect(() => {
        if (!mariachi?.id) {
            setServices([]);
            setServicesLoading(false);
            return;
        }
        let cancelled = false;
        setServicesLoading(true);
        void serenatasApi.providerGroupServices(mariachi.id).then((response) => {
            if (cancelled) return;
            const items = response.ok
                ? response.items.filter((service) => service.isActive !== false && Number(service.price) > 0)
                : [];
            setServices(items);
            setServicesLoading(false);
            if (!item && items.length > 0 && !selectedServiceId) {
                const first = items[0];
                setSelectedServiceId(first.id);
                setDuration(first.durationMinutes);
                setPrice(String(serviceEffectivePrice(first)));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [mariachi?.id, item]);

    useEffect(() => {
        if (!selectedService) return;
        if (!item || selectedServiceId !== item.selectedServiceId) {
            setDuration(selectedService.durationMinutes);
            setPrice(String(serviceEffectivePrice(selectedService)));
            setPricingExpanded(false);
        }
    }, [item, selectedService, selectedServiceId]);

    useEffect(() => {
        if (!item?.id || !selectedService) return;
        const eventPrice = item.price ?? serviceEffectivePrice(selectedService);
        const differs =
            item.duration !== selectedService.durationMinutes
            || eventPrice !== serviceEffectivePrice(selectedService);
        if (differs) setPricingExpanded(true);
    }, [item?.duration, item?.id, item?.price, selectedService]);

    useEffect(() => {
        if (!groupId) return;
        if (!selectableGroups.some((group) => group.id === groupId)) {
            setGroupId('');
        }
    }, [groupId, selectableGroups]);

    useEffect(() => {
        if (!item?.id) return;
        let cancelled = false;
        void serenatasApi.serenataSongs(item.id).then((response) => {
            if (cancelled || !response.ok) return;
            const prefs = response.items
                .filter((song) => song.kind === 'client_preference' && song.repertoireSongId)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((song) => song.repertoireSongId!);
            setSelectedSongIds(prefs);
        });
        return () => {
            cancelled = true;
        };
    }, [item?.id]);

    useEffect(() => {
        if (!item) {
            setSelectedSongIds([]);
        }
    }, [selectedServiceId, item]);

    useEffect(() => {
        setOwnerCollectionMethod(item?.ownerCollectionMethod ?? '');
    }, [item?.id, item?.ownerCollectionMethod]);

    function validateStep1(): string | null {
        if (!recipientName.trim()) return 'Indica el destinatario de la serenata.';
        if (!eventDate || !eventTime) return 'Indica fecha y hora del evento.';
        const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
        const address = cleanSerenataAddress(rawAddress, location.communeName, location.regionName);
        if (!address) return 'Completa la dirección del evento.';
        if (!location.communeName?.trim() || !location.regionName?.trim()) {
            return 'Indica región y comuna: elige una sugerencia de Google o selecciónalas en los campos de abajo.';
        }
        return null;
    }

    function goToStep2() {
        const error = validateStep1();
        if (error) {
            setStatus({ loading: false, error, ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: null });
        setStep(2);
    }

    async function submit() {
        const stepError = validateStep1();
        if (stepError) {
            setStep(1);
            setStatus({ loading: false, error: stepError, ok: null });
            return;
        }

        setStatus({ loading: true, error: null, ok: null });
        const rawAddress = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ').trim();
        const address = cleanSerenataAddress(rawAddress, location.communeName, location.regionName);
        if (!selectedServiceId) {
            setStep(2);
            setStatus({
                loading: false,
                error: 'Selecciona un servicio de tu catálogo en Mi negocio.',
                ok: null,
            });
            return;
        }
        if (!ownerCollectionMethod) {
            setStep(2);
            setStatus({ loading: false, error: 'Indica cómo pagó el cliente.', ok: null });
            return;
        }

        const payload: Partial<Serenata> & {
            songSelections?: Array<{ repertoireSongId: string }>;
        } = {
            groupId: groupId || null,
            selectedServiceId,
            packageCode: null,
            recipientName: recipientName.trim(),
            clientPhone: clientPhone.trim() || null,
            address,
            comuna: location.communeName,
            region: location.regionName,
            lat: location.geoPoint.latitude == null ? null : String(location.geoPoint.latitude),
            lng: location.geoPoint.longitude == null ? null : String(location.geoPoint.longitude),
            eventDate,
            eventTime,
            duration,
            price: price ? Number(price) : null,
            eventType: selectedService?.name ?? null,
            message: message.trim() || null,
            ownerCollectionMethod: ownerCollectionMethod as OwnerCollectionMethod,
            songSelections: selectedSongIds.length > 0
                ? selectedSongIds.map((repertoireSongId) => ({ repertoireSongId }))
                : item
                    ? []
                    : undefined,
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

    const formDisabled = mariachiLoading || servicesLoading || status.loading;
    const closeHandler = onCancel ?? (() => undefined);

    const warnings = (
        <>
            {!hasMariachi && !mariachiLoading ? (
                <PanelNotice tone="warning">
                    Configura tu mariachi en{' '}
                    <Link href={panelMiNegocioHref('datos')} prefetch={false} className="font-medium text-accent underline">
                        Mi negocio → Datos
                    </Link>{' '}
                    antes de registrar serenatas.
                </PanelNotice>
            ) : null}
            {hasMariachi && !servicesLoading && activeServices.length === 0 ? (
                <PanelNotice tone="warning">
                    Crea al menos un servicio con precio en{' '}
                    <Link href={panelMiNegocioHref('servicios')} prefetch={false} className="font-medium text-accent underline">
                        Mi negocio → Servicios
                    </Link>
                    .
                </PanelNotice>
            ) : null}
        </>
    );

    const eventFields = (
        <div className="grid gap-4">
            <PanelField label="Destinatario" required>
                <FieldInput
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Nombre de quien recibe la serenata"
                />
            </PanelField>
            {item && !ownerCanViewClientPhone(item) ? (
                <PanelNotice tone="neutral" className="text-xs">
                    El teléfono del cliente se mostrará cuando la serenata quede confirmada en la agenda.
                </PanelNotice>
            ) : (
                <PanelField label="Contacto solicitante">
                    <FieldInput
                        value={clientPhone}
                        onChange={(event) => setClientPhone(event.target.value)}
                        placeholder="+56 9..."
                    />
                </PanelField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <PanelField label="Fecha" required>
                    <FieldDate
                        min={today}
                        value={eventDate}
                        onChange={setEventDate}
                    />
                </PanelField>
                <PanelField label="Hora" required>
                    <FieldTime
                        value={eventTime}
                        onChange={setEventTime}
                    />
                </PanelField>
            </div>
            <PanelField label="Dirección del evento" required>
                <ListingLocationEditor
                    simpleMode
                    framed={false}
                    showHeader={false}
                    location={location}
                    onChange={setLocation}
                    regions={regions}
                    communes={communes}
                    allCommunes={allCommunes}
                    addressBook={[]}
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
                    googleMapsApiKey={googleMapsApiKey}
                />
            </PanelField>
        </div>
    );

    function resetPricingToService() {
        if (!selectedService) return;
        setDuration(selectedService.durationMinutes);
        setPrice(String(serviceEffectivePrice(selectedService)));
        setPricingExpanded(false);
    }

    const detailFields = (
        <div className="grid gap-4">
            <PanelField label="Servicio" required>
                {servicesLoading ? (
                    <p className="flex items-center gap-2 text-sm text-fg-muted">
                        <IconLoader2 size={16} className="animate-spin" />
                        Cargando servicios…
                    </p>
                ) : (
                    <FieldSelect
                        value={selectedServiceId}
                        options={serviceOptions}
                        placeholder="Selecciona un servicio"
                        disabled={activeServices.length === 0}
                        onChange={(event) => setSelectedServiceId(event.target.value)}
                    />
                )}
                {selectedService ? (
                    <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                            <span className="text-fg-muted">
                                {selectedService.musiciansCount} músicos · {duration} min
                                {hasCustomPricing ? (
                                    <span className="text-accent"> · ajustado</span>
                                ) : null}
                            </span>
                            <span className="font-semibold text-fg tabular-nums">
                                {formatMoney(effectivePrice ?? serviceEffectivePrice(selectedService))}
                            </span>
                        </div>
                        {pricingExpanded ? (
                            <div className="grid gap-2 rounded-lg border border-border bg-bg-subtle/50 p-3 sm:grid-cols-2">
                                <PanelField label="Duración (min)">
                                    <FieldInput
                                        type="number"
                                        min={15}
                                        max={240}
                                        value={duration}
                                        disabled={formDisabled}
                                        onChange={(event) => setDuration(Number(event.target.value))}
                                    />
                                </PanelField>
                                <PanelField label="Precio (CLP)">
                                    <FieldInput
                                        type="number"
                                        min={0}
                                        value={price}
                                        disabled={formDisabled}
                                        onChange={(event) => setPrice(event.target.value)}
                                    />
                                </PanelField>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <button
                                type="button"
                                className="font-medium text-accent hover:underline disabled:opacity-50"
                                disabled={formDisabled}
                                onClick={() => setPricingExpanded((open) => !open)}
                            >
                                {pricingExpanded ? 'Ocultar ajuste' : 'Ajustar duración o precio'}
                            </button>
                            {pricingExpanded && hasCustomPricing ? (
                                <button
                                    type="button"
                                    className="text-fg-muted hover:text-fg hover:underline disabled:opacity-50"
                                    disabled={formDisabled}
                                    onClick={resetPricingToService}
                                >
                                    Usar valores del servicio
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </PanelField>
            <PanelField label="Grupo operativo">
                <FieldSelect
                    value={groupId}
                    options={groupOptions}
                    onChange={(event) => setGroupId(event.target.value)}
                />
            </PanelField>

            <PanelField label="Forma de pago" required>
                <FieldSelect
                    value={ownerCollectionMethod}
                    options={OWNER_COLLECTION_METHOD_OPTIONS}
                    disabled={formDisabled}
                    onChange={(event) => setOwnerCollectionMethod(event.target.value)}
                />
            </PanelField>

            {showRepertoire && mariachi ? (
                <CollapsibleRepertoireSection
                    providerGroupId={mariachi.id}
                    serviceId={selectedServiceId}
                    songsIncluded={songsIncluded}
                    variant="owner"
                    selectedIds={selectedSongIds}
                    onChange={setSelectedSongIds}
                    defaultExpanded={Boolean(item && selectedSongIds.length > 0)}
                    disabled={formDisabled}
                    repertorioManageHref={panelMiNegocioHref('repertorio')}
                />
            ) : null}

            <PanelField label="Mensaje">
                <FieldTextarea
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Detalle para tu equipo o el destinatario"
                />
            </PanelField>
        </div>
    );

    const submitLabel = item ? 'Guardar cambios' : 'Crear serenata';
    const submitIcon = item ? <IconCheck size={15} /> : <IconPlus size={15} />;

    const footerActions = (
        <SerenataFormDualStepFooter
            step={step}
            loading={status.loading}
            onBackStep={() => setStep(1)}
            onCancel={onCancel}
            onContinue={goToStep2}
            onSubmit={() => void submit()}
            continueDisabled={formDisabled}
            submitDisabled={formDisabled || activeServices.length === 0}
            submitLabel={submitLabel}
            submitIcon={submitIcon}
        />
    );

    const formBody = (
        <SerenataFormResponsiveLayout
            step={step}
            steps={FORM_STEPS}
            leftTitle="Evento"
            rightTitle="Detalles"
            leftSubtitle="Destinatario, fecha, hora, dirección y contacto."
            rightSubtitle="Servicio, grupo, forma de pago y mensaje."
            desktopIntro="Completa los dos bloques antes de crear la serenata."
            leftColumn={eventFields}
            rightColumn={detailFields}
        />
    );

    if (modal) {
        return (
            <SerenataFormModalShell
                title={title}
                subtitle={item ? 'Serenata propia' : 'Registro directo'}
                onClose={closeHandler}
                footer={
                    <div className="space-y-4">
                        {warnings}
                        <FormFeedback status={status} />
                        {footerActions}
                    </div>
                }
            >
                {formBody}
            </SerenataFormModalShell>
        );
    }

    return (
        <PanelCard size="lg">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <PanelBlockHeader
                        title={title}
                        description={
                            item
                                ? 'Actualiza los datos de esta serenata propia.'
                                : 'Registra una serenata directa. Usa los mismos servicios que ofreces al público.'
                        }
                        actions={item ? <PanelStatusBadge tone={serenataStatusTone(item.status)} label={serenataStatusLabel(item.status)} /> : null}
                    />
                </div>
                {onCancel ? <SerenataFormCloseButton onClose={onCancel} /> : null}
            </div>

            <div className="mt-4 space-y-3">{warnings}</div>

            <div className="mt-5">{formBody}</div>

            <FormFeedback status={status} />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {footerActions}
            </div>
        </PanelCard>
    );
}
