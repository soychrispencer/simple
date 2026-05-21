'use client';

import { useState } from 'react';
import type { AddressBookEntry } from '@simple/types';
import type { AddressBookManagerSubmitInput } from '@simple/ui';
import { AddressBookManager, PanelNotice } from '@simple/ui';
import {
    createAddressBookEntry,
    deleteAddressBookEntry,
    getCommunesForRegion,
    LOCATION_REGIONS,
    updateAddressBookEntry,
} from '@simple/utils';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';

type AddressesSectionProps = {
    entries: AddressBookEntry[];
    loading: boolean;
    onEntriesChange: (entries: AddressBookEntry[]) => void;
};

function normalizeCommuneLabel(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function matchCommuneToCatalog(name: string): string | null {
    const normalized = normalizeCommuneLabel(name);
    if (!normalized) return null;

    for (const region of LOCATION_REGIONS) {
        for (const commune of getCommunesForRegion(region.id)) {
            const catalog = normalizeCommuneLabel(commune.name);
            if (catalog === normalized) return commune.name;
            if (catalog.includes(normalized) || normalized.includes(catalog)) return commune.name;
        }
    }
    return null;
}

export function communesFromAddressBook(entries: AddressBookEntry[]): string[] {
    const names = new Set<string>();
    for (const entry of entries) {
        const raw = entry.communeName?.trim();
        if (!raw) continue;
        names.add(matchCommuneToCatalog(raw) ?? raw);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
}

export function AddressesSection({ entries, loading, onEntriesChange }: AddressesSectionProps) {
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const syncEntries = (items: AddressBookEntry[]) => {
        onEntriesChange(items);
    };

    const noticeTone = message?.toLowerCase().includes('no se pudo') ? 'error' : message ? 'success' : undefined;

    return (
        <div className="grid gap-5">
            <AddressBookManager
                showHeader={false}
                googleMapsApiKey={googleMapsApiKey}
                entries={entries}
                regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                getCommunes={(regionId) => getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name }))}
                loading={loading}
                saving={saving}
                deletingId={deletingId}
                onSaveEntry={async (draft: AddressBookManagerSubmitInput) => {
                    setMessage(null);
                    setSaving(true);
                    const payload = {
                        kind: draft.kind,
                        label: draft.label.trim(),
                        countryCode: draft.location.countryCode,
                        regionId: draft.location.regionId,
                        regionName: draft.location.regionName,
                        communeId: draft.location.communeId,
                        communeName: draft.location.communeName,
                        neighborhood: draft.location.neighborhood,
                        addressLine1: draft.location.addressLine1,
                        addressLine2: draft.location.addressLine2,
                        postalCode: draft.location.postalCode,
                        arrivalInstructions: draft.location.arrivalInstructions,
                        geoPoint: draft.location.geoPoint,
                        isDefault: draft.isDefault,
                    };
                    const result = draft.id
                        ? await updateAddressBookEntry(draft.id, payload)
                        : await createAddressBookEntry(payload);
                    setSaving(false);
                    if (!result.ok) {
                        setMessage(result.error || 'No se pudo guardar la dirección.');
                        return false;
                    }
                    syncEntries(result.items);
                    setMessage(draft.id ? 'Dirección actualizada.' : 'Dirección agregada.');
                    return true;
                }}
                onDeleteEntry={async (entryId) => {
                    setMessage(null);
                    setDeletingId(entryId);
                    const result = await deleteAddressBookEntry(entryId);
                    setDeletingId(null);
                    if (!result.ok) {
                        setMessage(result.error || 'No se pudo eliminar la dirección.');
                        return;
                    }
                    syncEntries(result.items);
                    setMessage('Dirección eliminada.');
                }}
            />
            {message ? (
                <PanelNotice tone={noticeTone === 'error' ? 'error' : 'success'}>{message}</PanelNotice>
            ) : null}
        </div>
    );
}
