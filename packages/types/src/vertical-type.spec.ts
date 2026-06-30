import { describe, expect, it } from 'vitest';
import { LISTING_VERTICAL_TYPES, VERTICAL_TYPES, listingVerticalTypeSchema, verticalTypeSchema } from './index';

describe('vertical type schemas', () => {
    it('keeps current Simple verticals centralized', () => {
        expect(VERTICAL_TYPES).toEqual(['autos', 'propiedades', 'agenda']);
        expect(verticalTypeSchema.safeParse('serenatas').success).toBe(false);
    });

    it('keeps listing verticals separate from agenda', () => {
        expect(LISTING_VERTICAL_TYPES).toEqual(['autos', 'propiedades']);
        expect(listingVerticalTypeSchema.safeParse('agenda').success).toBe(false);
    });
});
