import { API_BASE } from '@simple/config';
import type {
    PropertyValuationEstimate,
    PropertyValuationRequest,
    PropertyValuationSourceStatus,
    VehicleValuationEstimate,
    VehicleValuationRequest,
    VehicleValuationSourceStatus,
} from '@simple/types';

type ValuationResponse<TEstimate> = {
    ok: boolean;
    estimate?: TEstimate;
    error?: string;
};

type ValuationSourcesResponse<TSource> = {
    ok: boolean;
    sources: TSource[];
    totalRecords?: number;
    error?: string;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });
        const data = await response.json().catch(() => null);
        return data || { ok: false, error: 'Respuesta invalida del servidor.' };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' } as T;
    }
}

export async function estimatePropertyValue(request: PropertyValuationRequest): Promise<ValuationResponse<PropertyValuationEstimate>> {
    return apiRequest<ValuationResponse<PropertyValuationEstimate>>('/api/public/valuations/properties/estimate', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function fetchPropertyValuationSources(): Promise<ValuationSourcesResponse<PropertyValuationSourceStatus>> {
    return apiRequest<ValuationSourcesResponse<PropertyValuationSourceStatus>>('/api/public/valuations/properties/sources', {
        method: 'GET',
    });
}

export async function refreshPropertyValuationSources(): Promise<ValuationSourcesResponse<PropertyValuationSourceStatus>> {
    return apiRequest<ValuationSourcesResponse<PropertyValuationSourceStatus>>('/api/public/valuations/properties/sources/refresh', {
        method: 'POST',
    });
}

export async function estimateVehicleValue(request: VehicleValuationRequest): Promise<ValuationResponse<VehicleValuationEstimate>> {
    return apiRequest<ValuationResponse<VehicleValuationEstimate>>('/api/public/valuations/vehicles/estimate', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function fetchVehicleValuationSources(): Promise<ValuationSourcesResponse<VehicleValuationSourceStatus>> {
    return apiRequest<ValuationSourcesResponse<VehicleValuationSourceStatus>>('/api/public/valuations/vehicles/sources', {
        method: 'GET',
    });
}

export async function refreshVehicleValuationSources(): Promise<ValuationSourcesResponse<VehicleValuationSourceStatus>> {
    return apiRequest<ValuationSourcesResponse<VehicleValuationSourceStatus>>('/api/public/valuations/vehicles/sources/refresh', {
        method: 'POST',
    });
}
