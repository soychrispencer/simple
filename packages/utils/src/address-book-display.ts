import type { AddressBookEntry, StructuredLocation } from '@simple/types';
import { normalizeStructuredLocation } from './structured-location.js';

export type PublicProfileAddressFields = {
    addressLine: string | null;
    city: string | null;
    region: string | null;
};

export type PublicProfileAddressSource = {
    primaryAddressId?: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
};

export function formatPublicAddressLineFromEntry(
    entry: Pick<AddressBookEntry, 'addressLine1' | 'addressLine2' | 'neighborhood'>,
): string | null {
    const parts = [entry.addressLine1, entry.addressLine2, entry.neighborhood]
        .map((item) => (item ?? '').trim())
        .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}

export function publicAddressFieldsFromEntry(
    entry: Pick<AddressBookEntry, 'addressLine1' | 'addressLine2' | 'neighborhood' | 'communeName' | 'regionName'>,
): PublicProfileAddressFields {
    return {
        addressLine: formatPublicAddressLineFromEntry(entry),
        city: entry.communeName ?? null,
        region: entry.regionName ?? null,
    };
}

export function resolvePublicProfileAddressFields(
    profile: PublicProfileAddressSource,
    primaryEntry: (Pick<AddressBookEntry, 'isPublicVisible' | 'addressLine1' | 'addressLine2' | 'neighborhood' | 'communeName' | 'regionName'>) | null | undefined,
): PublicProfileAddressFields {
    if (profile.primaryAddressId) {
        if (!primaryEntry?.isPublicVisible) {
            return { addressLine: null, city: null, region: null };
        }
        return publicAddressFieldsFromEntry(primaryEntry);
    }
    return {
        addressLine: profile.addressLine ?? null,
        city: profile.city ?? null,
        region: profile.region ?? null,
    };
}

export function structuredLocationFromAddressBookEntry(
    entry: Pick<AddressBookEntry, 'countryCode' | 'regionId' | 'regionName' | 'communeId' | 'communeName'>,
): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: entry.countryCode,
        regionId: entry.regionId,
        regionName: entry.regionName,
        localityId: entry.communeId,
        localityName: entry.communeName,
    });
}

export function formatAddressBookEntryFullAddress(
    entry: Pick<AddressBookEntry, 'addressLine1' | 'addressLine2' | 'neighborhood' | 'communeName' | 'regionName'>,
): string {
    return [
        formatPublicAddressLineFromEntry(entry),
        entry.communeName,
        entry.regionName,
    ]
        .map((item) => (item ?? '').trim())
        .filter(Boolean)
        .join(', ');
}

export function formatAddressBookEntryLabel(
    entry: Pick<AddressBookEntry, 'label' | 'addressLine1' | 'communeName' | 'regionName'>,
): string {
    return [
        entry.label,
        entry.addressLine1,
        entry.communeName,
        entry.regionName,
    ]
        .map((item) => (item ?? '').trim())
        .filter(Boolean)
        .join(' · ');
}

export function addressBookEntryToWritePayload(
    entry: AddressBookEntry,
    overrides: Partial<Pick<AddressBookEntry, 'isDefault' | 'isPublicVisible' | 'label'>> = {},
) {
    return {
        kind: entry.kind,
        scope: entry.scope,
        ...(entry.scope === 'business' && entry.vertical ? { vertical: entry.vertical } : {}),
        label: overrides.label ?? entry.label,
        countryCode: entry.countryCode,
        regionId: entry.regionId,
        regionName: entry.regionName,
        communeId: entry.communeId,
        communeName: entry.communeName,
        neighborhood: entry.neighborhood,
        addressLine1: entry.addressLine1,
        addressLine2: entry.addressLine2,
        postalCode: entry.postalCode,
        arrivalInstructions: entry.arrivalInstructions,
        geoPoint: entry.geoPoint,
        isDefault: overrides.isDefault ?? entry.isDefault,
        isPublicVisible: overrides.isPublicVisible ?? entry.isPublicVisible,
    };
}
