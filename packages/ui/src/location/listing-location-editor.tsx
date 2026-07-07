'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AddressBookEntry, ListingLocation, ListingLocationKind, ListingLocationVisibilityMode } from '@simple/types';
import { applyAddressBookEntryToLocation, patchListingLocation } from '@simple/types';
import { PanelButton, getPanelButtonClassName, getPanelButtonStyle } from '../panel/panel-button';
import {
    ADDRESS_KIND_OPTIONS,
    DEFAULT_VISIBILITY_OPTIONS,
    Field,
    StyledSelect,
    applyPlaceToLocation,
    buildGoogleMapsUrls,
    buildOsmUrls,
    clearResolvedGeo,
    createEmptyGeoPoint,
    createGooglePlacesAutocomplete,
    fieldError,
    fieldInvalid,
    joinClasses,
    addressSummary,
    buildLocationQuery,
    buildSavedAddressSelectOptions,
    GoogleMapIcon,
    ShareIcon,
    type FieldErrorMap,
    type GooglePlaceResult,
    type SelectOption,
    type VisibilityOption,
} from './location-shared';
import { resolveGoogleMapsBrowserKey } from '../hooks/google-maps-browser-key-shared';

export type ListingLocationEditorProps = {
    title?: string;
    description?: string;
    showHeader?: boolean;
    framed?: boolean;
    simpleMode?: boolean;
    location: ListingLocation;
    onChange: (next: ListingLocation) => void;
    regions: SelectOption[];
    communes: SelectOption[];
    allCommunes?: SelectOption[];
    addressBook: AddressBookEntry[];
    addressBookLoading?: boolean;
    errors?: FieldErrorMap;
    allowAreaOnly?: boolean;
    showAreaFields?: boolean;
    addressFirst?: boolean;
    showSourceSelector?: boolean;
    showVisibilityField?: boolean;
    showPublicPreviewCard?: boolean;
    showActionBar?: boolean;
    showGoogleMapsLink?: boolean;
    showLocationMeta?: boolean;
    addressRequired?: boolean;
    showAddressLine2?: boolean;
    showSimpleVisibilityToggle?: boolean;
    /** Controls helper copy under the address / Places field. */
    addressHintMode?: 'default' | 'minimal' | 'none';
    /** En simpleMode: instrucciones de llegada. */
    showArrivalInstructions?: boolean;
    /** En simpleMode: selector «Usar dirección» de la libreta. */
    showSavedAddressPicker?: boolean;
    /** Filtra direcciones de negocio por vertical al armar el selector. */
    publishVertical?: 'autos' | 'propiedades' | 'serenatas';
    visibilityOptions?: VisibilityOption[];
    geocoding?: boolean;
    googleMapsApiKey?: string;
    onGeocode?: () => void | Promise<void>;
    onSaveToAddressBook?: () => void | Promise<void>;
};

export type LocationMapPreviewProps = {
    location: ListingLocation;
    title?: string;
    subtitle?: string;
    mode?: 'public' | 'internal';
    showTechnicalMeta?: boolean;
};


export function LocationMapPreview({ location, title = 'Mapa público', subtitle, mode = 'public', showTechnicalMeta = false }: LocationMapPreviewProps) {
    const previewGeoPoint = mode === 'internal'
        ? location.geoPoint
        : (location.publicMapEnabled && location.visibilityMode !== 'hidden'
            ? (location.publicGeoPoint.latitude != null && location.publicGeoPoint.longitude != null ? location.publicGeoPoint : location.geoPoint)
            : createEmptyGeoPoint());
    const addressQuery = buildLocationQuery(location, mode);
    const canUsePrecisePoint = previewGeoPoint.latitude != null && previewGeoPoint.longitude != null && previewGeoPoint.provider !== 'catalog_seed';
    const googleUrls = buildGoogleMapsUrls(
        canUsePrecisePoint ? previewGeoPoint.latitude : null,
        canUsePrecisePoint ? previewGeoPoint.longitude : null,
        previewGeoPoint.precision,
        addressQuery,
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
    );
    const previewUrls = canUsePrecisePoint
        ? buildOsmUrls(previewGeoPoint.latitude!, previewGeoPoint.longitude!, previewGeoPoint.precision)
        : null;
    const subtitleText = subtitle || (
        mode === 'internal'
            ? [location.addressLine1, location.neighborhood, location.communeName, location.regionName].filter(Boolean).join(', ') || 'Sin dirección interna todavía.'
            : location.publicLabel || 'Sin vista pública todavía.'
    );
    const externalMapsUrl = googleUrls?.externalUrl || previewUrls?.externalUrl || null;
    const statusLabel = !addressQuery
        ? 'Completa la dirección'
        : canUsePrecisePoint
            ? (mode === 'internal' ? 'Ubicación confirmada' : 'Vista pública lista')
            : 'Pendiente de verificar';
    const emptyStateText = !addressQuery
        ? (mode === 'internal' ? 'Escribe una dirección para mostrar la ubicación.' : 'Sin dirección pública todavía.')
        : 'Aún no pudimos ubicar esta dirección con precisión. Verifica la dirección o activa Google Places para usar sugerencias.';

    return (
        <div className="loc-editor-card rounded-card border p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold loc-editor-fg">{title}</p>
                    <p className="text-xs mt-1 loc-editor-muted">{subtitleText}</p>
                </div>
                <span className="loc-editor-badge text-[11px] px-2 py-1 rounded-full">
                    {statusLabel}
                </span>
            </div>
            <div className="loc-editor-map-frame relative mt-3 h-52 overflow-hidden rounded-card border">
                {previewUrls?.imageUrl ? (
                    <img
                        alt={title}
                        src={previewUrls.imageUrl}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : externalMapsUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="loc-editor-map-icon h-12 w-12 rounded-full flex items-center justify-center">
                            <span className="text-lg">+</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium loc-editor-fg">
                                Abre esta dirección en Google Maps
                            </p>
                            <p className="text-xs mt-1 loc-editor-muted">
                                Usa el mapa para confirmar que la dirección corresponde al punto correcto.
                            </p>
                        </div>
                        <a
                            href={externalMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={getPanelButtonClassName({ size: 'sm', className: 'h-9 px-3 text-xs' })}
                            style={getPanelButtonStyle('secondary')}
                        >
                            Abrir en Google Maps
                        </a>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm loc-editor-secondary">
                        {emptyStateText}
                    </div>
                )}
            </div>
            {showTechnicalMeta ? (
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs loc-editor-secondary">
                    <span>Interna: {location.geoPoint.latitude != null && location.geoPoint.longitude != null ? `${location.geoPoint.latitude.toFixed(4)}, ${location.geoPoint.longitude.toFixed(4)}` : 'Pendiente'}</span>
                    <span>{mode === 'internal' ? 'Precisión' : 'Publica'}: {mode === 'internal'
                        ? location.geoPoint.precision
                        : (location.publicGeoPoint.latitude != null && location.publicGeoPoint.longitude != null ? `${location.publicGeoPoint.latitude.toFixed(4)}, ${location.publicGeoPoint.longitude.toFixed(4)}` : 'Oculta')}</span>
                </div>
            ) : null}
            {externalMapsUrl ? (
                <div className="mt-3 flex justify-end">
                    <a href={externalMapsUrl} target="_blank" rel="noreferrer" className="text-xs font-medium loc-editor-fg">
                        Ver en Google Maps
                    </a>
                </div>
            ) : null}
        </div>
    );
}

export function ListingLocationEditor(props: ListingLocationEditorProps) {
    const {
        title = 'Ubicación del aviso',
        description = 'Controla la dirección interna, la visibilidad pública y la ubicación en el mapa.',
        showHeader = true,
        framed = true,
        simpleMode = false,
        location,
        onChange,
        regions,
        communes,
        allCommunes,
        addressBook,
        addressBookLoading = false,
        errors,
        allowAreaOnly = true,
        showAreaFields = true,
        addressFirst = false,
        showSourceSelector = true,
        showVisibilityField = true,
        showPublicPreviewCard = true,
        showActionBar = true,
        showGoogleMapsLink = false,
        showLocationMeta = false,
        addressRequired = false,
        showAddressLine2 = true,
        showSimpleVisibilityToggle = true,
        addressHintMode = 'default',
        showSavedAddressPicker = simpleMode,
        showArrivalInstructions = false,
        publishVertical,
        visibilityOptions = DEFAULT_VISIBILITY_OPTIONS,
        geocoding = false,
        googleMapsApiKey,
        onGeocode,
        onSaveToAddressBook,
    } = props;
    const [addressInputEl, setAddressInputEl] = useState<HTMLInputElement | null>(null);
    const addressInputRef = (el: HTMLInputElement | null) => { setAddressInputEl(el); };
    const addressInputElRef = useRef<HTMLInputElement | null>(null);
    const locationRef = useRef(location);
    const regionsRef = useRef(regions);
    const communesRef = useRef(communes);
    const allCommunesRef = useRef(allCommunes ?? communes);
    const onChangeRef = useRef(onChange);
    const autocompleteRef = useRef<any>(null);
    const googlePlacesKey = resolveGoogleMapsBrowserKey(googleMapsApiKey) ?? '';
    const [autocompleteReady, setAutocompleteReady] = useState(false);

    const sourceOptions = useMemo(() => {
        const base = [
            { value: 'custom', label: 'Dirección personalizada', description: 'Ingresa una dirección nueva para este aviso.' },
            { value: 'saved_address', label: 'Dirección guardada', description: 'Reutiliza una dirección desde la libreta.' },
        ];
        return allowAreaOnly
            ? [{ value: 'area_only', label: 'Solo zona', description: 'Publica solo con región y comuna.' }, ...base]
            : base;
    }, [allowAreaOnly]);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        regionsRef.current = regions;
    }, [regions]);

    useEffect(() => {
        communesRef.current = communes;
    }, [communes]);

    useEffect(() => {
        allCommunesRef.current = allCommunes ?? communes;
    }, [allCommunes, communes]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        addressInputElRef.current = addressInputEl;
    }, [addressInputEl]);

    useEffect(() => {
        if (!googlePlacesKey || location.sourceMode === 'area_only' || !addressInputEl) {
            setAutocompleteReady(false);
            return;
        }

        let disposed = false;

        void createGooglePlacesAutocomplete(addressInputEl, googlePlacesKey, {
            componentRestrictions: { country: 'cl' },
            fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        }).then((autocomplete) => {
            if (disposed || !autocomplete || !addressInputElRef.current) {
                setAutocompleteReady(false);
                return;
            }

            const googleMaps = (window as typeof window & { google?: any }).google?.maps;
            if (autocompleteRef.current && googleMaps?.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace?.() as GooglePlaceResult | undefined;
                if (!place) return;
                const nextLocation = applyPlaceToLocation(place, locationRef.current, regionsRef.current, allCommunesRef.current);
                onChangeRef.current(nextLocation);
            });

            autocompleteRef.current = autocomplete;
            setAutocompleteReady(true);
        });

        return () => {
            disposed = true;
            const googleMaps = (window as typeof window & { google?: any }).google?.maps;
            if (autocompleteRef.current && googleMaps?.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }
            autocompleteRef.current = null;
            setAutocompleteReady(false);
        };
    }, [googlePlacesKey, googleMapsApiKey, location.sourceMode, addressInputEl]);

    const addressHint = addressHintMode === 'none'
        ? undefined
        : addressHintMode === 'minimal'
            ? (showAreaFields
                ? 'Escribe y elige una sugerencia de Google, o completa región y comuna.'
                : (autocompleteReady
                    ? 'Escribe y elige una sugerencia de Google.'
                    : (googlePlacesKey
                        ? 'Cargando sugerencias de Google…'
                        : 'Sin clave de Google Maps: puedes escribir la dirección manualmente.')))
            : (autocompleteReady
                ? 'Selecciona una sugerencia cuando aparezca.'
                : (googlePlacesKey ? 'Si no ves sugerencias, puedes escribir la dirección manualmente.' : 'Puedes escribir la dirección manualmente.'));
    const internalMapsUrl = (showGoogleMapsLink || showLocationMeta)
        ? buildGoogleMapsUrls(
            location.geoPoint.latitude,
            location.geoPoint.longitude,
            location.geoPoint.precision,
            buildLocationQuery(location, 'internal')
        )?.externalUrl || null
        : null;
    const kindOptions = ADDRESS_KIND_OPTIONS;
    const savedAddressSelectValue = location.sourceMode === 'saved_address' && location.sourceAddressId
        ? location.sourceAddressId
        : '__new__';
    const savedAddressOptions = buildSavedAddressSelectOptions(addressBook, publishVertical);
    const regionField = (
        <Field label="Región" required error={fieldError(errors, 'regionId')}>
            <StyledSelect value={location.regionId || ''} onChange={(nextValue) => onChange(patchListingLocation(location, {
                regionId: nextValue || null,
                regionName: regions.find((item) => item.value === nextValue)?.label || null,
                communeId: null,
                communeName: null,
                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                ...clearResolvedGeo(location),
            }))} options={regions} invalid={fieldInvalid(errors, 'regionId')} />
        </Field>
    );
    const communeField = (
        <Field label="Comuna" required error={fieldError(errors, 'communeId')}>
            <StyledSelect
                value={location.communeId || ''}
                onChange={(nextValue) => onChange(patchListingLocation(location, {
                    communeId: nextValue || null,
                    communeName: allCommunesRef.current.find((item) => item.value === nextValue)?.label || null,
                    sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                    sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                    ...clearResolvedGeo(location),
                }))}
                disabled={!location.regionId}
                placeholder={location.regionId ? 'Seleccionar' : 'Primero región'}
                options={communes}
                invalid={fieldInvalid(errors, 'communeId')}
            />
        </Field>
    );
    const mapsActionButtons = internalMapsUrl ? (
        <div className="flex shrink-0 gap-2">
            <a
                href={internalMapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Ver en Maps"
                title="Ver en Maps"
                className="loc-editor-source-btn inline-flex size-10 items-center justify-center rounded-xl border transition-colors hover:opacity-80"
            >
                <GoogleMapIcon />
            </a>
            <button
                type="button"
                aria-label="Compartir dirección"
                title="Compartir dirección"
                onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                        void navigator.share({ title: location.label || 'Dirección', url: internalMapsUrl });
                    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        void navigator.clipboard.writeText(internalMapsUrl);
                    }
                }}
                className="loc-editor-source-btn inline-flex size-10 items-center justify-center rounded-xl border transition-colors hover:opacity-80"
            >
                <ShareIcon />
            </button>
        </div>
    ) : null;
    const locationMetaFields = showLocationMeta ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre de la dirección" required>
                <input
                    className="form-input"
                    value={location.label || ''}
                    onChange={(event) => onChange(patchListingLocation(location, { label: event.target.value }))}
                    placeholder="Ej: Consulta Providencia"
                />
            </Field>
            <Field label="Tipo">
                <StyledSelect
                    value={location.kind || ''}
                    onChange={(nextValue) => onChange(patchListingLocation(location, { kind: (nextValue as ListingLocationKind) || null }))}
                    placeholder="Seleccionar tipo"
                    options={kindOptions}
                />
            </Field>
        </div>
    ) : null;
    const arrivalField = (showLocationMeta || (simpleMode && showArrivalInstructions)) ? (
        <Field label="Instrucciones de llegada" hint={showLocationMeta ? 'Referencias visibles para el paciente antes de la sesión.' : 'Referencias para visitas o entregas.'}>
            <textarea
                className="form-textarea"
                value={location.arrivalInstructions || ''}
                onChange={(event) => onChange(patchListingLocation(location, { arrivalInstructions: event.target.value }))}
                placeholder="Ej: Piso 3, timbre 301. Estacionamiento disponible en el edificio."
                rows={3}
            />
        </Field>
    ) : null;
    const addressFields = location.sourceMode !== 'area_only' ? (
        simpleMode ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Dirección" required={addressRequired} error={fieldError(errors, 'addressLine1')} hint={addressHint}>
                    <div className="flex items-center gap-2">
                        <input
                            ref={addressInputRef}
                            className={joinClasses('form-input min-w-0 flex-1', fieldInvalid(errors, 'addressLine1') && 'form-input-error')}
                            value={location.addressLine1 || ''}
                            autoComplete="off"
                            onChange={(event) => onChange(patchListingLocation(location, {
                                addressLine1: event.target.value,
                                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                                ...clearResolvedGeo(location),
                            }))}
                            placeholder="Ej: Av. Italia 1452"
                        />
                        {mapsActionButtons}
                    </div>
                </Field>
                {showAddressLine2 ? (
                    <Field label="Depto, oficina o referencia">
                        <input className="form-input" value={location.addressLine2 || ''} onChange={(event) => onChange(patchListingLocation(location, { addressLine2: event.target.value }))} placeholder="Ej: Depto 608, torre B o portón gris" />
                    </Field>
                ) : null}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Dirección" required={addressRequired} error={fieldError(errors, 'addressLine1')} hint={addressHint}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                            ref={addressInputRef}
                            className={joinClasses('form-input', fieldInvalid(errors, 'addressLine1') && 'form-input-error')}
                            style={{ flex: 1 }}
                            value={location.addressLine1 || ''}
                            autoComplete="street-address"
                            onChange={(event) => onChange(patchListingLocation(location, {
                                addressLine1: event.target.value,
                                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                                ...clearResolvedGeo(location),
                            }))}
                            placeholder="Ej: Av. Italia 1452"
                        />
                        {internalMapsUrl ? (
                            <a
                                href={internalMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={getPanelButtonClassName({ className: 'h-10 px-3 text-sm whitespace-nowrap' })}
                                style={getPanelButtonStyle('secondary')}
                            >
                                Ver en Google Maps
                            </a>
                        ) : null}
                    </div>
                </Field>
                {showAddressLine2 ? (
                    <Field label="Depto, oficina o referencia">
                        <input className="form-input" value={location.addressLine2 || ''} onChange={(event) => onChange(patchListingLocation(location, { addressLine2: event.target.value }))} placeholder="Ej: Depto 608, torre B o portón gris" />
                    </Field>
                ) : null}
            </div>
        )
    ) : null;
    const areaFieldsBlock = showAreaFields ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regionField}
            {communeField}
        </div>
    ) : null;

    return (
        <div
            className={framed ? 'loc-editor-card rounded-card border p-4 space-y-4' : 'space-y-4'}
        >
            {showHeader ? (
                <div>
                    <p className="text-sm font-semibold loc-editor-fg">{title}</p>
                    <p className="text-xs mt-1 loc-editor-muted">{description}</p>
                </div>
            ) : null}
            {simpleMode ? (
                <>
                    {locationMetaFields}
                    {showSavedAddressPicker ? (
                    <Field label="Usar dirección" hint={!addressBookLoading && addressBook.length === 0 ? 'Aún no tienes direcciones guardadas. Completa el formulario y usa «Guardar en libreta».' : undefined}>
                        <StyledSelect
                            value={savedAddressSelectValue}
                            placeholder={addressBookLoading ? 'Cargando...' : 'Nueva dirección'}
                            disabled={addressBookLoading}
                            options={savedAddressOptions}
                            onChange={(nextValue) => {
                                if (!nextValue || nextValue === '__new__') {
                                    onChange(patchListingLocation(location, {
                                        sourceMode: 'custom',
                                        sourceAddressId: null,
                                    }));
                                    return;
                                }
                                const nextAddress = addressBook.find((item) => item.id === nextValue);
                                if (!nextAddress) return;
                                onChange(applyAddressBookEntryToLocation(nextAddress, location));
                            }}
                        />
                    </Field>
                    ) : null}
                    {addressFields}
                    {showAreaFields ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {regionField}
                            {communeField}
                        </div>
                    ) : null}
                    {arrivalField}
                    {(showSimpleVisibilityToggle || (onSaveToAddressBook && location.sourceMode !== 'saved_address')) ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {showSimpleVisibilityToggle ? (
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={location.visibilityMode !== 'exact'}
                                        onChange={(event) => onChange(patchListingLocation(location, {
                                            visibilityMode: event.target.checked ? 'commune_only' : 'exact',
                                            publicMapEnabled: !event.target.checked,
                                        }))}
                                    />
                                    <span>No mostrar dirección exacta</span>
                                </label>
                            ) : <div />}
                            {onSaveToAddressBook && location.sourceMode !== 'saved_address' ? (
                                <PanelButton type="button" variant="ghost" size="sm" onClick={() => void onSaveToAddressBook()}>
                                    Guardar en libreta
                                </PanelButton>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : (
                <>
            {showSourceSelector ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {sourceOptions.map((option) => {
                        const disabled = option.value === 'saved_address' && !addressBookLoading && addressBook.length === 0;
                        const active = location.sourceMode === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(patchListingLocation(location, {
                                    sourceMode: option.value as ListingLocation['sourceMode'],
                                    sourceAddressId: option.value === 'saved_address' ? location.sourceAddressId : null,
                                    addressLine1: option.value === 'area_only' ? null : location.addressLine1,
                                    addressLine2: option.value === 'area_only' ? null : location.addressLine2,
                                    ...(option.value === 'area_only' ? clearResolvedGeo(location) : {}),
                                }))}
                                className={`rounded-xl border p-3 text-left ${active ? 'loc-editor-source-btn loc-editor-source-btn--active' : 'loc-editor-source-btn'}`}
                                style={{ opacity: disabled ? 0.6 : 1 }}
                            >
                                <p className="text-sm font-semibold">{option.label}</p>
                                <p className="text-xs mt-1">{option.description}</p>
                            </button>
                        );
                    })}
                </div>
            ) : null}
            {location.sourceMode === 'saved_address' ? (
                <Field label="Dirección guardada" error={fieldError(errors, 'sourceAddressId')}>
                    <StyledSelect
                        value={location.sourceAddressId || ''}
                        placeholder={addressBookLoading ? 'Cargando...' : 'Seleccionar'}
                        disabled={addressBookLoading || addressBook.length === 0}
                        options={buildSavedAddressSelectOptions(addressBook, publishVertical)}
                        onChange={(nextValue) => {
                        const nextAddress = addressBook.find((item) => item.id === nextValue);
                        if (!nextAddress) return;
                        onChange(applyAddressBookEntryToLocation(nextAddress, location));
                    }}
                    />
                </Field>
            ) : null}
            {addressFirst ? addressFields : areaFieldsBlock}
            {addressFirst ? areaFieldsBlock : addressFields}
            {(showAreaFields || showVisibilityField) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showAreaFields ? (
                        <Field label="Sector / barrio">
                            <input className="form-input" value={location.neighborhood || ''} onChange={(event) => onChange(patchListingLocation(location, { neighborhood: event.target.value }))} placeholder="Ej: Barrio Italia" />
                        </Field>
                    ) : null}
                    {showVisibilityField ? (
                        <Field label="Visibilidad pública">
                            <StyledSelect
                                value={location.visibilityMode}
                                onChange={(nextValue) => onChange(patchListingLocation(location, { visibilityMode: nextValue as ListingLocationVisibilityMode }))}
                                options={visibilityOptions}
                            />
                        </Field>
                    ) : null}
                </div>
            ) : null}
            {(showActionBar && (showPublicPreviewCard || onGeocode || onSaveToAddressBook)) ? (
                <div className="loc-editor-action-bar flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-card border px-3 py-3">
                    {showPublicPreviewCard ? (
                        <div>
                            <p className="text-sm font-medium">Vista pública</p>
                            <p className="text-xs mt-1">
                                {location.publicLabel || 'La ubicación pública quedará oculta.'}
                            </p>
                            <p className="text-xs mt-1">Mapa público: {location.visibilityMode === 'hidden' ? 'Oculto' : location.publicMapEnabled ? 'Visible' : 'No visible'}</p>
                        </div>
                    ) : <div />}
                    <div className="flex items-center gap-2 flex-wrap">
                        {onGeocode ? <PanelButton type="button" variant="secondary" size="sm" className="h-9 px-3 text-xs" onClick={() => void onGeocode()} loading={geocoding}>{geocoding ? 'Actualizando mapa...' : 'Actualizar mapa'}</PanelButton> : null}
                        {showPublicPreviewCard ? <PanelButton type="button" variant="secondary" size="sm" className="h-9 px-3 text-xs" onClick={() => onChange(patchListingLocation(location, { publicMapEnabled: !location.publicMapEnabled }))} disabled={location.visibilityMode === 'hidden'}>{location.publicMapEnabled ? 'Ocultar mapa' : 'Mostrar mapa'}</PanelButton> : null}
                        {onSaveToAddressBook ? <PanelButton type="button" variant="secondary" size="sm" className="h-9 px-3 text-xs" onClick={() => void onSaveToAddressBook()}>Guardar en libreta</PanelButton> : null}
                    </div>
                </div>
            ) : null}
            {showPublicPreviewCard ? <LocationMapPreview location={location} /> : null}
                </>
            )}
        </div>
    );
}

