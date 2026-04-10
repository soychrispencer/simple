'use client';

import { useEffect, useState } from 'react';
import type { AddressBookEntry } from '@simple/types';
import type { AddressBookManagerSubmitInput } from '@simple/ui';
import { AddressBookManager, PanelPageHeader, PanelNotice } from '@simple/ui';
import {
    createAddressBookEntry,
    deleteAddressBookEntry,
    fetchAddressBook,
    getCommunesForRegion,
    LOCATION_REGIONS,
    updateAddressBookEntry,
} from '@simple/utils';

export default function DireccionesPage() {
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
        return () => { active = false; };
    }, []);

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Direcciones"
                description="Gestiona tus direcciones de propiedades."
            />

            <div className="space-y-4">
                <AddressBookManager
                    entries={addressBook}
                    regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                    getCommunes={(regionId) => getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name }))}
                    loading={loading}
                    saving={saving}
                    deletingId={deletingId}
                    onSaveEntry={async (draft: AddressBookManagerSubmitInput) => {
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
                            geoPoint: draft.location.geoPoint,
                            contactName: draft.contactName,
                            contactPhone: draft.contactPhone,
                            isDefault: draft.isDefault,
                        };
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
                    }}
                    onDeleteEntry={async (entryId) => {
                        setDeletingId(entryId);
                        const result = await deleteAddressBookEntry(entryId);
                        setDeletingId(null);
                        if (!result.ok) {
                            setMessage(result.error || 'No se pudo eliminar la direccion.');
                            return;
                        }
                        setAddressBook(result.items);
                        setMessage('Direccion eliminada.');
                    }}
                />
                {message ? <PanelNotice>{message}</PanelNotice> : null}
            </div>
        </div>
    );
}
