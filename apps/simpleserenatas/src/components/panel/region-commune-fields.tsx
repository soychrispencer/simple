'use client';

import { useMemo } from 'react';
import { PanelField } from '@simple/ui';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';

type RegionCommuneFieldsProps = {
    region: string;
    comuna: string;
    onRegionChange: (regionName: string) => void;
    onComunaChange: (comunaName: string) => void;
    disabled?: boolean;
    optional?: boolean;
};

function findRegionIdByName(regionName: string): string {
    if (!regionName.trim()) return '';
    const match = LOCATION_REGIONS.find(
        (r) => r.name.toLowerCase() === regionName.trim().toLowerCase(),
    );
    return match?.id ?? '';
}

export function RegionCommuneFields({
    region,
    comuna,
    onRegionChange,
    onComunaChange,
    disabled,
    optional = false,
}: RegionCommuneFieldsProps) {
    const optionalSuffix = optional ? ' (opcional)' : '';
    const regionId = useMemo(() => findRegionIdByName(region), [region]);
    const communes = useMemo(
        () => (regionId ? getCommunesForRegion(regionId) : []),
        [regionId],
    );

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <PanelField label={`Región${optionalSuffix}`}>
                <select
                    className="form-input w-full"
                    value={regionId}
                    disabled={disabled}
                    onChange={(event) => {
                        const next = LOCATION_REGIONS.find((r) => r.id === event.target.value);
                        onRegionChange(next?.name ?? '');
                        onComunaChange('');
                    }}
                >
                    <option value="">Selecciona región</option>
                    {LOCATION_REGIONS.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </PanelField>
            <PanelField label={`Comuna${optionalSuffix}`}>
                <select
                    className="form-input w-full"
                    value={
                        communes.find((c) => c.name.toLowerCase() === comuna.trim().toLowerCase())?.id ?? ''
                    }
                    disabled={disabled || !regionId}
                    onChange={(event) => {
                        const next = communes.find((c) => c.id === event.target.value);
                        onComunaChange(next?.name ?? '');
                    }}
                >
                    <option value="">Selecciona comuna</option>
                    {communes.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </PanelField>
        </div>
    );
}
