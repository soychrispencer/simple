import { apiFetch } from '@simple/utils';

export type SavedMariachiRecord = {
    id: string;
    slug: string;
    href: string;
    title: string;
    price: string;
    image?: string;
    location?: string;
    savedAt: number;
    subtitle?: string;
};

type SavedResponse = {
    ok: boolean;
    items?: SavedMariachiRecord[];
    error?: string;
};

type ToggleResponse = SavedResponse & {
    saved?: boolean;
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

const SAVED_EVENT = 'simple:saved-mariachis-updated';
let savedMariachisCache: SavedMariachiRecord[] = [];

function emitSavedUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}

function normalizeRecords(input: unknown): SavedMariachiRecord[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((item): item is SavedMariachiRecord => {
            return Boolean(
                item &&
                    typeof item === 'object' &&
                    typeof (item as SavedMariachiRecord).id === 'string' &&
                    typeof (item as SavedMariachiRecord).title === 'string' &&
                    typeof (item as SavedMariachiRecord).price === 'string',
            );
        })
        .sort((a, b) => b.savedAt - a.savedAt);
}

function updateSavedMariachisCache(items: SavedMariachiRecord[]): SavedMariachiRecord[] {
    savedMariachisCache = normalizeRecords(items).slice(0, 150);
    emitSavedUpdated();
    return savedMariachisCache;
}

export function clearSavedMariachisCache(): void {
    savedMariachisCache = [];
    emitSavedUpdated();
}

export function readSavedMariachis(): SavedMariachiRecord[] {
    return savedMariachisCache;
}

export async function syncSavedMariachisFromApi(): Promise<SavedMariachiRecord[]> {
    const { status, data } = await apiFetch<SavedResponse>('/api/serenatas/marketplace/favorites', { method: 'GET' });
    if (status === 401) {
        clearSavedMariachisCache();
        return [];
    }
    if (!data?.ok || !Array.isArray(data.items)) return readSavedMariachis();
    return updateSavedMariachisCache(data.items);
}

export function isMariachiSaved(id: string): boolean {
    return readSavedMariachis().some((item) => item.id === id);
}

export async function toggleSavedMariachi(providerGroupId: string): Promise<ToggleSavedResult> {
    const { status, data } = await apiFetch<ToggleResponse>('/api/serenatas/marketplace/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ providerGroupId }),
    });

    if (status === 401) {
        return {
            ok: false,
            saved: isMariachiSaved(providerGroupId),
            unauthorized: true,
            error: 'Tu sesión expiró. Vuelve a iniciar sesión.',
        };
    }
    if (data?.ok && Array.isArray(data.items)) {
        updateSavedMariachisCache(data.items);
        return { ok: true, saved: Boolean(data.saved) };
    }

    return {
        ok: false,
        saved: isMariachiSaved(providerGroupId),
        error: data?.error ?? 'No pudimos actualizar tus favoritos.',
    };
}

export async function removeSavedMariachi(providerGroupId: string): Promise<RemoveSavedResult> {
    const { status, data } = await apiFetch<SavedResponse>(
        `/api/serenatas/marketplace/favorites/${encodeURIComponent(providerGroupId)}`,
        { method: 'DELETE' },
    );

    if (status === 401) {
        return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    }
    if (data?.ok && Array.isArray(data.items)) {
        updateSavedMariachisCache(data.items);
        return { ok: true };
    }

    return { ok: false, error: data?.error ?? 'No pudimos eliminar este favorito.' };
}

export function subscribeSavedMariachis(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    window.addEventListener(SAVED_EVENT, listener);

    return () => {
        window.removeEventListener(SAVED_EVENT, listener);
    };
}
