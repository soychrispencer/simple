/**
 * Specs de footer en cards (máx. 4), según tipo de propiedad o vehículo.
 */

export type PropertyCardSpecInput = {
    propertyType?: string | null;
    operationType?: string | null;
    section?: string | null;
    rooms?: number | string | null;
    bathrooms?: number | string | null;
    parkingSpaces?: number | string | null;
    storageUnits?: number | string | null;
    totalArea?: number | string | null;
    usableArea?: number | string | null;
    commercialUse?: string | null;
    condition?: string | null;
    projectName?: string | null;
    availableUnits?: number | string | null;
    usableAreaFrom?: number | string | null;
    usableAreaTo?: number | string | null;
    deliveryStatus?: string | null;
    salesStage?: string | null;
};

export type VehicleCardSpecInput = {
    vehicleType?: string | null;
    bodyType?: string | null;
    vehicleTypeLabel?: string | null;
    year?: number | string | null;
    mileage?: number | string | null;
    fuelType?: string | null;
    transmission?: string | null;
};

function asTrimmed(value: unknown): string {
    if (value == null) return '';
    return String(value).trim();
}

function asFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatCount(value: number): string {
    return value.toLocaleString('es-CL');
}

function appendUnique(summary: string[], value: string | null | undefined) {
    const next = asTrimmed(value);
    if (!next) return;
    if (summary.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    summary.push(next);
}

export function normalizePropertyTypeKey(propertyType?: string | null): string {
    return asTrimmed(propertyType).toLowerCase();
}

export function isLandPropertyCardType(propertyType?: string | null): boolean {
    const value = normalizePropertyTypeKey(propertyType);
    return value === 'terreno' || value === 'parcela' || /\bterreno\b|\bparcela\b/.test(value);
}

export function isProgramPropertyCardType(propertyType?: string | null): boolean {
    const value = normalizePropertyTypeKey(propertyType);
    return /casa|depto|departamento|townhouse|loft|penthouse|duplex|dúplex|studio|estudio|local comercial|^local$/.test(value);
}

export function isOfficePropertyCardType(propertyType?: string | null): boolean {
    return normalizePropertyTypeKey(propertyType).includes('oficina');
}

export function isWarehousePropertyCardType(propertyType?: string | null): boolean {
    const value = normalizePropertyTypeKey(propertyType);
    return value === 'bodega' || /^bodega\b/.test(value);
}

export function isPropertyProjectCard(input: Pick<PropertyCardSpecInput, 'operationType' | 'section'>): boolean {
    return asTrimmed(input.operationType).toLowerCase() === 'project'
        || asTrimmed(input.section).toLowerCase() === 'project';
}

/** true si el uso se mide en horas (náutico / maquinaria / aéreo). */
export function vehicleUsesHourMeter(vehicleType?: string | null): boolean {
    const value = asTrimmed(vehicleType).toLowerCase();
    return value === 'nautical' || value === 'machinery' || value === 'aerial'
        || /n[aá]utico|maquinaria|a[eé]reo/.test(value);
}

export function defaultVehicleTypeLabel(vehicleType?: string | null): string {
    switch (asTrimmed(vehicleType).toLowerCase()) {
        case 'car':
            return 'Auto / SUV';
        case 'motorcycle':
            return 'Moto';
        case 'truck':
            return 'Camión';
        case 'bus':
            return 'Bus';
        case 'machinery':
            return 'Maquinaria';
        case 'nautical':
            return 'Náutico';
        case 'aerial':
            return 'Aéreo';
        default:
            return asTrimmed(vehicleType);
    }
}

/**
 * Tags de summary/meta para cards de propiedades (ordenados, máx. 4).
 */
export function buildPropertyCardSummaryTags(input: PropertyCardSpecInput): string[] {
    const summary: string[] = [];

    if (isPropertyProjectCard(input)) {
        const units = asFiniteNumber(input.availableUnits);
        if (units != null) appendUnique(summary, `${formatCount(units)} unidades`);

        const from = asFiniteNumber(input.usableAreaFrom);
        const to = asFiniteNumber(input.usableAreaTo);
        if (from != null && to != null && to > from) {
            appendUnique(summary, `${formatCount(from)}-${formatCount(to)} m²`);
        } else if (from != null) {
            appendUnique(summary, `Desde ${formatCount(from)} m²`);
        }

        appendUnique(summary, asTrimmed(input.deliveryStatus));
        appendUnique(summary, asTrimmed(input.salesStage));
        return summary.slice(0, 4);
    }

    const propertyType = asTrimmed(input.propertyType);
    const rooms = asFiniteNumber(input.rooms);
    const bathrooms = asFiniteNumber(input.bathrooms);
    const parking = asFiniteNumber(input.parkingSpaces);
    const storage = asFiniteNumber(input.storageUnits);
    const totalArea = asFiniteNumber(input.totalArea);
    const usableArea = asFiniteNumber(input.usableArea);
    const commercialUse = asTrimmed(input.commercialUse);
    const condition = asTrimmed(input.condition);

    if (isProgramPropertyCardType(propertyType) || (rooms != null || bathrooms != null)) {
        if (rooms != null) appendUnique(summary, `${formatCount(rooms)}D`);
        if (bathrooms != null) appendUnique(summary, `${formatCount(bathrooms)}B`);
        if (parking != null) appendUnique(summary, `${formatCount(parking)}E`);
        if (storage != null) appendUnique(summary, `${formatCount(storage)}Bo`);
        return summary.slice(0, 4);
    }

    if (isLandPropertyCardType(propertyType)) {
        appendUnique(summary, propertyType);
        if (totalArea != null) appendUnique(summary, `${formatCount(totalArea)} m²`);
        appendUnique(summary, commercialUse);
        appendUnique(summary, condition);
        return summary.slice(0, 4);
    }

    if (isOfficePropertyCardType(propertyType)) {
        appendUnique(summary, propertyType || 'Oficina');
        if (totalArea != null) appendUnique(summary, `${formatCount(totalArea)} m²`);
        if (parking != null) appendUnique(summary, `${formatCount(parking)}E`);
        if (storage != null) appendUnique(summary, `${formatCount(storage)}Bo`);
        return summary.slice(0, 4);
    }

    if (isWarehousePropertyCardType(propertyType)) {
        appendUnique(summary, propertyType || 'Bodega');
        if (totalArea != null) appendUnique(summary, `${formatCount(totalArea)} m²`);
        if (parking != null) appendUnique(summary, `${formatCount(parking)}E`);
        if (usableArea != null && usableArea !== totalArea) {
            appendUnique(summary, `${formatCount(usableArea)} m² út.`);
        } else {
            appendUnique(summary, commercialUse);
        }
        return summary.slice(0, 4);
    }

    appendUnique(summary, propertyType);
    if (totalArea != null) appendUnique(summary, `${formatCount(totalArea)} m²`);
    if (parking != null) appendUnique(summary, `${formatCount(parking)}E`);
    if (storage != null) appendUnique(summary, `${formatCount(storage)}Bo`);
    return summary.slice(0, 4);
}

/**
 * Tags de summary/meta para cards de vehículos (incluye año para legacy;
 * la card lo filtra porque ya va en el título).
 */
export function buildVehicleCardSummaryTags(input: VehicleCardSpecInput): string[] {
    const summary: string[] = [];
    const year = asFiniteNumber(input.year);
    if (year != null && year >= 1900 && year <= 2100) {
        appendUnique(summary, String(Math.trunc(year)));
    }

    const typeLabel = asTrimmed(input.bodyType)
        || asTrimmed(input.vehicleTypeLabel)
        || defaultVehicleTypeLabel(input.vehicleType);
    appendUnique(summary, typeLabel);

    const mileage = asFiniteNumber(input.mileage);
    if (mileage != null) {
        const suffix = vehicleUsesHourMeter(input.vehicleType) ? 'h' : 'km';
        appendUnique(summary, `${formatCount(mileage)} ${suffix}`);
    }

    appendUnique(summary, asTrimmed(input.fuelType));
    appendUnique(summary, asTrimmed(input.transmission));
    return summary.slice(0, 5);
}
