import {
    propertyValuationRequestSchema,
    vehicleValuationRequestSchema,
    type PropertyValuationRequest,
    type VehicleValuationRequest,
} from '@simple/types';
import { VEHICLE_CONDITION_OPTIONS } from './publish/vehicle-condition.js';

export type ValuationSupplementField = {
    id: string;
    label: string;
    required: boolean;
    kind: 'number' | 'text' | 'select';
    placeholder?: string;
    hint?: string;
    options?: Array<{ value: string; label: string }>;
};

export const PROPERTY_CONDITION_OPTIONS = [
    'Nuevo',
    'Entrega inmediata',
    'Usado',
    'Remodelado',
    'A refaccionar',
    'En verde',
].map((value) => ({ value, label: value }));

export const PROPERTY_TYPE_OPTIONS = [
    'Departamento',
    'Casa',
    'Oficina',
    'Local comercial',
    'Bodega',
    'Terreno',
    'Parcela',
].map((value) => ({ value, label: value }));

export const VEHICLE_FUEL_OPTIONS = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'].map((value) => ({ value, label: value }));

export const VEHICLE_TRANSMISSION_OPTIONS = [
    'Manual',
    'Automática',
    'CVT',
    'Secuencial',
    'DCT / DSG',
    'Tiptronic',
].map((value) => ({ value, label: value }));

export type PropertyValuationContext = {
    operationType?: 'sale' | 'rent' | 'project';
    propertyType?: string;
    regionId?: string;
    communeId?: string;
    addressLine1?: string;
    totalArea?: string | number | null;
    usableArea?: string | number | null;
    rooms?: string | number | null;
    bathrooms?: string | number | null;
    condition?: string | null;
    parkingSpaces?: string | number | null;
    propertyAge?: string | number | null;
};

export type VehicleValuationContext = {
    operationType?: 'sale' | 'rent';
    vehicleType?: string;
    brand?: string;
    model?: string;
    year?: string | number | null;
    regionId?: string;
    communeId?: string;
    addressLine1?: string;
    mileageKm?: string | number | null;
    condition?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
};

function isBlank(value: unknown): boolean {
    return value == null || String(value).trim() === '';
}

function parsePositiveNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseYear(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value !== 'string') return null;
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function isResidentialPropertyType(propertyType?: string): boolean {
    const normalized = String(propertyType ?? '').toLowerCase();
    return normalized.includes('casa') || normalized.includes('depto') || normalized.includes('departamento');
}

function makeField(
    id: string,
    label: string,
    required: boolean,
    kind: ValuationSupplementField['kind'],
    extra?: Partial<ValuationSupplementField>,
): ValuationSupplementField {
    return { id, label, required, kind, ...extra };
}

export function getPropertyValuationSupplementFields(ctx: PropertyValuationContext): ValuationSupplementField[] {
    const fields: ValuationSupplementField[] = [];

    if (isBlank(ctx.propertyType)) {
        fields.push(makeField('propertyType', 'Tipo de propiedad', true, 'select', { options: PROPERTY_TYPE_OPTIONS }));
    }
    if (parsePositiveNumber(ctx.totalArea) == null) {
        fields.push(makeField('totalArea', 'Superficie total (m²)', true, 'number', { placeholder: 'Ej. 85' }));
    }
    if (isBlank(ctx.regionId)) {
        fields.push(makeField('regionId', 'Región', true, 'select', { hint: 'Selecciona la región de la propiedad.' }));
    }
    if (isBlank(ctx.communeId)) {
        fields.push(makeField('communeId', 'Comuna', true, 'select', { hint: 'Selecciona la comuna de la propiedad.' }));
    }
    if (isBlank(ctx.addressLine1)) {
        fields.push(makeField('addressLine1', 'Dirección', true, 'text', { placeholder: 'Calle y número' }));
    }

    if (isResidentialPropertyType(ctx.propertyType)) {
        if (parseNonNegativeNumber(ctx.rooms) == null) {
            fields.push(makeField('rooms', 'Dormitorios', false, 'number', { placeholder: 'Ej. 3' }));
        }
        if (parseNonNegativeNumber(ctx.bathrooms) == null) {
            fields.push(makeField('bathrooms', 'Baños', false, 'number', { placeholder: 'Ej. 2' }));
        }
        if (isBlank(ctx.condition)) {
            fields.push(makeField('condition', 'Condición', false, 'select', { options: PROPERTY_CONDITION_OPTIONS }));
        }
    }

    if (parseNonNegativeNumber(ctx.parkingSpaces) == null) {
        fields.push(makeField('parkingSpaces', 'Estacionamientos', false, 'number', { placeholder: '0 si no tiene', hint: 'Puedes ingresar 0.' }));
    }

    return fields;
}

export function getVehicleValuationSupplementFields(ctx: VehicleValuationContext): ValuationSupplementField[] {
    const fields: ValuationSupplementField[] = [];

    if (isBlank(ctx.brand)) {
        fields.push(makeField('brand', 'Marca', true, 'text', { placeholder: 'Ej. Toyota' }));
    }
    if (isBlank(ctx.model)) {
        fields.push(makeField('model', 'Modelo', true, 'text', { placeholder: 'Ej. RAV4' }));
    }
    if (parseYear(ctx.year) == null) {
        fields.push(makeField('year', 'Año', true, 'number', { placeholder: 'Ej. 2022' }));
    }
    if (isBlank(ctx.regionId)) {
        fields.push(makeField('regionId', 'Región', true, 'select', { hint: 'Selecciona la región del vehículo.' }));
    }
    if (isBlank(ctx.communeId)) {
        fields.push(makeField('communeId', 'Comuna', true, 'select', { hint: 'Selecciona la comuna del vehículo.' }));
    }
    if (isBlank(ctx.addressLine1)) {
        fields.push(makeField('addressLine1', 'Dirección', true, 'text', { placeholder: 'Calle y número' }));
    }

    if (parseNonNegativeNumber(ctx.mileageKm) == null) {
        fields.push(makeField('mileageKm', 'Kilometraje', false, 'number', { placeholder: 'Ej. 45000' }));
    }
    if (isBlank(ctx.condition)) {
        fields.push(makeField('condition', 'Condición', false, 'select', { options: VEHICLE_CONDITION_OPTIONS }));
    }
    if (isBlank(ctx.fuelType)) {
        fields.push(makeField('fuelType', 'Combustible', false, 'select', { options: VEHICLE_FUEL_OPTIONS }));
    }
    if (isBlank(ctx.transmission)) {
        fields.push(makeField('transmission', 'Transmisión', false, 'select', { options: VEHICLE_TRANSMISSION_OPTIONS }));
    }

    return fields;
}

export function mergePropertyValuationRequest(
    base: Partial<PropertyValuationRequest> & Pick<PropertyValuationRequest, 'operationType'>,
    supplements: Record<string, string>,
): PropertyValuationRequest | null {
    const currentYear = new Date().getFullYear();
    const propertyAgeFromSupplement = parseNonNegativeNumber(supplements.propertyAge);
    const inferredYearBuilt = propertyAgeFromSupplement != null
        ? Math.max(1900, currentYear - propertyAgeFromSupplement)
        : (base.yearBuilt ?? null);

    const merged: PropertyValuationRequest = {
        operationType: base.operationType,
        propertyType: supplements.propertyType?.trim() || base.propertyType || '',
        regionId: supplements.regionId?.trim() || base.regionId || '',
        communeId: supplements.communeId?.trim() || base.communeId || '',
        neighborhood: base.neighborhood ?? null,
        addressLine1: supplements.addressLine1?.trim() || base.addressLine1 || null,
        areaM2: parsePositiveNumber(supplements.totalArea) ?? base.areaM2 ?? 0,
        builtAreaM2: parsePositiveNumber(supplements.usableArea) ?? base.builtAreaM2 ?? null,
        bedrooms: parseNonNegativeNumber(supplements.rooms) ?? base.bedrooms ?? null,
        bathrooms: parseNonNegativeNumber(supplements.bathrooms) ?? base.bathrooms ?? null,
        parkingSpaces: parseNonNegativeNumber(supplements.parkingSpaces) ?? base.parkingSpaces ?? null,
        storageUnits: base.storageUnits ?? null,
        yearBuilt: inferredYearBuilt,
        condition: supplements.condition?.trim() || base.condition || null,
    };

    const parsed = propertyValuationRequestSchema.safeParse(merged);
    return parsed.success ? parsed.data : null;
}

export function mergeVehicleValuationRequest(
    base: Partial<VehicleValuationRequest> & Pick<VehicleValuationRequest, 'operationType'>,
    supplements: Record<string, string>,
): VehicleValuationRequest | null {
    const merged: VehicleValuationRequest = {
        operationType: base.operationType,
        vehicleType: base.vehicleType || '',
        brand: supplements.brand?.trim() || base.brand || '',
        model: supplements.model?.trim() || base.model || '',
        version: base.version ?? null,
        year: parseYear(supplements.year) ?? base.year ?? 0,
        mileageKm: parseNonNegativeNumber(supplements.mileageKm) ?? base.mileageKm ?? null,
        condition: supplements.condition?.trim() || base.condition || null,
        fuelType: supplements.fuelType?.trim() || base.fuelType || null,
        transmission: supplements.transmission?.trim() || base.transmission || null,
        traction: base.traction ?? null,
        bodyType: base.bodyType ?? null,
        regionId: supplements.regionId?.trim() || base.regionId || '',
        communeId: supplements.communeId?.trim() || base.communeId || '',
        addressLine1: supplements.addressLine1?.trim() || base.addressLine1 || null,
    };

    const parsed = vehicleValuationRequestSchema.safeParse(merged);
    return parsed.success ? parsed.data : null;
}
