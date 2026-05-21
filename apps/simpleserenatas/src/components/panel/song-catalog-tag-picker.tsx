'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconPlus, IconX } from '@tabler/icons-react';
import { serenatasApi, type CatalogSong } from '@/lib/serenatas-api';

const MAX_TAGS = 80;

export type CatalogTagSelection = {
    catalogSongId: string;
    title: string;
    artist: string | null;
};

export function SongCatalogTagPicker({
    selected,
    onChange,
    excludeCatalogIds = [],
    disabled = false,
    placeholder = 'Busca una canción del banco…',
    onRequestCreateNew,
}: {
    selected: CatalogTagSelection[];
    onChange: (items: CatalogTagSelection[]) => void;
    excludeCatalogIds?: string[];
    disabled?: boolean;
    placeholder?: string;
    /** Abre el modal para crear una canción que no está en el banco. */
    onRequestCreateNew?: (query: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CatalogSong[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    const excluded = useMemo(() => new Set([...excludeCatalogIds, ...selected.map((item) => item.catalogSongId)]), [excludeCatalogIds, selected]);

    const loadSuggestions = useCallback(async (q: string) => {
        setLoading(true);
        const response = await serenatasApi.searchSongCatalog(q, 16);
        const items = response.ok ? response.items.filter((song) => !excluded.has(song.id)) : [];
        setSuggestions(items);
        setLoading(false);
    }, [excluded]);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => {
            void loadSuggestions(query);
        }, 200);
        return () => window.clearTimeout(timer);
    }, [loadSuggestions, open, query]);

    useEffect(() => {
        function onDocClick(event: MouseEvent) {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    function addSong(song: CatalogSong) {
        if (disabled || selected.length >= MAX_TAGS) return;
        if (excluded.has(song.id)) return;
        onChange([...selected, { catalogSongId: song.id, title: song.title, artist: song.artist }]);
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    }

    function requestCreate(title: string) {
        const trimmed = title.trim();
        if (!trimmed || disabled || !onRequestCreateNew) return;
        onRequestCreateNew(trimmed);
        setQuery('');
        setOpen(false);
    }

    function removeAt(catalogSongId: string) {
        onChange(selected.filter((item) => item.catalogSongId !== catalogSongId));
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const exact = suggestions.find(
                (song) => song.title.toLowerCase() === query.trim().toLowerCase(),
            );
            if (exact) {
                addSong(exact);
                return;
            }
            if (suggestions[0]) {
                addSong(suggestions[0]);
                return;
            }
            if (query.trim() && onRequestCreateNew) requestCreate(query);
        }
        if (event.key === 'Backspace' && !query && selected.length > 0) {
            onChange(selected.slice(0, -1));
        }
    }

    const trimmedQuery = query.trim();
    const showCreate =
        Boolean(onRequestCreateNew)
        && trimmedQuery.length >= 2
        && !suggestions.some((song) => song.title.toLowerCase() === trimmedQuery.toLowerCase());

    return (
        <div ref={wrapRef} className="relative">
            <label className="block text-xs font-medium text-fg-muted">Canciones</label>
            <div
                className={[
                    'mt-1 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1.5',
                    disabled ? 'opacity-60' : 'focus-within:ring-2 focus-within:ring-accent/30',
                ].join(' ')}
                onClick={() => inputRef.current?.focus()}
            >
                {selected.map((item) => (
                    <span
                        key={item.catalogSongId}
                        className="inline-flex max-w-full items-center gap-1 rounded-lg bg-bg-subtle px-2 py-1 text-sm text-fg"
                    >
                        <span className="truncate">{item.title}</span>
                        {!disabled ? (
                            <button
                                type="button"
                                className="shrink-0 rounded p-0.5 text-fg-muted hover:bg-surface hover:text-fg"
                                aria-label={`Quitar ${item.title}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeAt(item.catalogSongId);
                                }}
                            >
                                <IconX size={14} />
                            </button>
                        ) : null}
                    </span>
                ))}
                {selected.length < MAX_TAGS ? (
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        placeholder={selected.length === 0 ? placeholder : ''}
                        className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-fg outline-none placeholder:text-fg-muted"
                    />
                ) : null}
                <button
                    type="button"
                    disabled={disabled || !trimmedQuery}
                    className="ml-auto shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-accent disabled:opacity-40"
                    aria-label="Agregar canción"
                    onClick={() => {
                        if (!trimmedQuery) return;
                        const exact = suggestions.find((s) => s.title.toLowerCase() === trimmedQuery.toLowerCase());
                        if (exact) addSong(exact);
                        else if (suggestions[0]) addSong(suggestions[0]);
                        else if (showCreate) requestCreate(trimmedQuery);
                    }}
                >
                    <IconPlus size={18} />
                </button>
            </div>
            <p className="mt-1 text-[11px] text-fg-muted">
                Busca en el banco y agrégalas con Enter o +. Límite por tanda: {MAX_TAGS}.
            </p>

            {open && !disabled ? (
                <ul
                    className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
                    role="listbox"
                >
                    {loading ? (
                        <li className="px-3 py-2 text-sm text-fg-muted">Buscando…</li>
                    ) : null}
                    {!loading && suggestions.length === 0 && !showCreate ? (
                        <li className="px-3 py-2 text-sm text-fg-muted">Escribe para buscar en el banco.</li>
                    ) : null}
                    {suggestions.map((song) => (
                        <li key={song.id}>
                            <button
                                type="button"
                                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-bg-subtle"
                                onClick={() => addSong(song)}
                            >
                                <span className="font-medium text-fg">{song.title}</span>
                                {song.artist ? <span className="text-xs text-fg-muted">{song.artist}</span> : null}
                            </button>
                        </li>
                    ))}
                    {showCreate ? (
                        <li className="border-t border-border">
                            <button
                                type="button"
                                className="w-full px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-accent-soft"
                                onClick={() => requestCreate(trimmedQuery)}
                            >
                                Nueva canción: «{trimmedQuery}»…
                            </button>
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </div>
    );
}
