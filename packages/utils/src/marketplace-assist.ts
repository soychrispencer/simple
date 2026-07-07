export const FACEBOOK_MARKETPLACE_VEHICLE_URL = 'https://www.facebook.com/marketplace/create/vehicle';
export const FACEBOOK_MARKETPLACE_HOME_URL = 'https://www.facebook.com/marketplace/create';

export type MarketplaceAssistVertical = 'autos' | 'propiedades';

export function getFacebookMarketplaceCreateUrl(vertical: MarketplaceAssistVertical): string {
    return vertical === 'autos' ? FACEBOOK_MARKETPLACE_VEHICLE_URL : FACEBOOK_MARKETPLACE_HOME_URL;
}

export function buildMarketplaceListingCopy(input: {
    title: string;
    price?: string | null;
    description?: string | null;
    location?: string | null;
    publicUrl: string;
    brandLabel?: string;
}): string {
    const brand = input.brandLabel?.trim() || 'Simple';
    const lines = [
        input.title.trim(),
        input.price?.trim() ? `Precio: ${input.price.trim()}` : null,
        input.location?.trim() ? `Ubicación: ${input.location.trim()}` : null,
        '',
        input.description?.trim() || null,
        '',
        `Ver en ${brand}: ${input.publicUrl}`,
    ].filter((line) => line !== null && line !== undefined);

    return lines.join('\n').trim();
}

export function buildMarketplacePublicUrl(listingHref: string): string {
    if (listingHref.startsWith('http')) return listingHref;
    if (typeof window === 'undefined') return listingHref;
    return `${window.location.origin}${listingHref}`;
}
