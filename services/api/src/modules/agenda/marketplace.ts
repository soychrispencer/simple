import type { StructuredLocation } from '@simple/types';

type AgendaMarketplaceRow = {
    slug: string;
    displayName: string | null;
    profession: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    countryCode: string | null;
    regionId: string | null;
    localityId: string | null;
    serviceLocalities: string[] | null;
    servesOnline: boolean | null;
    servesPresential: boolean | null;
    timezone: string | null;
};

export type AgendaMarketplaceQuery = {
    country?: string;
    region?: string;
    regionId?: string;
    locality?: string;
    localityId?: string;
    profession?: string;
    q?: string;
    modality?: 'online' | 'presential' | 'all';
};

function normalizeSearchText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim();
}

export function mapAgendaProfileToMarketplaceItem(row: AgendaMarketplaceRow) {
    return {
        slug: row.slug,
        displayName: row.displayName,
        profession: row.profession,
        headline: row.headline,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        countryCode: row.countryCode ?? 'CL',
        region: row.region,
        regionId: row.regionId,
        city: row.city,
        localityId: row.localityId,
        serviceLocalities: row.serviceLocalities ?? [],
        servesOnline: row.servesOnline ?? true,
        servesPresential: row.servesPresential ?? false,
        timezone: row.timezone ?? 'America/Santiago',
    };
}

export function filterAgendaMarketplaceProfiles(
    rows: AgendaMarketplaceRow[],
    query: AgendaMarketplaceQuery,
) {
    const country = query.country?.trim().toUpperCase();
    const region = query.region?.trim();
    const regionId = query.regionId?.trim();
    const locality = query.locality?.trim();
    const localityId = query.localityId?.trim();
    const profession = query.profession?.trim();
    const q = query.q?.trim();
    const qNormalized = q ? normalizeSearchText(q) : '';
    const modality = query.modality ?? 'all';

    return rows.filter((row) => {
        const rowCountry = (row.countryCode ?? 'CL').toUpperCase();
        if (country && rowCountry !== country) return false;

        if (modality === 'online' && !row.servesOnline) return false;
        if (modality === 'presential' && !row.servesPresential) return false;

        if (modality !== 'online') {
            if (regionId && row.regionId && row.regionId !== regionId) return false;
            if (region && row.region && row.region.toLowerCase() !== region.toLowerCase()) return false;

            const coverage = row.serviceLocalities ?? [];
            if (locality || localityId) {
                const matchesBase = locality
                    ? row.city?.toLowerCase() === locality.toLowerCase()
                    : false;
                const matchesCoverage = locality
                    ? coverage.some((item) => item.toLowerCase() === locality.toLowerCase())
                    : false;
                if (locality && !matchesBase && !matchesCoverage && row.servesPresential) return false;
            }
        }

        if (profession && row.profession) {
            if (!row.profession.toLowerCase().includes(profession.toLowerCase())) return false;
        } else if (profession && !row.profession) {
            return false;
        }

        if (qNormalized) {
            const haystack = normalizeSearchText(
                [row.displayName, row.profession, row.headline, row.bio, row.city, row.region]
                    .filter(Boolean)
                    .join(' '),
            );
            if (!haystack.includes(qNormalized)) return false;
        }

        return true;
    });
}

export function publicOperatingLocationFromProfile(row: AgendaMarketplaceRow): StructuredLocation {
    return {
        countryCode: row.countryCode ?? 'CL',
        regionId: row.regionId ?? null,
        regionName: row.region ?? null,
        localityId: row.localityId ?? null,
        localityName: row.city ?? null,
    };
}
