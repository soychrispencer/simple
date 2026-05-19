import { describe, expect, it } from 'vitest';
import { applyLeadCountsToListingCache } from './lead-count.js';

describe('applyLeadCountsToListingCache', () => {
    it('actualiza Map de conteos y campo leads en listings cargados', () => {
        const listingsById = new Map([
            ['a', { leads: 0 }],
            ['b', { leads: 99 }],
        ]);
        const listingLeadCountsByListing = new Map<string, number>();
        const counts = new Map([
            ['a', 3],
            ['b', 0],
            ['c', 5],
        ]);

        applyLeadCountsToListingCache(listingsById, listingLeadCountsByListing, counts, ['a', 'b', 'c']);

        expect(listingLeadCountsByListing.get('a')).toBe(3);
        expect(listingLeadCountsByListing.get('b')).toBe(0);
        expect(listingLeadCountsByListing.get('c')).toBe(5);
        expect(listingsById.get('a')?.leads).toBe(3);
        expect(listingsById.get('b')?.leads).toBe(0);
        expect(listingsById.has('c')).toBe(false);
    });
});
