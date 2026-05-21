'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconMusic, IconX } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelStatusBadge } from '@simple/ui';
import { serenatasApi, type RepertoireSong } from '@/lib/serenatas-api';
import { PanelSheet } from '@/components/panel/panel-sheet';

export function MariachiRepertoireSection({ groupSlug }: { groupSlug: string }) {
    const [songs, setSongs] = useState<RepertoireSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void serenatasApi.marketplaceGroupRepertoire(groupSlug).then((response) => {
            if (cancelled) return;
            setSongs(response.ok ? response.items : []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [groupSlug]);

    const tagCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const song of songs) {
            for (const tag of song.tags ?? []) {
                const key = tag.trim();
                if (!key) continue;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [songs]);

    if (loading) {
        return (
            <p className="text-sm text-fg-muted">Cargando repertorio…</p>
        );
    }

    if (songs.length === 0) return null;

    return (
        <>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-subtle/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                    <IconMusic className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">
                            Repertorio · {songs.length} canción{songs.length === 1 ? '' : 'es'}
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            Al contratar eliges según lo que incluya cada servicio.
                        </p>
                        {tagCounts.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {tagCounts.map(([tag, count]) => (
                                    <PanelStatusBadge
                                        key={tag}
                                        label={`${tag} (${count})`}
                                        tone="neutral"
                                        size="xs"
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
                <PanelButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => setModalOpen(true)}
                >
                    Ver listado completo
                </PanelButton>
            </div>

            {modalOpen ? (
                <PanelSheet
                    onClose={() => setModalOpen(false)}
                    ariaLabel="Repertorio del mariachi"
                    maxWidthClass="sm:max-w-lg"
                >
                    <PanelCard size="lg">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-fg">Repertorio</h2>
                                <p className="mt-1 text-sm text-fg-muted">
                                    {songs.length} canción{songs.length === 1 ? '' : 'es'} en catálogo
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-xl bg-bg-subtle p-2 text-fg-muted"
                                onClick={() => setModalOpen(false)}
                                aria-label="Cerrar"
                            >
                                <IconX size={18} />
                            </button>
                        </div>
                        {tagCounts.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {tagCounts.map(([tag, count]) => (
                                    <PanelStatusBadge
                                        key={tag}
                                        label={`${tag} (${count})`}
                                        tone="neutral"
                                        size="xs"
                                    />
                                ))}
                            </div>
                        ) : null}
                        <ul className="mt-4 max-h-[min(60vh,28rem)] space-y-0 divide-y divide-border overflow-y-auto text-sm">
                            {songs.map((song) => (
                                <li key={song.id} className="flex flex-wrap gap-x-2 py-2.5 first:pt-0">
                                    <span className="font-medium text-fg">{song.title}</span>
                                    {song.artist ? <span className="text-fg-muted">{song.artist}</span> : null}
                                </li>
                            ))}
                        </ul>
                    </PanelCard>
                </PanelSheet>
            ) : null}
        </>
    );
}
