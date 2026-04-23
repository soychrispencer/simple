import { API_BASE } from './api-config';
import type { SavedListingRecord as BaseSavedListingRecord } from '@simple/listings-core';

export type SavedListingRecord = BaseSavedListingRecord & {
    subtitle?: string;
    meta?: string[];
    badge?: string;
    sellerName?: string;
    sellerMeta?: string;
};

type SavedResponse = {
    ok: boolean;
    items?: SavedListingRecord[];
    error?: string;
};

type ToggleResponse = SavedResponse & {
    saved?: boolean;
};

type ApiResponse<T> = {
    status: number;
    data: T | null;
};

type ToggleSavedResult = {
    ok: boolean;
    saved: boolean;
    unauthorized?: boolean;
    error?: string;
};

type RemoveSavedResult = {
    ok: boolean;
    unauthorized?: boolean;
    error?: string;
};

const SAVED_EVENT = 'simple:saved-listings-updated';
let savedListingsCache: SavedListingRecord[] = [];

function emitSavedUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}

function normalizeRecords(input: unknown): SavedListingRecord[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((item): item is SavedListingRecord => {
            return Boolean(
                item &&
                    typeof item === 'object' &&
                    typeof (item as SavedListingRecord).id === 'string' &&
                    typeof (item as SavedListingRecord).title === 'string' &&
                    typeof (item as SavedListingRecord).price === 'string'
            );
        })
        .sort((a, b) => b.savedAt - a.savedAt);
}

function updateSavedListingsCache(items: SavedListingRecord[]): SavedListingRecord[] {
    savedListingsCache = normalizeRecords(items).slice(0, 150);
    emitSavedUpdated();
    return savedListingsCache;
}

export function clearSavedListingsCache(): void {
    savedListingsCache = [];
    emitSavedUpdated();
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
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

export function readSavedListings(): SavedListingRecord[] {
    return savedListingsCache;
}

export async function syncSavedListingsFromApi(): Promise<SavedListingRecord[]> {
    const { status, data } = await apiRequest<SavedResponse>('/api/saved', { method: 'GET' });
    if (status === 401) {
        clearSavedListingsCache();
        return [];
    }
    if (!data?.ok || !Array.isArray(data.items)) return readSavedListings();
    return updateSavedListingsCache(data.items);
}

export function isListingSaved(id: string): boolean {
    return readSavedListings().some((item) => item.id === id);
}

export async function toggleSavedListing(record: Omit<SavedListingRecord, 'savedAt'>): Promise<ToggleSavedResult> {
    const { status, data } = await apiRequest<ToggleResponse>('/api/saved/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: record.id }),
    });

    if (status === 401) {
        return {
            ok: false,
            saved: isListingSaved(record.id),
            unauthorized: true,
            error: 'Tu sesión expiró. Vuelve a iniciar sesión.',
        };
    }
    if (data?.ok && Array.isArray(data.items)) {
        updateSavedListingsCache(data.items);
        return { ok: true, saved: Boolean(data.saved) };
    }

    return {
        ok: false,
        saved: isListingSaved(record.id),
        error: data?.error ?? 'No pudimos actualizar tus guardados.',
    };
}

export async function removeSavedListing(id: string): Promise<RemoveSavedResult> {
    const { status, data } = await apiRequest<SavedResponse>(`/api/saved/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });

    if (status === 401) {
        return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    }
    if (data?.ok && Array.isArray(data.items)) {
        updateSavedListingsCache(data.items);
        return { ok: true };
    }

    return { ok: false, error: data?.error ?? 'No pudimos eliminar este guardado.' };
}

export function subscribeSavedListings(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    window.addEventListener(SAVED_EVENT, listener);

    return () => {
        window.removeEventListener(SAVED_EVENT, listener);
    };
}
