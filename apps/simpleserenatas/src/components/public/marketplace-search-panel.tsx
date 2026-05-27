'use client';

import { useMemo, type FormEvent } from 'react';
import { IconCalendar, IconMapPin, IconMusic, IconSearch, IconShield } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { type MarketplaceSearchFilters, todayIsoDate } from '@/lib/marketplace-search';

const INLINE_SELECT_TRIGGER =
    '!h-auto !min-h-0 !border-0 !bg-transparent !shadow-none focus:!shadow-none focus:!border-transparent !px-0 text-sm font-semibold sm:text-base';

function regionIdFromName(name: string) {
    return LOCATION_REGIONS.find((region) => region.name === name)?.id ?? '';
}

export function MarketplaceSearchPanel({
    value,
    onChange,
    onSubmit,
    loading = false,
}: {
    value: MarketplaceSearchFilters;
    onChange: (next: MarketplaceSearchFilters) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    loading?: boolean;
}) {
    const regionId = regionIdFromName(value.region);
    const communes = regionId ? getCommunesForRegion(regionId) : [];
    const update = (patch: Partial<MarketplaceSearchFilters>) => onChange({ ...value, ...patch });

    const regionOptions = useMemo(
        () => [
            { value: '', label: 'Todas las regiones' },
            ...LOCATION_REGIONS.map((region) => ({ value: region.name, label: region.name })),
        ],
        [],
    );

    const communeOptions = useMemo(
        () => [
            { value: '', label: 'Todas' },
            ...communes.map((commune) => ({ value: commune.name, label: commune.name })),
        ],
        [communes],
    );

    return (
        <form className="rounded-card border border-border bg-surface p-3 shadow-xl sm:p-4" onSubmit={onSubmit}>
            <label className="mb-3 grid gap-1.5 rounded-button border border-border bg-bg-subtle px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                    <IconMusic size={15} />
                    Nombre del mariachi
                </span>
                <input
                    type="search"
                    value={value.q}
                    onChange={(event) => update({ q: event.target.value })}
                    placeholder="Ej. Los Charros, Mariachi Central…"
                    className="min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted sm:text-base"
                    autoComplete="off"
                />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="grid gap-1.5 rounded-button border border-border bg-bg-subtle px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconShield size={15} />
                        Región
                    </span>
                    <ModernSelect
                        value={value.region}
                        onChange={(nextRegion) => update({ region: nextRegion, comuna: '' })}
                        options={regionOptions}
                        triggerClassName={INLINE_SELECT_TRIGGER}
                        dropdownClassName="z-50"
                        ariaLabel="Región"
                    />
                </label>
                <label className="grid gap-1.5 rounded-button border border-border bg-bg-subtle px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconMapPin size={15} />
                        Comuna
                    </span>
                    <ModernSelect
                        value={value.comuna}
                        onChange={(comuna) => update({ comuna })}
                        options={communeOptions}
                        disabled={!regionId}
                        triggerClassName={INLINE_SELECT_TRIGGER}
                        dropdownClassName="z-50"
                        ariaLabel="Comuna"
                    />
                </label>
                <label className="grid gap-1.5 rounded-button border border-border bg-bg-subtle px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconCalendar size={15} />
                        Disponible el
                    </span>
                    <input
                        type="date"
                        min={todayIsoDate()}
                        value={value.date}
                        onChange={(event) => update({ date: event.target.value })}
                        className="form-input-inline text-sm sm:text-base"
                    />
                </label>
                <button
                    type="submit"
                    className="btn btn-primary h-full min-h-14 px-6 font-semibold sm:col-span-2 lg:col-span-1"
                    disabled={loading}
                >
                    <IconSearch size={19} />
                    {loading ? 'Buscando' : 'Buscar'}
                </button>
            </div>
        </form>
    );
}
