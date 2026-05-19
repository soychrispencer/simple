import { describe, expect, it } from 'vitest';
import { buildListingLeadActionExternalSourceId } from './listing-lead-ingest.js';

describe('buildListingLeadActionExternalSourceId', () => {
    it('es estable para la misma identidad de contacto', () => {
        const input = {
            listingId: 'listing-1',
            source: 'whatsapp' as const,
            buyerUserId: 'buyer-1',
            contactEmail: 'test@example.com',
        };
        expect(buildListingLeadActionExternalSourceId(input)).toBe(
            buildListingLeadActionExternalSourceId(input),
        );
    });

    it('cambia cuando cambia el listing o el canal', () => {
        const base = {
            listingId: 'listing-1',
            source: 'whatsapp' as const,
            contactEmail: 'test@example.com',
        };
        const a = buildListingLeadActionExternalSourceId(base);
        const b = buildListingLeadActionExternalSourceId({ ...base, listingId: 'listing-2' });
        const c = buildListingLeadActionExternalSourceId({ ...base, source: 'email' });
        expect(a).not.toBe(b);
        expect(a).not.toBe(c);
    });
});
