import { describe, expect, it } from 'vitest';
import { estimatePropertyValuation } from './property-estimate.js';

describe('estimatePropertyValuation', () => {
    it('returns baseline estimate when no internal comparables', () => {
        const result = estimatePropertyValuation({
            operationType: 'sale',
            propertyType: 'departamento',
            regionId: 'rm',
            communeId: 'providencia',
            neighborhood: null,
            addressLine1: null,
            areaM2: 80,
            builtAreaM2: null,
            bedrooms: 2,
            bathrooms: 1,
            parkingSpaces: 0,
            storageUnits: 0,
            yearBuilt: 2015,
            condition: null,
        });

        expect(result.engineVersion).toBe('v3');
        expect(result.currency).toBe('UF');
        expect(result.estimatedPrice).toBeGreaterThan(0);
        expect(result.comparablesUsed).toBeGreaterThanOrEqual(0);
    });
});
