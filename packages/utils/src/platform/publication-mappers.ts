import type { OperatorProductRecord } from '../operator-product-config.js';
import type { OperatorServiceRecord } from '../operator-service-config.js';
import type { Publication, PublicationStatus } from './publication.js';
import { publicationDetailHref } from './publication.js';

function mapActiveStatus(isActive: boolean): PublicationStatus {
    return isActive ? 'active' : 'paused';
}

export function operatorServiceToPublication(
    item: OperatorServiceRecord,
    opts: { verticalId: string; createdAt?: string; userId?: string; businessId?: string },
): Publication {
    const images = item.imageUrl ? [item.imageUrl] : [];
    return {
        id: item.id,
        publishType: 'service',
        verticalId: opts.verticalId,
        title: item.name,
        description: item.description ?? undefined,
        images,
        status: mapActiveStatus(item.isActive),
        href: publicationDetailHref('service', item.id),
        createdAt: opts.createdAt ?? new Date().toISOString(),
        pricing: {
            amount: item.pricingMode === 'quote' ? null : item.price,
            currency: item.currency,
            label: item.pricingMode === 'quote' ? 'A cotizar' : undefined,
        },
        visibility: { isPublic: item.isActive },
        owner: { userId: opts.userId, businessId: opts.businessId },
        persistence: { source: 'operator_service' },
    };
}

export function operatorProductToPublication(
    item: OperatorProductRecord,
    opts: { verticalId: string; createdAt?: string; userId?: string; businessId?: string },
): Publication {
    const images = item.imageUrl ? [item.imageUrl] : [];
    return {
        id: item.id,
        publishType: 'product',
        verticalId: opts.verticalId,
        title: item.name,
        description: item.description ?? undefined,
        images,
        status: mapActiveStatus(item.isActive),
        href: publicationDetailHref('product', item.id),
        createdAt: opts.createdAt ?? new Date().toISOString(),
        pricing: {
            amount: item.price,
            currency: item.currency,
        },
        visibility: { isPublic: item.isActive },
        owner: { userId: opts.userId, businessId: opts.businessId },
        persistence: { source: 'operator_product' },
    };
}
