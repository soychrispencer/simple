import { apiFetch } from './api-client.js';
import type { PublicProfileVertical } from './public-profile-settings.js';
import type { OperatorProductRecord, PublicOperatorProductItem } from './operator-product-config.js';

function verticalQuery(vertical: PublicProfileVertical) {
    return `vertical=${vertical}`;
}

export async function fetchOperatorProducts(vertical: PublicProfileVertical) {
    const { data } = await apiFetch<{ ok: boolean; items?: OperatorProductRecord[]; error?: string }>(
        `/api/account/operator-products?${verticalQuery(vertical)}`,
    );
    return { ok: Boolean(data?.ok), items: data?.items ?? [], error: data?.error };
}

export async function createOperatorProduct(
    vertical: PublicProfileVertical,
    payload: Partial<OperatorProductRecord> & { name: string; price: string },
) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorProductRecord; error?: string }>(
        `/api/account/operator-products?${verticalQuery(vertical)}`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function updateOperatorProduct(vertical: PublicProfileVertical, id: string, payload: Partial<OperatorProductRecord>) {
    const { data } = await apiFetch<{ ok: boolean; item?: OperatorProductRecord; error?: string }>(
        `/api/account/operator-products/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}

export async function deleteOperatorProduct(vertical: PublicProfileVertical, id: string) {
    const { data } = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/account/operator-products/${encodeURIComponent(id)}?${verticalQuery(vertical)}`,
        { method: 'DELETE' },
    );
    return { ok: Boolean(data?.ok), error: data?.error };
}

export type FetchPublicOperatorProductsResult = {
    ok: boolean;
    products: PublicOperatorProductItem[];
    error?: string;
};

export async function fetchPublicOperatorProducts(
    vertical: PublicProfileVertical,
    filters?: { q?: string; category?: string; region?: string; commune?: string; limit?: number },
): Promise<FetchPublicOperatorProductsResult> {
    const params = new URLSearchParams({ vertical });
    if (filters?.q) params.set('q', filters.q);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.region) params.set('region', filters.region);
    if (filters?.commune) params.set('commune', filters.commune);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const { data } = await apiFetch<{
        ok: boolean;
        error?: string;
        products?: PublicOperatorProductItem[];
        items?: PublicOperatorProductItem[];
    }>(`/api/public/products?${params.toString()}`);
    return {
        ok: Boolean(data?.ok),
        products: data?.products ?? data?.items ?? [],
        error: data?.ok ? undefined : (data?.error ?? 'No se pudieron cargar los productos.'),
    };
}

export async function fetchPublicOperatorProductById(vertical: PublicProfileVertical, id: string) {
    const params = new URLSearchParams({ vertical });
    const { data } = await apiFetch<{ ok: boolean; item?: PublicOperatorProductItem; error?: string }>(
        `/api/public/products/${encodeURIComponent(id)}?${params.toString()}`,
    );
    return { ok: Boolean(data?.ok), item: data?.item, error: data?.error };
}
