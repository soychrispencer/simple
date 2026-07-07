import { describe, expect, it } from 'vitest';
import { formatListingPrice } from './format.js';

describe('formatListingPrice', () => {
    it('formatea CLP sin forzar espacio tras el símbolo', () => {
        expect(formatListingPrice('$8000000')).toBe('$8.000.000');
        expect(formatListingPrice('$ 8.000.000')).toBe('$8.000.000');
        expect(formatListingPrice('8000000')).toBe('$8.000.000');
    });

    it('respeta UF', () => {
        expect(formatListingPrice('UF 4850')).toBe('UF 4.850');
        expect(formatListingPrice('UF 4.850')).toBe('UF 4.850');
    });

    it('respeta USD', () => {
        expect(formatListingPrice('USD 120000')).toBe('USD 120.000');
    });

    it('conserva sufijos y rangos', () => {
        expect(formatListingPrice('$450000 / mes')).toBe('$450.000 / mes');
        expect(formatListingPrice('UF 3000 - UF 5000')).toBe('UF 3.000 - UF 5.000');
        expect(formatListingPrice('Desde UF 3200')).toBe('Desde UF 3.200');
    });
});
