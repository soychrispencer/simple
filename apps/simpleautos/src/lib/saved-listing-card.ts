import type { VehicleListingCardData } from '@/components/listings/vehicle-listing-card';
import type { SavedListingRecord } from '@simple/utils';

type VehicleSection = 'sale' | 'rent' | 'auction';

function resolveSection(item: SavedListingRecord): VehicleSection {
    if (item.section === 'rent') return 'rent';
    if (item.section === 'auction') return 'auction';
    return 'sale';
}

function resolveImages(item: SavedListingRecord): string[] {
    if (item.images && item.images.length > 0) return item.images;
    return item.image ? [item.image] : [];
}

export function mapSavedListingToVehicleCard(item: SavedListingRecord): VehicleListingCardData {
    const section = resolveSection(item);
    const images = resolveImages(item);

    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: section === 'rent' ? 'Arriendo' : section === 'auction' ? 'Oferta actual' : 'Precio',
        meta: item.meta ?? [],
        location: item.location || 'Chile',
        sellerName: item.sellerName ?? 'Cuenta SimpleAutos',
        sellerMeta: item.sellerMeta,
        badge: item.badge ?? 'Venta',
        variant: section,
        images,
        videoUrl: item.videoUrl,
        videoThumbnail: images[0],
        ctaLabel: section === 'rent' ? 'Ver disponibilidad' : section === 'auction' ? 'Ver subasta' : 'Ver detalle',
    };
}
