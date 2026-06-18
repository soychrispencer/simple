import { API_BASE } from './api-config';

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

export type GenerateListingReelResult = {
    ok: boolean;
    videoUrl?: string;
    durationSeconds?: number;
    slideCount?: number;
    error?: string;
};

export async function generateListingReel(
    listingId: string,
    options: { replaceExisting?: boolean } = {},
): Promise<GenerateListingReelResult> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        videoUrl?: string;
        durationSeconds?: number;
        slideCount?: number;
        error?: string;
    }>(`/api/listings/${encodeURIComponent(listingId)}/generate-reel`, {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            replaceExisting: options.replaceExisting ?? false,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (status === 503) return { ok: false, error: data?.error ?? 'Generador de video no disponible en este entorno.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No se pudo generar el video.' };

    return {
        ok: true,
        videoUrl: data.videoUrl,
        durationSeconds: data.durationSeconds,
        slideCount: data.slideCount,
    };
}
