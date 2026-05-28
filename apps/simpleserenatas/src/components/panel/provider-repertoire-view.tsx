'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconMusic, IconTrash, IconSearch, IconX, IconMusicOff, IconPlus } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelNotice } from '@simple/ui/panel';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { serenatasApi, type CatalogSong, type RepertoireSong, type SongScore } from '@/lib/serenatas-api';
import { COMMON_INSTRUMENTS } from '@/lib/repertoire-tags';
import { EmptyBlock, FormFeedback, type FormStatus } from './shared';
import { ScoreViewerModal } from './score-viewer-modal';
import { CreateCatalogSongModal } from './create-catalog-song-modal';
import { SongCatalogTagPicker, type CatalogTagSelection } from './song-catalog-tag-picker';

export function ProviderRepertoireView({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, hasMariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();
    const [songs, setSongs] = useState<RepertoireSong[]>([]);
    const [listLoading, setListLoading] = useState(true);
    
    // Estados para búsqueda y agregar canciones
    const [localSearch, setLocalSearch] = useState('');
    const [pending, setPending] = useState<CatalogTagSelection[]>([]);
    const [formStatus, setFormStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [createModalQuery, setCreateModalQuery] = useState<string | null>(null);
    
    // Estados para gestión de partituras (Inline)
    const [scoreSong, setScoreSong] = useState<RepertoireSong | null>(null);
    const [scores, setScores] = useState<SongScore[]>([]);
    const [previewScore, setPreviewScore] = useState<SongScore | null>(null);
    const [scoreLoading, setScoreLoading] = useState(false);

    const excludeCatalogIds = useMemo(
        () => [
            ...songs.map((song) => song.catalogSongId).filter((id): id is string => Boolean(id)),
            ...pending.map((item) => item.catalogSongId),
        ],
        [pending, songs],
    );

    const loadSongs = useCallback(async () => {
        if (!mariachi) return;
        setListLoading(true);
        const response = await serenatasApi.providerGroupRepertoire(mariachi.id);
        setSongs(response.ok ? response.items.filter((song) => song.isActive) : []);
        setListLoading(false);
    }, [mariachi]);

    useEffect(() => {
        void loadSongs();
    }, [loadSongs]);

    // Filtrar catálogo local propio
    const filteredLocalSongs = useMemo(() => {
        return songs.filter((song) => {
            const query = localSearch.toLowerCase();
            return (
                song.title.toLowerCase().includes(query) ||
                (song.artist && song.artist.toLowerCase().includes(query)) ||
                song.tags.some((tag) => tag.toLowerCase().includes(query))
            );
        });
    }, [songs, localSearch]);

    function onCatalogSongCreated(song: CatalogSong) {
        if (excludeCatalogIds.includes(song.id)) return;
        setPending((current) => {
            if (current.some((item) => item.catalogSongId === song.id)) return current;
            return [...current, { catalogSongId: song.id, title: song.title, artist: song.artist }];
        });
    }

    async function savePending() {
        if (!mariachi) return;
        if (pending.length === 0) {
            setFormStatus({ loading: false, error: 'Agrega al menos una canción.', ok: null });
            return;
        }
        setFormStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.bulkAddRepertoireSongs(
            mariachi.id,
            pending.map((item) => item.catalogSongId),
        );
        if (!response.ok) {
            setFormStatus({
                loading: false,
                error: response.error ?? 'No pudimos guardar el repertorio.',
                ok: null,
            });
            return;
        }
        const addedCount = response.added?.length ?? pending.length;
        setPending([]);
        setFormStatus({
            loading: false,
            error: null,
            ok: `${addedCount} canción${addedCount === 1 ? '' : 'es'} agregada${addedCount === 1 ? '' : 's'} al repertorio.`,
        });
        await loadSongs();
        await refreshMariachi();
        await refresh();
    }

    async function removeSong(songId: string) {
        if (!mariachi) return;
        
        // Si eliminamos la canción que tiene el acordeón abierto, limpiamos
        if (scoreSong?.id === songId) {
            setScoreSong(null);
            setScores([]);
        }

        await serenatasApi.deleteRepertoireSong(mariachi.id, songId);
        await loadSongs();
    }

    // Abrir/Cerrar sección de partituras inline
    async function toggleScores(song: RepertoireSong) {
        if (scoreSong?.id === song.id) {
            setScoreSong(null);
            setScores([]);
            return;
        }
        if (!mariachi) return;
        setScoreSong(song);
        setScoreLoading(true);
        setScores([]);
        const response = await serenatasApi.repertoireSongScores(mariachi.id, song.id);
        setScores(response.ok ? response.items : []);
        setScoreLoading(false);
    }

    async function uploadScore(instrument: string, file: File) {
        if (!mariachi || !scoreSong) return;
        setFormStatus({ loading: true, error: null, ok: null });
        const uploaded = await serenatasApi.uploadDocument(file);
        if (!uploaded.ok || !uploaded.url) {
            setFormStatus({ loading: false, error: uploaded.error ?? 'Error al subir PDF.', ok: null });
            return;
        }
        await serenatasApi.saveRepertoireSongScore(mariachi.id, scoreSong.id, instrument, {
            storageUrl: uploaded.url,
            originalFilename: file.name,
        });
        const response = await serenatasApi.repertoireSongScores(mariachi.id, scoreSong.id);
        setScores(response.ok ? response.items : []);
        setFormStatus({ loading: false, error: null, ok: `Partitura de ${instrument} guardada.` });
    }

    if (loading) return <p className="text-sm text-fg-muted">Cargando…</p>;
    if (error) return <PanelNotice tone="error">{error}</PanelNotice>;
    if (!hasMariachi || !mariachi) {
        return (
            <EmptyBlock
                title="Crea tus datos comerciales primero"
                description="Configura tu mariachi antes de publicar el repertorio."
            />
        );
    }
    return (
        <div className="grid gap-4 sm:gap-5">
            <PanelCard className="p-4 sm:p-5">
                <div className="grid gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-fg">Repertorio</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            Busca canciones, agrégalas y deja visible el catálogo que verá el cliente.
                        </p>
                    </div>
                    <SongCatalogTagPicker
                        selected={pending}
                        onChange={setPending}
                        excludeCatalogIds={excludeCatalogIds}
                        disabled={formStatus.loading}
                        placeholder="Buscar canción para agregar..."
                        onRequestCreateNew={(query) => setCreateModalQuery(query)}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-accent hover:underline"
                            onClick={() => setCreateModalQuery('')}
                        >
                            <IconPlus size={14} /> Crear canción nueva
                        </button>
                        <PanelButton
                            disabled={formStatus.loading || pending.length === 0}
                            onClick={() => void savePending()}
                            className="w-full sm:w-auto"
                        >
                            Guardar {pending.length > 0 ? `(${pending.length})` : ''}
                        </PanelButton>
                    </div>
                    <FormFeedback status={formStatus} />
                </div>
            </PanelCard>

            <PanelCard className="p-4 sm:p-5">
                <div className="grid gap-4">
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                        <input
                            type="text"
                            placeholder="Buscar en mi repertorio..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent-border focus:ring-2 focus:ring-accent/20"
                        />
                        {localSearch ? (
                            <button
                                type="button"
                                onClick={() => setLocalSearch('')}
                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-bg-subtle hover:text-fg"
                                aria-label="Limpiar búsqueda"
                            >
                                <IconX size={14} />
                            </button>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-fg">Mis canciones</h3>
                            <p className="text-sm text-fg-muted">
                                {songs.length} canción{songs.length === 1 ? '' : 'es'} publicada{songs.length === 1 ? '' : 's'}.
                            </p>
                        </div>
                    </div>

                    {listLoading ? (
                        <p className="rounded-xl border border-border px-4 py-5 text-sm text-fg-muted">Cargando canciones...</p>
                    ) : songs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                            <IconMusicOff className="mx-auto h-7 w-7 text-fg-muted" />
                            <p className="mt-3 text-sm font-semibold text-fg">Todavía no hay canciones</p>
                            <p className="mt-1 text-sm text-fg-muted">Usa el buscador de arriba para agregar tu primer tema.</p>
                        </div>
                    ) : filteredLocalSongs.length === 0 ? (
                        <div className="rounded-xl border border-border px-4 py-8 text-center">
                            <p className="text-sm font-semibold text-fg">Sin resultados</p>
                            <p className="mt-1 text-sm text-fg-muted">Prueba con otro título, artista o etiqueta.</p>
                        </div>
                    ) : (
                    <div className="divide-y divide-border rounded-xl border border-border">
                        {filteredLocalSongs.map((song) => {
                            const isScoreOpen = scoreSong?.id === song.id;
                            return (
                                <div key={song.id} className="p-3 sm:p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold leading-snug text-fg">{song.title}</p>
                                            {song.artist ? <p className="mt-0.5 text-sm text-fg-muted">{song.artist}</p> : null}
                                            {song.tags.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {song.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-xs text-fg-muted"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <PanelButton 
                                                size="sm" 
                                                variant={isScoreOpen ? 'accent' : 'secondary'} 
                                                onClick={() => void toggleScores(song)}
                                            >
                                                Partituras
                                            </PanelButton>
                                            <button 
                                                type="button" 
                                                onClick={() => void removeSong(song.id)}
                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted transition-colors hover:border-error/30 hover:bg-error-soft hover:text-error"
                                                title="Eliminar de mi repertorio"
                                            >
                                                <IconTrash size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {isScoreOpen ? (
                                        <div className="mt-3 rounded-xl border border-border bg-bg-subtle p-3 sm:p-4">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                                                    Partituras: {song.title}
                                                </h4>
                                                <span className="text-xs text-fg-muted">
                                                    Solo los músicos de tu grupo tienen acceso
                                                </span>
                                            </div>

                                            {scoreLoading ? (
                                                <p className="py-2 text-sm text-fg-muted">Cargando archivos...</p>
                                            ) : (
                                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                    {COMMON_INSTRUMENTS.map((instrument) => {
                                                        const existing = scores.find((score) => score.instrument === instrument);
                                                        return (
                                                            <div
                                                                key={instrument}
                                                                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2.5"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium leading-none text-fg">{instrument}</p>
                                                                    <p className="mt-1 max-w-[140px] truncate text-xs text-fg-muted">
                                                                        {existing ? existing.originalFilename || 'PDF guardado' : 'Sin partitura'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 gap-1.5">
                                                                    {existing ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewScore(existing)}
                                                                            className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-white"
                                                                        >
                                                                            Ver
                                                                        </button>
                                                                    ) : null}
                                                                    <label
                                                                        htmlFor={`repertoire-score-${song.id}-${instrument}`}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <span className="inline-flex rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-fg-secondary hover:bg-bg-subtle">
                                                                            {existing ? 'Cambiar' : 'Subir'}
                                                                        </span>
                                                                        <input
                                                                            id={`repertoire-score-${song.id}-${instrument}`}
                                                                            type="file"
                                                                            accept="application/pdf"
                                                                            className="sr-only"
                                                                            onChange={(event) => {
                                                                                const file = event.target.files?.[0];
                                                                                if (file) void uploadScore(instrument, file);
                                                                                event.target.value = '';
                                                                            }}
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
            </PanelCard>

            {createModalQuery !== null ? (
                <CreateCatalogSongModal
                    initialTitle={createModalQuery}
                    onClose={() => setCreateModalQuery(null)}
                    onCreated={onCatalogSongCreated}
                />
            ) : null}

            {previewScore ? (
                <ScoreViewerModal
                    title={`${scoreSong?.title ?? 'Canción'} — ${previewScore.instrument}`}
                    storageUrl={previewScore.storageUrl}
                    onClose={() => setPreviewScore(null)}
                />
            ) : null}
        </div>
    );
}
