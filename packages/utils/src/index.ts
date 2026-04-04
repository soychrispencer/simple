import type {
    AddressBookEntry,
    GeocodeLocationResponse,
    ListingLocation,
    PropertyValuationEstimate,
    PropertyValuationRequest,
    PropertyValuationSourceStatus,
    VehicleValuationEstimate,
    VehicleValuationRequest,
    VehicleValuationSourceStatus,
} from '@simple/types';
import { API_BASE } from '@simple/config';

export * from './format';
export * from './location-catalog';
export * from './media-upload';
export * from './crm';
export * from './listing-leads';
export * from './social-feed';

export { API_BASE };

async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T | null }> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });
        const data = (await response.json().catch(() => null)) as T | null;
        return { status: response.status, data };
    } catch {
        return { status: 0, data: null };
    }
}

export type AddressBookWriteInput = {
    kind: AddressBookEntry['kind'];
    label: string;
    countryCode?: string;
    regionId: string | null;
    regionName: string | null;
    communeId: string | null;
    communeName: string | null;
    neighborhood?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    isDefault?: boolean;
    geoPoint?: ListingLocation['geoPoint'];
};

type AddressBookResponse = {
    ok: boolean;
    items?: AddressBookEntry[];
    error?: string;
};

type PropertyValuationResponse = {
    ok: boolean;
    estimate?: PropertyValuationEstimate;
    error?: string;
};

type PropertyValuationSourcesResponse = {
    ok: boolean;
    sources?: PropertyValuationSourceStatus[];
    totalRecords?: number;
    error?: string;
};

type VehicleValuationResponse = {
    ok: boolean;
    estimate?: VehicleValuationEstimate;
    error?: string;
};

type VehicleValuationSourcesResponse = {
    ok: boolean;
    sources?: VehicleValuationSourceStatus[];
    totalRecords?: number;
    error?: string;
};

type GeocodeResponse = GeocodeLocationResponse;

export async function fetchAddressBook(): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<AddressBookResponse>('/api/address-book', { method: 'GET' });
    if (status === 401) return { ok: false, items: [], unauthorized: true, error: 'No autenticado' };
    if (!data?.ok || !Array.isArray(data.items)) return { ok: false, items: [], error: data?.error ?? 'No pudimos cargar la libreta.' };
    return { ok: true, items: data.items };
}

export async function createAddressBookEntry(input: AddressBookWriteInput): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<AddressBookResponse>('/api/address-book', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (status === 401) return { ok: false, items: [], unauthorized: true, error: 'No autenticado' };
    if (!data?.ok || !Array.isArray(data.items)) return { ok: false, items: [], error: data?.error ?? 'No pudimos guardar la dirección.' };
    return { ok: true, items: data.items };
}

export async function updateAddressBookEntry(addressId: string, input: AddressBookWriteInput): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<AddressBookResponse>(`/api/address-book/${encodeURIComponent(addressId)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
    if (status === 401) return { ok: false, items: [], unauthorized: true, error: 'No autenticado' };
    if (!data?.ok || !Array.isArray(data.items)) return { ok: false, items: [], error: data?.error ?? 'No pudimos actualizar la dirección.' };
    return { ok: true, items: data.items };
}

export async function deleteAddressBookEntry(addressId: string): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<AddressBookResponse>(`/api/address-book/${encodeURIComponent(addressId)}`, {
        method: 'DELETE',
    });
    if (status === 401) return { ok: false, items: [], unauthorized: true, error: 'No autenticado' };
    if (!data?.ok || !Array.isArray(data.items)) return { ok: false, items: [], error: data?.error ?? 'No pudimos eliminar la dirección.' };
    return { ok: true, items: data.items };
}

export async function estimatePropertyValue(
    input: PropertyValuationRequest
): Promise<{ ok: boolean; estimate?: PropertyValuationEstimate; error?: string }> {
    const { data } = await apiRequest<PropertyValuationResponse>('/api/valuations/properties/estimate', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (!data?.ok || !data.estimate) return { ok: false, error: data?.error ?? 'No pudimos calcular la tasación.' };
    return { ok: true, estimate: data.estimate };
}

export async function fetchPropertyValuationSources(): Promise<{ ok: boolean; sources: PropertyValuationSourceStatus[]; error?: string }> {
    const { data } = await apiRequest<PropertyValuationSourcesResponse>('/api/valuations/properties/sources', {
        method: 'GET',
    });
    if (!data?.ok || !Array.isArray(data.sources)) return { ok: false, sources: [], error: data?.error ?? 'No pudimos cargar las fuentes del tasador.' };
    return { ok: true, sources: data.sources };
}

export async function refreshPropertyValuationSources(): Promise<{ ok: boolean; sources: PropertyValuationSourceStatus[]; totalRecords?: number; error?: string }> {
    const { data } = await apiRequest<PropertyValuationSourcesResponse>('/api/valuations/properties/sources/refresh', {
        method: 'POST',
    });
    if (!data?.ok || !Array.isArray(data.sources)) {
        return { ok: false, sources: [], totalRecords: data?.totalRecords, error: data?.error ?? 'No pudimos refrescar las fuentes del tasador.' };
    }
    return { ok: true, sources: data.sources, totalRecords: data.totalRecords };
}

export async function estimateVehicleValue(
    input: VehicleValuationRequest
): Promise<{ ok: boolean; estimate?: VehicleValuationEstimate; error?: string }> {
    const { data } = await apiRequest<VehicleValuationResponse>('/api/valuations/vehicles/estimate', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (!data?.ok || !data.estimate) return { ok: false, error: data?.error ?? 'No pudimos calcular la tasación.' };
    return { ok: true, estimate: data.estimate };
}

export async function fetchVehicleValuationSources(): Promise<{ ok: boolean; sources: VehicleValuationSourceStatus[]; error?: string }> {
    const { data } = await apiRequest<VehicleValuationSourcesResponse>('/api/valuations/vehicles/sources', {
        method: 'GET',
    });
    if (!data?.ok || !Array.isArray(data.sources)) return { ok: false, sources: [], error: data?.error ?? 'No pudimos cargar las fuentes del tasador.' };
    return { ok: true, sources: data.sources };
}

export async function refreshVehicleValuationSources(): Promise<{ ok: boolean; sources: VehicleValuationSourceStatus[]; totalRecords?: number; error?: string }> {
    const { data } = await apiRequest<VehicleValuationSourcesResponse>('/api/valuations/vehicles/sources/refresh', {
        method: 'POST',
    });
    if (!data?.ok || !Array.isArray(data.sources)) {
        return { ok: false, sources: [], totalRecords: data?.totalRecords, error: data?.error ?? 'No pudimos refrescar las fuentes del tasador.' };
    }
    return { ok: true, sources: data.sources, totalRecords: data.totalRecords };
}

export async function geocodeListingLocation(
    location: ListingLocation
): Promise<{ ok: boolean; location?: ListingLocation; provider?: string; error?: string }> {
    const { data } = await apiRequest<GeocodeResponse>('/api/locations/geocode', {
        method: 'POST',
        body: JSON.stringify({ location }),
    });
    if (!data?.ok || !data.location) return { ok: false, provider: data?.provider, error: data?.error ?? 'No pudimos geocodificar la ubicación.' };
    return { ok: true, location: data.location, provider: data.provider };
}

export function listingLocationToAddressBookInput(
    location: ListingLocation,
    label: string,
    kind: AddressBookEntry['kind'] = 'personal'
): AddressBookWriteInput {
    return {
        kind,
        label,
        countryCode: location.countryCode,
        regionId: location.regionId,
        regionName: location.regionName,
        communeId: location.communeId,
        communeName: location.communeName,
        neighborhood: location.neighborhood,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        postalCode: location.postalCode,
        geoPoint: location.geoPoint,
        isDefault: false,
    };
}

export * from './location-catalog';
