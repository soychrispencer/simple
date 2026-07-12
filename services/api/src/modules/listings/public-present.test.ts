import { describe, expect, it } from 'vitest';
import { createListingPublicPresent } from './public-present.js';
import type { ListingPublicRecord } from './public-present.js';

function baseListing(overrides: Partial<ListingPublicRecord> = {}): ListingPublicRecord {
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
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
        updatedAt: now,
        ...overrides,
    };
}

const present = createListingPublicPresent({
    toPublicMediaUrl: (value) => (typeof value === 'string' ? value : ''),
    publicSectionLabel: (section) => (section === 'rent' ? 'Arriendo' : 'Venta'),
    buildLocationPublicLabel: () => '',
    humanizePublicLocationFallback: (location) => location,
    listingAgeDays: (createdAt) => (createdAt ? 3 : 0),
    formatAgo: () => 'hace 1 día',
    usernameFromName: (name) => name.toLowerCase().replace(/\s+/g, '-'),
    usersById: new Map([
        ['user-1', { id: 'user-1', name: 'Ana Pérez', email: 'ana@example.com', phone: '+569' }],
    ]),
    getPublishedSellerProfile: () => ({
        displayName: 'Ana Autos',
        slug: 'ana-autos',
        avatarImageUrl: '/uploads/logo.webp',
        publicEmail: 'ventas@anaautos.cl',
        publicPhone: '+56911111111',
        publicWhatsapp: '+56922222222',
    }),
});

describe('listingToPublicResponse', () => {
    it('expone seller y métricas públicas', () => {
        const item = present.listingToPublicResponse(baseListing());
        expect(item.id).toBe('lst-1');
        expect(item.sectionLabel).toBe('Venta');
        expect(item.seller?.name).toBe('Ana Autos');
        expect(item.seller?.username).toBe('ana-autos');
        expect(item.seller?.profileHref).toBe('/perfil/ana-autos');
        expect(item.seller?.avatarUrl).toBe('/uploads/logo.webp');
        expect(item.seller?.email).toBe('ventas@anaautos.cl');
        expect(item.seller?.phone).toBe('+56911111111');
        expect(item.seller?.whatsapp).toBe('+56922222222');
        expect(item.views).toBe(10);
        expect(item.days).toBe(3);
    });

    it('no usa avatar personal si el negocio no tiene logo', () => {
        const withoutLogo = createListingPublicPresent({
            toPublicMediaUrl: (value) => (typeof value === 'string' ? value : ''),
            publicSectionLabel: (section) => (section === 'rent' ? 'Arriendo' : 'Venta'),
            buildLocationPublicLabel: () => '',
            humanizePublicLocationFallback: (location) => location,
            listingAgeDays: (createdAt) => (createdAt ? 3 : 0),
            formatAgo: () => 'hace 1 día',
            usernameFromName: (name) => name.toLowerCase().replace(/\s+/g, '-'),
            usersById: new Map([
                ['user-1', {
                    id: 'user-1',
                    name: 'Ana Pérez',
                    email: 'ana@example.com',
                    phone: '+569',
                    avatar: '/uploads/personal.webp',
                }],
            ]),
            getPublishedSellerProfile: () => ({
                displayName: 'Ana Autos',
                slug: 'ana-autos',
                avatarImageUrl: null,
                publicEmail: null,
                publicPhone: null,
                publicWhatsapp: null,
            }),
        });

        const item = withoutLogo.listingToPublicResponse(baseListing());
        expect(item.seller?.avatarUrl).toBeNull();
    });

    it('oculta listings no activos', () => {
        expect(present.isPublicListingVisible(baseListing())).toBe(true);
        expect(present.isPublicListingVisible(baseListing({ status: 'draft' }))).toBe(false);
    });

    it('resuelve slug por id o href', () => {
        const listing = baseListing({ href: '/vehiculo/corolla-2020' });
        expect(present.matchesListingSlug(listing, 'lst-1')).toBe(true);
        expect(present.matchesListingSlug(listing, 'corolla-2020')).toBe(true);
        expect(present.matchesListingSlug(listing, 'otro')).toBe(false);
    });

    it('summary residencial usa D/B/E/Bo ordenados', () => {
        const item = present.listingToPublicResponse(baseListing({
            vertical: 'propiedades',
            section: 'sale',
            title: 'Depto Providencia',
            rawData: {
                basic: {
                    propertyType: 'Departamento',
                    rooms: 2,
                    bathrooms: 1,
                    parkingSpaces: 1,
                    storageUnits: 1,
                    totalArea: 65,
                },
            },
        }));
        expect(item.summary).toEqual(['2D', '1B', '1E', '1Bo']);
    });

    it('summary no residencial usa tipo y m²', () => {
        const item = present.listingToPublicResponse(baseListing({
            vertical: 'propiedades',
            section: 'sale',
            title: 'Oficina Las Condes',
            rawData: {
                basic: {
                    propertyType: 'Oficina',
                    totalArea: 120,
                    parkingSpaces: 2,
                },
            },
        }));
        expect(item.summary).toEqual(['Oficina', '120 m²', '2E']);
    });

    it('summary autos prioriza año, tipo, km y combustible', () => {
        const item = present.listingToPublicResponse(baseListing({
            rawData: {
                basic: {
                    year: '2020',
                    bodyType: 'Sedán',
                    mileage: '45000',
                    fuelType: 'Bencina',
                    transmission: 'Automático',
                    condition: 'Seminuevo',
                },
            },
        }));
        expect(item.summary).toEqual(['2020', 'Sedán', '45.000 km', 'Bencina', 'Automático']);
        expect(item.year).toBe('2020');
        expect(item.condition).toBe('Seminuevo');
    });

    it('expone precio lista y descuento cuando hay oferta', () => {
        const item = present.listingToPublicResponse(baseListing({
            price: '$ 16.990.000',
            rawData: {
                commercial: {
                    currency: 'CLP',
                    price: '18990000',
                    offerPrice: '16990000',
                },
            },
        }));
        expect(item.price).toBe('$ 16.990.000');
        expect(item.priceOriginal).toBe('$ 18.990.000');
        expect(item.discountPercent).toBe(11);
    });
});
