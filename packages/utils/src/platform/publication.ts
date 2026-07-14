import type { PublishType } from './vertical-config.js';

export type PublicationStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';

export type PublicationPersistenceSource = 'listing' | 'operator_service' | 'operator_product';

/**
 * Entidad de dominio: todo lo publicado.
 * Persistencia (listing / operator_*) se mapea hacia aquí; la UI no consume Listing crudo.
 */
export type Publication = {
    id: string;
    publishType: PublishType;
    verticalId: string;
    title: string;
    description?: string;
    images: string[];
    status: PublicationStatus;
    href: string;
    createdAt: string;
    updatedAt?: string;
    pricing?: {
        amount?: string | null;
        currency?: string;
        label?: string;
    };
    visibility?: {
        isPublic: boolean;
    };
    owner: {
        businessId?: string;
        userId?: string;
    };
    /** Solo infraestructura / mappers */
    persistence?: {
        source: PublicationPersistenceSource;
    };
};

export function publicationListPath(publishType: PublishType): string {
    switch (publishType) {
        case 'sale':
            return '/ventas';
        case 'rent':
            return '/arriendos';
        case 'auction':
            return '/subastas';
        case 'project':
            return '/proyectos';
        case 'service':
            return '/servicios';
        case 'product':
            return '/productos';
        default:
            return '/';
    }
}

export function publicationDetailHref(
    publishType: PublishType,
    id: string,
    opts?: { listingHref?: string | null },
): string {
    if (publishType === 'service') return `/servicios/${encodeURIComponent(id)}`;
    if (publishType === 'product') return `/productos/${encodeURIComponent(id)}`;
    if (opts?.listingHref) return opts.listingHref;
    return publicationListPath(publishType);
}
