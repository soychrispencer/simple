export const FACEBOOK_MARKETPLACE_VEHICLE_URL = 'https://www.facebook.com/marketplace/create/vehicle';

export function buildMarketplaceListingCopy(input: {
    title: string;
    price?: string | null;
    description?: string | null;
    location?: string | null;
    publicUrl: string;
}): string {
    const lines = [
        input.title.trim(),
        input.price?.trim() ? `Precio: ${input.price.trim()}` : null,
        input.location?.trim() ? `Ubicación: ${input.location.trim()}` : null,
        '',
        input.description?.trim() || null,
        '',
        `Ver en SimpleAutos: ${input.publicUrl}`,
    ].filter((line) => line !== null && line !== undefined);

    return lines.join('\n').trim();
}

export function buildMarketplacePublicUrl(listingHref: string): string {
    if (listingHref.startsWith('http')) return listingHref;
    if (typeof window === 'undefined') return listingHref;
    return `${window.location.origin}${listingHref}`;
}
