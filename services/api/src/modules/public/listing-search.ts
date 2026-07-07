export type PublicListingSearchQuery = {
    q?: string | null;
    region?: string | null;
    commune?: string | null;
    priceFrom?: string | null;
    priceTo?: string | null;
    brand?: string | null;
    model?: string | null;
    yearFrom?: string | null;
    yearTo?: string | null;
    fuel?: string | null;
    propertyType?: string | null;
    bedrooms?: string | null;
    bathrooms?: string | null;
    parking?: string | null;
    minArea?: string | null;
    salesStage?: string | null;
    deliveryStatus?: string | null;
};

export type PublicListingSearchDeps = {
    asString: (value: unknown) => string;
    asObject: (value: unknown) => Record<string, unknown>;
    parseNumberFromString: (value: unknown) => number | null;
};

function normalizeSearchToken(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function parseMinimumFilterValue(value: string): number | null {
    const normalized = value.trim().replace(/\+$/, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function listingPropertyType(rawData: Record<string, unknown>, asObject: PublicListingSearchDeps['asObject'], asString: PublicListingSearchDeps['asString']): string {
    const setup = asObject(rawData.setup);
    const basic = asObject(rawData.basic);
    return normalizeSearchToken(asString(setup.propertyType) || asString(basic.propertyType));
}

function propertyTypeMatches(listingType: string, filter: string): boolean {
    const normalizedFilter = normalizeSearchToken(filter);
    if (!normalizedFilter) return true;
    if (normalizedFilter === 'local') {
        return listingType.includes('local');
    }
    return listingType === normalizedFilter || listingType.includes(normalizedFilter);
}

function listingAreaValue(basic: Record<string, unknown>, project: Record<string, unknown>, parseNumberFromString: PublicListingSearchDeps['parseNumberFromString']): number {
    return parseNumberFromString(basic.totalArea)
        ?? parseNumberFromString(basic.usableArea)
        ?? parseNumberFromString(basic.surface)
        ?? parseNumberFromString(project.usableAreaFrom)
        ?? 0;
}

export function matchesPublicListingSearchFilters(
    listing: Record<string, unknown>,
    query: PublicListingSearchQuery,
    deps: PublicListingSearchDeps,
): boolean {
    const { asString, asObject, parseNumberFromString } = deps;

    if (query.q) {
        const searchQuery = query.q.toLowerCase();
        const title = (listing.title as string | undefined)?.toLowerCase() ?? '';
        const description = (listing.description as string | undefined)?.toLowerCase() ?? '';
        const rawData = asObject(listing.rawData);
        const basic = asObject(rawData.basic);
        const brandField = (asString(basic.brand) || asString(rawData.brand) || '').toLowerCase();
        const modelField = (asString(basic.model) || asString(rawData.model) || '').toLowerCase();
        if (
            !title.includes(searchQuery)
            && !description.includes(searchQuery)
            && !brandField.includes(searchQuery)
            && !modelField.includes(searchQuery)
        ) {
            return false;
        }
    }

    if (query.region) {
        const locationData = asObject(listing.locationData);
        const rawData = asObject(listing.rawData);
        const location = asObject(rawData.location);
        const listingRegionId = (asString(locationData.regionId) || asString(location.regionId) || '').toLowerCase();
        if (listingRegionId !== query.region.toLowerCase()) return false;
    }

    if (query.commune) {
        const locationData = asObject(listing.locationData);
        const rawData = asObject(listing.rawData);
        const location = asObject(rawData.location);
        const listingCommuneId = (asString(locationData.communeId) || asString(location.communeId) || '').toLowerCase();
        if (listingCommuneId !== query.commune.toLowerCase()) return false;
    }

    if (query.brand) {
        const rawData = asObject(listing.rawData);
        const basic = asObject(rawData.basic);
        const listingBrand = (asString(basic.brand) || asString(rawData.brand) || '').toLowerCase();
        if (listingBrand !== query.brand.toLowerCase()) return false;
    }

    if (query.model) {
        const rawData = asObject(listing.rawData);
        const basic = asObject(rawData.basic);
        const listingModel = (asString(basic.model) || asString(rawData.model) || '').toLowerCase();
        if (listingModel !== query.model.toLowerCase()) return false;
    }

    if (query.fuel) {
        const rawData = asObject(listing.rawData);
        const basic = asObject(rawData.basic);
        const listingFuel = (asString(basic.fuelType) || asString(rawData.fuelType) || '').toLowerCase();
        if (listingFuel !== query.fuel.toLowerCase()) return false;
    }

    const rawData = asObject(listing.rawData);
    const basic = asObject(rawData.basic);
    const project = asObject(rawData.project);

    if (query.propertyType) {
        const listingType = listingPropertyType(rawData, asObject, asString);
        if (!propertyTypeMatches(listingType, query.propertyType)) return false;
    }

    if (query.bedrooms) {
        const minimum = parseMinimumFilterValue(query.bedrooms);
        const listingRooms = parseNumberFromString(basic.rooms) ?? 0;
        if (minimum != null && listingRooms < minimum) return false;
    }

    if (query.bathrooms) {
        const minimum = parseMinimumFilterValue(query.bathrooms);
        const listingBathrooms = parseNumberFromString(basic.bathrooms) ?? 0;
        if (minimum != null && listingBathrooms < minimum) return false;
    }

    if (query.parking) {
        const minimum = parseMinimumFilterValue(query.parking);
        const listingParking = parseNumberFromString(basic.parkingSpaces) ?? 0;
        if (minimum != null && listingParking < minimum) return false;
    }

    if (query.minArea) {
        const minimumArea = Number(query.minArea);
        const listingArea = listingAreaValue(basic, project, parseNumberFromString);
        if (Number.isFinite(minimumArea) && listingArea < minimumArea) return false;
    }

    if (query.salesStage) {
        const listingStage = normalizeSearchToken(asString(project.salesStage));
        const filterStage = normalizeSearchToken(query.salesStage);
        if (!listingStage.includes(filterStage)) return false;
    }

    if (query.deliveryStatus) {
        const listingDelivery = normalizeSearchToken(asString(project.deliveryStatus));
        const filterDelivery = normalizeSearchToken(query.deliveryStatus);
        if (!listingDelivery.includes(filterDelivery)) return false;
    }

    if (query.yearFrom) {
        const listingYear = parseNumberFromString(basic.year) ?? parseNumberFromString(rawData.year) ?? 0;
        if (listingYear < Number(query.yearFrom)) return false;
    }

    if (query.yearTo) {
        const listingYear = parseNumberFromString(basic.year) ?? parseNumberFromString(rawData.year) ?? 0;
        if (listingYear > Number(query.yearTo)) return false;
    }

    const commercial = asObject(rawData.commercial);
    const listingPrice = parseNumberFromString(listing.price)
        ?? parseNumberFromString(commercial.price)
        ?? parseNumberFromString(rawData.price)
        ?? 0;
    if (query.priceFrom && query.priceTo) {
        return listingPrice >= Number(query.priceFrom) && listingPrice <= Number(query.priceTo);
    }
    if (query.priceFrom) return listingPrice >= Number(query.priceFrom);
    if (query.priceTo) return listingPrice <= Number(query.priceTo);

    return true;
}

export type ListPublicListingsInput<T extends Record<string, unknown>> = {
    vertical: string;
    section: string | null;
    limit: number;
    searchQuery: PublicListingSearchQuery;
    deps: PublicListingSearchDeps & {
        isPublicListingVisible: (listing: T) => boolean;
        listingToPublicResponse: (listing: T) => unknown;
        fetchActiveRowsFromDb: () => Promise<unknown[]>;
        mapRowToListing: (row: unknown) => T;
        listingsById: Map<string, T>;
    };
};

/**
 * Lectura DB-first del listado público; si la consulta falla o no devuelve filas visibles, usa Map en memoria.
 */
export async function listPublicListingsFromSource<T extends Record<string, unknown>>(
    input: ListPublicListingsInput<T>,
): Promise<unknown[]> {
    const { vertical, section, limit, searchQuery, deps } = input;
    const {
        asString,
        asObject,
        parseNumberFromString,
        isPublicListingVisible,
        listingToPublicResponse,
        fetchActiveRowsFromDb,
        mapRowToListing,
        listingsById,
    } = deps;

    const matchesListing = (listing: T) => {
        if (asString(listing.vertical) !== vertical) return false;
        if (!isPublicListingVisible(listing)) return false;
        if (section && asString(listing.section) !== section) return false;
        return matchesPublicListingSearchFilters(listing, searchQuery, {
            asString,
            asObject,
            parseNumberFromString,
        });
    };

    const toResponseItems = (records: T[]) =>
        records
            .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
            .slice(0, limit)
            .map((listing) => listingToPublicResponse(listing));

    try {
        const rows = await fetchActiveRowsFromDb();
        if (rows.length > 0) {
            const fromDb = rows.map(mapRowToListing).filter(matchesListing);
            const items = toResponseItems(fromDb);
            if (items.length > 0) return items;
        }
    } catch {
        // fallback Map
    }

    const fromMap = Array.from(listingsById.values()).filter(matchesListing);
    return toResponseItems(fromMap);
}
