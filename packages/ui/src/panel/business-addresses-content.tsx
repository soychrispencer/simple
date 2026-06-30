'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAccountPublicProfile, type PublicProfileVertical } from '@simple/utils';
import type { AddressBookBusinessVertical } from '@simple/types';
import { AddressBookManager } from '../address-book/address-book-manager';
import { useAddressBookPage } from '../address-book/use-address-book-page';
import { PanelNotice } from './panel-primitives.js';
import { ADDRESS_BOOK_CHANGED_EVENT, type AddressBookChangedDetail } from '@simple/utils';

export type PanelBusinessAddressesContentProps = {
    vertical: PublicProfileVertical | Extract<AddressBookBusinessVertical, 'serenatas'>;
};

export function PanelBusinessAddressesContent({ vertical }: PanelBusinessAddressesContentProps) {
    const [featuredOnProfileId, setFeaturedOnProfileId] = useState<string | null>(null);
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
    } = useAddressBookPage({ scope: 'business', vertical });

    const loadFeaturedId = useCallback(async () => {
        if (vertical === 'serenatas') return;
        const data = await fetchAccountPublicProfile(vertical);
        setFeaturedOnProfileId(data?.profile.primaryAddressId ?? null);
    }, [vertical]);

    useEffect(() => {
        void loadFeaturedId();
    }, [loadFeaturedId]);

    useEffect(() => {
        const onChanged = (event: Event) => {
            const detail = (event as CustomEvent<AddressBookChangedDetail>).detail;
            if (detail?.vertical && detail.vertical !== vertical) return;
            void loadFeaturedId();
        };
        window.addEventListener(ADDRESS_BOOK_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(ADDRESS_BOOK_CHANGED_EVENT, onChanged);
    }, [loadFeaturedId, vertical]);

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
                defaultPublicVisible
                featuredOnProfileId={vertical === 'serenatas' ? null : featuredOnProfileId}
            />
            {message ? <PanelNotice tone={noticeTone}>{message}</PanelNotice> : null}
        </div>
    );
}
