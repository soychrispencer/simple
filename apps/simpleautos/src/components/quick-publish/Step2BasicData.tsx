'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    IconCar, IconMotorbike, IconTruck, IconBus, IconTractor, IconAnchor, IconPlane,
    IconChevronDown, IconCheck, IconPencil, IconTag, IconKey, IconHammer,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';
import ModernSelect from '@/components/ui/modern-select';
import {
    type PublishWizardCatalog,
    getBrandsForVehicleType,
    getModelsForBrand,
    getVersionsForModel,
    loadPublishWizardCatalog,
    type VehicleCatalogType,
} from '@/lib/publish-wizard-catalog';
import { ColorPicker } from '@/components/ui/color-picker';
import type { QuickBasicData, QuickListingType } from './types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const LISTING_TYPE_OPTIONS: { value: QuickListingType; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { value: 'sale', label: 'Venta', Icon: IconTag },
    { value: 'rent', label: 'Arriendo', Icon: IconKey },
    { value: 'auction', label: 'Subasta', Icon: IconHammer },
];

const VEHICLE_TYPE_OPTIONS: { value: VehicleCatalogType; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { value: 'car',        label: 'Auto / SUV',  Icon: IconCar },
    { value: 'motorcycle', label: 'Moto',         Icon: IconMotorbike },
    { value: 'truck',      label: 'Camión',       Icon: IconTruck },
    { value: 'bus',        label: 'Bus',          Icon: IconBus },
    { value: 'machinery',  label: 'Maquinaria',   Icon: IconTractor },
    { value: 'nautical',   label: 'Náutico',      Icon: IconAnchor },
    { value: 'aerial',     label: 'Aéreo',        Icon: IconPlane },
];

const TRANSMISSION_OPTIONS = ['Manual', 'Automática', 'CVT'];
const FUEL_OPTIONS = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas', 'Otro'];
const CONDITION_OPTIONS = ['Nuevo', 'Seminuevo', 'Usado', 'Para reparar'];
const CAR_BODY_TYPES = ['Sedán', 'SUV', 'Hatchback', 'Pickup', 'Station Wagon', 'Coupé', 'Convertible', 'Crossover', 'Van', 'Minivan'];
const TRACTION_OPTIONS = ['FWD', 'RWD', 'AWD', '4WD'];
const OWNER_COUNT_OPTIONS = ['1° dueño', '2° dueño', '3° dueño o más'];

type FormState = {
    listingType: QuickListingType;
    vehicleType: VehicleCatalogType;
    brandId: string;
    customBrand: string;
    modelId: string;
    customModel: string;
    year: string;
    version: string;
    customVersion: string;
    mileage: string;
    transmission: string;
    color: string;
    bodyType: string;
    fuelType: string;
    condition: string;
    traction: string;
    ownerCount: string;
    engineSize: string;
    doors: string;
    passengers: string;
    steeringWheel: string;
};

const defaultForm: FormState = {
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
    transmission: '',
    color: '',
    bodyType: '',
    fuelType: '',
    condition: '',
    traction: '',
    ownerCount: '',
    engineSize: '',
    doors: '',
    passengers: '',
    steeringWheel: '',
};

function getPreservedCommercialData(initialData: QuickBasicData | null): Pick<
    QuickBasicData,
    | 'price'
    | 'offerPrice'
    | 'offerPriceMode'
    | 'negotiable'
    | 'financingAvailable'
    | 'exchangeAvailable'
    | 'currency'
    | 'rentDaily'
    | 'rentWeekly'
    | 'rentMonthly'
    | 'rentMinDays'
    | 'rentDeposit'
    | 'rentAvailableFrom'
    | 'rentAvailableTo'
    | 'auctionStartPrice'
    | 'auctionReservePrice'
    | 'auctionMinIncrement'
    | 'auctionStartAt'
    | 'auctionEndAt'
> {
    return {
        price: initialData?.price ?? '',
        offerPrice: initialData?.offerPrice ?? '',
        offerPriceMode: initialData?.offerPriceMode ?? '$',
        negotiable: initialData?.negotiable ?? true,
        financingAvailable: initialData?.financingAvailable ?? false,
        exchangeAvailable: initialData?.exchangeAvailable ?? false,
        currency: initialData?.currency ?? 'CLP',
        rentDaily: initialData?.rentDaily ?? '',
        rentWeekly: initialData?.rentWeekly ?? '',
        rentMonthly: initialData?.rentMonthly ?? '',
        rentMinDays: initialData?.rentMinDays ?? '',
        rentDeposit: initialData?.rentDeposit ?? '',
        rentAvailableFrom: initialData?.rentAvailableFrom ?? '',
        rentAvailableTo: initialData?.rentAvailableTo ?? '',
        auctionStartPrice: initialData?.auctionStartPrice ?? '',
        auctionReservePrice: initialData?.auctionReservePrice ?? '',
        auctionMinIncrement: initialData?.auctionMinIncrement ?? '',
        auctionStartAt: initialData?.auctionStartAt ?? '',
        auctionEndAt: initialData?.auctionEndAt ?? '',
    };
}

interface Props {
    initialData: QuickBasicData | null;
    onChange?: (data: QuickBasicData) => void;
    onSubmit?: (data: QuickBasicData) => void;
    onBack?: () => void;
    isExtended?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
    label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1 text-[var(--fg-secondary)]">
                {label}{required && <abbr title="requerido" style={{ color: 'var(--color-error, #ef4444)', textDecoration: 'none' }}> *</abbr>}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>}
            {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>{error}</p>}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="type-overline mb-2 text-[var(--fg-muted)]">{children}</p>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step2BasicData({ initialData, onChange, onSubmit, onBack, isExtended = false }: Props) {
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [versions, setVersions] = useState<Array<{ id: string; name: string }>>([]);
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [form, setForm] = useState<FormState>(() => {
        if (!initialData) return defaultForm;
        return {
            ...defaultForm,
            ...initialData,
            customVersion: (initialData as FormState).customVersion ?? '',
            // Normalizar km: solo dígitos
            mileage: initialData.mileage?.replace(/\D/g, '') ?? '',
        };
    });
    const [showDetails, setShowDetails] = useState(() => {
        if (!initialData) return false;
        return !!(
            initialData.transmission ||
            initialData.fuelType ||
            initialData.condition ||
            (initialData as FormState).bodyType ||
            (initialData as FormState).traction ||
            initialData.ownerCount
        );
    });
    const pendingChangeRef = useRef<QuickBasicData | null>(null);

    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog).catch(() => null);
    }, []);

    // Track previous vehicleType to only clear brand/model on a real user change,
    // not on initial mount or React Strict Mode's double-effect run.
    const prevVehicleTypeRef = useRef(form.vehicleType);
    useEffect(() => {
        const prev = prevVehicleTypeRef.current;
        prevVehicleTypeRef.current = form.vehicleType;
        if (prev === form.vehicleType) return;
        setForm((f) => ({ ...f, brandId: '', modelId: '', version: '', customBrand: '', customModel: '' }));
        setVersions([]);
    }, [form.vehicleType]);

    useEffect(() => {
        setVersions([]);
        if (
            !catalog ||
            !form.brandId || form.brandId === '__custom__' ||
            !form.modelId || form.modelId === '__custom__'
        ) return;
        const catalogVersions = getVersionsForModel(catalog, form.modelId, form.vehicleType);
        setVersions(catalogVersions.map((v) => ({ id: v.id, name: v.name })));
    }, [catalog, form.brandId, form.modelId, form.vehicleType]);

    useEffect(() => {
        if (!pendingChangeRef.current || !onChange) return;
        onChange(pendingChangeRef.current);
        pendingChangeRef.current = null;
    });

    const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            if (onChange) {
                const brandName = catalog?.brands.find((b) => b.id === next.brandId)?.name;
                const modelName = catalog?.models.find((m) => m.id === next.modelId)?.name;
                const resolvedVersion =
                    next.brandId === '__custom__' || next.modelId === '__custom__' || next.version === '__custom__'
                        ? next.customVersion
                        : next.version;
                        
                // We emit the QuickBasicData representation back
                pendingChangeRef.current = {
                    ...next,
                    version: resolvedVersion,
                    brandName,
                    modelName,
                    ...getPreservedCommercialData(initialData),
                };
            }
            return next;
        });
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    }, [catalog, onChange, initialData]);

    const brands = catalog ? getBrandsForVehicleType(catalog, form.vehicleType) : [];
    const models = catalog && form.brandId && form.brandId !== '__custom__'
        ? getModelsForBrand(catalog, form.brandId, form.vehicleType) : [];

    function validate() {
        const next: Partial<Record<keyof FormState, string>> = {};
        if (!(form.brandId === '__custom__' ? form.customBrand.trim() : form.brandId)) next.brandId = 'Selecciona una marca';
        if (!(form.modelId === '__custom__' ? form.customModel.trim() : form.modelId)) next.modelId = 'Selecciona un modelo';
        if (!form.year) next.year = 'Selecciona el año';
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    return (
        <div className="flex flex-col gap-6">

            {/* ── Tipo + Categoría ── */}
            <div className="flex flex-col gap-4">
                <div>
                    <SectionLabel>Tipo de publicación</SectionLabel>
                    <div className="flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5 gap-0.5">
                        {LISTING_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => set('listingType', value)}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-sm font-medium transition-all ${
                                    form.listingType === value
                                        ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-color)] shadow-sm'
                                        : 'text-[var(--fg-secondary)] hover:text-[var(--fg)]'
                                }`}
                            >
                                <Icon size={13} strokeWidth={1.8} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <SectionLabel>Categoría</SectionLabel>
                    <div className="grid grid-cols-4 md:grid-cols-7 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5 gap-0.5">
                        {VEHICLE_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => set('vehicleType', value)}
                                className={`flex flex-col items-center justify-center gap-1 rounded-[8px] py-2.5 text-xs font-medium transition-all ${
                                    form.vehicleType === value
                                        ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-color)] shadow-sm'
                                        : 'text-[var(--fg-secondary)] hover:text-[var(--fg)]'
                                }`}
                            >
                                <Icon size={14} strokeWidth={1.8} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* ── Field visibility derived from tipo + categoría ── */}
            {(() => {
                const isMotor = ['car', 'motorcycle', 'truck', 'bus'].includes(form.vehicleType);
                const showVersion     = form.vehicleType === 'car' || form.vehicleType === 'motorcycle';
                const showKm          = isMotor && form.listingType !== 'rent';
                const showTransmission = isMotor;
                const showFuel        = isMotor || form.vehicleType === 'machinery';
                const showBodyType    = form.vehicleType === 'car';

                return (
                    <div className="flex flex-col gap-4">

                        {/* Marca + Modelo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Field label="Marca" required error={errors.brandId}>
                                    <ModernSelect
                                        value={form.brandId}
                                        onChange={(v) => { set('brandId', v); set('modelId', ''); set('version', ''); }}
                                        options={[
                                            ...brands.map((b) => ({ value: b.id, label: b.name })),
                                            { value: '__custom__', label: 'Otra marca…' },
                                        ]}
                                        placeholder="Seleccionar"
                                    />
                                </Field>
                                {form.brandId === '__custom__' && (
                                    <input className="form-input mt-2" placeholder="Escribe la marca"
                                        value={form.customBrand} onChange={(e) => set('customBrand', e.target.value)} />
                                )}
                            </div>
                            <div>
                                <Field label="Modelo" required error={errors.modelId}>
                                    <ModernSelect
                                        value={form.modelId}
                                        onChange={(v) => { set('modelId', v); set('version', ''); }}
                                        disabled={!form.brandId}
                                        options={[
                                            ...models.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
                                                .map((m) => ({ value: m.id, label: m.name })),
                                            ...(form.brandId && form.brandId !== '__custom__'
                                                ? [{ value: '__custom__', label: 'Otro modelo…' }]
                                                : []),
                                        ]}
                                        placeholder={form.brandId ? 'Seleccionar' : 'Primero marca'}
                                    />
                                </Field>
                                {form.modelId === '__custom__' && (
                                    <input className="form-input mt-2" placeholder="Escribe el modelo"
                                        value={form.customModel} onChange={(e) => set('customModel', e.target.value)} />
                                )}
                            </div>
                        </div>

                        {/* Año + Versión */}
                        <div className={`grid gap-3 ${showVersion ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <Field label="Año" required error={errors.year}>
                                <ModernSelect
                                    value={form.year}
                                    onChange={(v) => { set('year', v); set('version', ''); }}
                                    options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
                                    placeholder="Seleccionar"
                                />
                            </Field>
                            {showVersion && (
                                <Field label="Versión">
                                    {(form.brandId === '__custom__' || form.modelId === '__custom__') ? (
                                        <input className="form-input" placeholder="Ej: XEi 2.0 AT, SE-G CVT…"
                                            value={form.customVersion}
                                            onChange={(e) => set('customVersion', e.target.value)} />
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
                                                    ...(form.modelId && form.year
                                                        ? [{ value: '__custom__', label: 'Escribir versión…' }]
                                                        : []),
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

                        {/* Km + Color */}
                        <div className={`grid gap-3 ${showKm ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {showKm && (
                                <Field label="Kilometraje">
                                    <input className="form-input" placeholder="150.000" inputMode="numeric"
                                        value={form.mileage ? Number(form.mileage).toLocaleString('es-CL') : ''}
                                        onChange={(e) => set('mileage', e.target.value.replace(/\D/g, ''))} />
                                </Field>
                            )}
                            <Field label="Color">
                                <ColorPicker
                                    value={form.color}
                                    onChange={(color) => set('color', color)}
                                />
                            </Field>
                        </div>

                        {/* Más detalles */}
                        <button
                            type="button"
                            onClick={() => setShowDetails((s) => !s)}
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                        >
                            <IconChevronDown size={14} style={{ transform: showDetails ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
                            {showDetails ? 'Menos detalles' : 'Más detalles'}
                        </button>

                        {showDetails && (
                            <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-4">
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
                                                options={FUEL_OPTIONS.map((f) => ({ value: f, label: f }))}
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
                                                options={CAR_BODY_TYPES.map((b) => ({ value: b, label: b }))}
                                                placeholder="Seleccionar"
                                            />
                                        </Field>
                                    )}
                                </div>
                                <div className={`grid gap-3 ${isExtended ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
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
                                            options={OWNER_COUNT_OPTIONS.map((o) => ({ value: o, label: o }))}
                                            placeholder="Seleccionar"
                                        />
                                    </Field>

                                    {isExtended && (
                                        <>
                                            <Field label="Cilindrada (cc o L)">
                                                <input className="form-input" placeholder="Ej: 2.0"
                                                    value={form.engineSize}
                                                    onChange={(e) => set('engineSize', e.target.value)} />
                                            </Field>
                                            <Field label="Pasajeros">
                                                <ModernSelect
                                                    value={form.passengers}
                                                    onChange={(v) => set('passengers', v)}
                                                    options={['2', '4', '5', '7', '9', 'Más'].map(o => ({ value: o, label: o }))}
                                                    placeholder="Seleccionar"
                                                />
                                            </Field>
                                            <Field label="Puertas">
                                                <ModernSelect
                                                    value={form.doors}
                                                    onChange={(v) => set('doors', v)}
                                                    options={['2', '3', '4', '5'].map(o => ({ value: o, label: o }))}
                                                    placeholder="Seleccionar"
                                                />
                                            </Field>
                                            <Field label="Posición Volante">
                                                <ModernSelect
                                                    value={form.steeringWheel}
                                                    onChange={(v) => set('steeringWheel', v)}
                                                    options={[{ value: 'left', label: 'Izquierda (Original)' }, { value: 'right', label: 'Derecha (Cambiado)' }]}
                                                    placeholder="Seleccionar"
                                                />
                                            </Field>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ─── Actions ─── */}
            {!isExtended && (
                <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2 pt-1 border-t border-[var(--border)]">
                    <PanelButton type="button" variant="ghost" className="w-full md:w-auto" onClick={onBack}>
                        ← Volver
                    </PanelButton>
                    <PanelButton type="button" variant="primary" className="w-full md:w-auto"
                        onClick={() => {
                            if (!validate() || !onSubmit) return;
                            const brandName = catalog?.brands.find((b) => b.id === form.brandId)?.name;
                            const modelName = catalog?.models.find((m) => m.id === form.modelId)?.name;
                            const resolvedVersion =
                                form.brandId === '__custom__' || form.modelId === '__custom__' || form.version === '__custom__'
                                    ? form.customVersion
                                    : form.version;
                            onSubmit({
                                ...form,
                                version: resolvedVersion,
                                brandName,
                                modelName,
                                ...getPreservedCommercialData(initialData),
                            });
                        }}>
                        Continuar →
                    </PanelButton>
                </div>
            )}
        </div>
    );

}
