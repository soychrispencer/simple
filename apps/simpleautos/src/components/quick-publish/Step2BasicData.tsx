'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    IconCar, IconMotorbike, IconTruck, IconBus, IconTractor, IconAnchor, IconPlane,
    IconTag, IconKey, IconHammer, IconMapPin, IconChevronRight,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';
import { ModernSelect } from '@simple/ui';
import {
    type PublishWizardCatalog,
    getBrandsForVehicleType,
    getModelsForBrand,
    getVersionsForModel,
    loadPublishWizardCatalog,
    type VehicleCatalogType,
} from '@/lib/publish-wizard-catalog';
import { ColorPicker } from '@/components/ui/color-picker';
import { fetchAddressBook, LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import type { ListingLocation, AddressBookEntry } from '@simple/types';
import { createEmptyListingLocation } from '@simple/types';
import type { QuickBasicData, QuickListingType } from './types';
import { formatPrice } from '@/hooks/useQuickPublish';

const LISTING_TYPE_OPTIONS: { value: QuickListingType; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { value: 'sale', label: 'Venta', Icon: IconTag },
    { value: 'rent', label: 'Arriendo', Icon: IconKey },
    { value: 'auction', label: 'Subasta', Icon: IconHammer },
];

// Visible categories (3 main ones for mobile-first)
const VISIBLE_VEHICLE_TYPES: { value: VehicleCatalogType; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { value: 'car', label: 'Auto / SUV', Icon: IconCar },
    { value: 'motorcycle', label: 'Moto', Icon: IconMotorbike },
    { value: 'truck', label: 'Camión', Icon: IconTruck },
];

// Additional categories in "Más" dropdown
const MORE_VEHICLE_TYPES: { value: VehicleCatalogType; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { value: 'bus', label: 'Bus', Icon: IconBus },
    { value: 'machinery', label: 'Maquinaria', Icon: IconTractor },
    { value: 'nautical', label: 'Náutico', Icon: IconAnchor },
    { value: 'aerial', label: 'Aéreo', Icon: IconPlane },
];

// Combined for reference
const ALL_VEHICLE_TYPES = [...VISIBLE_VEHICLE_TYPES, ...MORE_VEHICLE_TYPES];

// Fuel options: 3 main + more dropdown
const VISIBLE_FUEL_OPTIONS = ['Bencina', 'Diésel', 'Eléctrico'];
const MORE_FUEL_OPTIONS = ['Híbrido', 'Gas', 'GLP', 'Otro'];
const ALL_FUEL_OPTIONS = [...VISIBLE_FUEL_OPTIONS, ...MORE_FUEL_OPTIONS];

const CONDITION_OPTIONS = ['Nuevo', 'Seminuevo', 'Usado'];
const BODY_TYPE_OPTIONS = ['Sedán', 'SUV', 'Hatchback', 'Pickup', 'Station Wagon', 'Coupé', 'Crossover', 'Van'];
const TRANSMISSION_OPTIONS = ['Manual', 'Automática', 'CVT'];
const TRACTION_OPTIONS = ['FWD', 'RWD', 'AWD', '4WD'];

const SMART_DEFAULTS: Partial<FormState> = {
    condition: 'Seminuevo',
    fuelType: 'Bencina',
    transmission: 'Manual',
    bodyType: 'Sedán',
};

type FormState = QuickBasicData & {
    customBrand: string;
    customModel: string;
    customVersion: string;
    regionId: string;
    communeId: string;
    selectedAddressId: string;
};

function buildFormState(initial: QuickBasicData | null): FormState {
    const base: FormState = {
        listingType: 'sale',
        vehicleType: 'car',
        brandId: '',
        customBrand: '',
        modelId: '',
        customModel: '',
        year: '',
        version: '',
        customVersion: '',
        mileage: '',
        transmission: SMART_DEFAULTS.transmission ?? '',
        color: '',
        bodyType: SMART_DEFAULTS.bodyType ?? '',
        fuelType: SMART_DEFAULTS.fuelType ?? '',
        condition: SMART_DEFAULTS.condition ?? '',
        traction: '',
        ownerCount: '',
        engineSize: '',
        doors: '',
        passengers: '',
        steeringWheel: '',
        price: '',
        offerPrice: '',
        offerPriceMode: '$',
        negotiable: true,
        financingAvailable: false,
        exchangeAvailable: false,
        currency: 'CLP',
        rentDaily: '',
        rentWeekly: '',
        rentMonthly: '',
        rentMinDays: '',
        rentDeposit: '',
        rentAvailableFrom: '',
        rentAvailableTo: '',
        auctionStartPrice: '',
        auctionReservePrice: '',
        auctionMinIncrement: '',
        auctionStartAt: '',
        auctionEndAt: '',
        regionId: '',
        communeId: '',
        selectedAddressId: '',
    };
    if (!initial) return base;
    return {
        ...base,
        ...initial,
        customBrand: (initial as FormState).customBrand ?? '',
        customModel: (initial as FormState).customModel ?? '',
        customVersion: (initial as FormState).customVersion ?? '',
        mileage: initial.mileage?.replace(/\D/g, '') ?? '',
        regionId: (initial as any).regionId ?? '',
        communeId: (initial as any).communeId ?? '',
        selectedAddressId: (initial as any).selectedAddressId ?? '',
    };
}

function getOutputData(form: FormState, catalog: PublishWizardCatalog | null): QuickBasicData {
    const brandName = catalog?.brands.find((b) => b.id === form.brandId)?.name;
    const modelName = catalog?.models.find((m) => m.id === form.modelId)?.name;
    const resolvedVersion =
        form.brandId === '__custom__' || form.modelId === '__custom__' || form.version === '__custom__'
            ? form.customVersion
            : form.version;
    const region = LOCATION_REGIONS.find((r) => r.id === form.regionId);
    const commune = getCommunesForRegion(form.regionId).find((c) => c.id === form.communeId);
    const loc = form.regionId && form.communeId
        ? createEmptyListingLocation({
            sourceMode: 'area_only',
            sourceAddressId: form.selectedAddressId === '__manual__' ? null : (form.selectedAddressId || null),
            regionId: form.regionId,
            regionName: region?.name ?? null,
            communeId: form.communeId,
            communeName: commune?.name ?? null,
            visibilityMode: 'commune_only',
            publicLabel: [commune?.name, region?.name].filter(Boolean).join(', '),
        })
        : null;
    const { regionId, communeId, selectedAddressId, ...rest } = form;
    void regionId; void communeId; void selectedAddressId;
    return {
        ...rest,
        version: resolvedVersion,
        brandName,
        modelName,
        location: loc,
    };
}

interface Props {
    initialData: QuickBasicData | null;
    onChange?: (data: QuickBasicData) => void;
    onSubmit?: (data: QuickBasicData) => void;
    onBack?: () => void;
    isExtended?: boolean;
}

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1.5 text-(--fg-secondary)">
                {label}{required && <abbr title="requerido" style={{ color: 'var(--color-error, #ef4444)', textDecoration: 'none' }}> *</abbr>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>{error}</p>}
        </div>
    );
}

/** Segmented control — best for 2-4 options. Mobile: full width row, Desktop: same. */
function SegmentedControl({ label, options, value, onChange }: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <p className="block text-sm font-medium mb-1.5 text-(--fg-secondary)">{label}</p>
            <div className="flex rounded-xl border border-(--border) bg-(--bg-subtle) p-1 gap-1">
                {options.map((opt) => {
                    const active = value === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={`flex-1 min-w-0 rounded-lg py-2.5 px-1 text-sm font-medium transition-all duration-200 cursor-pointer ${
                                active
                                    ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-color)] shadow-sm'
                                    : 'text-(--fg-secondary) hover:text-(--fg) hover:bg-(--bg-hover)'
                            }`}
                        >
                            <span className="truncate block">{opt}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Option grid — best for 4+ options. Mobile 2-col, desktop auto-dense. */
function OptionGrid({ label, options, value, onChange }: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <p className="block text-sm font-medium mb-1.5 text-(--fg-secondary)">{label}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {options.map((opt) => {
                    const active = value === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={`relative rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 text-center cursor-pointer ${
                                active
                                    ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-color)] border-[var(--button-primary-bg)] shadow-sm'
                                    : 'bg-(--bg-subtle) text-(--fg-secondary) border-(--border) hover:border-(--fg-muted) hover:text-(--fg)'
                            }`}
                        >
                            {opt}
                            {active && (
                                <span className="absolute top-1 right-1.5 text-[10px] leading-none opacity-80">✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Fuel selector with 3+Más pattern
function FuelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [showMore, setShowMore] = useState(false);
    const isMoreSelected = MORE_FUEL_OPTIONS.includes(value);

    return (
        <div>
            <p className="type-overline mb-2 text-(--fg-muted)">Combustible</p>
            <div className="grid grid-cols-4 rounded-(--radius) border border-(--border) bg-(--bg-subtle) p-0.5 gap-0.5">
                {/* 3 main options */}
                {VISIBLE_FUEL_OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={`flex items-center justify-center rounded-lg py-2.5 text-xs font-medium transition-all ${
                            value === option
                                ? 'bg-(--button-primary-bg) text-(--button-primary-color) shadow-sm'
                                : 'text-(--fg-secondary) hover:text-(--fg)'
                        }`}
                    >
                        {option}
                    </button>
                ))}
                {/* "Más" dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowMore(!showMore)}
                        className={`w-full h-full flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs font-medium transition-all ${
                            isMoreSelected
                                ? 'bg-(--button-primary-bg) text-(--button-primary-color) shadow-sm'
                                : 'text-(--fg-secondary) hover:text-(--fg)'
                        }`}
                    >
                        <span className="text-lg leading-none">+</span>
                        <span className="text-[10px]">
                            {isMoreSelected ? value : 'Más'}
                        </span>
                    </button>
                    {showMore && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                            <div className="absolute right-0 top-full mt-1 w-28 rounded-lg border border-(--border) bg-(--bg) shadow-lg z-50 overflow-hidden">
                                {MORE_FUEL_OPTIONS.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            onChange(option);
                                            setShowMore(false);
                                        }}
                                        className={`w-full px-3 py-2 text-xs font-medium transition-colors text-left ${
                                            value === option
                                                ? 'bg-(--button-primary-bg) text-(--button-primary-color)'
                                                : 'text-(--fg-secondary) hover:bg-(--bg-subtle)'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Step2BasicData({ initialData, onChange, onSubmit, onBack, isExtended = false }: Props) {
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [versions, setVersions] = useState<Array<{ id: string; name: string }>>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState<FormState>(() => buildFormState(initialData));
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [showMoreVehicleTypes, setShowMoreVehicleTypes] = useState(false);
    const pendingRef = useRef<QuickBasicData | null>(null);

    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog).catch(() => null);
    }, []);

    useEffect(() => {
        setVersions([]);
        if (!catalog || !form.brandId || form.brandId === '__custom__' || !form.modelId || form.modelId === '__custom__') return;
        const catalogVersions = getVersionsForModel(catalog, form.modelId, form.vehicleType);
        setVersions(catalogVersions.map((v) => ({ id: v.id, name: v.name })));
    }, [catalog, form.brandId, form.modelId, form.vehicleType]);

    useEffect(() => {
        fetchAddressBook().then((r) => {
            const items = r.items ?? [];
            setAddressBook(items);
            if (!form.regionId && !form.communeId) {
                const def = items.find((a) => a.isDefault) ?? items[0] ?? null;
                if (def) {
                    setForm((f) => ({
                        ...f,
                        selectedAddressId: def.id,
                        regionId: def.regionId ?? '',
                        communeId: def.communeId ?? '',
                    }));
                }
            }
        }).catch(() => null);
    }, []);

    const prevVehicleTypeRef = useRef(form.vehicleType);
    useEffect(() => {
        const prev = prevVehicleTypeRef.current;
        prevVehicleTypeRef.current = form.vehicleType;
        if (prev === form.vehicleType) return;
        setForm((f) => ({ ...f, brandId: '', modelId: '', version: '', customBrand: '', customModel: '' }));
    }, [form.vehicleType]);

    useEffect(() => {
        if (!pendingRef.current || !onChange) return;
        onChange(pendingRef.current);
        pendingRef.current = null;
    });

    const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            if (onChange) pendingRef.current = getOutputData(next, catalog);
            return next;
        });
        setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }, [catalog, onChange]);

    const brands = catalog ? getBrandsForVehicleType(catalog, form.vehicleType) : [];
    const models = catalog && form.brandId && form.brandId !== '__custom__'
        ? getModelsForBrand(catalog, form.brandId, form.vehicleType) : [];

    function handleSelectAddress(addrId: string) {
        if (addrId === '__manual__') {
            setForm((f) => ({ ...f, selectedAddressId: addrId, regionId: '', communeId: '' }));
            return;
        }
        const addr = addressBook.find((a) => a.id === addrId);
        if (addr) {
            setForm((f) => ({ ...f, selectedAddressId: addrId, regionId: addr.regionId ?? '', communeId: addr.communeId ?? '' }));
        }
    }

    function validate() {
        const next: Record<string, string> = {};
        if (!(form.brandId === '__custom__' ? form.customBrand.trim() : form.brandId)) next.brandId = 'Selecciona marca';
        if (!(form.modelId === '__custom__' ? form.customModel.trim() : form.modelId)) next.modelId = 'Selecciona modelo';
        if (!form.year || form.year.length !== 4) next.year = 'Año inválido';
        if (form.listingType === 'sale' && !form.price.trim()) next.price = 'Ingresa el precio';
        if (form.listingType === 'rent' && !(form.rentMonthly ?? '').trim()) next.rentMonthly = 'Ingresa precio mensual';
        if (form.listingType === 'auction' && !(form.auctionStartPrice ?? '').trim()) next.auctionStartPrice = 'Ingresa precio base';
        if (!form.regionId || !form.communeId) next.location = 'Selecciona región y comuna';
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    const isMotor = ['car', 'motorcycle', 'truck', 'bus'].includes(form.vehicleType);
    const showVersion = form.vehicleType === 'car' || form.vehicleType === 'motorcycle';
    const showKm = isMotor && form.listingType !== 'rent';
    const showBodyType = form.vehicleType === 'car';
    const showFuel = isMotor || form.vehicleType === 'machinery';
    const showTransmission = isMotor;

    return (
        <div className="flex flex-col gap-6">

            {/* Tipo + Categoría */}
            <div className="flex flex-col gap-4">
                <div>
                    <p className="type-overline mb-2 text-(--fg-muted)">Tipo de publicación</p>
                    <div className="flex rounded-(--radius) border border-(--border) bg-(--bg-subtle) p-0.5 gap-0.5">
                        {LISTING_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => set('listingType', value)}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                                    form.listingType === value
                                        ? 'bg-(--button-primary-bg) text-(--button-primary-color) shadow-sm'
                                        : 'text-(--fg-secondary) hover:text-(--fg)'
                                }`}
                            >
                                <Icon size={13} strokeWidth={1.8} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="type-overline mb-2 text-(--fg-muted)">Categoría</p>
                    <div className="grid grid-cols-4 rounded-(--radius) border border-(--border) bg-(--bg-subtle) p-0.5 gap-0.5">
                        {/* 3 main categories */}
                        {VISIBLE_VEHICLE_TYPES.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => set('vehicleType', value)}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
                                    form.vehicleType === value
                                        ? 'bg-(--button-primary-bg) text-(--button-primary-color) shadow-sm'
                                        : 'text-(--fg-secondary) hover:text-(--fg)'
                                }`}
                            >
                                <Icon size={14} strokeWidth={1.8} />
                                {label}
                            </button>
                        ))}
                        {/* "Más" dropdown trigger */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowMoreVehicleTypes(!showMoreVehicleTypes)}
                                className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
                                    MORE_VEHICLE_TYPES.some(t => t.value === form.vehicleType)
                                        ? 'bg-(--button-primary-bg) text-(--button-primary-color) shadow-sm'
                                        : 'text-(--fg-secondary) hover:text-(--fg)'
                                }`}
                            >
                                <span className="text-lg leading-none">+</span>
                                <span className="text-[10px]">
                                    {MORE_VEHICLE_TYPES.find(t => t.value === form.vehicleType)?.label || 'Más'}
                                </span>
                            </button>
                            {/* Dropdown with more options */}
                            {showMoreVehicleTypes && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowMoreVehicleTypes(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-(--border) bg-(--bg) shadow-lg z-50 overflow-hidden">
                                        {MORE_VEHICLE_TYPES.map(({ value, label, Icon }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    set('vehicleType', value);
                                                    setShowMoreVehicleTypes(false);
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                                                    form.vehicleType === value
                                                        ? 'bg-(--button-primary-bg) text-(--button-primary-color)'
                                                        : 'text-(--fg-secondary) hover:bg-(--bg-subtle)'
                                                }`}
                                            >
                                                <Icon size={14} strokeWidth={1.8} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-(--border)" />

            {/* Condición - justo después de categoría */}
            <SegmentedControl
                label="Condición"
                options={CONDITION_OPTIONS}
                value={form.condition}
                onChange={(v: string) => set('condition', v)}
            />

            <div className="border-t border-(--border)" />

            {/* Marca / Modelo */}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Marca" required error={errors.brandId}>
                    <ModernSelect
                        value={form.brandId}
                        onChange={(v) => { set('brandId', v); set('modelId', ''); set('version', ''); }}
                        options={[...brands.map((b) => ({ value: b.id, label: b.name })), { value: '__custom__', label: 'Otra…' }]}
                        placeholder="Seleccionar"
                    />
                </Field>
                {form.brandId === '__custom__' && (
                    <input className="form-input mt-8" placeholder="Marca" value={form.customBrand} onChange={(e) => set('customBrand', e.target.value)} />
                )}
                <Field label="Modelo" required error={errors.modelId}>
                    <ModernSelect
                        value={form.modelId}
                        onChange={(v) => { set('modelId', v); set('version', ''); }}
                        disabled={!form.brandId}
                        options={[
                            ...models.map((m) => ({ value: m.id, label: m.name })),
                            ...(form.brandId && form.brandId !== '__custom__' ? [{ value: '__custom__', label: 'Otro…' }] : []),
                        ]}
                        placeholder={form.brandId ? 'Seleccionar' : 'Primero marca'}
                    />
                </Field>
                {form.modelId === '__custom__' && (
                    <input className="form-input mt-8" placeholder="Modelo" value={form.customModel} onChange={(e) => set('customModel', e.target.value)} />
                )}
            </div>

            {/* Año / Versión */}
            <div className={`grid gap-3 ${showVersion ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Field label="Año" required error={errors.year}>
                    <input
                        className="form-input"
                        placeholder="2020"
                        inputMode="numeric"
                        maxLength={4}
                        value={form.year}
                        onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                </Field>
                {showVersion && (
                    <Field label="Versión">
                        {(form.brandId === '__custom__' || form.modelId === '__custom__') ? (
                            <input className="form-input" placeholder="XEi 2.0 AT" value={form.customVersion} onChange={(e) => set('customVersion', e.target.value)} />
                        ) : (
                            <>
                                <ModernSelect
                                    value={form.version}
                                    onChange={(v) => { set('version', v); if (v !== '__custom__') set('customVersion', ''); }}
                                    disabled={!form.modelId || !form.year}
                                    options={[
                                        ...versions
                                            .filter((v, i, arr) => arr.findIndex((x) => x.name === v.name) === i)
                                            .map((v) => ({ value: v.name, label: v.name })),
                                        ...(form.modelId && form.year && isExtended ? [{ value: '__custom__', label: 'Escribir versión…' }] : []),
                                    ]}
                                    placeholder={!form.year ? 'Selecciona el año' : 'Sin especificar'}
                                />
                                {form.version === '__custom__' && (
                                    <input className="form-input mt-2" placeholder="Ej: XEi 2.0 AT, SE-G CVT…"
                                        value={form.customVersion}
                                        onChange={(e) => set('customVersion', e.target.value)} />
                                )}
                            </>
                        )}
                    </Field>
                )}
            </div>

            {/* Km / Color */}
            <div className={`grid gap-3 ${showKm ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {showKm && (
                    <Field label="Kilometraje">
                        <input className="form-input" placeholder="150.000" inputMode="numeric"
                            value={form.mileage ? Number(form.mileage).toLocaleString('es-CL') : ''}
                            onChange={(e) => set('mileage', e.target.value.replace(/\D/g, ''))} />
                    </Field>
                )}
                <Field label="Color">
                    <ColorPicker value={form.color} onChange={(c) => set('color', c)} />
                </Field>
            </div>

            {/* Especificaciones técnicas — reordenado: Carrocería > Transmisión > Combustible */}
            <div className="flex flex-col gap-5">
                {/* Carrocería (antes que transmisión) */}
                {showBodyType && (
                    <Field label="Carrocería">
                        <ModernSelect
                            value={form.bodyType}
                            onChange={(v: string) => set('bodyType', v)}
                            options={BODY_TYPE_OPTIONS.map((b) => ({ value: b, label: b }))}
                            placeholder="Seleccionar"
                        />
                    </Field>
                )}

                {/* Transmisión y Combustible (3 + Más) */}
                <div className={`grid gap-4 ${showTransmission && showFuel ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    {showTransmission && (
                        <SegmentedControl
                            label="Transmisión"
                            options={TRANSMISSION_OPTIONS}
                            value={form.transmission}
                            onChange={(v: string) => set('transmission', v)}
                        />
                    )}
                    {showFuel && (
                        <FuelSelector
                            value={form.fuelType}
                            onChange={(v: string) => set('fuelType', v)}
                        />
                    )}
                </div>
            </div>

            {isExtended && (
                <div className="flex flex-col gap-4 border-t border-(--border) pt-4">
                    <div className={`grid gap-3 ${showTransmission || showFuel ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {showTransmission && (
                            <Field label="Transmisión">
                                <ModernSelect
                                    value={form.transmission}
                                    onChange={(v) => set('transmission', v)}
                                    options={TRANSMISSION_OPTIONS.map((t) => ({ value: t, label: t }))}
                                    placeholder="Seleccionar"
                                />
                            </Field>
                        )}
                        {showFuel && (
                            <Field label="Combustible">
                                <ModernSelect
                                    value={form.fuelType}
                                    onChange={(v) => set('fuelType', v)}
                                    options={ALL_FUEL_OPTIONS.map((f: string) => ({ value: f, label: f }))}
                                    placeholder="Seleccionar"
                                />
                            </Field>
                        )}
                    </div>
                    <div className={`grid gap-3 ${showBodyType ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <Field label="Estado">
                            <ModernSelect
                                value={form.condition}
                                onChange={(v) => set('condition', v)}
                                options={CONDITION_OPTIONS.map((c) => ({ value: c, label: c }))}
                                placeholder="Seleccionar"
                            />
                        </Field>
                        {showBodyType && (
                            <Field label="Carrocería">
                                <ModernSelect
                                    value={form.bodyType}
                                    onChange={(v) => set('bodyType', v)}
                                    options={BODY_TYPE_OPTIONS.map((b) => ({ value: b, label: b }))}
                                    placeholder="Seleccionar"
                                />
                            </Field>
                        )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {isMotor && (
                            <Field label="Tracción">
                                <ModernSelect
                                    value={form.traction}
                                    onChange={(v) => set('traction', v)}
                                    options={TRACTION_OPTIONS.map((t) => ({ value: t, label: t }))}
                                    placeholder="Seleccionar"
                                />
                            </Field>
                        )}
                        <Field label="N° de dueños">
                            <ModernSelect
                                value={form.ownerCount}
                                onChange={(v) => set('ownerCount', v)}
                                options={['1° dueño', '2° dueño', '3° dueño o más'].map((o) => ({ value: o, label: o }))}
                                placeholder="Seleccionar"
                            />
                        </Field>
                        <Field label="Cilindrada (cc o L)">
                            <input className="form-input" placeholder="Ej: 2.0"
                                value={form.engineSize}
                                onChange={(e) => set('engineSize', e.target.value)} />
                        </Field>
                        <Field label="Pasajeros">
                            <ModernSelect
                                value={form.passengers ?? ''}
                                onChange={(v) => set('passengers', v)}
                                options={['2', '4', '5', '7', '9', 'Más'].map((o) => ({ value: o, label: o }))}
                                placeholder="Seleccionar"
                            />
                        </Field>
                        <Field label="Puertas">
                            <ModernSelect
                                value={form.doors ?? ''}
                                onChange={(v) => set('doors', v)}
                                options={['2', '3', '4', '5'].map((o) => ({ value: o, label: o }))}
                                placeholder="Seleccionar"
                            />
                        </Field>
                        <Field label="Posición Volante">
                            <ModernSelect
                                value={form.steeringWheel ?? ''}
                                onChange={(v) => set('steeringWheel', v)}
                                options={[{ value: 'left', label: 'Izquierda (Original)' }, { value: 'right', label: 'Derecha (Cambiado)' }]}
                                placeholder="Seleccionar"
                            />
                        </Field>
                    </div>
                </div>
            )}

            <div className="border-t border-(--border)" />

            {/* Precio */}
            <div className="flex flex-col gap-3">
                <p className="type-overline text-(--fg-muted)">Precio</p>
                {form.listingType === 'sale' && (
                    <>
                        <Field label="Precio de venta" required error={errors.price}>
                            <div className="relative flex items-center h-10.5 rounded-[var(--radius)] border bg-[var(--bg-subtle)] overflow-hidden"
                                 style={{ borderColor: errors.price ? 'var(--color-error, #ef4444)' : 'var(--border)' }}>
                                <span className="pl-3 pr-1 text-sm font-medium text-[var(--fg-muted)]">$</span>
                                <input className="flex-1 bg-transparent border-none outline-none h-full text-sm pr-2"
                                    placeholder="18.990.000" inputMode="numeric"
                                    value={form.price.replace(/^\$\s*/, '')}
                                    onChange={(e) => set('price', formatPrice(e.target.value))} />
                            </div>
                        </Field>

                        {/* Precio oferta con descuento $ o % */}
                        <Field label="Precio oferta (opcional)">
                            <div className="flex items-center gap-1.5 h-10.5">
                                <div className="flex-1 flex items-center h-full rounded-[var(--radius)] border bg-[var(--bg-subtle)] focus-within:border-[var(--accent-border)] transition-colors overflow-hidden"
                                     style={{ borderColor: 'var(--border)' }}>
                                    <input className="flex-1 bg-transparent border-none outline-none h-full text-sm px-3"
                                        placeholder={form.offerPriceMode === '%' ? '10' : 'Ej: 16.990.000'} inputMode="numeric"
                                        value={form.offerPriceMode === '%' ? form.offerPrice : form.offerPrice.replace(/^\$\s*/, '')}
                                        onChange={(e) => {
                                            if (form.offerPriceMode === '%') set('offerPrice', e.target.value.replace(/\D/g, '').slice(0, 2));
                                            else set('offerPrice', formatPrice(e.target.value));
                                        }} />
                                </div>
                                <div className="w-18 shrink-0">
                                    <ModernSelect
                                        value={form.offerPriceMode}
                                        onChange={(v) => { set('offerPriceMode', v as '$' | '%'); set('offerPrice', ''); }}
                                        options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]}
                                    />
                                </div>
                            </div>
                        </Field>

                        {/* Preview de precio final con descuento */}
                        {(() => {
                            const mainPrice = parseInt(form.price.replace(/\D/g, '') || '0', 10);
                            if (!mainPrice || !form.offerPrice) return null;
                            let finalPrice: number | null = null;
                            let discountPct: number | null = null;
                            if (form.offerPriceMode === '%') {
                                const pct = parseInt(form.offerPrice, 10);
                                if (pct > 0 && pct < 100) {
                                    finalPrice = Math.round(mainPrice * (1 - pct / 100));
                                    discountPct = pct;
                                }
                            } else {
                                const op = parseInt(form.offerPrice.replace(/\D/g, '') || '0', 10);
                                if (op > 0 && op < mainPrice) {
                                    finalPrice = op;
                                    discountPct = Math.round((1 - op / mainPrice) * 100);
                                }
                            }
                            if (finalPrice === null) return null;
                            return (
                                <div className="flex items-center justify-center gap-3 rounded-[var(--radius)] py-3 px-4 bg-[var(--bg-subtle)] border border-[var(--border)]">
                                    <span className="text-sm line-through text-[var(--fg-muted)]">${mainPrice.toLocaleString('es-CL')}</span>
                                    <span className="text-xl font-bold text-[var(--accent)]">${finalPrice.toLocaleString('es-CL')}</span>
                                    {discountPct !== null && discountPct > 0 && (
                                        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[var(--accent-subtle)] text-[var(--accent)]">-{discountPct}%</span>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
                {form.listingType === 'rent' && (
                    <Field label="Precio mensual" required error={errors.rentMonthly}>
                        <div className="relative flex items-center h-10.5 rounded-[var(--radius)] border bg-[var(--bg-subtle)] overflow-hidden"
                             style={{ borderColor: errors.rentMonthly ? 'var(--color-error, #ef4444)' : 'var(--border)' }}>
                            <span className="pl-3 pr-1 text-sm font-medium text-[var(--fg-muted)]">$</span>
                            <input className="flex-1 bg-transparent border-none outline-none h-full text-sm pr-2"
                                placeholder="800.000" inputMode="numeric"
                                value={(form.rentMonthly ?? '').replace(/^\$\s*/, '')}
                                onChange={(e) => set('rentMonthly', formatPrice(e.target.value))} />
                        </div>
                    </Field>
                )}
                {form.listingType === 'auction' && (
                    <Field label="Precio base" required error={errors.auctionStartPrice}>
                        <div className="relative flex items-center h-10.5 rounded-[var(--radius)] border bg-[var(--bg-subtle)] overflow-hidden"
                             style={{ borderColor: errors.auctionStartPrice ? 'var(--color-error, #ef4444)' : 'var(--border)' }}>
                            <span className="pl-3 pr-1 text-sm font-medium text-[var(--fg-muted)]">$</span>
                            <input className="flex-1 bg-transparent border-none outline-none h-full text-sm pr-2"
                                placeholder="5.000.000" inputMode="numeric"
                                value={(form.auctionStartPrice ?? '').replace(/^\$\s*/, '')}
                                onChange={(e) => set('auctionStartPrice', formatPrice(e.target.value))} />
                        </div>
                    </Field>
                )}
            </div>

            {/* Ubicación */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <IconMapPin size={13} className="text-(--fg-muted)" />
                    <p className="type-overline text-(--fg-muted)">Ubicación</p>
                </div>
                {addressBook.length > 0 && (
                    <ModernSelect
                        value={form.selectedAddressId}
                        onChange={handleSelectAddress}
                        options={[
                            ...addressBook.map((a) => ({ value: a.id, label: `${a.label}${a.isDefault ? ' (predeterminada)' : ''}` })),
                            { value: '__manual__', label: 'Otra ubicación…' },
                        ]}
                        placeholder="Seleccionar"
                    />
                )}
                <div className="grid grid-cols-2 gap-3">
                    <ModernSelect
                        value={form.regionId}
                        onChange={(v) => { set('regionId', v); set('communeId', ''); set('selectedAddressId', '__manual__'); }}
                        options={LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }))}
                        placeholder="Región"
                    />
                    <ModernSelect
                        value={form.communeId}
                        onChange={(v) => set('communeId', v)}
                        disabled={!form.regionId}
                        options={getCommunesForRegion(form.regionId).map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Comuna"
                    />
                </div>
                {errors.location && <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>{errors.location}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 pt-1 border-t border-(--border)">
                <PanelButton type="button" variant="ghost" className="w-full" onClick={onBack}>
                    ← Volver a fotos
                </PanelButton>
                <PanelButton type="button" variant="primary" className="w-full"
                    onClick={() => {
                        if (!validate() || !onSubmit) return;
                        onSubmit(getOutputData(form, catalog));
                    }}>
                    <span className="flex items-center justify-center gap-2">
                        Revisar y publicar <IconChevronRight size={16} />
                    </span>
                </PanelButton>
            </div>
        </div>
    );
}
