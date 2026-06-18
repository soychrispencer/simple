'use client';

import { useState } from 'react';
import { IconSparkles, IconVideo } from '@tabler/icons-react';
import { generateListingReel } from '@/lib/generate-reel';

type Props = {
    listingId: string;
    hasVideo?: boolean;
    onGenerated?: (videoUrl: string) => void;
};

export function GenerateListingReelCard({ listingId, hasVideo = false, onGenerated }: Props) {
    const [busy, setBusy] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate() {
        setBusy(true);
        setMessage(null);
        setError(null);

        const result = await generateListingReel(listingId, { replaceExisting: hasVideo ? replaceExisting : false });
        setBusy(false);

        if (!result.ok || !result.videoUrl) {
            setError(result.error ?? 'No se pudo generar el video.');
            return;
        }

        setMessage(
            `Video generado (${result.slideCount ?? 0} escenas, ~${Math.round(result.durationSeconds ?? 0)}s). Ya puedes publicarlo en Reel y Descubre.`,
        );
        onGenerated?.(result.videoUrl);
    }

    return (
        <div className="sm:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <IconVideo size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--fg)]">Generar video para redes</p>
                    <p className="mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                        Crea un Reel vertical 9:16 desde las fotos del aviso (portada + carrusel). Tú decides si publicarlo después.
                    </p>
                </div>
            </div>

            {hasVideo ? (
                <label className="mt-3 flex items-center gap-2 text-xs text-[var(--fg-secondary)]">
                    <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--accent)]"
                        checked={replaceExisting}
                        onChange={() => setReplaceExisting((value) => !value)}
                    />
                    Reemplazar el video actual del aviso
                </label>
            ) : null}

            <button
                type="button"
                disabled={busy || (hasVideo && !replaceExisting)}
                onClick={() => void handleGenerate()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <IconSparkles size={16} />
                {busy ? 'Generando video...' : hasVideo ? 'Regenerar video desde fotos' : 'Generar video desde fotos'}
            </button>

            {hasVideo && !replaceExisting ? (
                <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
                    Este aviso ya tiene video. Marca reemplazar si quieres uno nuevo generado automáticamente.
                </p>
            ) : null}

            {message ? <p className="mt-3 text-xs text-green-700">{message}</p> : null}
            {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
        </div>
    );
}
