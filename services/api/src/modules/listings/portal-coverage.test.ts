import { describe, expect, it } from 'vitest';
import { getPortalCoverage } from './portal-coverage.js';

describe('getPortalCoverage', () => {
    it('marca faltantes requeridos en autos yapo', () => {
        const coverage = getPortalCoverage(
            {
                vertical: 'autos',
                listingType: 'sale',
                title: 'x',
                description: 'corta',
                price: '',
                rawData: { setup: { vehicleType: 'car', listingType: 'sale' }, basic: {}, media: { photos: [] }, location: {} },
            },
            'yapo',
        );
        expect(coverage.missingRequired.length).toBeGreaterThan(0);
        expect(coverage.missingRequired.some((label) => /título|descripción|precio|fotos/i.test(label))).toBe(true);
    });
});
