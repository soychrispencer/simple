import type { VerticalType } from '@simple/types';
import { asObject, asString } from '../shared/index.js';
import {
    AUTOS_PORTAL_REQUIREMENTS,
    PROPERTIES_PORTAL_REQUIREMENTS,
    REQUIRED_SPECIFIC_FIELDS_BY_VEHICLE,
    type PortalKey,
} from './portals.js';

/** Subconjunto de listing usado para validar cobertura de portales. */
export type PortalCoverageListing = {
    vertical: VerticalType;
    listingType: string;
    title: string;
    description: string;
    price: string;
    location?: string;
    locationData?: {
        regionId?: string | null;
        communeId?: string | null;
        communeName?: string | null;
        regionName?: string | null;
    };
    rawData?: unknown;
};

function listingFieldLabel(key: string): string {
    switch (key) {
        case 'title':
            return 'Título';
        case 'description':
            return 'Descripción';
        case 'brand':
            return 'Marca';
        case 'model':
            return 'Modelo';
        case 'year':
            return 'Año';
        case 'mileage':
            return 'Kilometraje';
        case 'fuel':
            return 'Combustible';
        case 'transmission':
            return 'Transmisión';
        case 'bodyType':
            return 'Carrocería / tipo';
        case 'condition':
            return 'Condición del vehículo';
        case 'location':
            return 'Región + comuna';
        case 'price':
            return 'Precio';
        case 'photos':
            return 'Fotos (mínimo 3)';
        case 'specificRequired':
            return 'Campos especiales por categoría';
        case 'rentMinDays':
            return 'Arriendo: días mínimos';
        case 'rentAvailability':
            return 'Arriendo: rango de disponibilidad';
        case 'auctionIncrement':
            return 'Subasta: incremento mínimo';
        case 'rooms':
            return 'Dormitorios';
        case 'bathrooms':
            return 'banos';
        case 'surface':
            return 'Superficie';
        default:
            return key;
    }
}

function parseNumberFromString(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return null;
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function locationIdsFromRecord(record: PortalCoverageListing) {
    const payload = asObject(record.rawData);
    const location = asObject(payload.location);
    return {
        regionId: asString(record.locationData?.regionId) || asString(location.regionId),
        communeId: asString(record.locationData?.communeId) || asString(location.communeId),
    };
}

export function getAutosPortalCoverage(
    record: PortalCoverageListing,
    portal: PortalKey,
): { missingRequired: string[]; missingRecommended: string[] } {
    const payload = asObject(record.rawData);
    const setup = asObject(payload.setup);
    const basic = asObject(payload.basic);
    const location = asObject(payload.location);
    const media = asObject(payload.media);
    const commercial = asObject(payload.commercial);
    const { regionId, communeId } = locationIdsFromRecord(record);

    const vehicleType = asString(setup.vehicleType) || 'car';
    const listingType = asString(setup.listingType) || record.listingType;
    const brandId = asString(basic.brandId);
    const customBrand = asString(basic.customBrand);
    const modelId = asString(basic.modelId);
    const customModel = asString(basic.customModel);
    const year = parseNumberFromString(basic.year);
    const mileage = parseNumberFromString(basic.mileage);
    const fuelType = asString(basic.fuelType);
    const transmission = asString(basic.transmission);
    const bodyType = asString(basic.bodyType);
    const condition = asString(basic.condition);
    const photoCount = Array.isArray(media.photos) ? media.photos.length : 0;
    const specific = asObject(basic.specific);
    const rentMinDays = parseNumberFromString(commercial.rentMinDays);
    const rentAvailableFrom = asString(commercial.rentAvailableFrom);
    const rentAvailableTo = asString(commercial.rentAvailableTo);
    const auctionMinIncrement = parseNumberFromString(commercial.auctionMinIncrement);

    const requiredSpecific = REQUIRED_SPECIFIC_FIELDS_BY_VEHICLE[vehicleType] ?? [];
    const hasSpecificRequired = requiredSpecific.every((field) => asString(specific[field]).length > 0);

    const hasPrice = (() => {
        if (listingType === 'rent') {
            return (
                parseNumberFromString(commercial.rentDaily) != null
                || parseNumberFromString(commercial.rentWeekly) != null
                || parseNumberFromString(commercial.rentMonthly) != null
            );
        }
        if (listingType === 'auction') {
            return parseNumberFromString(commercial.auctionStartPrice) != null;
        }
        return parseNumberFromString(commercial.price) != null || asString(record.price).length > 0;
    })();

    const checks: Record<string, boolean> = {
        title: asString(record.title).length >= 10 || asString(basic.title).length >= 10,
        description: asString(record.description).length >= 100 || asString(basic.description).length >= 100,
        brand: brandId.length > 0 && (brandId !== '__custom__' || customBrand.length >= 2),
        model: modelId.length > 0 && (modelId !== '__custom__' || customModel.length >= 2),
        year: year != null && year >= 1900,
        mileage: mileage != null || vehicleType === 'nautical' || vehicleType === 'aerial',
        fuel: fuelType.length > 0 || vehicleType === 'aerial',
        transmission: transmission.length > 0 || vehicleType === 'nautical' || vehicleType === 'machinery',
        bodyType: vehicleType !== 'car' || bodyType.length > 0,
        condition: condition.length > 0,
        location: regionId.length > 0 && communeId.length > 0,
        price: hasPrice,
        photos: photoCount >= 3,
        specificRequired: hasSpecificRequired,
        rentMinDays: listingType !== 'rent' || (rentMinDays != null && rentMinDays >= 1),
        rentAvailability: listingType !== 'rent' || (rentAvailableFrom.length > 0 && rentAvailableTo.length > 0),
        auctionIncrement: listingType !== 'auction' || (auctionMinIncrement != null && auctionMinIncrement > 0),
    };

    const requirements = AUTOS_PORTAL_REQUIREMENTS[portal];
    const missingRequired = requirements.required
        .filter((key) => !checks[key])
        .map((key) => listingFieldLabel(key));
    const missingRecommended = requirements.recommended
        .filter((key) => !checks[key])
        .map((key) => listingFieldLabel(key));
    return { missingRequired, missingRecommended };
}

export function getPropertiesPortalCoverage(
    record: PortalCoverageListing,
    portal: PortalKey,
): { missingRequired: string[]; missingRecommended: string[] } {
    const payload = asObject(record.rawData);
    const basic = asObject(payload.basic);
    const media = asObject(payload.media);
    const location = asObject(payload.location);
    const { regionId, communeId } = locationIdsFromRecord(record);

    const rooms = asString(basic.rooms);
    const bathrooms = asString(basic.bathrooms);
    const surface = asString(basic.totalArea || basic.surface);
    const photoCount = Array.isArray(media.photos) ? media.photos.length : 0;
    const hasLocation = regionId.length > 0 && communeId.length > 0;

    const checks: Record<string, boolean> = {
        title: asString(record.title).length >= 10,
        description: asString(record.description).length >= 80,
        price: asString(record.price).length > 0,
        location: hasLocation || asString(record.location).length > 0,
        photos: photoCount >= 3,
        rooms: rooms.length > 0,
        bathrooms: bathrooms.length > 0,
        surface: surface.length > 0,
    };

    const requirements = PROPERTIES_PORTAL_REQUIREMENTS[portal];
    const missingRequired = requirements.required.filter((key) => !checks[key]).map((key) => listingFieldLabel(key));
    const missingRecommended = requirements.recommended.filter((key) => !checks[key]).map((key) => listingFieldLabel(key));
    return { missingRequired, missingRecommended };
}

export function getPortalCoverage(
    record: PortalCoverageListing,
    portal: PortalKey,
): { missingRequired: string[]; missingRecommended: string[] } {
    if (record.vertical === 'autos') return getAutosPortalCoverage(record, portal);
    return getPropertiesPortalCoverage(record, portal);
}
