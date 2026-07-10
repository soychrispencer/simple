import type { PropertyListingCardData } from '@/components/listings/property-listing-card';
import type { SavedListingRecord } from '@simple/utils';
import { orderPropertyCardTags } from '@simple/ui/listings';

type PropertySection = 'sale' | 'rent' | 'project';

function resolveSection(item: SavedListingRecord): PropertySection {
    if (item.section === 'rent') return 'rent';
    if (item.section === 'project') return 'project';
    return 'sale';
}

function resolveImages(item: SavedListingRecord): string[] {
    if (item.images && item.images.length > 0) return item.images;
    return item.image ? [item.image] : [];
}

export function mapSavedListingToPropertyCard(item: SavedListingRecord): PropertyListingCardData {
    const section = resolveSection(item);
    const images = resolveImages(item);

    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: section === 'project' ? 'Proyecto' : section === 'rent' ? 'Arriendo' : 'Precio',
        meta: orderPropertyCardTags(item.meta ?? []),
        location: item.location || 'Chile',
        sellerName: item.sellerName ?? 'Cuenta SimplePropiedades',
        sellerMeta: item.sellerMeta,
        badge: item.badge ?? 'Venta',
        variant: section,
        images,
        videoUrl: item.videoUrl,
        videoThumbnail: images[0],
    };
}
