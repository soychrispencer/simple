'use client';

import type { ReactNode } from 'react';
import { AddressBookManager } from './address-book-manager';
import { useAddressBookPage } from './use-address-book-page';
import { PanelNotice, PanelPageHeader } from '../panel';

export function PanelAddressesPage({ afterHeader }: { afterHeader?: ReactNode }) {
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
                title="Direcciones"
                description="Registra y gestiona tus direcciones. Puedes tener más de una activa."
            />
            {afterHeader}
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
