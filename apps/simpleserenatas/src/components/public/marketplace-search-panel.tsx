'use client';

import { useMemo, type FormEvent } from 'react';
import { IconCalendar, IconMapPin, IconMusic, IconSearch, IconShield } from '@tabler/icons-react';
import { ModernDateInput, ModernSelect } from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { type MarketplaceSearchFilters, todayIsoDate } from '@/lib/marketplace-search';

const CONTROL_CLASS = 'h-12 text-sm font-semibold sm:text-base';

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
        <form className="rounded-card border border-border bg-surface p-4 shadow-xl sm:p-5" onSubmit={onSubmit}>
            <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr_0.9fr_1fr_auto]">
                <label className="grid gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconMusic size={15} />
                        Nombre del mariachi
                    </span>
                    <input
                        type="search"
                        value={value.q}
                        onChange={(event) => update({ q: event.target.value })}
                        placeholder="Ej. Los Charros, Mariachi Central…"
                        className={`form-input min-w-0 ${CONTROL_CLASS}`}
                        autoComplete="off"
                    />
                </label>
                <label className="grid gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconShield size={15} />
                        Región
                    </span>
                    <ModernSelect
                        value={value.region}
                        onChange={(nextRegion) => update({ region: nextRegion, comuna: '' })}
                        options={regionOptions}
                        dropdownClassName="z-50"
                        ariaLabel="Región"
                        triggerClassName={CONTROL_CLASS}
                    />
                </label>
                <label className="grid gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconMapPin size={15} />
                        Comuna
                    </span>
                    <ModernSelect
                        value={value.comuna}
                        onChange={(comuna) => update({ comuna })}
                        options={communeOptions}
                        disabled={!regionId}
                        dropdownClassName="z-50"
                        ariaLabel="Comuna"
                        triggerClassName={CONTROL_CLASS}
                    />
                </label>
                <label className="grid gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <IconCalendar size={15} />
                        Fecha
                    </span>
                    <ModernDateInput
                        min={todayIsoDate()}
                        value={value.date}
                        onChange={(date) => update({ date })}
                        className={CONTROL_CLASS}
                        aria-label="Fecha de la serenata"
                    />
                </label>
                <button
                    type="submit"
                    className="btn btn-primary min-h-12 px-6 font-semibold sm:col-span-2 lg:col-span-1 lg:self-end"
                    disabled={loading}
                >
                    <IconSearch size={19} />
                    {loading ? 'Buscando' : 'Buscar'}
                </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                Si eliges una fecha, mostramos mariachis con servicios activos y al menos un horario posible ese día.
            </p>
        </form>
    );
}
