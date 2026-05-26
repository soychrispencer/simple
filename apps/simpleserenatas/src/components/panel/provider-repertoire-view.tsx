'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconMusic, IconTrash } from '@tabler/icons-react';
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
    const [pending, setPending] = useState<CatalogTagSelection[]>([]);
    const [presets, setPresets] = useState<CatalogTagSelection[]>([]);
    const [formStatus, setFormStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [createModalQuery, setCreateModalQuery] = useState<string | null>(null);
    const [scoreSong, setScoreSong] = useState<RepertoireSong | null>(null);
    const [scores, setScores] = useState<SongScore[]>([]);
    const [previewScore, setPreviewScore] = useState<SongScore | null>(null);

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

    useEffect(() => {
        void serenatasApi.searchSongCatalog('', 12).then((response) => {
            if (!response.ok) return;
            setPresets(
                response.items.slice(0, 10).map((song) => ({
                    catalogSongId: song.id,
                    title: song.title,
                    artist: song.artist,
                })),
            );
        });
    }, []);

    function togglePreset(item: CatalogTagSelection) {
        if (excludeCatalogIds.includes(item.catalogSongId)) return;
        const exists = pending.some((entry) => entry.catalogSongId === item.catalogSongId);
        if (exists) {
            setPending(pending.filter((entry) => entry.catalogSongId !== item.catalogSongId));
            return;
        }
        setPending([...pending, item]);
    }

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
        await serenatasApi.deleteRepertoireSong(mariachi.id, songId);
        await loadSongs();
    }

    async function openScores(song: RepertoireSong) {
        if (!mariachi) return;
        setScoreSong(song);
        const response = await serenatasApi.repertoireSongScores(mariachi.id, song.id);
        setScores(response.ok ? response.items : []);
    }

    async function uploadScore(instrument: string, file: File) {
        if (!mariachi || !scoreSong) return;
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
        <div className="grid gap-5">
            <PanelCard>
                <div className="flex items-center gap-2">
                    <IconMusic className="h-5 w-5 text-accent" aria-hidden />
                    <h2 className="text-lg font-semibold text-fg">Repertorio público</h2>
                </div>
                <p className="mt-1 text-sm text-fg-muted">
                    Agrega canciones del banco compartido. Aparecen en tu perfil y en las solicitudes de clientes.
                </p>

                <div className="mt-5 rounded-xl border border-border bg-bg-subtle/40 p-4">
                    {presets.length > 0 ? (
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                                Populares en serenatas
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {presets.map((item) => {
                                    const inRepertoire = songs.some((song) => song.catalogSongId === item.catalogSongId);
                                    const active =
                                        pending.some((entry) => entry.catalogSongId === item.catalogSongId) || inRepertoire;
                                    return (
                                        <button
                                            key={item.catalogSongId}
                                            type="button"
                                            disabled={inRepertoire || formStatus.loading}
                                            className={[
                                                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                                active
                                                    ? 'border-accent-border bg-accent-soft text-accent'
                                                    : 'border-border text-fg-muted hover:border-accent-border',
                                            ].join(' ')}
                                            onClick={() => togglePreset(item)}
                                        >
                                            {item.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <SongCatalogTagPicker
                        selected={pending}
                        onChange={setPending}
                        excludeCatalogIds={excludeCatalogIds}
                        disabled={formStatus.loading}
                        onRequestCreateNew={(query) => setCreateModalQuery(query)}
                    />

                    <button
                        type="button"
                        className="mt-2 text-xs font-medium text-accent hover:underline"
                        onClick={() => setCreateModalQuery('')}
                    >
                        ¿No está en el banco? Agregar canción nueva
                    </button>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <PanelButton
                            disabled={formStatus.loading || pending.length === 0}
                            onClick={() => void savePending()}
                        >
                            Agregar al repertorio ({pending.length})
                        </PanelButton>
                    </div>
                </div>

                <FormFeedback status={formStatus} />

                <div className="mt-6 border-t border-border pt-5">
                    <h3 className="font-semibold text-fg">Tu repertorio ({songs.length})</h3>
                    {listLoading ? (
                        <p className="mt-3 text-sm text-fg-muted">Cargando canciones…</p>
                    ) : songs.length === 0 ? (
                        <p className="mt-3 text-sm text-fg-muted">
                            Aún no publicas canciones. Usa el recuadro de arriba para etiquetar las que ofreces.
                        </p>
                    ) : (
                        <ul className="mt-4 divide-y divide-border">
                            {songs.map((song) => (
                                <li key={song.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-fg">{song.title}</p>
                                        {song.artist ? <p className="text-xs text-fg-muted">{song.artist}</p> : null}
                                        {song.tags.length > 0 ? (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {song.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-muted"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <PanelButton size="sm" variant="secondary" onClick={() => void openScores(song)}>
                                            Partituras
                                        </PanelButton>
                                        <PanelButton size="sm" variant="ghost" onClick={() => void removeSong(song.id)}>
                                            <IconTrash size={14} />
                                        </PanelButton>
                                    </div>
                                </li>
                            ))}
                        </ul>
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

            {scoreSong ? (
                <PanelCard>
                    <h3 className="font-semibold text-fg">Partituras — {scoreSong.title}</h3>
                    <p className="mt-1 text-xs text-fg-muted">Solo visibles para músicos del grupo.</p>
                    <ul className="mt-4 space-y-3">
                        {COMMON_INSTRUMENTS.map((instrument) => {
                            const existing = scores.find((score) => score.instrument === instrument);
                            return (
                                <li
                                    key={instrument}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                                >
                                    <span className="text-sm font-medium text-fg">{instrument}</span>
                                    <div className="flex gap-2">
                                        {existing ? (
                                            <PanelButton
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setPreviewScore(existing)}
                                            >
                                                Ver PDF
                                            </PanelButton>
                                        ) : null}
                                        <label className="btn btn-ghost h-8 cursor-pointer px-3 text-xs">
                                            Subir PDF
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    if (file) void uploadScore(instrument, file);
                                                    event.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <PanelButton className="mt-3" variant="ghost" onClick={() => setScoreSong(null)}>
                        Cerrar
                    </PanelButton>
                </PanelCard>
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
