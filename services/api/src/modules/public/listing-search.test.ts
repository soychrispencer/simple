import { describe, expect, it, vi } from 'vitest';
import { buildPublicListingSearchSqlConditions } from '../listings/public-search-sql.js';
import { listPublicListingsFromSource, matchesPublicListingSearchFilters } from './listing-search.js';

const deps = {
    asString: (value: unknown) => (typeof value === 'string' ? value : String(value ?? '')),
    asObject: (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}),
    parseNumberFromString: (value: unknown) => {
        const raw = String(value ?? '').replace(/[^\d]/g, '');
        return raw ? Number(raw) : null;
    },
};

describe('matchesPublicListingSearchFilters', () => {
    it('filtra por marca en rawData', () => {
        const listing = {
            title: 'Auto',
            description: '',
            rawData: { basic: { brand: 'Toyota' } },
            price: '1000000',
        };
        expect(matchesPublicListingSearchFilters(listing, { brand: 'toyota' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { brand: 'ford' }, deps)).toBe(false);
    });

    it('filtra por modelo y región', () => {
        const listing = {
            title: 'SUV',
            description: '',
            rawData: { basic: { model: 'RAV4' }, location: { regionId: 'rm' } },
            locationData: {},
            price: '1',
        };
        expect(matchesPublicListingSearchFilters(listing, { model: 'rav4' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { region: 'rm' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { region: 'valpo' }, deps)).toBe(false);
    });

    it('filtra por texto q en título', () => {
        const listing = {
            title: 'Chevrolet Spark',
            description: '',
            rawData: {},
            price: '1',
        };
        expect(matchesPublicListingSearchFilters(listing, { q: 'spark' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { q: 'ford' }, deps)).toBe(false);
    });

    it('filtra por rango de precio y año', () => {
        const listing = {
            title: 'SUV',
            description: '',
            rawData: { basic: { year: '2020' }, commercial: { price: '15000000' } },
            price: '15.000.000',
        };
        expect(matchesPublicListingSearchFilters(listing, { priceFrom: '10000000', priceTo: '20000000' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { priceFrom: '20000001' }, deps)).toBe(false);
        expect(matchesPublicListingSearchFilters(listing, { yearFrom: '2019', yearTo: '2021' }, deps)).toBe(true);
        expect(matchesPublicListingSearchFilters(listing, { yearTo: '2019' }, deps)).toBe(false);
    });
});

describe('buildPublicListingSearchSqlConditions', () => {
    it('genera condiciones para marca, modelo y región', () => {
        const conditions = buildPublicListingSearchSqlConditions({
            brand: 'toyota',
            model: 'corolla',
            region: 'rm',
        });
        expect(conditions).toHaveLength(3);
    });

    it('genera condiciones para precio y año', () => {
        const conditions = buildPublicListingSearchSqlConditions({
            priceFrom: '5000000',
            priceTo: '15000000',
            yearFrom: '2018',
            yearTo: '2024',
        });
        expect(conditions).toHaveLength(4);
    });

    it('no genera condiciones cuando el query está vacío', () => {
        expect(buildPublicListingSearchSqlConditions({})).toHaveLength(0);
    });
});

describe('listPublicListingsFromSource', () => {
    it('prefiere filas DB cuando hay resultados visibles', async () => {
        const dbListing = {
            id: 'db-1',
            vertical: 'autos',
            section: 'sale',
            status: 'active',
            title: 'DB',
            description: '',
            price: '1',
            updatedAt: 100,
        };
        const mapListing = {
            id: 'map-1',
            vertical: 'autos',
            section: 'sale',
            status: 'active',
            title: 'Map',
            description: '',
            price: '1',
            updatedAt: 50,
        };

        const items = await listPublicListingsFromSource({
            vertical: 'autos',
            section: 'sale',
            limit: 10,
            searchQuery: {},
            deps: {
                ...deps,
                isPublicListingVisible: () => true,
                listingToPublicResponse: (listing) => ({ id: listing.id }),
                fetchActiveRowsFromDb: vi.fn().mockResolvedValue([{ id: 'row' }]),
                mapRowToListing: () => dbListing,
                listingsById: new Map([['map-1', mapListing]]),
            },
        });

        expect(items).toEqual([{ id: 'db-1' }]);
    });

    it('usa Map si la consulta DB falla', async () => {
        const mapListing = {
            id: 'map-1',
            vertical: 'autos',
            section: 'sale',
            status: 'active',
            title: 'Map',
            description: '',
            price: '1',
            updatedAt: 50,
        };

        const items = await listPublicListingsFromSource({
            vertical: 'autos',
            section: null,
            limit: 10,
            searchQuery: {},
            deps: {
                ...deps,
                isPublicListingVisible: () => true,
                listingToPublicResponse: (listing) => ({ id: listing.id }),
                fetchActiveRowsFromDb: vi.fn().mockRejectedValue(new Error('db down')),
                mapRowToListing: () => mapListing,
                listingsById: new Map([['map-1', mapListing]]),
            },
        });

        expect(items).toEqual([{ id: 'map-1' }]);
    });
});
