import type { StructuredLocation } from '@simple/types';
import {
    inferTimezoneFromStructuredLocation,
    normalizeStructuredLocation,
} from '@simple/utils';

export function residenceFromUserRow(row: {
    residenceCountryCode?: string | null;
    residenceRegionId?: string | null;
    residenceRegionName?: string | null;
    residenceLocalityId?: string | null;
    residenceLocalityName?: string | null;
}): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: row.residenceCountryCode ?? 'CL',
        regionId: row.residenceRegionId,
        regionName: row.residenceRegionName,
        localityId: row.residenceLocalityId,
        localityName: row.residenceLocalityName,
    });
}

export function operatingLocationFromAgendaProfile(row: {
    countryCode?: string | null;
    regionId?: string | null;
    localityId?: string | null;
    city?: string | null;
    region?: string | null;
}): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: row.countryCode ?? 'CL',
        regionId: row.regionId,
        regionName: row.region,
        localityId: row.localityId,
        localityName: row.city,
    });
}

export function operatingLocationFromSerenataGroup(row: {
    countryCode?: string | null;
    regionId?: string | null;
    region?: string | null;
    localityId?: string | null;
    comunaBase?: string | null;
}): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: row.countryCode ?? 'CL',
        regionId: row.regionId,
        regionName: row.region,
        localityId: row.localityId,
        localityName: row.comunaBase,
    });
}

export function inferTimezoneForResidence(row: Parameters<typeof residenceFromUserRow>[0]): string {
    return inferTimezoneFromStructuredLocation(residenceFromUserRow(row));
}

export function inferTimezoneForAgendaProfile(row: Parameters<typeof operatingLocationFromAgendaProfile>[0]): string {
    return inferTimezoneFromStructuredLocation(operatingLocationFromAgendaProfile(row));
}

export function inferTimezoneForSerenataGroup(row: Parameters<typeof operatingLocationFromSerenataGroup>[0]): string {
    return inferTimezoneFromStructuredLocation(operatingLocationFromSerenataGroup(row));
}

export function agendaOperatingPatchFromBody(body: Record<string, unknown>) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if ('countryCode' in body) patch.countryCode = body.countryCode;
    if ('regionId' in body) patch.regionId = body.regionId;
    if ('regionName' in body || 'region' in body) {
        patch.region = body.regionName ?? body.region;
    }
    if ('localityId' in body) patch.localityId = body.localityId;
    if ('localityName' in body || 'city' in body) {
        patch.city = body.localityName ?? body.city;
    }
    if ('serviceLocalities' in body) patch.serviceLocalities = body.serviceLocalities;
    if ('servesOnline' in body) patch.servesOnline = body.servesOnline;
    if ('servesPresential' in body) patch.servesPresential = body.servesPresential;
    return patch;
}

export function residencePatchFromBody(body: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};
    if ('residenceCountryCode' in body) patch.residenceCountryCode = body.residenceCountryCode;
    if ('residenceRegionId' in body) patch.residenceRegionId = body.residenceRegionId;
    if ('residenceRegionName' in body) patch.residenceRegionName = body.residenceRegionName;
    if ('residenceLocalityId' in body) patch.residenceLocalityId = body.residenceLocalityId;
    if ('residenceLocalityName' in body) patch.residenceLocalityName = body.residenceLocalityName;
    return patch;
}
