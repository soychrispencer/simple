'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AddressBookBusinessVertical, AddressBookEntry, AddressBookScope } from '@simple/types';
import {
    createAddressBookEntry,
    defaultKindForScope,
    deleteAddressBookEntry,
    dispatchAddressBookChanged,
    fetchAddressBook,
    getCommunesForRegion,
    LOCATION_REGIONS,
    syncMarketplaceProfileWithDefaultAddress,
    updateAddressBookEntry,
} from '@simple/utils';
import type { AddressBookManagerSubmitInput } from './address-book-manager';
import { useGoogleMapsBrowserKey } from '../hooks/use-google-maps-browser-key';

function draftToPayload(
    draft: AddressBookManagerSubmitInput,
    scope: AddressBookScope,
    vertical?: AddressBookBusinessVertical,
) {
    return {
        kind: draft.kind,
        scope,
        ...(scope === 'business' && vertical ? { vertical } : {}),
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
        ...(scope === 'business' ? { isPublicVisible: Boolean(draft.isPublicVisible) } : {}),
    };
}

export type UseAddressBookPageOptions = {
    scope?: AddressBookScope;
    vertical?: AddressBookBusinessVertical;
};

export function useAddressBookPage(options: UseAddressBookPageOptions = {}) {
    const scope = options.scope ?? 'personal';
    const vertical = options.vertical;
    const defaultKind = defaultKindForScope(scope);

    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const syncMarketplaceDefault = useCallback(async (
        items: AddressBookEntry[],
        linkPrimaryAddress: boolean,
    ) => {
        if (scope !== 'business' || !vertical || vertical === 'serenatas') return;
        const defaultEntry = items.find((item) => item.isDefault);
        if (!defaultEntry) return;
        await syncMarketplaceProfileWithDefaultAddress(vertical, defaultEntry, { linkPrimaryAddress });
    }, [scope, vertical]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const result = await fetchAddressBook({
                scope,
                vertical: scope === 'business' ? vertical : undefined,
            });
            if (!active) return;
            setAddressBook(result.items);
            setLoading(false);
            if (!result.ok && result.error) setMessage(result.error);
        };
        void load();
        return () => {
            active = false;
        };
    }, [scope, vertical]);

    const onSaveEntry = useCallback(async (draft: AddressBookManagerSubmitInput) => {
        setSaving(true);
        const payload = draftToPayload(draft, scope, vertical);
        const result = draft.id
            ? await updateAddressBookEntry(draft.id, payload)
            : await createAddressBookEntry(payload);
        setSaving(false);
        if (!result.ok) {
            setMessage(result.error || 'No se pudo guardar la dirección.');
            return false;
        }
        setAddressBook(result.items);
        const linkPrimary = Boolean(draft.isDefault) || result.items.some((item) => item.isDefault && item.isPublicVisible);
        await syncMarketplaceDefault(result.items, linkPrimary);
        dispatchAddressBookChanged({ scope, vertical });
        setMessage(draft.id ? 'Dirección actualizada.' : 'Dirección agregada.');
        return true;
    }, [scope, syncMarketplaceDefault, vertical]);

    const onDeleteEntry = useCallback(async (entryId: string) => {
        setDeletingId(entryId);
        const result = await deleteAddressBookEntry(entryId);
        setDeletingId(null);
        if (!result.ok) {
            setMessage(result.error || 'No se pudo eliminar la dirección.');
            return;
        }
        setAddressBook(result.items);
        await syncMarketplaceDefault(result.items, false);
        dispatchAddressBookChanged({ scope, vertical });
        setMessage('Dirección eliminada.');
    }, [scope, syncMarketplaceDefault, vertical]);

    const googleMapsApiKey = useGoogleMapsBrowserKey();

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
        scope,
        defaultKind,
    };
}
