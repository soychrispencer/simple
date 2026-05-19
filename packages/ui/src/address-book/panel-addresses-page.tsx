'use client';

import { AddressBookManager } from './address-book-manager';
import { useAddressBookPage } from './use-address-book-page';
// PanelNotice y PanelPageHeader viven en index.tsx; este módulo se re-exporta al final del barrel.
import { PanelNotice, PanelPageHeader } from '../index';

export function PanelAddressesPage() {
    const {
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
    } = useAddressBookPage();

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Direcciones"
                description="Registra y gestiona tus direcciones. Puedes tener más de una activa."
            />
            <div className="space-y-4">
                <AddressBookManager
                    showHeader={false}
                    googleMapsApiKey={googleMapsApiKey}
                    entries={addressBook}
                    regions={regions}
                    getCommunes={getCommunes}
                    loading={loading}
                    saving={saving}
                    deletingId={deletingId}
                    onSaveEntry={onSaveEntry}
                    onDeleteEntry={onDeleteEntry}
                />
                {message ? <PanelNotice>{message}</PanelNotice> : null}
            </div>
        </div>
    );
}
