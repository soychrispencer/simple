'use client';

import { useMemo } from 'react';
import { PanelField } from '@simple/ui/panel';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import { FieldSelect } from '@/components/panel/shared';

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
    const regionOptions = useMemo(
        () => [
            { value: '', label: 'Selecciona región' },
            ...LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name })),
        ],
        [],
    );
    const communeOptions = useMemo(
        () => [
            { value: '', label: 'Selecciona comuna' },
            ...communes.map((item) => ({ value: item.id, label: item.name })),
        ],
        [communes],
    );
    const communeValue =
        communes.find((c) => c.name.toLowerCase() === comuna.trim().toLowerCase())?.id ?? '';

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <PanelField label={`Región${optionalSuffix}`}>
                <FieldSelect
                    value={regionId}
                    disabled={disabled}
                    options={regionOptions}
                    onChange={(event) => {
                        const next = LOCATION_REGIONS.find((r) => r.id === event.target.value);
                        onRegionChange(next?.name ?? '');
                        onComunaChange('');
                    }}
                />
            </PanelField>
            <PanelField label={`Comuna${optionalSuffix}`}>
                <FieldSelect
                    value={communeValue}
                    disabled={disabled || !regionId}
                    options={communeOptions}
                    onChange={(event) => {
                        const next = communes.find((c) => c.id === event.target.value);
                        onComunaChange(next?.name ?? '');
                    }}
                />
            </PanelField>
        </div>
    );
}
