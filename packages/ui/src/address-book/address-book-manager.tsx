'use client';

// Libreta de direcciones: diseño limpio intencional (PanelCard + simpleMode + addressHintMode="none").
// No reintroducir showHeader/framed ni copy denso del editor de publicaciones en este flujo.

import { useEffect, useMemo, useState } from 'react';
import type { AddressBookEntry, AddressBookKind, ListingLocation } from '@simple/types';
import { createEmptyListingLocation, patchListingLocation } from '@simple/types';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';
import { Field, addressSummary, type SelectOption } from '../location/location-shared';
import { ListingLocationEditor } from '../location/listing-location-editor';
import { joinClasses } from '../shared/join-classes';

export type AddressBookManagerSubmitInput = {
    id?: string;
    label: string;
    kind: AddressBookKind;
    isDefault: boolean;
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
};

function createDraftFromEntry(entry?: AddressBookEntry | null): AddressBookManagerSubmitInput {
    return {
        id: entry?.id,
        label: entry?.label || '',
        kind: entry?.kind || 'personal',
        isDefault: entry?.isDefault || false,
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
        description = 'Guarda direcciones particulares, de empresa, sucursal o envíos para reutilizarlas en publicaciones y operaciones.',
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
    } = props;
    const [draft, setDraft] = useState<AddressBookManagerSubmitInput>(createDraftFromEntry());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [composerOpen, setComposerOpen] = useState(false);

    useEffect(() => {
        if (!editingId) return;
        const current = entries.find((item) => item.id === editingId);
        if (!current) {
            setEditingId(null);
            setDraft(createDraftFromEntry());
            setComposerOpen(false);
        }
    }, [editingId, entries]);

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
        setDraft({ ...createDraftFromEntry(), isDefault: entries.length === 0 });
        setComposerOpen(true);
    };

    const handleEdit = (entry: AddressBookEntry) => {
        setEditingId(entry.id);
        setDraft(createDraftFromEntry(entry));
        setComposerOpen(true);
    };

    const handleReset = () => {
        setEditingId(null);
        setDraft(createDraftFromEntry());
        setComposerOpen(false);
    };

    const handleSave = async () => {
        const saved = await onSaveEntry(draft);
        if (saved) {
            handleReset();
        }
    };

    const handleMakeDefault = async (entry: AddressBookEntry) => {
        if (entry.isDefault) return;
        await onSaveEntry({ ...createDraftFromEntry(entry), isDefault: true });
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
                    <button type="button" className="btn btn-primary h-10 px-4 text-sm" style={{ marginLeft: 'auto' }} onClick={handleStartCreate}>
                        + Agregar dirección
                    </button>
                ) : null}
            </div>

            <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {entries.length > 0 ? entries.map((entry) => (
                        <div key={entry.id} className="rounded-card border p-4" style={{ borderColor: editingId === entry.id ? 'var(--fg)' : 'var(--border)', background: editingId === entry.id ? 'var(--bg-subtle)' : 'var(--bg)' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{entry.label}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{[entry.communeName, entry.regionName].filter(Boolean).join(', ') || 'Sin comuna'}</p>
                                </div>
                                {entry.isDefault ? <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>Predeterminada</span> : null}
                            </div>
                            <p className="text-sm mt-3" style={{ color: 'var(--fg-secondary)' }}>{[entry.addressLine1, entry.addressLine2].filter(Boolean).join(', ') || addressSummary(entry)}</p>
                            {entry.arrivalInstructions ? (
                                <p className="text-xs mt-2 italic" style={{ color: 'var(--fg-muted)' }}>{entry.arrivalInstructions}</p>
                            ) : null}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => handleEdit(entry)}>Editar</button>
                                {!entry.isDefault ? (
                                    <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => void handleMakeDefault(entry)} disabled={saving}>
                                        Predeterminar
                                    </button>
                                ) : null}
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => void onDeleteEntry(entry.id)} disabled={deletingId === entry.id}>{deletingId === entry.id ? 'Eliminando...' : 'Eliminar'}</button>
                            </div>
                        </div>
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
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" style={{ marginLeft: 'auto' }} onClick={handleReset}>
                                    Cancelar
                                </button>
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
                                        simpleMode
                                        addressHintMode="none"
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
                                        addressRequired
                                        googleMapsApiKey={googleMapsApiKey}
                                    />

                                <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
                                    <span style={{ color: 'var(--fg-secondary)' }}>Usar como dirección predeterminada</span>
                                </label>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button type="button" className="btn btn-primary h-10 px-4 text-sm" onClick={() => void handleSave()} disabled={saving || submitDisabled}>
                                        {saving ? 'Guardando...' : editingId ? 'Guardar dirección' : 'Agregar dirección'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PanelCard>
                ) : null}
            </div>
        </div>
    );
}
