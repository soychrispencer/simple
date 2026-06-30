'use client';

import { AddressBookManager } from '../address-book/address-book-manager';
import { useAddressBookPage } from '../address-book/use-address-book-page';
import { PanelNotice } from './panel-primitives.js';

export function PanelAccountAddressesContent() {
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
        defaultKind,
    } = useAddressBookPage({ scope: 'personal' });

    const noticeTone = message?.toLowerCase().includes('no se pudo') ? 'error' : 'success';

    return (
        <div className="grid gap-5">
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
                defaultKind={defaultKind}
            />
            {message ? <PanelNotice tone={noticeTone}>{message}</PanelNotice> : null}
        </div>
    );
}
