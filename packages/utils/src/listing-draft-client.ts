import { apiRequest } from './api-client.js';
import type { ListingDraftVertical } from './listing-draft.js';

type DraftResponse = {
    ok: boolean;
    item?: { draft: unknown };
    error?: string;
};

export type ListingDraftResult<T = unknown> = {
    ok: boolean;
    draft?: T;
    unauthorized?: boolean;
    error?: string;
};

export async function fetchListingDraft<T = unknown>(
    vertical: ListingDraftVertical,
): Promise<ListingDraftResult<T>> {
    const { status, data } = await apiRequest<DraftResponse>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'GET',
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos cargar el borrador.' };
    return { ok: true, draft: data.item?.draft as T | undefined };
}

export async function saveListingDraft(
    vertical: ListingDraftVertical,
    draft: unknown,
): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    const { status, data } = await apiRequest<DraftResponse>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'PUT',
        body: JSON.stringify({ draft }),
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos guardar el borrador.' };
    return { ok: true };
}

export async function deleteListingDraft(
    vertical: ListingDraftVertical,
): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'DELETE',
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos limpiar el borrador.' };
    return { ok: true };
}
