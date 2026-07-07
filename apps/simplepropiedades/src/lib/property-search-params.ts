import type { PublicListingsFilters } from './public-listings';

function parsePriceBucket(price: string): Pick<PublicListingsFilters, 'price_from' | 'price_to'> {
    if (price.endsWith('+')) {
        return { price_from: price.slice(0, -1) };
    }
    const [from, to] = price.split('-');
    return {
        price_from: from || undefined,
        price_to: to || undefined,
    };
}

export function parsePropertyListingSearchParams(searchParams: URLSearchParams): PublicListingsFilters {
    const priceBucket = searchParams.get('price');
    const explicitFrom = searchParams.get('price_from') || undefined;
    const explicitTo = searchParams.get('price_to') || undefined;
    const bucketParsed = priceBucket && !explicitFrom && !explicitTo
        ? parsePriceBucket(priceBucket)
        : {};

    return {
        q: searchParams.get('q') || undefined,
        region: searchParams.get('region') || undefined,
        commune: searchParams.get('commune') || undefined,
        price_from: explicitFrom ?? bucketParsed.price_from,
        price_to: explicitTo ?? bucketParsed.price_to,
        property_type: searchParams.get('property_type') || undefined,
        bedrooms: searchParams.get('bedrooms') || undefined,
        bathrooms: searchParams.get('bathrooms') || undefined,
        parking: searchParams.get('parking') || undefined,
        min_area: searchParams.get('min_area') || undefined,
        sales_stage: searchParams.get('sales_stage') || undefined,
        delivery_status: searchParams.get('delivery_status') || undefined,
    };
}
