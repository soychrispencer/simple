'use client';

import { useMemo, useState } from 'react';
import { PanelField } from '@simple/ui/panel';
import type { RepertoireSong } from '@/lib/serenatas-api';
import { FieldInput } from './shared';

export function RepertoireSongPicker({
    songs,
    maxSelections,
    selectedIds,
    onChange,
    disabled = false,
}: {
    songs: RepertoireSong[];
    maxSelections: number;
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}) {
    const [tag, setTag] = useState('');
    const [q, setQ] = useState('');

    const tags = useMemo(() => {
        const set = new Set<string>();
        for (const song of songs) {
            for (const item of song.tags) set.add(item);
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'es'));
    }, [songs]);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        const tagKey = tag.trim().toLowerCase();
        return songs.filter((song) => {
            if (tagKey && !song.tags.some((item) => item.toLowerCase() === tagKey)) return false;
            if (query) {
                const hay = `${song.title} ${song.artist ?? ''}`.toLowerCase();
                if (!hay.includes(query)) return false;
            }
            return true;
        });
    }, [q, songs, tag]);

    function toggle(id: string) {
        if (disabled) return;
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((item) => item !== id));
            return;
        }
        if (selectedIds.length >= maxSelections) return;
        onChange([...selectedIds, id]);
    }

    if (maxSelections <= 0) {
        return (
            <p className="text-sm text-fg-muted">
                Este servicio no incluye elección de canciones; el mariachi arma el repertorio en el evento.
            </p>
        );
    }

    return (
        <div className="grid gap-3">
            <p className="text-sm text-fg-muted">
                Elige hasta {maxSelections} canción{maxSelections === 1 ? '' : 'es'} del repertorio (opcional).
                {' '}
                <span className="font-medium text-fg">{selectedIds.length}/{maxSelections}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag === '' ? 'border-accent-border bg-accent-soft text-accent' : 'border-border text-fg-muted'}`}
                    onClick={() => setTag('')}
                >
                    Todas
                </button>
                {tags.map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag === item ? 'border-accent-border bg-accent-soft text-accent' : 'border-border text-fg-muted'}`}
                        onClick={() => setTag(item)}
                    >
                        {item}
                    </button>
                ))}
            </div>
            <FieldInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar canción…" />
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {filtered.length === 0 ? (
                    <li className="px-2 py-3 text-sm text-fg-muted">Sin canciones en el catálogo.</li>
                ) : (
                    filtered.map((song) => {
                        const checked = selectedIds.includes(song.id);
                        const full = !checked && selectedIds.length >= maxSelections;
                        return (
                            <li key={song.id}>
                                <label
                                    className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 ${checked ? 'bg-accent-soft' : 'hover:bg-bg-subtle'} ${full ? 'opacity-50' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={checked}
                                        disabled={disabled || full}
                                        onChange={() => toggle(song.id)}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-fg">{song.title}</span>
                                        {song.artist ? (
                                            <span className="block text-xs text-fg-muted">{song.artist}</span>
                                        ) : null}
                                    </span>
                                </label>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}
