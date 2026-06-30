import type { z } from 'zod';
import type {
    GeoPoint,
    ValuationComparable,
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
import { getValuationFeedState } from './property-feeds.js';
import { daysSince, haversineDistanceKm } from './geo.js';
import { detectPriceCurrency, parseMoneyAmount } from './money.js';
import { propertyValuationRequestSchema } from './schemas.js';

export { propertyValuationRequestSchema } from './schemas.js';

let internalListingsSource: () => Iterable<InternalListingForValuation> = () => [];

export function configurePropertyValuationEstimate(deps: {
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

function normalizePropertyType(raw: unknown): string {
    const value = asString(raw).toLowerCase();
    if (value.includes('depto') || value.includes('departamento')) return 'departamento';
    if (value.includes('casa')) return 'casa';
    if (value.includes('oficina')) return 'oficina';
    if (value.includes('local')) return 'local';
    if (value.includes('terreno')) return 'terreno';
    if (value.includes('bodega')) return 'bodega';
    return value || 'propiedad';
}

function saleBaselineUfPerM2(propertyType: string): number {
    switch (propertyType) {
        case 'departamento':
            return 73;
        case 'casa':
            return 58;
        case 'oficina':
            return 66;
        case 'local':
            return 70;
        case 'bodega':
            return 34;
        case 'terreno':
            return 18;
        default:
            return 52;
    }
}

function rentBaselineClpPerM2(propertyType: string): number {
    switch (propertyType) {
        case 'departamento':
            return 12500;
        case 'casa':
            return 9800;
        case 'oficina':
            return 14500;
        case 'local':
            return 17500;
        case 'bodega':
            return 6500;
        case 'terreno':
            return 2200;
        default:
            return 9000;
    }
}

function extractPropertyComparable(
    record: InternalListingForValuation,
    operationType: 'sale' | 'rent',
    targetGeoPoint?: GeoPoint,
): ValuationComparable | null {
    if (record.vertical !== 'propiedades') return null;
    if (record.section !== operationType) return null;

    const payload = asObject(record.rawData);
    const basic = asObject(payload.basic);
    const location = normalizeListingLocation(record.locationData ?? payload.location);
    const areaM2 = parseNumberFromString(basic.totalArea) ?? parseNumberFromString(basic.surface);
    const price = parseMoneyAmount(record.price);
    if (price == null || areaM2 == null || areaM2 <= 0) return null;

    return {
        source: 'simple_internal',
        externalId: record.id,
        title: record.title,
        price,
        currency: detectPriceCurrency(record.price),
        operationType,
        propertyType: normalizePropertyType(basic.propertyType || basic.type || record.title),
        regionId: location?.regionId ?? null,
        communeId: location?.communeId ?? null,
        addressLabel: location?.publicLabel || record.location || null,
        distanceKm: targetGeoPoint && location ? haversineDistanceKm(targetGeoPoint, location.geoPoint) : null,
        bedrooms: parseNumberFromString(basic.rooms),
        bathrooms: parseNumberFromString(basic.bathrooms),
        areaM2,
        publishedAt: record.updatedAt,
        url: record.href,
    };
}

export function estimatePropertyValuation(input: z.infer<typeof propertyValuationRequestSchema>) {
    const propertyType = normalizePropertyType(input.propertyType);
    const operationType = input.operationType;
    const targetCurrency = operationType === 'sale' ? 'UF' : 'CLP';
    const feedState = getValuationFeedState();
    const targetLocation = geocodeListingLocation({
        sourceMode: 'custom',
        sourceAddressId: null,
        countryCode: 'CL',
        regionId: input.regionId,
        regionName: null,
        communeId: input.communeId,
        communeName: null,
        neighborhood: input.neighborhood,
        addressLine1: input.addressLine1,
        addressLine2: null,
        postalCode: null,
        geoPoint: makeGeoPoint(null, null, 'none'),
        visibilityMode: 'exact',
        publicMapEnabled: true,
        publicGeoPoint: makeGeoPoint(null, null, 'none'),
        publicLabel: '',
    });

    const internalComparables = Array.from(internalListingsSource())
        .map((record) => extractPropertyComparable(record, operationType, targetLocation.geoPoint))
        .filter((item): item is ValuationComparable => Boolean(item))
        .filter((item) => item.currency === targetCurrency)
        .filter((item) => item.propertyType === propertyType)
        .filter((item) => item.regionId === input.regionId)
        .filter((item) => item.communeId === input.communeId);

    const feedComparables = feedState.records
        .filter((record) => record.operationType === operationType)
        .filter((record) => record.currency === targetCurrency)
        .filter((record) => record.propertyType === propertyType)
        .filter((record) => record.regionId === input.regionId)
        .filter((record) => record.communeId === input.communeId)
        .map((record) => {
            const feedLocation = geocodeListingLocation({
                sourceMode: 'custom',
                sourceAddressId: null,
                countryCode: 'CL',
                regionId: record.regionId,
                regionName: null,
                communeId: record.communeId,
                communeName: null,
                neighborhood: record.neighborhood,
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
                propertyType: record.propertyType,
                regionId: record.regionId,
                communeId: record.communeId,
                addressLabel: record.addressLabel,
                distanceKm: haversineDistanceKm(targetLocation.geoPoint, feedLocation.geoPoint),
                bedrooms: record.bedrooms,
                bathrooms: record.bathrooms,
                areaM2: record.areaM2,
                publishedAt: record.publishedAt,
                url: record.url,
            } satisfies ValuationComparable;
        });

    const comparables = [...internalComparables, ...feedComparables]
        .sort((a, b) => {
            const areaA = a.areaM2 ?? input.areaM2;
            const areaB = b.areaM2 ?? input.areaM2;
            const distanceA = a.distanceKm ?? 999;
            const distanceB = b.distanceKm ?? 999;
            return (Math.abs(areaA - input.areaM2) + distanceA * 3) - (Math.abs(areaB - input.areaM2) + distanceB * 3);
        })
        .slice(0, 10);

    const comparablePricePerM2 = comparables
        .map((item) => (item.areaM2 && item.areaM2 > 0 ? item.price / item.areaM2 : null))
        .filter((value): value is number => value != null && Number.isFinite(value));

    const baselinePricePerM2 = operationType === 'sale'
        ? saleBaselineUfPerM2(propertyType)
        : rentBaselineClpPerM2(propertyType);

    const averageComparablePricePerM2 = comparablePricePerM2.length > 0
        ? comparablePricePerM2.reduce((sum, value) => sum + value, 0) / comparablePricePerM2.length
        : baselinePricePerM2;

    let adjustmentFactor = 1;
    if ((input.parkingSpaces ?? 0) > 0) adjustmentFactor += 0.03;
    if ((input.storageUnits ?? 0) > 0) adjustmentFactor += 0.015;
    if ((input.bathrooms ?? 0) >= 2) adjustmentFactor += 0.02;
    if ((input.bedrooms ?? 0) >= 3) adjustmentFactor += 0.02;
    if (input.yearBuilt != null && input.yearBuilt >= 2018) adjustmentFactor += 0.04;
    if (asString(input.condition).toLowerCase().includes('remodel')) adjustmentFactor += 0.03;

    const estimatedPricePerM2 = averageComparablePricePerM2 * adjustmentFactor;
    const estimatedPrice = estimatedPricePerM2 * input.areaM2;
    const variance = comparablePricePerM2.length >= 3 ? 0.09 : comparablePricePerM2.length >= 1 ? 0.14 : 0.2;
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
    const dataCoverageScore = Math.min(100, comparables.length * 12 + sourceBreakdown.length * 8);
    const locationAccuracyScore = targetLocation.geoPoint.precision === 'exact' ? 90 : targetLocation.geoPoint.precision === 'approximate' ? 70 : 45;
    const similarityScore = Math.min(100, 45 + comparablePricePerM2.length * 7 + ((input.bedrooms ?? 0) > 0 ? 8 : 0) + ((input.bathrooms ?? 0) > 0 ? 8 : 0));
    const recencyScore = Math.max(
        30,
        100 - Math.round(
            (comparables.reduce((sum, item) => sum + (daysSince(item.publishedAt) ?? 90), 0) / (comparables.length || 1)) * 0.7
        )
    );
    const confidenceBreakdown: ValuationConfidenceBreakdown = {
        dataCoverage: Math.min(100, dataCoverageScore),
        locationAccuracy: Math.min(100, locationAccuracyScore),
        similarity: Math.min(100, similarityScore),
        recency: Math.min(100, recencyScore),
    };
    const confidenceScore = Math.max(
        35,
        Math.min(
            92,
            Math.round((confidenceBreakdown.dataCoverage + confidenceBreakdown.locationAccuracy + confidenceBreakdown.similarity + confidenceBreakdown.recency) / 4)
        )
    );
    const historyKey = `${operationType}|${propertyType}|${input.regionId}|${input.communeId}`;
    const historicalSeries = feedState.historyBySegment[historyKey] ?? [];
    const marketTrendPct30d = historicalSeries.length >= 2
        ? Math.round((((historicalSeries[historicalSeries.length - 1].medianPricePerM2 ?? 0) - (historicalSeries[historicalSeries.length - 2].medianPricePerM2 ?? 0))
            / ((historicalSeries[historicalSeries.length - 2].medianPricePerM2 ?? 1) || 1)) * 10000) / 100
        : null;
    const estimatedLiquidityDays = operationType === 'sale'
        ? Math.max(28, 110 - comparables.length * 5 - Math.round((confidenceScore - 40) * 0.6))
        : Math.max(12, 48 - comparables.length * 3 - Math.round((confidenceScore - 40) * 0.35));

    const notes = [
        comparables.length > 0
            ? `Se consideraron ${comparables.length} comparables combinando publicaciones internas y feeds externos de la misma comuna.`
            : 'No hubo comparables suficientes; se aplicó una base tipológica ajustada.',
        operationType === 'sale'
            ? 'La estimación de venta se expresa en UF para mantener consistencia con publicaciones residenciales.'
            : 'La estimación de arriendo se expresa en CLP mensuales.',
        'La confianza mejora con geocodificación exacta, más fuentes integradas y comparables cerrados por sector.',
    ];

    return {
        engineVersion: 'v2',
        currency: targetCurrency,
        minPrice: Math.round(estimatedPrice * (1 - variance)),
        estimatedPrice: Math.round(estimatedPrice),
        maxPrice: Math.round(estimatedPrice * (1 + variance)),
        estimatedPricePerM2: Math.round(estimatedPricePerM2 * 100) / 100,
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
