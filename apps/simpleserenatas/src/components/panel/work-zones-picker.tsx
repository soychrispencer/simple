'use client';

import { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconMapPin, IconSearch, IconX } from '@tabler/icons-react';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';

type WorkZonesPickerProps = {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
};

function normalize(value: string) {
    return value.trim().toLowerCase();
}

export function WorkZonesPicker({ value, onChange, disabled = false }: WorkZonesPickerProps) {
    const [query, setQuery] = useState('');
    const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({ 'cl-13': true });

    const selectedSet = useMemo(() => new Set(value), [value]);
    const normalizedQuery = normalize(query);

    const regions = useMemo(() => {
        return LOCATION_REGIONS.map((region) => {
            const communes = getCommunesForRegion(region.id);
            const filteredCommunes = normalizedQuery
                ? communes.filter((commune) => {
                    const haystack = `${region.name} ${commune.name}`.toLowerCase();
                    return haystack.includes(normalizedQuery);
                })
                : communes;
            const selectedCount = communes.filter((commune) => selectedSet.has(commune.name)).length;
            return { region, communes, filteredCommunes, selectedCount };
        }).filter((entry) => entry.filteredCommunes.length > 0 || entry.selectedCount > 0);
    }, [normalizedQuery, selectedSet]);

    const toggleCommune = (communeName: string) => {
        if (disabled) return;
        if (selectedSet.has(communeName)) {
            onChange(value.filter((entry) => entry !== communeName));
            return;
        }
        onChange([...value, communeName].sort((a, b) => a.localeCompare(b, 'es')));
    };

    const toggleRegion = (_regionId: string, communeNames: string[]) => {
        if (disabled) return;
        const allSelected = communeNames.every((name) => selectedSet.has(name));
        if (allSelected) {
            const remove = new Set(communeNames);
            onChange(value.filter((entry) => !remove.has(entry)));
            return;
        }
        const merged = new Set(value);
        communeNames.forEach((name) => merged.add(name));
        onChange(Array.from(merged).sort((a, b) => a.localeCompare(b, 'es')));
    };

    const toggleExpanded = (regionId: string) => {
        setExpandedRegions((current) => ({ ...current, [regionId]: !current[regionId] }));
    };

    const clearAll = () => {
        if (disabled) return;
        onChange([]);
    };

    const removeChip = (communeName: string) => {
        if (disabled) return;
        onChange(value.filter((entry) => entry !== communeName));
    };

    return (
        <div className="grid gap-3" role="group" aria-label="Zonas de trabajo">
            <div
                className="panel-surface-subtle flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
            >
                <IconSearch size={16} className="panel-text-muted" aria-hidden />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar comuna o región…"
                    disabled={disabled}
                    className="min-w-[12rem] flex-1 bg-transparent text-sm text-[var(--fg)] outline-none"
                    aria-label="Buscar comunas"
                />
                <span
                    className="panel-accent-soft rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                    {value.length} seleccionada{value.length === 1 ? '' : 's'}
                </span>
                {value.length > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={disabled}
                        className="panel-text-muted text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Comunas seleccionadas">
                    {value.map((communeName) => (
                        <button
                            key={communeName}
                            type="button"
                            onClick={() => removeChip(communeName)}
                            disabled={disabled}
                            className="panel-accent-soft inline-flex items-center gap-1 rounded-full border border-[var(--accent-border)] px-2.5 py-1 text-xs font-medium transition disabled:opacity-50"
                            aria-label={`Quitar ${communeName}`}
                        >
                            <IconMapPin size={12} aria-hidden />
                            {communeName}
                            <IconX size={12} aria-hidden />
                        </button>
                    ))}
                </div>
            )}

            <div className="panel-surface-card max-h-72 overflow-y-auto rounded-xl border">
                {regions.length === 0 ? (
                    <p className="panel-text-muted p-4 text-sm">
                        No hay comunas que coincidan con tu búsqueda.
                    </p>
                ) : (
                    regions.map(({ region, communes, filteredCommunes, selectedCount }) => {
                        const expanded = expandedRegions[region.id] ?? normalizedQuery.length > 0;
                        const allNames = communes.map((entry) => entry.name);
                        const allSelected = allNames.length > 0 && allNames.every((name) => selectedSet.has(name));
                        const partial = selectedCount > 0 && !allSelected;

                        return (
                            <section key={region.id} className="border-b border-[var(--border)] last:border-b-0">
                                <div className="panel-surface-subtle flex items-center gap-2 px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(region.id)}
                                        className="panel-text-muted rounded p-0.5"
                                        aria-expanded={expanded}
                                        aria-label={expanded ? `Ocultar comunas de ${region.name}` : `Mostrar comunas de ${region.name}`}
                                    >
                                        {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <p className="panel-text-fg truncate text-sm font-semibold">
                                            {region.name}
                                        </p>
                                        <p className="panel-text-muted text-xs">
                                            {selectedCount}/{communes.length} comunas
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleRegion(region.id, allNames)}
                                        disabled={disabled || communes.length === 0}
                                        className={`shrink-0 rounded-button border px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                                            allSelected || partial
                                                ? 'border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)]'
                                        }`}
                                    >
                                        {allSelected ? 'Quitar región' : 'Toda la región'}
                                    </button>
                                </div>

                                {expanded && (
                                    <ul className="grid gap-1 px-3 py-2 sm:grid-cols-2">
                                        {filteredCommunes.map((commune) => {
                                            const checked = selectedSet.has(commune.name);
                                            const inputId = `work-zone-${commune.id}`;
                                            return (
                                                <li key={commune.id}>
                                                    <label
                                                        htmlFor={inputId}
                                                        className="flex cursor-pointer items-center gap-2 rounded-button px-2 py-1.5 text-sm text-[var(--fg)] transition hover:bg-[var(--bg-subtle)]"
                                                    >
                                                        <input
                                                            id={inputId}
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={disabled}
                                                            onChange={() => toggleCommune(commune.name)}
                                                            className="h-4 w-4 rounded border accent-[var(--accent)]"
                                                        />
                                                        <span className="truncate">{commune.name}</span>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        );
                    })
                )}
            </div>

            <p className="panel-text-muted text-xs">
                Indica las comunas donde puedes presentarte. Sirven para tu perfil y visibilidad; las solicitudes del marketplace se organizan según las zonas del grupo.
            </p>
        </div>
    );
}
