import { describe, expect, it } from 'vitest';
import { getPortalSyncView, listingAgeDays, listingToResponse } from './panel-present.js';
import type { ListingRecord } from './persist.js';

function baseListing(overrides: Partial<ListingRecord> = {}): ListingRecord {
    const now = Date.now();
    return {
        id: 'lst-1',
        ownerId: 'user-1',
        vertical: 'autos',
        section: 'sale',
        title: 'Toyota Corolla',
        description: 'Buen estado',
        price: '$8.000.000',
        href: '/vehiculo/lst-1',
        status: 'active',
        views: 10,
        favs: 2,
        leads: 1,
        rawData: {},
        integrations: {},
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
        updatedAt: now,
        ...overrides,
    };
}

describe('listingAgeDays', () => {
    it('devuelve 0 sin createdAt', () => {
        expect(listingAgeDays(0)).toBe(0);
    });

    it('redondea días desde createdAt', () => {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        expect(listingAgeDays(threeDaysAgo)).toBeGreaterThanOrEqual(2);
        expect(listingAgeDays(threeDaysAgo)).toBeLessThanOrEqual(4);
    });
});

describe('getPortalSyncView', () => {
    it('marca missing cuando faltan campos requeridos del portal', () => {
        const record = baseListing({ rawData: { basic: {}, media: { photos: [] } } });
        const view = getPortalSyncView(record, 'yapo');
        expect(view.status).toBe('missing');
        expect(view.missingRequired.length).toBeGreaterThan(0);
    });

    it('refleja integración publicada', () => {
        const record = baseListing({
            integrations: {
                mercadolibre: {
                    portal: 'mercadolibre',
                    status: 'published',
                    publishedAt: 1,
                    externalId: 'ext-1',
                    lastError: null,
                    lastAttemptAt: 1,
                },
            },
        });
        const view = getPortalSyncView(record, 'mercadolibre');
        expect(view.status).toBe('published');
        expect(view.externalId).toBe('ext-1');
    });
});

describe('listingToResponse', () => {
    it('incluye integraciones y métricas del panel', () => {
        const record = baseListing();
        const item = listingToResponse(record);
        expect(item.id).toBe('lst-1');
        expect(item.leads).toBe(1);
        expect(item.days).toBeGreaterThanOrEqual(2);
        expect(Array.isArray(item.integrations)).toBe(true);
        expect(item.integrations.length).toBeGreaterThan(0);
        expect(item.publicationLifecycle).toBeDefined();
    });
});
