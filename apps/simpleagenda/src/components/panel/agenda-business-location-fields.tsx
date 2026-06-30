'use client';

import type { StructuredLocation } from '@simple/types';
import { StructuredLocationFields } from '@simple/ui/panel';
import { normalizeStructuredLocation, timezoneShortLabel } from '@simple/utils';

type AgendaBusinessLocationFieldsProps = {
    value: StructuredLocation;
    onChange: (next: StructuredLocation) => void;
    timezone?: string;
    disabled?: boolean;
};

export function AgendaBusinessLocationFields({
    value,
    onChange,
    timezone = 'America/Santiago',
    disabled = false,
}: AgendaBusinessLocationFieldsProps) {
    return (
        <div className="space-y-4">
            <StructuredLocationFields
                value={value}
                onChange={(location) => onChange(normalizeStructuredLocation(location))}
                disabled={disabled}
                regionLabel="Región"
                localityLabel="Comuna / ciudad"
            />

            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Zona horaria de citas: {timezoneShortLabel(timezone)}
            </p>
        </div>
    );
}

export function agendaBusinessLocationFromProfile(profile: {
    countryCode?: string | null;
    regionId?: string | null;
    region?: string | null;
    localityId?: string | null;
    city?: string | null;
    operatingLocation?: {
        countryCode?: string;
        regionId?: string | null;
        regionName?: string | null;
        localityId?: string | null;
        localityName?: string | null;
    };
}): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: profile.countryCode ?? profile.operatingLocation?.countryCode ?? 'CL',
        regionId: profile.regionId ?? profile.operatingLocation?.regionId ?? null,
        regionName: profile.region ?? profile.operatingLocation?.regionName ?? null,
        localityId: profile.localityId ?? profile.operatingLocation?.localityId ?? null,
        localityName: profile.city ?? profile.operatingLocation?.localityName ?? null,
    });
}

export function agendaBusinessLocationToProfilePayload(location: StructuredLocation) {
    const normalized = normalizeStructuredLocation(location);
    return {
        countryCode: normalized.countryCode,
        regionId: normalized.regionId,
        localityId: normalized.localityId,
        region: normalized.regionName,
        city: normalized.localityName,
    };
}
