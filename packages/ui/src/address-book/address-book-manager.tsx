'use client';

// Libreta de direcciones: diseño limpio intencional (PanelCard + simpleMode + addressHintMode="none").
// No reintroducir showHeader/framed ni copy denso del editor de publicaciones en este flujo.

import { useEffect, useMemo, useState } from 'react';
import type { AddressBookEntry, AddressBookKind, ListingLocation } from '@simple/types';
import { createEmptyListingLocation, patchListingLocation } from '@simple/types';
import { PanelCard } from '../panel/panel-card';
import { PanelButton } from '../panel/panel-button';
import { Field, type SelectOption } from '../location/location-shared';
import { ListingLocationEditor } from '../location/listing-location-editor';
import { AddressBookEntryCard } from './address-book-entry-card';
import { resolveGoogleMapsBrowserKey } from '../hooks/google-maps-browser-key-shared';

export type AddressBookManagerSubmitInput = {
    id?: string;
    label: string;
    kind: AddressBookKind;
    isDefault: boolean;
    isPublicVisible?: boolean;
    location: ListingLocation;
};

type AddressBookManagerProps = {
    title?: string;
    description?: string;
    showHeader?: boolean;
    googleMapsApiKey?: string;
    entries: AddressBookEntry[];
    regions: SelectOption[];
    getCommunes: (regionId: string) => SelectOption[];
    loading?: boolean;
    saving?: boolean;
    deletingId?: string | null;
    onSaveEntry: (input: AddressBookManagerSubmitInput) => boolean | Promise<boolean>;
    onDeleteEntry: (entryId: string) => void | Promise<void>;
    defaultKind?: AddressBookKind;
    /** Valor inicial de visibilidad pública al crear (sin toggle en formulario). */
    defaultPublicVisible?: boolean;
    /** ID enlazado a la ficha pública (marketplace: primaryAddressId). */
    featuredOnProfileId?: string | null;
    profileBadgeLabel?: string;
    showInactiveBadge?: boolean;
    inactiveBadgeLabel?: string;
};

function createDraftFromEntry(
    entry?: AddressBookEntry | null,
    defaultKind: AddressBookKind = 'personal',
    defaultPublicVisible = false,
): AddressBookManagerSubmitInput {
    return {
        id: entry?.id,
        label: entry?.label || '',
        kind: entry?.kind || defaultKind,
        isDefault: entry?.isDefault || false,
        isPublicVisible: entry?.isPublicVisible ?? defaultPublicVisible,
        location: patchListingLocation(
            createEmptyListingLocation({
                sourceMode: 'custom',
                countryCode: entry?.countryCode || 'CL',
                visibilityMode: 'exact',
                publicMapEnabled: true,
                label: entry?.label || null,
                kind: entry?.kind || null,
            }),
            {
                regionId: entry?.regionId || null,
                regionName: entry?.regionName || null,
                communeId: entry?.communeId || null,
                communeName: entry?.communeName || null,
                neighborhood: entry?.neighborhood || null,
                addressLine1: entry?.addressLine1 || null,
                addressLine2: entry?.addressLine2 || null,
                postalCode: entry?.postalCode || null,
                arrivalInstructions: entry?.arrivalInstructions || null,
                geoPoint: entry?.geoPoint || undefined,
                publicGeoPoint: entry?.geoPoint || undefined,
                publicLabel: [entry?.addressLine1, entry?.communeName, entry?.regionName].filter(Boolean).join(', '),
            }
        ),
    };
}

export function AddressBookManager(props: AddressBookManagerProps) {
    const {
        title = 'Direcciones guardadas',
        description = 'Guarda direcciones para reutilizarlas en tu perfil, publicaciones y operaciones.',
        showHeader = true,
        googleMapsApiKey,
        entries,
        regions,
        getCommunes,
        loading = false,
        saving = false,
        deletingId = null,
        onSaveEntry,
        onDeleteEntry,
        defaultKind = 'personal',
        defaultPublicVisible = false,
        featuredOnProfileId = null,
        profileBadgeLabel = 'En ficha',
        showInactiveBadge = false,
        inactiveBadgeLabel = 'Inactiva',
    } = props;
    const [draft, setDraft] = useState<AddressBookManagerSubmitInput>(
        createDraftFromEntry(undefined, defaultKind, defaultPublicVisible),
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const resolvedMapsKey = resolveGoogleMapsBrowserKey(googleMapsApiKey);

    useEffect(() => {
        if (!editingId) return;
        const current = entries.find((item) => item.id === editingId);
        if (!current) {
            setEditingId(null);
            setDraft(createDraftFromEntry(undefined, defaultKind, defaultPublicVisible));
            setComposerOpen(false);
        }
    }, [defaultKind, defaultPublicVisible, editingId, entries]);

    const communes = useMemo(
        () => getCommunes(draft.location.regionId || ''),
        [draft.location.regionId, getCommunes]
    );
    const allCommunes = useMemo(
        () => regions.flatMap((region) => getCommunes(region.value)),
        [regions, getCommunes]
    );

    const submitDisabled = !(draft.location.label?.trim() || draft.label.trim()) || !draft.location.regionId || !draft.location.communeId || !draft.location.addressLine1?.trim();
    const draftLabel = draft.label || draft.location.label || '';

    const handleStartCreate = () => {
        setEditingId(null);
        setDraft({ ...createDraftFromEntry(undefined, defaultKind, defaultPublicVisible), isDefault: entries.length === 0 });
        setComposerOpen(true);
    };

    const handleEdit = (entry: AddressBookEntry) => {
        setEditingId(entry.id);
        setDraft(createDraftFromEntry(entry, defaultKind, defaultPublicVisible));
        setComposerOpen(true);
    };

    const handleReset = () => {
        setEditingId(null);
        setDraft(createDraftFromEntry(undefined, defaultKind, defaultPublicVisible));
        setComposerOpen(false);
    };

    const handleSave = async () => {
        const kind = draft.kind || defaultKind;
        const saved = await onSaveEntry({
            ...draft,
            kind,
            location: patchListingLocation(draft.location, { kind }),
        });
        if (saved) {
            handleReset();
        }
    };

    const handleMakeDefault = async (entry: AddressBookEntry) => {
        if (entry.isDefault) return;
        await onSaveEntry({ ...createDraftFromEntry(entry, defaultKind, defaultPublicVisible), isDefault: true });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {showHeader ? (
                    <div>
                        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>{title}</h2>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{description}</p>
                    </div>
                ) : null}
                {!composerOpen ? (
                    <PanelButton type="button" variant="accent" size="sm" onClick={handleStartCreate} className="ml-auto">
                        + Agregar dirección
                    </PanelButton>
                ) : null}
            </div>

            <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {entries.length > 0 ? entries.map((entry) => (
                        <AddressBookEntryCard
                            key={entry.id}
                            entry={entry}
                            isEditing={editingId === entry.id}
                            featuredOnProfile={
                                featuredOnProfileId
                                    ? featuredOnProfileId === entry.id
                                    : (entry.isDefault && Boolean(entry.isPublicVisible))
                            }
                            dimmed={showInactiveBadge && !entry.isPublicVisible}
                            profileBadgeLabel={profileBadgeLabel}
                            inactiveBadgeLabel={inactiveBadgeLabel}
                            saving={saving}
                            deletingId={deletingId}
                            onEdit={() => handleEdit(entry)}
                            onMakeDefault={!entry.isDefault ? () => void handleMakeDefault(entry) : undefined}
                            onDelete={() => void onDeleteEntry(entry.id)}
                        />
                    )) : (
                        <div className="rounded-card border p-5 text-sm md:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}>
                            <p>{loading ? 'Cargando direcciones...' : 'Todavía no tienes direcciones guardadas.'}</p>
                        </div>
                    )}
                </div>

                {composerOpen ? (
                    <PanelCard tone="surface" size="lg" className="shadow-(--shadow-xs)">
                        <div className="space-y-5">
                            <div className="flex flex-wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <p className="text-base font-semibold pr-2" style={{ color: 'var(--fg)' }}>{editingId ? 'Editar dirección' : 'Nueva dirección'}</p>
                                <PanelButton type="button" variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
                                    Cancelar
                                </PanelButton>
                            </div>

                            <div className="space-y-5">
                                <Field label="Nombre de la dirección" required>
                                    <input
                                        className="form-input"
                                        value={draftLabel}
                                        onChange={(event) => {
                                            const nextLabel = event.target.value;
                                            setDraft((current) => ({
                                                ...current,
                                                label: nextLabel,
                                                location: patchListingLocation(current.location, { label: nextLabel }),
                                            }));
                                        }}
                                        placeholder="Ej: Casa, Oficina, Casa mamá"
                                    />
                                </Field>

                                <ListingLocationEditor
                                        key={resolvedMapsKey || 'maps-key-pending'}
                                        simpleMode
                                        addressHintMode="minimal"
                                        location={draft.location}
                                        onChange={(next) => setDraft((current) => ({
                                            ...current,
                                            location: patchListingLocation(next, { visibilityMode: 'exact', publicMapEnabled: true, label: current.label || next.label }),
                                        }))}
                                        regions={regions}
                                        communes={communes}
                                        allCommunes={allCommunes}
                                        addressBook={[]}
                                        showHeader={false}
                                        framed={false}
                                        addressFirst
                                        allowAreaOnly={false}
                                        showSavedAddressPicker={false}
                                        showSourceSelector={false}
                                        showVisibilityField={false}
                                        showSimpleVisibilityToggle={false}
                                        showPublicPreviewCard={false}
                                        showActionBar={false}
                                        showGoogleMapsLink
                                        showArrivalInstructions
                                        addressRequired
                                        googleMapsApiKey={resolvedMapsKey}
                                    />

                                <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
                                    <span style={{ color: 'var(--fg-secondary)' }}>Usar como dirección predeterminada</span>
                                </label>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <PanelButton type="button" variant="accent" onClick={() => void handleSave()} disabled={saving || submitDisabled}>
                                        {saving ? 'Guardando...' : editingId ? 'Guardar dirección' : 'Agregar dirección'}
                                    </PanelButton>
                                </div>
                            </div>
                        </div>
                    </PanelCard>
                ) : null}
            </div>
        </div>
    );
}
