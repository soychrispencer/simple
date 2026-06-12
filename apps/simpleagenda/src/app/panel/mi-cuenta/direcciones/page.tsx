'use client';

import { useEffect, useState } from 'react';
import { PanelPageHeader } from '@simple/ui/panel';
import { PanelSectionTabs, accountSectionTabs } from '@/components/panel/panel-section-tabs';
import { AddressBookManager, type AddressBookManagerSubmitInput } from '@simple/ui/address-book';
import { fetchAddressBook, createAddressBookEntry, updateAddressBookEntry, deleteAddressBookEntry, getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import type { AddressBookEntry } from '@simple/types';
import { useGoogleMapsBrowserKey } from '@/lib/use-google-maps-browser-key';

export default function DireccionesPage() {
    const [entries, setEntries] = useState<AddressBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const googleMapsApiKey = useGoogleMapsBrowserKey();

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        const result = await fetchAddressBook();
        if (result.ok) {
            setEntries(result.items);
        }
        setLoading(false);
    };

    const noticeTone = message?.toLowerCase().includes('no se pudo') ? 'error' : message ? 'success' : undefined;

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Direcciones"
                description="Gestiona tus direcciones personales. Podrás reutilizarlas en tu negocio."
            />

            <div className="mb-6">
                <PanelSectionTabs
                    items={accountSectionTabs}
                    activeKey="direcciones"
                    ariaLabel="Secciones de mi cuenta"
                />
            </div>

            <div className="grid gap-5">
                <AddressBookManager
                    showHeader={true}
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
                        setEntries(result.items);
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
                        setEntries(result.items);
                        setMessage('Dirección eliminada.');
                    }}
                />
                {message ? (
                    <div className={`p-4 rounded-xl border ${noticeTone === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                        {message}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
