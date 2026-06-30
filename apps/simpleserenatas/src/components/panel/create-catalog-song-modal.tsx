'use client';

import { useEffect, useState } from 'react';
import { PanelButton } from '@simple/ui/panel';
import { PanelField } from '@simple/ui/panel';
import { serenatasApi, type CatalogSong } from '@/lib/serenatas-api';
import { SUGGESTED_REPERTOIRE_TAGS } from '@/lib/repertoire-tags';
import { PanelSheet } from './panel-sheet';
import { FieldInput, FormFeedback, type FormStatus } from './shared';

export function CreateCatalogSongModal({
    initialTitle = '',
    onClose,
    onCreated,
}: {
    initialTitle?: string;
    onClose: () => void;
    onCreated: (song: CatalogSong) => void;
}) {
    const [title, setTitle] = useState(initialTitle);
    const [artist, setArtist] = useState('Tradicional');
    const [tagsInput, setTagsInput] = useState('');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    useEffect(() => {
        setTitle(initialTitle);
    }, [initialTitle]);

    async function submit() {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setStatus({ loading: false, error: 'Escribe el título de la canción.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const tags = tagsInput.split(',').map((item) => item.trim()).filter(Boolean);
        const response = await serenatasApi.createCatalogSong({
            title: trimmedTitle,
            artist: artist.trim() || null,
            tags,
        });
        if (!response.ok || !response.item) {
            setStatus({
                loading: false,
                error: response.error ?? 'No pudimos crear la canción en el banco.',
                ok: null,
            });
            return;
        }
        onCreated(response.item);
        onClose();
    }

    return (
        <PanelSheet ariaLabel="Nueva canción en el banco" onClose={onClose} maxWidthClass="sm:max-w-md">
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-fg">Nueva canción en el banco</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            Solo si no existe en el catálogo. Quedará normalizada para que otros mariachis la reutilicen.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="shrink-0 rounded-lg p-2 text-fg-muted hover:bg-bg-subtle"
                        aria-label="Cerrar"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="mt-4 grid gap-3">
                    <PanelField label="Título" required>
                        <FieldInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Las Mañanitas" />
                    </PanelField>
                    <PanelField label="Artista / autor">
                        <FieldInput value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Tradicional" />
                    </PanelField>
                    <PanelField label="Etiquetas" hint="Separadas por coma. Opcional.">
                        <FieldInput
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            placeholder="Cumpleaños, Tradicional"
                        />
                        <div className="mt-2 flex flex-wrap gap-1">
                            {SUGGESTED_REPERTOIRE_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent-border"
                                    onClick={() => setTagsInput((prev) => (prev ? `${prev}, ${tag}` : tag))}
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                    </PanelField>
                </div>

                <FormFeedback status={status} />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <PanelButton variant="secondary" disabled={status.loading} onClick={onClose}>
                        Cancelar
                    </PanelButton>
                    <PanelButton disabled={status.loading || !title.trim()} onClick={() => void submit()}>
                        Crear y seleccionar
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}
