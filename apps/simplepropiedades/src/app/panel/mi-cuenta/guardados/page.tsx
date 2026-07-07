'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconGridDots, IconList } from '@tabler/icons-react';
import PropertyListingCard from '@/components/listings/property-listing-card';
import { mapSavedListingToPropertyCard } from '@/lib/saved-listing-card';
import {
    ACCOUNT_SAVED_PAGE,
    MARKETPLACE_ACCOUNT_SECTION_TABS,
    PanelAccountShell,
    PanelEmptyState,
    PanelSegmentedToggle,
} from '@simple/ui/panel';
import { readSavedListings, subscribeSavedListings, syncSavedListingsFromApi, type SavedListingRecord } from '@simple/utils';

type ViewMode = 'grid' | 'list';

export default function GuardadosCuentaPage() {
    const [items, setItems] = useState<SavedListingRecord[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window === 'undefined') return 'grid';
        const saved = window.localStorage.getItem('simplepropiedades:panel:guardados:viewMode');
        return saved === 'list' ? 'list' : 'grid';
    });

    useEffect(() => {
        const sync = () => setItems(readSavedListings());
        sync();
        void syncSavedListingsFromApi().then(setItems);
        return subscribeSavedListings(sync);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simplepropiedades:panel:guardados:viewMode', viewMode);
        }
    }, [viewMode]);

    const description = useMemo(() => {
        if (items.length === 0) return ACCOUNT_SAVED_PAGE.description;
        return items.length === 1 ? '1 propiedad guardada' : `${items.length} propiedades guardadas`;
    }, [items.length]);

    return (
        <PanelAccountShell
            activeKey="guardados"
            tabs={MARKETPLACE_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_SAVED_PAGE.title}
            description={description}
            actions={
                items.length > 0 ? (
                    <PanelSegmentedToggle
                        className="shrink-0"
                        size="sm"
                        iconOnly
                        items={[
                            { key: 'grid', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista vertical' },
                            { key: 'list', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista horizontal' },
                        ]}
                        activeKey={viewMode}
                        onChange={(key) => setViewMode(key as ViewMode)}
                    />
                ) : null
            }
        >
            {items.length === 0 ? (
                <PanelEmptyState description="Todavía no guardas publicaciones." />
            ) : (
                <div className={viewMode === 'grid' ? 'listings-grid grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'w-full space-y-3'}>
                    {items.map((item) => (
                        <PropertyListingCard
                            key={item.id}
                            data={mapSavedListingToPropertyCard(item)}
                            mode={viewMode}
                        />
                    ))}
                </div>
            )}
        </PanelAccountShell>
    );
}
