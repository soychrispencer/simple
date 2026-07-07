'use client';

import { useMemo, type FormEvent } from 'react';
import {
    IconDeviceLaptop,
    IconMap2,
    IconMapPin,
    IconSearch,
    IconWorld,
    IconX,
} from '@tabler/icons-react';
import { ModernSelect } from '../modern-select.js';
import { ModernDateInput } from '../modern-datetime-input.js';
import { PanelButton } from '../panel/panel-button.js';
import {
    getCountryByCode,
    getLocalitiesForRegion,
    getRegionsForCountry,
    getSupportedCountries,
} from '@simple/utils';
import type { OperatorSearchFieldId, OperatorSearchShellCopy, OperatorSearchShellValue } from './types.js';

const CONTROL_CLASS = 'h-11 text-sm font-semibold';

function regionIdFromName(country: string, name: string) {
    return getRegionsForCountry(country).find((region) => region.name === name)?.id ?? '';
}

function todayIsoDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export type OperatorSearchShellProps = {
    value: OperatorSearchShellValue;
    onChange: (next: OperatorSearchShellValue) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    fields: OperatorSearchFieldId[];
    copy: OperatorSearchShellCopy;
    loading?: boolean;
};

export function OperatorSearchShell({
    value,
    onChange,
    onSubmit,
    fields,
    copy,
    loading = false,
}: OperatorSearchShellProps) {
    const country = value.country || 'CL';
    const hasCatalog = getCountryByCode(country)?.hasFullCatalog ?? false;
    const regionId = regionIdFromName(country, value.region);
    const localities = hasCatalog && regionId ? getLocalitiesForRegion(country, regionId) : [];
    const update = (patch: Partial<OperatorSearchShellValue>) => onChange({ ...value, ...patch });

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

    const localityOptions = useMemo(
        () => [
            { value: '', label: copy.localityPlaceholder?.includes('ciudad') ? 'Todas' : 'Todas las comunas' },
            ...localities.map((item) => ({ value: item.name, label: item.name })),
        ],
        [localities, copy.localityPlaceholder],
    );

    const modalityOptions = useMemo(
        () => [
            { value: 'all', label: 'Todas' },
            { value: 'online', label: 'Online' },
            { value: 'presential', label: 'Presencial' },
        ],
        [],
    );

    const show = (field: OperatorSearchFieldId) => fields.includes(field);

    return (
        <form
            className="overflow-visible rounded-card border marketplace-search-hero border-border bg-surface"
            onSubmit={onSubmit}
        >
            <div className="space-y-3 p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
                    {show('q') ? (
                        <label className="relative md:col-span-2 xl:col-span-3">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-fg-muted">
                                <IconSearch size={18} />
                            </span>
                            <input
                                type="search"
                                value={value.q}
                                onChange={(event) => update({ q: event.target.value })}
                                placeholder={copy.queryPlaceholder}
                                className={`form-input min-w-0 pl-11 ${value.q ? 'pr-10' : ''} ${CONTROL_CLASS}`}
                                autoComplete="off"
                                aria-label={copy.queryAriaLabel}
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
                    ) : null}

                    {show('country') ? (
                        <div className="min-w-0 xl:col-span-2">
                            <ModernSelect
                                value={country}
                                onChange={(nextCountry) => update({ country: nextCountry, region: '', locality: '' })}
                                options={countryOptions}
                                dropdownClassName="z-50"
                                ariaLabel="País"
                                placeholder="País"
                                triggerClassName={CONTROL_CLASS}
                                leadingIcon={<IconWorld size={15} />}
                            />
                        </div>
                    ) : null}

                    {show('profession') ? (
                        <label className="min-w-0 text-sm xl:col-span-2">
                            <input
                                className={`form-input w-full ${CONTROL_CLASS}`}
                                value={value.profession ?? ''}
                                onChange={(event) => update({ profession: event.target.value })}
                                placeholder={copy.professionPlaceholder ?? 'Rubro'}
                                aria-label="Rubro"
                            />
                        </label>
                    ) : null}

                    {show('region') ? (
                        <div className="min-w-0 xl:col-span-2">
                            <ModernSelect
                                value={value.region}
                                onChange={(nextRegion) => update({ region: nextRegion, locality: '' })}
                                options={regionOptions}
                                disabled={!hasCatalog}
                                dropdownClassName="z-50"
                                ariaLabel="Región"
                                placeholder={hasCatalog ? 'Región' : 'Sin catálogo regional'}
                                triggerClassName={CONTROL_CLASS}
                                leadingIcon={<IconMap2 size={15} />}
                            />
                        </div>
                    ) : null}

                    {show('locality') ? (
                        <div className="min-w-0 xl:col-span-2">
                            <ModernSelect
                                value={value.locality}
                                onChange={(locality) => update({ locality })}
                                options={localityOptions}
                                disabled={!hasCatalog || !regionId}
                                dropdownClassName="z-50"
                                ariaLabel="Comuna o ciudad"
                                placeholder={copy.localityPlaceholder ?? 'Comuna'}
                                triggerClassName={CONTROL_CLASS}
                                leadingIcon={<IconMapPin size={15} />}
                            />
                        </div>
                    ) : null}

                    {show('modality') ? (
                        <div className="min-w-0 xl:col-span-2">
                            <ModernSelect
                                value={value.modality ?? 'all'}
                                onChange={(modality) => update({ modality: modality as OperatorSearchShellValue['modality'] })}
                                options={modalityOptions}
                                dropdownClassName="z-50"
                                ariaLabel="Modalidad"
                                placeholder="Modalidad"
                                triggerClassName={CONTROL_CLASS}
                                leadingIcon={<IconDeviceLaptop size={15} />}
                            />
                        </div>
                    ) : null}

                    {show('date') ? (
                        <div className="min-w-0 xl:col-span-2">
                            <ModernDateInput
                                min={todayIsoDate()}
                                value={value.date ?? ''}
                                onChange={(date) => update({ date })}
                                placeholder="Fecha opcional"
                                className={CONTROL_CLASS}
                                ariaLabel="Fecha opcional"
                            />
                        </div>
                    ) : null}

                    <PanelButton
                        type="submit"
                        variant="accent"
                        className="h-11 w-full justify-center px-5 md:col-span-2 xl:col-span-1"
                        disabled={loading}
                        loading={loading}
                    >
                        <IconSearch size={18} />
                        {loading ? 'Buscando' : (copy.submitLabel ?? 'Buscar')}
                    </PanelButton>
                </div>
                {copy.footerHint ? (
                    <p className="text-xs leading-relaxed text-fg-muted">{copy.footerHint}</p>
                ) : null}
            </div>
        </form>
    );
}
