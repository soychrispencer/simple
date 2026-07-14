import { apiFetch } from './api-client.js';

export type RelationshipNoteVertical = 'autos' | 'propiedades' | 'serenatas';

export type RelationshipNote = {
    id: string;
    vertical: RelationshipNoteVertical;
    businessId: string;
    personKind: string;
    personId: string;
    body: string;
    authorUserId: string;
    createdAt: string;
    updatedAt: string;
};

type ApiResponse<T> = {
    ok?: boolean;
    error?: string;
} & T;

export async function fetchRelationshipNotes(
    vertical: RelationshipNoteVertical,
    personId: string,
): Promise<RelationshipNote[]> {
    const params = new URLSearchParams({
        vertical,
        personId,
    });
    const { ok, data } = await apiFetch<ApiResponse<{ items?: RelationshipNote[] }>>(
        `/api/platform/relationship-notes?${params.toString()}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function createRelationshipNote(
    vertical: RelationshipNoteVertical,
    personId: string,
    body: string,
): Promise<{ ok: true; item: RelationshipNote } | { ok: false; error: string }> {
    const { ok, data } = await apiFetch<ApiResponse<{ item?: RelationshipNote }>>(
        '/api/platform/relationship-notes',
        {
            method: 'POST',
            body: JSON.stringify({ vertical, personId, body }),
        },
    );
    if (!ok || !data?.ok || !data.item) {
        return { ok: false, error: data?.error || 'No pudimos guardar la nota.' };
    }
    return { ok: true, item: data.item };
}

export async function deleteRelationshipNote(
    vertical: RelationshipNoteVertical,
    noteId: string,
): Promise<boolean> {
    const params = new URLSearchParams({ vertical });
    const { ok, data } = await apiFetch<ApiResponse<Record<string, never>>>(
        `/api/platform/relationship-notes/${encodeURIComponent(noteId)}?${params.toString()}`,
        { method: 'DELETE' },
    );
    return Boolean(ok && data?.ok);
}
