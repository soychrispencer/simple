import { apiFetch } from './api-client.js';
import type { PublicProfileVertical } from './public-profile-settings.js';
import type {
    OperatorServicePackRecord,
    OperatorServicePromotionRecord,
    OperatorServiceRecord,
    PublicOperatorCatalog,
    PublicOperatorProviderSummary,
    PublicOperatorServiceItem,
} from './operator-service-config.js';
import { isOperatorPromotionActiveNow } from './operator-service-config.js';

function verticalQuery(vertical: PublicProfileVertical) {
    return `vertical=${vertical}`;
}

export async function fetchOperatorServices(vertical: PublicProfileVertical) {
    const { data } = await apiFetch<{ ok: boolean; items?: OperatorServiceRecord[]; error?: string }>(
        `/api/account/operator-services?${verticalQuery(vertical)}`,
    );
    return { ok: Boolean(data?.ok), items: data?.items ?? [], error: data?.error };
}

export async function createOperatorService(vertical: PublicProfileVertical, payload: Partial<OperatorServiceRecord> & { name: string }) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServiceRecord; error?: string }>(
        `/api/account/operator-services?${verticalQuery(vertical)}`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function updateOperatorService(vertical: PublicProfileVertical, id: string, payload: Partial<OperatorServiceRecord>) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServiceRecord; error?: string }>(
        `/api/account/operator-services/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function deleteOperatorService(vertical: PublicProfileVertical, id: string) {
    const { data } = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/account/operator-services/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'DELETE' },
    );
    return { ok: Boolean(data?.ok), error: data?.error };
}

export async function fetchOperatorServicePacks(vertical: PublicProfileVertical) {
    const { data } = await apiFetch<{ ok: boolean; items?: OperatorServicePackRecord[]; error?: string }>(
        `/api/account/operator-service-packs?${verticalQuery(vertical)}`,
    );
    return { ok: Boolean(data?.ok), items: data?.items ?? [], error: data?.error };
}

export async function createOperatorServicePack(vertical: PublicProfileVertical, payload: Partial<OperatorServicePackRecord> & { name: string; price: string }) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServicePackRecord; error?: string }>(
        `/api/account/operator-service-packs?${verticalQuery(vertical)}`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function updateOperatorServicePack(vertical: PublicProfileVertical, id: string, payload: Partial<OperatorServicePackRecord>) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServicePackRecord; error?: string }>(
        `/api/account/operator-service-packs/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function deleteOperatorServicePack(vertical: PublicProfileVertical, id: string) {
    const { data } = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/account/operator-service-packs/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'DELETE' },
    );
    return { ok: Boolean(data?.ok), error: data?.error };
}

export async function fetchOperatorServicePromotions(vertical: PublicProfileVertical) {
    const { data } = await apiFetch<{ ok: boolean; items?: OperatorServicePromotionRecord[]; error?: string }>(
        `/api/account/operator-service-promotions?${verticalQuery(vertical)}`,
    );
    return { ok: Boolean(data?.ok), items: data?.items ?? [], error: data?.error };
}

export async function createOperatorServicePromotion(
    vertical: PublicProfileVertical,
    payload: Partial<OperatorServicePromotionRecord> & { label: string; discountValue: string },
) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServicePromotionRecord; error?: string }>(
        `/api/account/operator-service-promotions?${verticalQuery(vertical)}`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function updateOperatorServicePromotion(vertical: PublicProfileVertical, id: string, payload: Partial<OperatorServicePromotionRecord>) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorServicePromotionRecord; error?: string }>(
        `/api/account/operator-service-promotions/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function deleteOperatorServicePromotion(vertical: PublicProfileVertical, id: string) {
    const { data } = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/account/operator-service-promotions/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'DELETE' },
    );
    return { ok: Boolean(data?.ok), error: data?.error };
}

export type FetchPublicOperatorCatalogResult = {
    ok: boolean;
    catalog: PublicOperatorCatalog;
    error?: string;
};

export async function fetchPublicOperatorCatalog(
    vertical: PublicProfileVertical,
    filters?: { q?: string; category?: string; region?: string; commune?: string; limit?: number },
): Promise<FetchPublicOperatorCatalogResult> {
    const params = new URLSearchParams({ vertical });
    if (filters?.q) params.set('q', filters.q);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.region) params.set('region', filters.region);
    if (filters?.commune) params.set('commune', filters.commune);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const { data } = await apiFetch<{
        ok: boolean;
        error?: string;
        services?: PublicOperatorServiceItem[];
        packs?: PublicOperatorCatalog['packs'];
        promotions?: PublicOperatorCatalog['promotions'];
        items?: PublicOperatorServiceItem[];
    }>(`/api/public/services?${params.toString()}`);
    const catalog: PublicOperatorCatalog = {
        services: data?.services ?? data?.items ?? [],
        packs: data?.packs ?? [],
        promotions: (data?.promotions ?? []).filter((promo) => isOperatorPromotionActiveNow(promo)),
    };
    return {
        ok: Boolean(data?.ok),
        catalog,
        error: data?.ok ? undefined : (data?.error ?? 'No se pudo cargar el catálogo.'),
    };
}

/** @deprecated Usar fetchPublicOperatorCatalog */
export async function fetchPublicOperatorServices(
    vertical: PublicProfileVertical,
    filters?: { q?: string; category?: string; region?: string; limit?: number },
) {
    const { catalog } = await fetchPublicOperatorCatalog(vertical, filters);
    return catalog.services;
}
