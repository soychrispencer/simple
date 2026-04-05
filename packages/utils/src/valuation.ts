import { API_BASE } from '@simple/config';
import type { 
    VehicleValuationRequest, 
    VehicleValuationEstimate, 
    VehicleValuationSourceStatus 
} from '@simple/types';

interface ValuationSourcesResponse {
    ok: boolean;
    sources: VehicleValuationSourceStatus[];
    totalRecords?: number;
    error?: string;
}

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
        return data || { ok: false, error: 'Respuesta inválida del servidor.' };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' } as any;
    }
}

export async function estimateVehicleValue(request: VehicleValuationRequest): Promise<{ ok: boolean; estimate?: VehicleValuationEstimate; error?: string }> {
    return apiRequest<{ ok: boolean; estimate?: VehicleValuationEstimate; error?: string }>('/api/valuation/estimate', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function fetchVehicleValuationSources(): Promise<ValuationSourcesResponse> {
    return apiRequest<ValuationSourcesResponse>('/api/valuation/sources', {
        method: 'GET',
    });
}

export async function refreshVehicleValuationSources(): Promise<ValuationSourcesResponse> {
    return apiRequest<ValuationSourcesResponse>('/api/valuation/sources/refresh', {
        method: 'POST',
    });
}
