'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AddressBookEntry } from '@simple/types';
import {
    createAddressBookEntry,
    deleteAddressBookEntry,
    fetchAddressBook,
    getCommunesForRegion,
    LOCATION_REGIONS,
    updateAddressBookEntry,
} from '@simple/utils';
import type { AddressBookManagerSubmitInput } from './address-book-manager';

function draftToPayload(draft: AddressBookManagerSubmitInput) {
    return {
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
}

export function useAddressBookPage() {
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const result = await fetchAddressBook();
            if (!active) return;
            setAddressBook(result.items);
            setLoading(false);
            if (!result.ok && result.error) setMessage(result.error);
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    const onSaveEntry = useCallback(async (draft: AddressBookManagerSubmitInput) => {
        setSaving(true);
        const payload = draftToPayload(draft);
        const result = draft.id
            ? await updateAddressBookEntry(draft.id, payload)
            : await createAddressBookEntry(payload);
        setSaving(false);
        if (!result.ok) {
            setMessage(result.error || 'No se pudo guardar la direccion.');
            return false;
        }
        setAddressBook(result.items);
        setMessage(draft.id ? 'Direccion actualizada.' : 'Direccion agregada.');
        return true;
    }, []);

    const onDeleteEntry = useCallback(async (entryId: string) => {
        setDeletingId(entryId);
        const result = await deleteAddressBookEntry(entryId);
        setDeletingId(null);
        if (!result.ok) {
            setMessage(result.error || 'No se pudo eliminar la direccion.');
            return;
        }
        setAddressBook(result.items);
        setMessage('Direccion eliminada.');
    }, []);

    const googleMapsApiKey =
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const regions = LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }));
    const getCommunes = useCallback(
        (regionId: string) =>
            getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name })),
        [],
    );

    return {
        addressBook,
        loading,
        saving,
        deletingId,
        message,
        googleMapsApiKey,
        regions,
        getCommunes,
        onSaveEntry,
        onDeleteEntry,
    };
}
