'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconMusic, IconSearch, IconX, IconMusicOff } from '@tabler/icons-react';
import { PanelCard } from '@simple/ui/panel';
import { serenatasApi, type RepertoireSong } from '@/lib/serenatas-api';

export function MariachiRepertoireSection({ groupSlug }: { groupSlug: string }) {
    const [songs, setSongs] = useState<RepertoireSong[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para la interactividad
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

    // Obtener los tags más populares (hasta 8)
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
            .slice(0, 8);
    }, [songs]);

    // Filtrar canciones según búsqueda y tag seleccionado
    const filteredSongs = useMemo(() => {
        return songs.filter((song) => {
            const matchesSearch =
                song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesTag = !selectedTag || (song.tags && song.tags.includes(selectedTag));

            return matchesSearch && matchesTag;
        });
    }, [songs, searchQuery, selectedTag]);

    if (loading) {
        return (
            <div className="h-48 animate-pulse rounded-2xl border border-border bg-bg-subtle/40 p-5" aria-hidden>
                <div className="h-6 w-32 rounded bg-border" />
                <div className="mt-4 h-10 w-full rounded-xl bg-border" />
                <div className="mt-3 flex gap-2">
                    <div className="h-7 w-16 rounded-full bg-border" />
                    <div className="h-7 w-20 rounded-full bg-border" />
                    <div className="h-7 w-24 rounded-full bg-border" />
                </div>
            </div>
        );
    }

    if (songs.length === 0) return null;

    return (
        <PanelCard className="p-4 sm:p-5">
            <div className="grid gap-4">
                <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                    <input
                        type="text"
                        placeholder="Buscar canción o artista..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent-border focus:ring-2 focus:ring-accent/20"
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-bg-subtle hover:text-fg"
                            aria-label="Limpiar búsqueda"
                        >
                            <IconX size={14} />
                        </button>
                    ) : null}
                </div>

                <div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-fg">Repertorio</h2>
                            <p className="text-sm text-fg-muted">
                                {songs.length} canción{songs.length === 1 ? '' : 'es'} disponible{songs.length === 1 ? '' : 's'}.
                            </p>
                        </div>
                        <p className="text-sm text-fg-muted sm:text-right">
                            Puedes revisar canciones antes de contratar.
                        </p>
                    </div>
                </div>

                {tagCounts.length > 0 ? (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                            <button
                                type="button"
                                onClick={() => setSelectedTag(null)}
                                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                    selectedTag === null
                                        ? 'border-accent-border bg-accent-soft text-accent'
                                        : 'border-border bg-surface text-fg-muted hover:text-fg'
                                }`}
                            >
                                Todas
                            </button>
                            {tagCounts.map(([tag]) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        selectedTag === tag
                                            ? 'border-accent-border bg-accent-soft text-accent'
                                            : 'border-border bg-surface text-fg-muted hover:text-fg'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                    </div>
                ) : null}

                {filteredSongs.length === 0 ? (
                    <div className="rounded-xl border border-border px-4 py-8 text-center">
                        <IconMusicOff className="mx-auto h-7 w-7 text-fg-muted" />
                        <p className="mt-3 text-sm font-semibold text-fg">No hay resultados</p>
                        <p className="mt-1 text-sm text-fg-muted">Puedes consultar por otra canción al enviar la solicitud.</p>
                    </div>
                ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {filteredSongs.map((song) => (
                            <li key={song.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg-muted">
                                    <IconMusic size={16} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-fg">{song.title}</span>
                                    {song.artist ? <span className="block truncate text-xs text-fg-muted">{song.artist}</span> : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </PanelCard>
    );
}
