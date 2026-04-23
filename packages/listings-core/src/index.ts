// Listings Core Package
// Shared types and utilities for autos and propiedades verticals

export interface ListingCoreConfig {
    vertical: 'autos' | 'propiedades';
    basePath: string;
}

export interface ListingMetadata {
    id: string;
    title: string;
    description?: string;
    price: number;
    currency: 'CLP' | 'USD';
    location: {
        regionId: string | null;
        regionName: string | null;
        communeId: string | null;
        communeName: string | null;
    };
    images: string[];
    status: 'draft' | 'active' | 'paused' | 'sold' | 'archived';
    createdAt: number;
    updatedAt: number;
}

export interface ListingFilters {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    regionId?: string;
    communeId?: string;
    status?: ListingMetadata['status'];
}

export function formatPrice(price: number, currency: 'CLP' | 'USD'): string {
    if (currency === 'CLP') {
        return `$${price.toLocaleString('es-CL')}`;
    }
    return `USD ${price.toLocaleString('en-US')}`;
}

export function getListingStatusLabel(status: ListingMetadata['status']): string {
    const labels: Record<ListingMetadata['status'], string> = {
        draft: 'Borrador',
        active: 'Activa',
        paused: 'Pausada',
        sold: 'Vendida',
        archived: 'Archivada',
    };
    return labels[status] || status;
}
