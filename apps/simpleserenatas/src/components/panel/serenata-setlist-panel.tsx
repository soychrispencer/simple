'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton } from '@simple/ui/panel';
import { serenatasApi, type RepertoireSong, type Serenata, type SerenataSongSelection } from '@/lib/serenatas-api';
import { FormFeedback, type FormStatus } from './shared';
import { RepertoireSongPicker } from './repertoire-song-picker';
import { ScoreViewerModal } from './score-viewer-modal';
import { useSerenataOptional } from '@/context/serenata-context';

function canOwnerEditSetlist(serenata: Serenata): boolean {
    return serenata.status === 'scheduled' || serenata.status === 'completed';
}

function formatRepertoireClientSummary(songsIncluded: number, selectedCount: number): string | null {
    if (songsIncluded <= 0) return null;
    const noun = songsIncluded === 1 ? 'canción' : 'canciones';
    if (selectedCount > 0) {
        return `${selectedCount} de ${songsIncluded} ${noun} elegida${selectedCount === 1 ? '' : 's'} por el cliente`;
    }
    return `El cliente aún no eligió entre las ${songsIncluded} ${noun} del servicio`;
}

export function SerenataSetlistPanel({
    serenata,
    mode,
    refresh,
    embedded = false,
}: {
    serenata: Serenata;
    mode: 'owner' | 'musician';
    refresh?: () => Promise<void>;
    /** Sin margen superior extra cuando va dentro del detalle de solicitud. */
    embedded?: boolean;
}) {
    const [musicianInstrument, setMusicianInstrument] = useState<string | null>(null);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });
    const [selections, setSelections] = useState<SerenataSongSelection[]>([]);
    const [songsIncluded, setSongsIncluded] = useState(0);
    const [catalog, setCatalog] = useState<RepertoireSong[]>([]);
    const [editIds, setEditIds] = useState<string[]>([]);
    const [previewInstrument, setPreviewInstrument] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const serenataCtx = useSerenataOptional();

    const ownerCanEdit = mode === 'owner' && canOwnerEditSetlist(serenata);

    const clientPrefs = useMemo(
        () => selections.filter((item) => item.kind === 'client_preference').sort((a, b) => a.sortOrder - b.sortOrder),
        [selections],
    );
    const setlist = useMemo(
        () => selections.filter((item) => item.kind === 'setlist').sort((a, b) => a.sortOrder - b.sortOrder),
        [selections],
    );

    const displaySongs = setlist.length > 0 ? setlist : clientPrefs;

    useEffect(() => {
        if (mode !== 'musician') return;
        const profile = serenataCtx?.profiles.musician;
        if (profile) {
            setMusicianInstrument(profile.instruments?.[0] ?? profile.instrument ?? 'Trompeta');
            return;
        }
        let cancelled = false;
        void serenatasApi.profiles().then((response) => {
            if (cancelled || !response.ok) return;
            const musician = response.profiles.musician;
            setMusicianInstrument(musician?.instruments?.[0] ?? musician?.instrument ?? 'Trompeta');
        });
        return () => {
            cancelled = true;
        };
    }, [mode, serenataCtx?.profiles.musician]);

    useEffect(() => {
        let cancelled = false;
        setStatus({ loading: true, error: null, ok: null });
        void serenatasApi.serenataSongs(serenata.id).then(async (response) => {
            if (cancelled) return;
            if (!response.ok) {
                setStatus({ loading: false, error: response.error ?? 'No pudimos cargar el repertorio.', ok: null });
                return;
            }
            setSelections(response.items);
            setSongsIncluded(response.songsIncludedAtBooking ?? 0);
            const setlistRows = response.items.filter((item) => item.kind === 'setlist' && item.repertoireSongId);
            const prefRows = response.items.filter((item) => item.kind === 'client_preference' && item.repertoireSongId);
            setEditIds(
                (setlistRows.length > 0 ? setlistRows : prefRows).map((item) => item.repertoireSongId!).filter(Boolean),
            );
            if (serenata.providerGroupId && mode === 'owner') {
                const rep = await serenatasApi.providerGroupRepertoire(serenata.providerGroupId);
                if (!cancelled && rep.ok) setCatalog(rep.items.filter((song) => song.isActive));
            }
            setStatus({ loading: false, error: null, ok: null });
        });
        return () => {
            cancelled = true;
        };
    }, [mode, serenata.id, serenata.providerGroupId]);

    async function saveSetlist() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.confirmSerenataSetlist(
            serenata.id,
            editIds.map((repertoireSongId, index) => ({ repertoireSongId, sortOrder: index })),
        );
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos guardar el repertorio.', ok: null });
            return;
        }
        setSelections(response.items);
        setStatus({ loading: false, error: null, ok: 'Repertorio actualizado.' });
        await refresh?.();
    }

    async function openScore(song: SerenataSongSelection) {
        if (!song.repertoireSongId) return;
        const instrument = musicianInstrument ?? 'Trompeta';
        setPreviewInstrument(instrument);
        setPreviewTitle(`${song.title} — ${instrument}`);
        const response = await serenatasApi.serenataSongScore(serenata.id, song.repertoireSongId, instrument);
        if (!response.ok || !response.item) {
            setStatus({ loading: false, error: response.error ?? 'Sin partitura para tu instrumento.', ok: null });
            return;
        }
        setPreviewUrl(response.item.storageUrl);
    }

    if (songsIncluded <= 0 && selections.length === 0) return null;

    const clientRepertoireSummary = formatRepertoireClientSummary(songsIncluded, displaySongs.length);

    return (
        <div className={`rounded-card border border-border bg-bg-subtle p-5 ${embedded ? '' : 'mt-6'}`}>
            <p className="text-sm font-semibold text-fg">Repertorio de la serenata</p>
            {clientRepertoireSummary ? (
                <p className="mt-2 text-xs text-fg-muted">{clientRepertoireSummary}</p>
            ) : null}
            {ownerCanEdit ? (
                <p className="mt-2 text-xs text-fg-muted">Puedes ajustar las canciones si el cliente pide cambios.</p>
            ) : null}

            <FormFeedback status={status} />

            {displaySongs.length > 0 ? (
                <div className="mt-4">
                    <ul className="space-y-2.5">
                        {displaySongs.map((song, index) => (
                            <li key={song.id} className="text-sm text-fg">
                                {index + 1}. {song.title}
                                {song.artist ? <span className="text-fg-muted"> — {song.artist}</span> : null}
                                {song.clientNote ? (
                                    <span className="block text-xs text-fg-muted">{song.clientNote}</span>
                                ) : null}
                                {mode === 'musician' && song.repertoireSongId && setlist.length > 0 ? (
                                    <button
                                        type="button"
                                        className="ml-2 text-xs font-medium text-accent hover:underline"
                                        onClick={() => void openScore(song)}
                                    >
                                        Partitura
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : clientRepertoireSummary ? null : (
                <p className="mt-2 text-sm text-fg-muted">El cliente no indicó canciones; el mariachi arma el set en el evento.</p>
            )}

            {ownerCanEdit && catalog.length > 0 ? (
                <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-medium text-fg">Editar repertorio</p>
                    <p className="mt-1 text-xs text-fg-muted">
                        Agrega o quita canciones si coordinaste cambios con el cliente.
                    </p>
                    <div className="mt-3">
                        <RepertoireSongPicker
                            songs={catalog}
                            maxSelections={Math.max(songsIncluded, clientPrefs.length, 12)}
                            selectedIds={editIds}
                            onChange={setEditIds}
                        />
                    </div>
                    <PanelButton className="mt-3" disabled={status.loading} onClick={() => void saveSetlist()}>
                        Guardar cambios
                    </PanelButton>
                </div>
            ) : null}

            {previewUrl && previewInstrument ? (
                <ScoreViewerModal
                    title={previewTitle}
                    storageUrl={previewUrl}
                    onClose={() => {
                        setPreviewUrl(null);
                        setPreviewInstrument(null);
                    }}
                />
            ) : null}
        </div>
    );
}
