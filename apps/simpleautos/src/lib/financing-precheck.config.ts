/**
 * Reglas de referencia para precalificación (no son aprobación crediticia).
 * Fuente: estándar mercado chileno 2025–2026 (pie ~20% perfiles acreditados,
 * vehículos comerciales con pie mayor, evaluación con DICOM sujeta a condiciones).
 * Migrar a panel/API cuando exista configuración por financiera.
 */

import type { VehicleCatalogType } from '@/lib/publish-wizard-catalog';

export type VehicleUseType = 'particular' | 'carga' | 'moto';

/** Mapea el tipo de uso del asistente al catálogo de marcas/modelos. */
export function mapVehicleUseToCatalogType(use: VehicleUseType): VehicleCatalogType {
    switch (use) {
        case 'carga':
            return 'truck';
        case 'moto':
            return 'motorcycle';
        default:
            return 'car';
    }
}

export type FinancierRuleSet = {
    id: string;
    label: string;
    minModelYear: number;
    minDownPaymentPercent: number;
    maxVehicleAgeYears: number;
    /** null = todas las marcas */
    allowedBrands: string[] | null;
    notes?: string;
};

/** Pie mínimo por tipo de uso del vehículo (política SimpleAutos / Alex Autos). */
export const MIN_DOWN_PAYMENT_BY_USE: Record<VehicleUseType, number> = {
    particular: 20,
    carga: 50,
    moto: 20,
};

/** Ingreso líquido mínimo de referencia para evaluar capacidad (CLP). */
export const REFERENCE_MIN_MONTHLY_INCOME_CLP = 500_000;

/** Carga financiera máxima orientativa sobre ingreso líquido (sin simular cuota). */
export const REFERENCE_MAX_PAYMENT_TO_INCOME_RATIO = 0.25;

/** Plazo de referencia solo para estimar capacidad interna (meses). */
export const REFERENCE_LOAN_TERM_MONTHS = 48;

/** Antigüedad máxima del vehículo si la marca no tiene regla específica. */
export const DEFAULT_MAX_VEHICLE_AGE_YEARS = 12;

/** Año mínimo por defecto si la marca no está en la tabla. */
export const DEFAULT_MIN_MODEL_YEAR = 2014;

/**
 * Tabla editable — reemplazar por panel admin.
 * Referencia inicial acordada con operación (Kia, Hyundai, chinas más recientes, etc.).
 */
export const BRAND_MIN_MODEL_YEAR: Record<string, number> = {
    kia: 2014,
    hyundai: 2014,
    volkswagen: 2014,
    vw: 2014,
    nissan: 2014,
    mg: 2018,
    chery: 2016,
    jac: 2018,
    changan: 2018,
    ssangyong: 2014,
    citroen: 2014,
    citroën: 2014,
    toyota: 2014,
    mazda: 2014,
    suzuki: 2014,
    mitsubishi: 2014,
    ford: 2014,
    chevrolet: 2014,
    peugeot: 2014,
    renault: 2014,
    honda: 2014,
    bmw: 2016,
    mercedes: 2016,
    'mercedes-benz': 2016,
    audi: 2016,
};

/** Plantilla para configuración futura por financiera en panel admin. */
export const FINANCIER_REFERENCE_RULES: FinancierRuleSet[] = [
    {
        id: 'autofin',
        label: 'Autofin',
        minModelYear: 2012,
        minDownPaymentPercent: 20,
        maxVehicleAgeYears: 12,
        allowedBrands: null,
        notes: 'Referencia mercado; DICOM evaluado caso a caso.',
    },
    {
        id: 'global',
        label: 'Global',
        minModelYear: 2014,
        minDownPaymentPercent: 20,
        maxVehicleAgeYears: 11,
        allowedBrands: null,
    },
    {
        id: 'unidad',
        label: 'Unidad',
        minModelYear: 2014,
        minDownPaymentPercent: 20,
        maxVehicleAgeYears: 10,
        allowedBrands: null,
        notes: 'Pie desde 20% con ingresos acreditados (referencia pública UNIDAD).',
    },
    {
        id: 'falabella',
        label: 'Falabella',
        minModelYear: 2015,
        minDownPaymentPercent: 20,
        maxVehicleAgeYears: 10,
        allowedBrands: null,
    },
];

export const VEHICLE_USE_OPTIONS: { value: VehicleUseType; label: string; hint: string }[] = [
    { value: 'particular', label: 'Particular', hint: 'Auto, SUV, camioneta de uso personal.' },
    { value: 'carga', label: 'Carga / comercial', hint: 'Pie mínimo 50% según política de financiamiento comercial.' },
    { value: 'moto', label: 'Moto', hint: 'Motocicletas y scooters.' },
];

export const DOWN_PAYMENT_PRESETS = [20, 30, 40, 50] as const;

export function normalizeBrandKey(brand: string): string {
    return brand.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function resolveBrandMinYear(brand: string): number {
    const key = normalizeBrandKey(brand);
    if (!key) return DEFAULT_MIN_MODEL_YEAR;
    if (BRAND_MIN_MODEL_YEAR[key] != null) return BRAND_MIN_MODEL_YEAR[key];
    const partial = Object.entries(BRAND_MIN_MODEL_YEAR).find(([name]) => key.includes(name) || name.includes(key));
    return partial?.[1] ?? DEFAULT_MIN_MODEL_YEAR;
}

export function getMinDownPaymentPercent(vehicleType: VehicleUseType): number {
    return MIN_DOWN_PAYMENT_BY_USE[vehicleType];
}
