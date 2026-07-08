'use client';

import { useMemo } from 'react';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';

export type MarketplaceCatalogLocationFiltersProps = {
    region: string;
    commune: string;
    onRegionChange: (value: string) => void;
    onCommuneChange: (value: string) => void;
};

export function MarketplaceCatalogLocationFilters({
    region,
    commune,
    onRegionChange,
    onCommuneChange,
}: MarketplaceCatalogLocationFiltersProps) {
    const communes = useMemo(() => (region ? getCommunesForRegion(region) : []), [region]);

    return (
        <>
            <PanelField label="Región">
                <PanelSelect
                    value={region}
                    onChange={(event) => {
                        onRegionChange(event.target.value);
                        onCommuneChange('');
                    }}
                >
                    <option value="">Todas las regiones</option>
                    {LOCATION_REGIONS.map((item) => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                </PanelSelect>
            </PanelField>
            <PanelField label="Comuna" hint={region ? undefined : 'Selecciona una región primero'}>
                <PanelSelect
                    value={commune}
                    onChange={(event) => onCommuneChange(event.target.value)}
                    disabled={!region}
                >
                    <option value="">Todas</option>
                    {communes.map((item) => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                </PanelSelect>
            </PanelField>
        </>
    );
}
