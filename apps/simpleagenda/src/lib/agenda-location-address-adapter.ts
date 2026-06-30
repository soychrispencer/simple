import type { AddressBookEntry, AddressBookKind, GeoPoint, ListingLocation } from '@simple/types';
import { createEmptyListingLocation, patchListingLocation } from '@simple/types';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import type { AgendaLocation } from '@/lib/agenda-api';

export type AgendaAddressDraft = {
    id?: string;
    label: string;
    kind: AddressBookKind;
    isDefault: boolean;
    isPublicVisible?: boolean;
    location: ListingLocation;
};

const AGENDA_DEFAULT_KIND = 'clinic' as const satisfies AddressBookKind;

function normalizeLabel(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function matchRegionId(regionName: string | null | undefined): { regionId: string | null; regionName: string | null } {
    const raw = regionName?.trim();
    if (!raw) return { regionId: null, regionName: null };
    const normalized = normalizeLabel(raw);
    const match = LOCATION_REGIONS.find((region) => {
        const name = normalizeLabel(region.name);
        return name === normalized || name.includes(normalized) || normalized.includes(name);
    });
    return match ? { regionId: match.id, regionName: match.name } : { regionId: null, regionName: raw };
}

function matchCommuneId(regionId: string | null, communeName: string | null | undefined): { communeId: string | null; communeName: string | null } {
    const raw = communeName?.trim();
    if (!raw || !regionId) return { communeId: null, communeName: raw ?? null };
    const normalized = normalizeLabel(raw);
    const communes = getCommunesForRegion(regionId);
    const match = communes.find((commune) => {
        const name = normalizeLabel(commune.name);
        return name === normalized || name.includes(normalized) || normalized.includes(name);
    });
    return match ? { communeId: match.id, communeName: match.name } : { communeId: null, communeName: raw };
}

function geoFromGoogleMapsUrl(url: string | null | undefined): GeoPoint {
    const empty = { latitude: null, longitude: null, precision: 'none' as const, provider: 'none' as const };
    const raw = url?.trim();
    if (!raw) return empty;
    const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        return {
            latitude: Number(atMatch[1]),
            longitude: Number(atMatch[2]),
            precision: 'exact',
            provider: 'external',
        };
    }
    const qMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
        return {
            latitude: Number(qMatch[1]),
            longitude: Number(qMatch[2]),
            precision: 'exact',
            provider: 'external',
        };
    }
    return empty;
}

function googleMapsUrlFromGeo(geo: GeoPoint, query: string): string | null {
    if (geo.latitude != null && geo.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${geo.latitude},${geo.longitude}`;
    }
    const trimmed = query.trim();
    return trimmed ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}` : null;
}

export function agendaLocationToAddressBookEntry(location: AgendaLocation): AddressBookEntry {
    const { regionId, regionName } = matchRegionId(location.region);
    const { communeId, communeName } = matchCommuneId(regionId, location.city);
    const geoPoint = geoFromGoogleMapsUrl(location.googleMapsUrl);
    const now = Date.now();

    return {
        id: location.id,
        kind: AGENDA_DEFAULT_KIND,
        scope: 'business',
        vertical: null,
        label: location.name,
        countryCode: 'CL',
        regionId,
        regionName,
        communeId,
        communeName,
        neighborhood: null,
        addressLine1: location.addressLine,
        addressLine2: null,
        postalCode: null,
        arrivalInstructions: location.notes,
        isDefault: location.isDefault,
        isPublicVisible: location.isActive,
        geoPoint,
        createdAt: new Date(location.createdAt).getTime() || now,
        updatedAt: new Date(location.updatedAt).getTime() || now,
    };
}

export function agendaDraftFromLocation(location: AgendaLocation, defaultKind: AddressBookKind = AGENDA_DEFAULT_KIND): AgendaAddressDraft {
    const entry = agendaLocationToAddressBookEntry(location);
    return {
        id: entry.id,
        label: entry.label,
        kind: defaultKind,
        isDefault: entry.isDefault,
        isPublicVisible: entry.isPublicVisible,
        location: patchListingLocation(
            createEmptyListingLocation({
                sourceMode: 'custom',
                countryCode: 'CL',
                visibilityMode: 'exact',
                publicMapEnabled: true,
                label: entry.label,
                kind: defaultKind,
            }),
            {
                regionId: entry.regionId,
                regionName: entry.regionName,
                communeId: entry.communeId,
                communeName: entry.communeName,
                addressLine1: entry.addressLine1,
                addressLine2: entry.addressLine2,
                arrivalInstructions: entry.arrivalInstructions,
                geoPoint: entry.geoPoint,
                publicGeoPoint: entry.geoPoint,
                publicLabel: [entry.addressLine1, entry.communeName, entry.regionName].filter(Boolean).join(', '),
            },
        ),
    };
}

export function agendaPayloadFromDraft(draft: AgendaAddressDraft) {
    const query = [draft.location.addressLine1, draft.location.communeName, draft.location.regionName].filter(Boolean).join(', ');
    return {
        name: (draft.label || draft.location.label || '').trim(),
        addressLine: draft.location.addressLine1?.trim() || '',
        city: draft.location.communeName?.trim() || null,
        region: draft.location.regionName?.trim() || null,
        notes: draft.location.arrivalInstructions?.trim() || null,
        googleMapsUrl: googleMapsUrlFromGeo(draft.location.geoPoint, query),
        isDefault: draft.isDefault,
        isActive: Boolean(draft.isPublicVisible),
    };
}
