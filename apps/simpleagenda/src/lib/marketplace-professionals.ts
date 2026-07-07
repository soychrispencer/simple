import { API_BASE } from '@simple/config';

export type MarketplaceProfessional = {
    slug: string;
    displayName: string | null;
    profession: string | null;
    headline: string | null;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    countryCode: string;
    servesOnline: boolean;
    servesPresential: boolean;
};

type MarketplaceProfessionalsResponse = {
    ok?: boolean;
    items?: MarketplaceProfessional[];
    error?: string;
};

export async function fetchMarketplaceProfessionals(input?: {
    limit?: number;
    offset?: number;
}): Promise<{ ok: true; items: MarketplaceProfessional[] } | { ok: false; error: string }> {
    const params = new URLSearchParams();
    params.set('limit', String(input?.limit ?? 24));
    params.set('offset', String(input?.offset ?? 0));

    const response = await fetch(`${API_BASE}/api/public/agenda/marketplace/professionals?${params.toString()}`);
    const data = (await response.json().catch(() => null)) as MarketplaceProfessionalsResponse | null;

    if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error ?? 'No pudimos cargar profesionales.' };
    }

    return { ok: true, items: data.items ?? [] };
}

export function resolveProfessionalMediaUrl(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        return `${API_BASE}${trimmed}`;
    }
    return `${API_BASE}/${trimmed}`;
}
