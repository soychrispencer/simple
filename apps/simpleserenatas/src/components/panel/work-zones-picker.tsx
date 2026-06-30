'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    IconCheck, IconChevronRight, IconMapPin, IconSearch, IconX, } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { FieldSelect } from './shared';

type WorkZonesPickerProps = {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
};

const DEFAULT_REGION_ID = 'cl-13';
const VISIBLE_CHIP_LIMIT = 8;
/** Por encima de esto, la grilla de comunas usa scroll contenido (no todo el modal). */
const COMMUNE_SCROLL_THRESHOLD = 18;

function normalize(value: string) {
    return value.trim().toLowerCase();
}

function sortCommunes(names: string[]) {
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

function RegionChip({
    label,
    active,
    count,
    onClick,
}: {
    label: string;
    active: boolean;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition ${
                active
                    ? 'border-(--accent-border) bg-(--accent-soft) text-(--accent)'
                    : 'border-border bg-bg-subtle text-fg hover:border-(--accent-border)'
            }`}
        >
            <span className="line-clamp-2 leading-snug">{label}</span>
            {count > 0 ? (
                <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{count} sel.</span>
            ) : null}
        </button>
    );
}

export function WorkZonesPicker({ value, onChange, disabled = false }: WorkZonesPickerProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string[]>(value);
    const [query, setQuery] = useState('');
    const [activeRegionId, setActiveRegionId] = useState(DEFAULT_REGION_ID);

    const selectedSet = useMemo(() => new Set(draft), [draft]);
    const normalizedQuery = normalize(query);

    const regionStats = useMemo(() => {
        return LOCATION_REGIONS.map((region) => {
            const communes = getCommunesForRegion(region.id);
            const selectedCount = communes.filter((c) => selectedSet.has(c.name)).length;
            return { region, communes, selectedCount };
        });
    }, [selectedSet]);

    const activeRegion = regionStats.find((entry) => entry.region.id === activeRegionId) ?? regionStats[0];

    const searchResults = useMemo(() => {
        if (!normalizedQuery) return null;
        const items: { regionName: string; communeName: string; communeId: string }[] = [];
        for (const { region, communes } of regionStats) {
            for (const commune of communes) {
                const haystack = `${region.name} ${commune.name}`.toLowerCase();
                if (haystack.includes(normalizedQuery)) {
                    items.push({ regionName: region.name, communeName: commune.name, communeId: commune.id });
                }
            }
        }
        return items;
    }, [normalizedQuery, regionStats]);
    const regionOptions = useMemo(
        () => regionStats.map(({ region, selectedCount }) => ({
            value: region.id,
            label: `${region.name}${selectedCount > 0 ? ` (${selectedCount})` : ''}`,
        })),
        [regionStats],
    );

    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setDraft(sortCommunes(value));
            setQuery('');
            const preferred =
                LOCATION_REGIONS.find((region) =>
                    getCommunesForRegion(region.id).some((c) => value.includes(c.name)),
                )?.id ?? DEFAULT_REGION_ID;
            setActiveRegionId(preferred);
        }
        wasOpenRef.current = open;
    }, [open, value]);

    const openModal = () => {
        if (disabled) return;
        setOpen(true);
    };

    const applyAndClose = () => {
        onChange(sortCommunes(draft));
        setOpen(false);
    };

    const toggleCommune = (communeName: string) => {
        if (selectedSet.has(communeName)) {
            setDraft((current) => current.filter((entry) => entry !== communeName));
            return;
        }
        setDraft((current) => sortCommunes([...current, communeName]));
    };

    const toggleActiveRegion = () => {
        if (!activeRegion) return;
        const names = activeRegion.communes.map((c) => c.name);
        const allSelected = names.every((name) => selectedSet.has(name));
        if (allSelected) {
            const remove = new Set(names);
            setDraft((current) => current.filter((entry) => !remove.has(entry)));
            return;
        }
        const merged = new Set(draft);
        names.forEach((name) => merged.add(name));
        setDraft(sortCommunes(Array.from(merged)));
    };

    const clearDraft = () => setDraft([]);

    const visibleChips = value.slice(0, VISIBLE_CHIP_LIMIT);
    const hiddenChipCount = Math.max(0, value.length - VISIBLE_CHIP_LIMIT);

    const activeRegionAllSelected =
        activeRegion != null
        && activeRegion.communes.length > 0
        && activeRegion.communes.every((c) => selectedSet.has(c.name));

    const communeCount = activeRegion?.communes.length ?? 0;
    const communeGridScrolls = communeCount > COMMUNE_SCROLL_THRESHOLD;

    return (
        <>
            <div className="grid gap-3" role="group" aria-label="Zonas de trabajo">
                <button
                    type="button"
                    onClick={openModal}
                    disabled={disabled}
                    className="group w-full rounded-card border border-border bg-surface p-4 text-left shadow-sm transition-[border-color,box-shadow] hover:border-(--accent-border) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <div className="flex items-start gap-3">
                        <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <IconMapPin size={22} stroke={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-fg">
                                    {value.length === 0 ? 'Elegir comunas' : 'Editar comunas'}
                                </span>
                                <IconChevronRight
                                    size={18}
                                    className="shrink-0 text-fg-muted transition group-hover:translate-x-0.5"
                                    aria-hidden
                                />
                            </span>
                            <span className="mt-0.5 block text-xs text-fg-muted">
                                {value.length === 0
                                    ? 'Toca para abrir el mapa de cobertura'
                                    : `${value.length} comuna${value.length === 1 ? '' : 's'} activa${value.length === 1 ? '' : 's'}`}
                            </span>
                        </span>
                    </div>
                </button>

                {value.length > 0 ? (
                    <div className="flex flex-wrap gap-2" aria-label="Comunas seleccionadas">
                        {visibleChips.map((communeName) => (
                            <span
                                key={communeName}
                                className="inline-flex items-center gap-1 rounded-full border border-(--accent-border) bg-(--accent-soft) px-2.5 py-1 text-xs font-medium text-(--accent)"
                            >
                                <IconMapPin size={12} aria-hidden />
                                {communeName}
                            </span>
                        ))}
                        {hiddenChipCount > 0 ? (
                            <button
                                type="button"
                                onClick={openModal}
                                disabled={disabled}
                                className="inline-flex items-center rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg disabled:opacity-50"
                            >
                                +{hiddenChipCount} más
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <p className="text-xs text-fg-muted">
                    Define tu cobertura para el marketplace. Puedes elegir comunas sueltas o marcar una región completa.
                </p>
            </div>

            {open ? (
                <PanelSheet
                    onClose={() => setOpen(false)}
                    ariaLabel="Seleccionar zonas de trabajo"
                    maxWidthClass="sm:max-w-5xl"
                    constrainHeight
                >
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0 space-y-3 p-4 pb-0 sm:space-y-4 sm:p-6 sm:pb-0">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold text-fg sm:text-lg">Zonas de trabajo</h2>
                                    <p className="mt-1 text-xs text-fg-muted sm:text-sm">
                                        Elige región y comunas. En regiones grandes usa la búsqueda.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl bg-bg-subtle p-2 text-fg-muted hover:text-fg"
                                    aria-label="Cerrar"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 sm:py-2.5">
                                <IconSearch size={17} className="shrink-0 text-fg-muted" aria-hidden />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar comuna o región…"
                                    className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
                                    aria-label="Buscar comunas"
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        className="rounded-lg p-1 text-fg-muted hover:bg-surface hover:text-fg"
                                        aria-label="Borrar búsqueda"
                                    >
                                        <IconX size={16} />
                                    </button>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                >
                                    {draft.length} seleccionada{draft.length === 1 ? '' : 's'}
                                </span>
                                {draft.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={clearDraft}
                                        className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                                    >
                                        Limpiar todo
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
                            {searchResults ? (
                                <div className="min-h-[min(44dvh,360px)] rounded-card border border-border bg-surface p-2.5 sm:min-h-[min(48vh,430px)] sm:p-3">
                                    {searchResults.length === 0 ? (
                                        <p className="p-2 text-sm text-fg-muted">Sin resultados para tu búsqueda.</p>
                                    ) : (
                                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {searchResults.map((item) => {
                                                const selected = selectedSet.has(item.communeName);
                                                return (
                                                    <li key={item.communeId}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCommune(item.communeName)}
                                                            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                                                selected
                                                                    ? 'border-(--accent-border) bg-(--accent-soft) text-(--accent)'
                                                                    : 'border-border bg-bg-subtle text-fg hover:border-(--accent-border)'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                                                                    selected
                                                                        ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)'
                                                                        : 'border-border bg-surface'
                                                                }`}
                                                            >
                                                                {selected ? <IconCheck size={12} stroke={3} /> : null}
                                                            </span>
                                                            <span className="min-w-0">
                                                                <span className="block truncate font-medium">{item.communeName}</span>
                                                                <span className="block truncate text-xs opacity-80">{item.regionName}</span>
                                                            </span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    <div>
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                                            Región
                                        </p>
                                        <div className="sm:hidden">
                                            <FieldSelect
                                                value={activeRegionId}
                                                onChange={(event) => setActiveRegionId(event.target.value)}
                                                options={regionOptions}
                                                className="w-full"
                                                aria-label="Seleccionar región"
                                            />
                                        </div>
                                        <div className="hidden sm:grid sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-4 xl:grid-cols-4">
                                            {regionStats.map(({ region, selectedCount }) => (
                                                <RegionChip
                                                    key={region.id}
                                                    label={region.name}
                                                    active={region.id === activeRegionId}
                                                    count={selectedCount}
                                                    onClick={() => setActiveRegionId(region.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {activeRegion ? (
                                        <div className="grid min-h-[min(44dvh,360px)] gap-3 rounded-card border border-border bg-surface p-3 sm:min-h-[min(48vh,430px)] sm:p-4">
                                            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-fg">{activeRegion.region.name}</p>
                                                    <p className="text-xs text-fg-muted">
                                                        {activeRegion.selectedCount} de {activeRegion.communes.length} comunas
                                                        {communeGridScrolls ? ' · desplázate en la lista' : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={toggleActiveRegion}
                                                    className={`w-full shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:w-auto sm:py-1.5 ${
                                                        activeRegionAllSelected
                                                            ? 'border-(--accent-border) bg-(--accent-soft) text-(--accent)'
                                                            : 'border-border bg-bg-subtle text-fg hover:border-(--accent-border)'
                                                    }`}
                                                >
                                                    {activeRegionAllSelected ? 'Quitar región' : 'Toda la región'}
                                                </button>
                                            </div>

                                            <ul
                                                className={`grid grid-cols-1 gap-1.5 md:grid-cols-3 xl:grid-cols-4 ${
                                                    communeGridScrolls
                                                        ? 'max-h-[min(32dvh,250px)] overflow-y-auto overscroll-contain pr-0.5 sm:max-h-[min(42vh,380px)]'
                                                        : ''
                                                }`}
                                            >
                                                {activeRegion.communes.map((commune) => {
                                                    const selected = selectedSet.has(commune.name);
                                                    return (
                                                        <li key={commune.id}>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCommune(commune.name)}
                                                                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition sm:py-1.5 ${
                                                                    selected
                                                                        ? 'border-(--accent-border) bg-(--accent-soft) font-medium text-(--accent)'
                                                                        : 'border-transparent bg-bg-subtle text-fg hover:border-border'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                                                        selected
                                                                            ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)'
                                                                            : 'border-border bg-surface'
                                                                    }`}
                                                                >
                                                                    {selected ? <IconCheck size={10} stroke={3} /> : null}
                                                                </span>
                                                                <span className="truncate">{commune.name}</span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface p-4 pt-3 sm:flex-row sm:justify-end sm:p-6">
                            <PanelButton variant="secondary" onClick={() => setOpen(false)}>
                                Cancelar
                            </PanelButton>
                            <PanelButton onClick={applyAndClose}>
                                Listo ({draft.length})
                            </PanelButton>
                        </div>
                    </div>
                </PanelSheet>
            ) : null}
        </>
    );
}
