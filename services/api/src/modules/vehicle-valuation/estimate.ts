import type { z } from 'zod';
import type {
    GeoPoint,
    VehicleValuationComparable,
    ValuationConfidenceBreakdown,
    ValuationSourceBreakdown,
} from '@simple/types';
import { asString, asObject } from '../shared/helpers.js';
type InternalListingForValuation = {
    id: string;
    vertical: string;
    section: string;
    title: string;
    price: string;
    location?: string;
    locationData?: unknown;
    href: string;
    rawData?: unknown;
    updatedAt: number;
};
import {
    geocodeListingLocation,
    makeGeoPoint,
    normalizeListingLocation,
} from '../listings/location.js';
import { daysSince, haversineDistanceKm } from '../valuation/geo.js';
import { parseMoneyAmount } from '../valuation/money.js';
import {
    getVehicleValuationFeedState,
    normalizeVehicleSlug,
    normalizeVehicleType,
} from './index.js';
import {
    conditionAdjustmentFactor,
    detectVehiclePriceCurrency,
    rentBaselineVehiclePrice,
    saleBaselineVehiclePrice,
} from './pricing.js';
import { vehicleValuationRequestSchema } from './schemas.js';

export { vehicleValuationRequestSchema } from './schemas.js';

let internalListingsSource: () => Iterable<InternalListingForValuation> = () => [];

export function configureVehicleValuationEstimate(deps: {
    getInternalListings: () => Iterable<InternalListingForValuation>;
}): void {
    internalListingsSource = deps.getInternalListings;
}

function parseNumberFromString(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function extractVehicleComparable(
    record: InternalListingForValuation,
    operationType: 'sale' | 'rent',
    targetGeoPoint?: GeoPoint,
): VehicleValuationComparable | null {
    if (record.vertical !== 'autos') return null;
    if (record.section !== operationType) return null;

    const payload = asObject(record.rawData);
    const setup = asObject(payload.setup);
    const basic = asObject(payload.basic);
    const commercial = asObject(payload.commercial);
    const location = normalizeListingLocation(record.locationData ?? payload.location);
    const vehicleType = normalizeVehicleType(setup.vehicleType ?? record.section);
    const brand = normalizeVehicleSlug(basic.brandId === '__custom__' ? basic.customBrand : basic.brandId ?? basic.customBrand);
    const model = normalizeVehicleSlug(basic.modelId === '__custom__' ? basic.customModel : basic.modelId ?? basic.customModel);
    const version = asString(basic.version).trim() || null;
    const year = parseNumberFromString(basic.year);
    const mileageKm = parseNumberFromString(basic.mileage);
    const commercialPrice = operationType === 'rent'
        ? commercial.rentDaily ?? commercial.rentWeekly ?? commercial.rentMonthly ?? record.price
        : commercial.price ?? record.price;
    const price = parseMoneyAmount(commercialPrice);

    if (!brand || !model || price == null) return null;

    return {
        source: 'simple_internal',
        externalId: record.id,
        title: record.title,
        price,
        currency: detectVehiclePriceCurrency(record.price, commercial.currency),
        operationType,
        vehicleType,
        brand,
        model,
        version,
        year,
        mileageKm,
        fuelType: asString(basic.fuelType) || null,
        transmission: asString(basic.transmission) || null,
        bodyType: asString(basic.bodyType) || null,
        regionId: location?.regionId ?? null,
        communeId: location?.communeId ?? null,
        addressLabel: location?.publicLabel || record.location || null,
        distanceKm: targetGeoPoint && location ? haversineDistanceKm(targetGeoPoint, location.geoPoint) : null,
        publishedAt: record.updatedAt,
        url: record.href,
    };
}

function comparableMatchScore(
    item: VehicleValuationComparable,
    input: z.infer<typeof vehicleValuationRequestSchema>,
    version: string,
    normalizedModel: string,
    relaxedMatching: boolean,
): number {
    const modelMismatchPenalty = relaxedMatching && item.model !== normalizedModel ? 8 : 0;
    return Math.abs((item.year ?? input.year) - input.year) * 5
        + Math.abs((item.mileageKm ?? input.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 8_000
        + (item.distanceKm ?? 20) * 1.8
        + (item.regionId === input.regionId ? 0 : 6)
        + (item.communeId === input.communeId ? 0 : 4)
        + modelMismatchPenalty
        - (normalizeVehicleSlug(item.version) === version && version ? 4 : 0)
        - (asString(item.fuelType).toLowerCase() === asString(input.fuelType).toLowerCase() && input.fuelType ? 2 : 0)
        - (asString(item.transmission).toLowerCase() === asString(input.transmission).toLowerCase() && input.transmission ? 2 : 0)
        - (asString(item.bodyType).toLowerCase() === asString(input.bodyType).toLowerCase() && input.bodyType ? 1 : 0);
}

function comparableWeight(
    item: VehicleValuationComparable,
    input: z.infer<typeof vehicleValuationRequestSchema>,
): number {
    const yearPenalty = Math.abs((item.year ?? input.year) - input.year) * 0.035;
    const mileagePenalty = input.mileageKm != null
        ? Math.abs((item.mileageKm ?? input.mileageKm ?? 0) - input.mileageKm) / 120_000
        : Math.abs((item.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 220_000;
    const distancePenalty = (item.distanceKm ?? 12) / 40;
    return Math.max(0.12, 1.35 - yearPenalty - mileagePenalty - distancePenalty);
}

export function estimateVehicleValuation(input: z.infer<typeof vehicleValuationRequestSchema>) {
    const operationType = input.operationType;
    const vehicleType = normalizeVehicleType(input.vehicleType);
    const brand = normalizeVehicleSlug(input.brand);
    const model = normalizeVehicleSlug(input.model);
    const version = normalizeVehicleSlug(input.version);
    const targetCurrency = 'CLP';
    const feedState = getVehicleValuationFeedState();
    const targetLocation = geocodeListingLocation({
        sourceMode: 'custom',
        sourceAddressId: null,
        countryCode: 'CL',
        regionId: input.regionId,
        regionName: null,
        communeId: input.communeId,
        communeName: null,
        neighborhood: null,
        addressLine1: input.addressLine1,
        addressLine2: null,
        postalCode: null,
        geoPoint: makeGeoPoint(null, null, 'none'),
        visibilityMode: 'exact',
        publicMapEnabled: true,
        publicGeoPoint: makeGeoPoint(null, null, 'none'),
        publicLabel: '',
    });

    const allInternalComparables = Array.from(internalListingsSource())
        .map((record) => extractVehicleComparable(record, operationType, targetLocation.geoPoint))
        .filter((item): item is VehicleValuationComparable => Boolean(item))
        .filter((item) => item.currency === targetCurrency)
        .filter((item) => item.vehicleType === vehicleType)
        .filter((item) => item.regionId === input.regionId);

    const exactInternalComparables = allInternalComparables
        .filter((item) => item.brand === brand && item.model === model);

    const exactFeedComparables = feedState.records
        .filter((record) => record.operationType === operationType)
        .filter((record) => record.currency === targetCurrency)
        .filter((record) => record.vehicleType === vehicleType)
        .filter((record) => record.brand === brand && record.model === model)
        .filter((record) => record.regionId === input.regionId)
        .map((record) => {
            const feedLocation = geocodeListingLocation({
                sourceMode: 'custom',
                sourceAddressId: null,
                countryCode: 'CL',
                regionId: record.regionId,
                regionName: null,
                communeId: record.communeId,
                communeName: null,
                neighborhood: null,
                addressLine1: record.addressLabel,
                addressLine2: null,
                postalCode: null,
                geoPoint: makeGeoPoint(null, null, 'none'),
                visibilityMode: 'exact',
                publicMapEnabled: true,
                publicGeoPoint: makeGeoPoint(null, null, 'none'),
                publicLabel: record.addressLabel || '',
            });

            return {
                source: record.source,
                externalId: record.id,
                title: record.title,
                price: record.price,
                currency: record.currency,
                operationType: record.operationType,
                vehicleType: record.vehicleType,
                brand: record.brand,
                model: record.model,
                version: record.version,
                year: record.year,
                mileageKm: record.mileageKm,
                fuelType: record.fuelType,
                transmission: record.transmission,
                bodyType: record.bodyType,
                regionId: record.regionId,
                communeId: record.communeId,
                addressLabel: record.addressLabel,
                distanceKm: haversineDistanceKm(targetLocation.geoPoint, feedLocation.geoPoint),
                publishedAt: record.publishedAt,
                url: record.url,
            } satisfies VehicleValuationComparable;
        });

    let comparables = [...exactInternalComparables, ...exactFeedComparables];
    let usedRelaxedMatching = false;

    if (comparables.length < 2) {
        const relaxedInternalComparables = allInternalComparables
            .filter((item) => item.brand === brand && item.model !== model);
        const relaxedFeedComparables = feedState.records
            .filter((record) => record.operationType === operationType)
            .filter((record) => record.currency === targetCurrency)
            .filter((record) => record.vehicleType === vehicleType)
            .filter((record) => record.brand === brand && record.model !== model)
            .filter((record) => record.regionId === input.regionId)
            .map((record) => {
                const feedLocation = geocodeListingLocation({
                    sourceMode: 'custom',
                    sourceAddressId: null,
                    countryCode: 'CL',
                    regionId: record.regionId,
                    regionName: null,
                    communeId: record.communeId,
                    communeName: null,
                    neighborhood: null,
                    addressLine1: record.addressLabel,
                    addressLine2: null,
                    postalCode: null,
                    geoPoint: makeGeoPoint(null, null, 'none'),
                    visibilityMode: 'exact',
                    publicMapEnabled: true,
                    publicGeoPoint: makeGeoPoint(null, null, 'none'),
                    publicLabel: record.addressLabel || '',
                });

                return {
                    source: record.source,
                    externalId: record.id,
                    title: record.title,
                    price: record.price,
                    currency: record.currency,
                    operationType: record.operationType,
                    vehicleType: record.vehicleType,
                    brand: record.brand,
                    model: record.model,
                    version: record.version,
                    year: record.year,
                    mileageKm: record.mileageKm,
                    fuelType: record.fuelType,
                    transmission: record.transmission,
                    bodyType: record.bodyType,
                    regionId: record.regionId,
                    communeId: record.communeId,
                    addressLabel: record.addressLabel,
                    distanceKm: haversineDistanceKm(targetLocation.geoPoint, feedLocation.geoPoint),
                    publishedAt: record.publishedAt,
                    url: record.url,
                } satisfies VehicleValuationComparable;
            });

        if (relaxedInternalComparables.length > 0 || relaxedFeedComparables.length > 0) {
            usedRelaxedMatching = true;
            comparables = [...comparables, ...relaxedInternalComparables, ...relaxedFeedComparables];
        }
    }

    comparables = comparables
        .sort((a, b) => comparableMatchScore(a, input, version, model, usedRelaxedMatching) - comparableMatchScore(b, input, version, model, usedRelaxedMatching))
        .slice(0, 10);

    const weightedComparablePrice = comparables.length > 0
        ? comparables.reduce((sum, item) => sum + item.price * comparableWeight(item, input), 0)
            / comparables.reduce((sum, item) => sum + comparableWeight(item, input), 0)
        : null;

    const ageYears = Math.max(0, new Date().getFullYear() - input.year);
    const baseline = operationType === 'sale' ? saleBaselineVehiclePrice(vehicleType) : rentBaselineVehiclePrice(vehicleType);
    const yearFactor = operationType === 'sale'
        ? Math.max(0.35, 1 - ageYears * 0.055)
        : Math.max(0.45, 1 - ageYears * 0.03);
    const mileageFactor = input.mileageKm != null
        ? Math.max(0.62, 1 - Math.min(input.mileageKm, 300_000) / 380_000)
        : 1;
    const conditionFactor = conditionAdjustmentFactor(input.condition);
    const estimatedPrice = Math.round((weightedComparablePrice ?? baseline * yearFactor * mileageFactor * conditionFactor) * (weightedComparablePrice ? conditionFactor : 1));
    const variance = comparables.length >= 5 ? 0.08 : comparables.length >= 2 ? 0.13 : 0.2;
    const sourceCounts = new Map<string, number>();
    for (const comparable of comparables) {
        sourceCounts.set(comparable.source, (sourceCounts.get(comparable.source) ?? 0) + 1);
    }
    const totalComparables = comparables.length || 1;
    const sourceBreakdown: ValuationSourceBreakdown[] = Array.from(sourceCounts.entries()).map(([source, count]) => ({
        source,
        comparables: count,
        weight: Math.round((count / totalComparables) * 100) / 100,
        freshnessDays: Math.min(
            ...comparables
                .filter((item) => item.source === source)
                .map((item) => daysSince(item.publishedAt) ?? 999)
        ),
    }));
    const confidenceBreakdown: ValuationConfidenceBreakdown = {
        dataCoverage: Math.min(100, comparables.length * 10 + sourceBreakdown.length * 10),
        locationAccuracy: usedRelaxedMatching
            ? (targetLocation.geoPoint.precision === 'exact' ? 78 : targetLocation.geoPoint.precision === 'approximate' ? 62 : 42)
            : (targetLocation.geoPoint.precision === 'exact' ? 90 : targetLocation.geoPoint.precision === 'approximate' ? 72 : 48),
        similarity: Math.min(100, 42 + comparables.length * 6 + (version ? 8 : 0) + (input.fuelType ? 6 : 0) + (input.transmission ? 6 : 0) - (usedRelaxedMatching ? 10 : 0)),
        recency: Math.max(32, 100 - Math.round((comparables.reduce((sum, item) => sum + (daysSince(item.publishedAt) ?? 90), 0) / (comparables.length || 1)) * 0.8)),
    };
    const confidenceScore = Math.max(
        35,
        Math.min(
            93,
            Math.round((confidenceBreakdown.dataCoverage + confidenceBreakdown.locationAccuracy + confidenceBreakdown.similarity + confidenceBreakdown.recency) / 4)
        )
    );
    const historyKey = `${operationType}|${vehicleType}|${brand}|${model}|${input.regionId}|${input.communeId}`;
    const historicalSeries = feedState.historyBySegment[historyKey] ?? [];
    const marketTrendPct30d = historicalSeries.length >= 2
        ? Math.round((((historicalSeries[historicalSeries.length - 1].medianPrice) - (historicalSeries[historicalSeries.length - 2].medianPrice))
            / ((historicalSeries[historicalSeries.length - 2].medianPrice || 1))) * 10000) / 100
        : null;
    const estimatedLiquidityDays = operationType === 'sale'
        ? Math.max(18, 74 - comparables.length * 4 - Math.round((confidenceScore - 40) * 0.35))
        : Math.max(5, 28 - comparables.length * 2 - Math.round((confidenceScore - 40) * 0.18));
    const notes = [
        comparables.length > 0
            ? usedRelaxedMatching
                ? `Se consideraron ${comparables.length} comparables; parte usa la misma marca y tipo en la región por escasez del modelo exacto.`
                : `Se consideraron ${comparables.length} comparables combinando avisos del marketplace y fuentes externas del segmento.`
            : 'No hubo comparables suficientes; se aplicó una referencia base ajustada por año, kilometraje y condición.',
        input.mileageKm != null
            ? 'El kilometraje informado ajustó la estimación con mayor peso en los comparables.'
            : null,
        'La confianza mejora cuando coinciden versión, transmisión, combustible y ubicación del vehículo.',
        'Esta referencia orienta el precio de mercado, pero no reemplaza una tasación comercial ni garantiza el cierre.',
    ].filter((note): note is string => Boolean(note));

    return {
        engineVersion: 'v3',
        currency: targetCurrency,
        minPrice: Math.round(estimatedPrice * (1 - variance)),
        estimatedPrice,
        maxPrice: Math.round(estimatedPrice * (1 + variance)),
        confidenceScore,
        confidenceBreakdown,
        comparablesUsed: comparables.length,
        comparables,
        sourceBreakdown,
        historicalSeries,
        estimatedLiquidityDays,
        marketTrendPct30d,
        notes,
    };
}
