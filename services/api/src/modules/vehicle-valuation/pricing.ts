import { asString } from '../shared/index.js';

// Vehicle pricing utilities
export function detectVehiclePriceCurrency(value: unknown, fallback?: unknown): 'CLP' | 'USD' {
    const fallbackValue = asString(fallback).trim().toUpperCase();
    if (fallbackValue === 'USD') return 'USD';
    const raw = asString(value).trim().toUpperCase();
    if (raw.includes('USD') || raw.includes('US$')) return 'USD';
    return 'CLP';
}

export function saleBaselineVehiclePrice(vehicleType: string): number {
    switch (vehicleType) {
        case 'motorcycle':
            return 6_200_000;
        case 'truck':
            return 78_000_000;
        case 'bus':
            return 69_000_000;
        case 'machinery':
            return 118_000_000;
        case 'nautical':
            return 24_000_000;
        case 'aerial':
            return 92_000_000;
        case 'car':
        default:
            return 14_500_000;
    }
}

export function rentBaselineVehiclePrice(vehicleType: string): number {
    switch (vehicleType) {
        case 'motorcycle':
            return 28_000;
        case 'truck':
            return 180_000;
        case 'bus':
            return 250_000;
        case 'machinery':
            return 320_000;
        case 'nautical':
            return 160_000;
        case 'aerial':
            return 680_000;
        case 'car':
        default:
            return 38_000;
    }
}

export function conditionAdjustmentFactor(raw: unknown): number {
    const value = asString(raw).toLowerCase();
    if (!value) return 1;
    if (value.includes('nuevo')) return 1.08;
    if (value.includes('demo')) return 1.05;
    if (value.includes('seminuevo') || value.includes('certific')) return 1.04;
    if (value.includes('usado')) return 1;
    if (value.includes('restaur')) return 0.97;
    if (value.includes('sinies')) return 0.82;
    if (value.includes('repar')) return 0.75;
    if (value.includes('repuesto')) return 0.65;
    if (value.includes('classic') || value.includes('clasico')) return 1.02;
    return 1;
}

// Placeholder for extractVehicleComparable - needs more dependencies
export function extractVehicleComparable(record: any, operationType: 'sale' | 'rent', targetGeoPoint?: any): any {
    // Implementation moved from index.ts - needs proper types and dependencies
    return null;
}

// Placeholder for estimateVehicleValuation - needs more dependencies
export function estimateVehicleValuation(input: any): any {
    // Implementation moved from index.ts - needs proper types and dependencies
    return null;
}