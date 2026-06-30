'use client';

import { useMemo } from 'react';
import type { StructuredLocation } from '@simple/types';
import { StructuredLocationFields } from '@simple/ui/panel';
import { structuredLocationFromLegacyNames } from '@simple/utils';

type RegionCommuneFieldsProps = {
    countryCode?: string;
    region: string;
    comuna: string;
    onCountryChange?: (countryCode: string) => void;
    onRegionChange: (regionName: string) => void;
    onComunaChange: (comunaName: string) => void;
    disabled?: boolean;
    optional?: boolean;
};

export function RegionCommuneFields({
    countryCode = 'CL',
    region,
    comuna,
    onCountryChange,
    onRegionChange,
    onComunaChange,
    disabled,
    optional = false,
}: RegionCommuneFieldsProps) {
    const value = useMemo(
        () => structuredLocationFromLegacyNames(countryCode, region, comuna),
        [countryCode, region, comuna],
    );

    const handleChange = (next: StructuredLocation) => {
        if (next.countryCode !== value.countryCode) {
            onCountryChange?.(next.countryCode);
        }
        onRegionChange(next.regionName ?? '');
        onComunaChange(next.localityName ?? '');
    };

    const regionLabel = optional ? 'Región (opcional)' : 'Región';
    const localityLabel = optional ? 'Comuna (opcional)' : 'Comuna';

    return (
        <StructuredLocationFields
            value={value}
            onChange={handleChange}
            disabled={disabled}
            regionLabel={regionLabel}
            localityLabel={localityLabel}
        />
    );
}
