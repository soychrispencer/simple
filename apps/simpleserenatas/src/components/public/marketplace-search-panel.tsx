'use client';

import { useMemo, type FormEvent } from 'react';
import { IconMap2, IconMapPin, IconSearch, IconWorld, IconX } from '@tabler/icons-react';
import { ModernDateInput, ModernSelect } from '@simple/ui';
import {
    getCommunesForRegion,
    getCountryByCode,
    getLocalitiesForRegion,
    getRegionsForCountry,
    getSupportedCountries,
} from '@simple/utils';
import { type MarketplaceSearchFilters, todayIsoDate } from '@/lib/marketplace-search';

const CONTROL_CLASS = 'h-11 text-sm font-semibold';

function regionIdFromName(country: string, name: string) {
    return getRegionsForCountry(country).find((region) => region.name === name)?.id ?? '';
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
    const country = value.country || 'CL';
    const hasCatalog = getCountryByCode(country)?.hasFullCatalog ?? false;
    const regionId = regionIdFromName(country, value.region);
    const communes = hasCatalog && regionId ? getLocalitiesForRegion(country, regionId) : [];
    const update = (patch: Partial<MarketplaceSearchFilters>) => onChange({ ...value, ...patch });

    const countryOptions = useMemo(
        () => getSupportedCountries().map((item) => ({ value: item.code, label: item.name })),
        [],
    );

    const regionOptions = useMemo(
        () => [
            { value: '', label: 'Todas las regiones' },
            ...getRegionsForCountry(country).map((region) => ({ value: region.name, label: region.name })),
        ],
        [country],
    );

    const communeOptions = useMemo(
        () => [
            { value: '', label: 'Todas las comunas' },
            ...communes.map((commune) => ({ value: commune.name, label: commune.name })),
        ],
        [communes],
    );

    return (
        <form
            className="overflow-visible rounded-[22px] border"
            style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                boxShadow: '0 16px 46px rgba(0,0,0,0.12)',
            }}
            onSubmit={onSubmit}
        >
            <div className="space-y-3 p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
                    <label className="relative md:col-span-2 xl:col-span-3">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-fg-muted">
                            <IconSearch size={18} />
                        </span>
                        <input
                            type="search"
                            value={value.q}
                            onChange={(event) => update({ q: event.target.value })}
                            placeholder="Buscar mariachi o grupo"
                            className={`form-input min-w-0 pl-11 ${value.q ? 'pr-10' : ''} ${CONTROL_CLASS}`}
                            autoComplete="off"
                            aria-label="Buscar mariachi o grupo"
                        />
                        {value.q ? (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted transition hover:bg-muted hover:text-fg"
                                onClick={() => update({ q: '' })}
                                aria-label="Limpiar búsqueda"
                            >
                                <IconX size={16} />
                            </button>
                        ) : null}
                    </label>
                    <div className="min-w-0 xl:col-span-2">
                        <ModernSelect
                            value={country}
                            onChange={(nextCountry) => update({ country: nextCountry, region: '', comuna: '' })}
                            options={countryOptions}
                            dropdownClassName="z-50"
                            ariaLabel="País"
                            placeholder="País"
                            triggerClassName={CONTROL_CLASS}
                            leadingIcon={<IconWorld size={15} />}
                        />
                    </div>
                    <div className="min-w-0 xl:col-span-2">
                        <ModernSelect
                            value={value.region}
                            onChange={(nextRegion) => update({ region: nextRegion, comuna: '' })}
                            options={regionOptions}
                            disabled={!hasCatalog}
                            dropdownClassName="z-50"
                            ariaLabel="Región"
                            placeholder={hasCatalog ? 'Región' : 'Sin catálogo regional'}
                            triggerClassName={CONTROL_CLASS}
                            leadingIcon={<IconMap2 size={15} />}
                        />
                    </div>
                    <div className="min-w-0 xl:col-span-2">
                        <ModernSelect
                            value={value.comuna}
                            onChange={(comuna) => update({ comuna })}
                            options={communeOptions}
                            disabled={!hasCatalog || !regionId}
                            dropdownClassName="z-50"
                            ariaLabel="Comuna"
                            placeholder="Comuna"
                            triggerClassName={CONTROL_CLASS}
                            leadingIcon={<IconMapPin size={15} />}
                        />
                    </div>
                    <div className="min-w-0 xl:col-span-2">
                        <ModernDateInput
                            min={todayIsoDate()}
                            value={value.date}
                            onChange={(date) => update({ date })}
                            placeholder="Fecha opcional"
                            className={CONTROL_CLASS}
                            ariaLabel="Fecha opcional de la serenata"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary h-11 w-full justify-center px-5 text-sm font-semibold md:col-span-2 xl:col-span-1"
                        disabled={loading}
                    >
                        <IconSearch size={18} />
                        {loading ? 'Buscando' : 'Buscar'}
                    </button>
                </div>
                <p className="text-xs leading-relaxed text-fg-muted">
                    Elige país y ubicación para ver mariachis cerca. Con fecha, filtramos grupos con horarios posibles ese día.
                </p>
            </div>
        </form>
    );
}

