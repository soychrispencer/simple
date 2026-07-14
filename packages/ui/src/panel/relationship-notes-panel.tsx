'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconLoader2, IconNotebook, IconTrash } from '@tabler/icons-react';
import {
    createRelationshipNote,
    deleteRelationshipNote,
    fetchRelationshipNotes,
    type RelationshipNote,
    type RelationshipNoteVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelEmptyState } from './panel-display.js';

function formatWhen(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export type RelationshipNotesPanelProps = {
    vertical: RelationshipNoteVertical;
    personId: string;
};

export function RelationshipNotesPanel({ vertical, personId }: RelationshipNotesPanelProps) {
    const [items, setItems] = useState<RelationshipNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(null);
            const next = await fetchRelationshipNotes(vertical, personId);
            if (!cancelled) {
                setItems(next);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [personId, vertical]);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body || saving) return;
        setSaving(true);
        setError(null);
        const result = await createRelationshipNote(vertical, personId, body);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setDraft('');
        setItems((current) => [result.item, ...current]);
    };

    const onDelete = async (noteId: string) => {
        if (deletingId) return;
        setDeletingId(noteId);
        const ok = await deleteRelationshipNote(vertical, noteId);
        setDeletingId(null);
        if (!ok) {
            setError('No pudimos eliminar la nota.');
            return;
        }
        setItems((current) => current.filter((item) => item.id !== noteId));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
                <IconLoader2 size={18} className="animate-spin" />
                Cargando notas…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <form onSubmit={(event) => void onSubmit(event)} className="space-y-2">
                <label className="block text-sm font-medium text-(--fg)" htmlFor={`note-${personId}`}>
                    Nota interna
                </label>
                <textarea
                    id={`note-${personId}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="Solo la ve tu equipo. Ej: pidió financiamiento, volver a llamar el lunes…"
                    className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) outline-none focus:border-accent"
                />
                <div className="flex items-center justify-between gap-3">
                    {error ? <p className="text-sm text-error">{error}</p> : <span />}
                    <PanelButton type="submit" variant="primary" disabled={saving || !draft.trim()}>
                        {saving ? 'Guardando…' : 'Agregar nota'}
                    </PanelButton>
                </div>
            </form>

            {items.length === 0 ? (
                <PanelEmptyState
                    title="Sin notas"
                    description="Agrega recordatorios privados sobre este contacto."
                />
            ) : (
                <ul className="space-y-3">
                    {items.map((note) => (
                        <li key={note.id}>
                            <PanelCard className="px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="whitespace-pre-wrap text-sm text-(--fg)">{note.body}</p>
                                        <p className="mt-2 text-xs text-fg-muted">{formatWhen(note.createdAt)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Eliminar nota"
                                        disabled={deletingId === note.id}
                                        onClick={() => void onDelete(note.id)}
                                        className="shrink-0 rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-error disabled:opacity-50"
                                    >
                                        {deletingId === note.id ? (
                                            <IconLoader2 size={16} className="animate-spin" />
                                        ) : (
                                            <IconTrash size={16} stroke={1.75} />
                                        )}
                                    </button>
                                </div>
                            </PanelCard>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Optional icon export for tabs. */
export const RelationshipNotesIcon = IconNotebook;
