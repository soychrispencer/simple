'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton } from '@simple/ui/panel';
import { PanelNotice } from '@simple/ui/panel';
import { useSerenataOptional } from '@/context/serenata-context';
import { serenatasApi, type RepertoireSong, type Serenata, type SerenataSongSelection } from '@/lib/serenatas-api';
import { FormFeedback, type FormStatus } from './shared';
import { RepertoireSongPicker } from './repertoire-song-picker';
import { ScoreViewerModal } from './score-viewer-modal';

export function SerenataSetlistPanel({
    serenata,
    mode,
    refresh,
}: {
    serenata: Serenata;
    mode: 'owner' | 'musician';
    refresh?: () => Promise<void>;
}) {
    const [musicianInstrument, setMusicianInstrument] = useState<string | null>(null);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });
    const [selections, setSelections] = useState<SerenataSongSelection[]>([]);
    const [setlistStatus, setSetlistStatus] = useState<Serenata['setlistStatus']>('pending_owner');
    const [songsIncluded, setSongsIncluded] = useState(0);
    const [catalog, setCatalog] = useState<RepertoireSong[]>([]);
    const [confirmIds, setConfirmIds] = useState<string[]>([]);
    const [previewInstrument, setPreviewInstrument] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const serenataCtx = useSerenataOptional();

    const clientPrefs = useMemo(
        () => selections.filter((item) => item.kind === 'client_preference').sort((a, b) => a.sortOrder - b.sortOrder),
        [selections],
    );
    const setlist = useMemo(
        () => selections.filter((item) => item.kind === 'setlist').sort((a, b) => a.sortOrder - b.sortOrder),
        [selections],
    );

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
            setSetlistStatus(response.setlistStatus ?? 'pending_owner');
            setSongsIncluded(response.songsIncludedAtBooking ?? 0);
            const prefs = response.items.filter((item) => item.kind === 'client_preference' && item.repertoireSongId);
            const confirmed = response.items.filter((item) => item.kind === 'setlist' && item.repertoireSongId);
            setConfirmIds(
                (confirmed.length > 0 ? confirmed : prefs).map((item) => item.repertoireSongId!).filter(Boolean),
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

    async function confirmSetlist() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.confirmSerenataSetlist(
            serenata.id,
            confirmIds.map((repertoireSongId, index) => ({ repertoireSongId, sortOrder: index })),
        );
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos confirmar el setlist.', ok: null });
            return;
        }
        setSelections(response.items);
        setSetlistStatus('confirmed');
        setStatus({ loading: false, error: null, ok: 'Setlist confirmado para el equipo.' });
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

    return (
        <div className="mt-6 rounded-card border border-border bg-bg-subtle p-4">
            <p className="text-sm font-semibold text-fg">Repertorio de la serenata</p>
            {songsIncluded > 0 ? (
                <p className="mt-1 text-xs text-fg-muted">
                    Servicio con hasta {songsIncluded} preferencia{songsIncluded === 1 ? '' : 's'} del cliente.
                    {setlistStatus === 'confirmed' ? ' Setlist confirmado.' : ' Pendiente de confirmación del dueño.'}
                </p>
            ) : null}

            <FormFeedback status={status} />

            {clientPrefs.length > 0 ? (
                <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Preferencias del cliente</p>
                    <ul className="mt-2 space-y-1">
                        {clientPrefs.map((song) => (
                            <li key={song.id} className="text-sm text-fg">
                                {song.title}
                                {song.artist ? <span className="text-fg-muted"> — {song.artist}</span> : null}
                                {song.clientNote ? <span className="block text-xs text-fg-muted">{song.clientNote}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="mt-2 text-sm text-fg-muted">El cliente no indicó canciones; el mariachi arma el set en el evento.</p>
            )}

            {mode === 'owner' && setlistStatus !== 'confirmed' && catalog.length > 0 ? (
                <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-medium text-fg">Confirmar setlist para músicos</p>
                    <p className="mt-1 text-xs text-fg-muted">
                        Incluye las preferencias del cliente y agrega las que complete el mariachi. Máximo recomendado: {songsIncluded || 'sin límite'}.
                    </p>
                    <div className="mt-3">
                        <RepertoireSongPicker
                            songs={catalog}
                            maxSelections={Math.max(songsIncluded, clientPrefs.length, 12)}
                            selectedIds={confirmIds}
                            onChange={setConfirmIds}
                        />
                    </div>
                    <PanelButton className="mt-3" disabled={status.loading} onClick={() => void confirmSetlist()}>
                        Confirmar setlist
                    </PanelButton>
                </div>
            ) : null}

            {setlist.length > 0 ? (
                <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Setlist confirmado</p>
                    <ul className="mt-2 space-y-1">
                        {setlist.map((song, index) => (
                            <li key={song.id} className="flex items-center justify-between gap-2 text-sm text-fg">
                                <span>
                                    {index + 1}. {song.title}
                                </span>
                                {mode === 'musician' && song.repertoireSongId ? (
                                    <button
                                        type="button"
                                        className="text-xs font-medium text-accent hover:underline"
                                        onClick={() => void openScore(song)}
                                    >
                                        Partitura
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {mode === 'musician' && setlistStatus !== 'confirmed' && clientPrefs.length > 0 ? (
                <PanelNotice tone="neutral" className="mt-3 text-xs">
                    El dueño aún no confirma el setlist final. Puedes revisar las preferencias del cliente.
                </PanelNotice>
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
