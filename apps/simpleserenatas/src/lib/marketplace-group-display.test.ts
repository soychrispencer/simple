import { describe, expect, it } from 'vitest';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import {
    cheapestService,
    extraServicesCount,
    filterMarketplaceGroupsByName,
    formatGroupRating,
    sortMarketplaceGroups,
    verificationBadgeLabel,
} from './marketplace-group-display';

function baseGroup(overrides: Partial<ProviderGroup> = {}): ProviderGroup {
    return {
        id: 'g1',
        ownerUserId: 'u1',
        ownerId: null,
        name: 'Mariachi Sol',
        slug: 'mariachi-sol',
        description: 'Serenatas en Santiago',
        logoUrl: null,
        coverUrl: null,
        phone: null,
        whatsapp: null,
        region: 'Región Metropolitana',
        comunaBase: 'Santiago',
        serviceComunas: ['Santiago', 'Providencia'],
        status: 'active',
        isVerified: true,
        ratingAverage: 4.5,
        ratingCount: 2,
        createdAt: '',
        updatedAt: '',
        ...overrides,
    };
}

describe('marketplace-group-display', () => {
    it('oculta rating sin reseñas', () => {
        expect(formatGroupRating(baseGroup({ ratingCount: 0 }))).toBeNull();
        expect(formatGroupRating(baseGroup({ ratingCount: 3 }))).toBe('4.5 (3)');
    });

    it('solo muestra badge verificado cuando aplica', () => {
        expect(verificationBadgeLabel(baseGroup({ isVerified: true }))).toBe('Verificado');
        expect(verificationBadgeLabel(baseGroup({ isVerified: false }))).toBeNull();
    });

    it('filtra y ordena por precio', () => {
        const items = [
            baseGroup({ id: 'a', name: 'Mariachi Sol', startingPrice: 90000 }),
            baseGroup({ id: 'b', name: 'Alfa', startingPrice: 50000, isVerified: false }),
        ];
        expect(filterMarketplaceGroupsByName(items, 'sol')).toHaveLength(1);
        const sorted = sortMarketplaceGroups(items, 'price_asc');
        expect(sorted[0]?.startingPrice).toBe(50000);
    });

    it('elige el servicio más barato', () => {
        const services: ProviderGroupService[] = [
            { id: '1', providerGroupId: 'g1', name: 'A', description: null, musiciansCount: 4, durationMinutes: 60, price: 80000, currency: 'CLP', eventType: null, isActive: true, sortOrder: 0, createdAt: '', updatedAt: '' },
            { id: '2', providerGroupId: 'g1', name: 'B', description: null, musiciansCount: 4, durationMinutes: 45, price: 60000, currency: 'CLP', eventType: null, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        ];
        expect(cheapestService(services)?.id).toBe('2');
    });

    it('cuenta servicios extra en preview', () => {
        expect(extraServicesCount(baseGroup({ activeServicesCount: 5, servicesPreview: [{ id: '1', name: 'A', price: 1, musiciansCount: 4, durationMinutes: 60 }] }))).toBe(4);
    });
});
