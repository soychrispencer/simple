import { API_BASE } from '@simple/config';
import type { ListingLocation, GeocodeLocationResponse } from '@simple/types';

export async function geocodeListingLocation(location: ListingLocation): Promise<GeocodeLocationResponse> {
    try {
        const response = await fetch(`${API_BASE}/api/geo/geocode`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ location }),
        });

        const data = await response.json().catch(() => null);
        if (data && typeof data.ok === 'boolean') {
            return {
                ok: data.ok,
                provider: data.provider || 'none',
                location: data.location,
                error: data.error,
            };
        }

        return {
            ok: false,
            provider: 'none',
            error: 'Respuesta inválida del servicio de geocodificación.',
        };
    } catch {
        return {
            ok: false,
            provider: 'none',
            error: 'No se pudo conectar con el servicio de geocodificación.',
        };
    }
}
