import { asObject, asString } from '../shared/helpers.js';

export type SocialFeedListingSection = 'sale' | 'rent' | 'auction' | 'project';

/** Clip de Descubre: solo publicaciones con video (formato Reel). */
export type SocialFeedClip = {
    id: string;
    vertical: string;
    section: 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
    href: string;
    title: string;
    price: string;
    location: string;
    authorId: string;
    mediaType: 'video';
    mediaUrl: string;
    posterUrl?: string;
    views: number;
    saves: number;
    publishedAt: number;
    featured?: boolean;
    specs?: Array<{ label: string; value: string; icon?: string }>;
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
};

export type SocialFeedListingRecord = {
    id: string;
    vertical: string;
    section: SocialFeedListingSection;
    href: string;
    title: string;
    price: string;
    location?: string;
    ownerId: string;
    views: number;
    favs: number;
    updatedAt: number;
    rawData?: unknown;
};

export type SocialFeedDeps = {
    listingsById: Map<string, SocialFeedListingRecord>;
    getActiveFeaturedListingIds: (vertical: string) => Set<string>;
    isPublicListingVisible: (record: SocialFeedListingRecord) => boolean;
    extractListingMediaUrls: (record: SocialFeedListingRecord) => string[];
    publicSectionLabel: (section: SocialFeedListingSection) => string;
};

function socialSectionFromListing(section: SocialFeedListingSection): SocialFeedClip['section'] | null {
    if (section === 'rent') return 'arriendos';
    if (section === 'auction') return 'subastas';
    if (section === 'project') return 'proyectos';
    if (section === 'sale') return 'ventas';
    return null;
}

function readMediaUrl(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    const obj = asObject(value);
    return asString(obj.dataUrl) || asString(obj.previewUrl) || asString(obj.url);
}

/** Descubre solo incluye avisos con video público (http/https). */
export function extractListingDiscoverVideoUrl(record: SocialFeedListingRecord): string | null {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const discoverVideo = asObject(media.discoverVideo);
    const direct = readMediaUrl(media.videoUrl);
    if (direct.startsWith('http')) return direct;
    const uploaded = readMediaUrl(discoverVideo);
    if (uploaded.startsWith('http')) return uploaded;
    return null;
}

export function buildSocialFeedClips(
    deps: SocialFeedDeps,
    vertical: string,
    section: string | null | undefined,
): SocialFeedClip[] {
    const featuredListingIds = deps.getActiveFeaturedListingIds(vertical);

    return Array.from(deps.listingsById.values())
        .filter((record) => record.vertical === vertical)
        .filter((record) => deps.isPublicListingVisible(record))
        .flatMap((record) => {
            const socialSection = socialSectionFromListing(record.section);
            if (!socialSection) return [];
            if (section && section !== 'todos' && socialSection !== section) return [];

            const videoUrl = extractListingDiscoverVideoUrl(record);
            if (!videoUrl) return [];

            const imageUrls = deps.extractListingMediaUrls(record);
            const discoverVideo = asObject(asObject(record.rawData).media).discoverVideo;
            const posterUrl = asString(asObject(discoverVideo).previewUrl) || imageUrls[0] || undefined;

            const rawData = record.rawData as Record<string, unknown> | null;

            const specs: Array<{ label: string; value: string; icon?: string }> = [];
            if (record.vertical === 'autos') {
                const basic = (rawData?.basic ?? {}) as Record<string, unknown>;
                if (basic.vehicleType) specs.push({ label: 'Tipo', value: String(basic.vehicleType), icon: 'car' });
                if (basic.year) specs.push({ label: 'Año', value: String(basic.year), icon: 'calendar' });
                if (basic.mileage) specs.push({ label: 'Kilometraje', value: String(basic.mileage), icon: 'gauge' });
                if (basic.fuelType) specs.push({ label: 'Combustible', value: String(basic.fuelType), icon: 'gas' });
                if (basic.transmission) specs.push({ label: 'Transmisión', value: String(basic.transmission), icon: 'gear' });
            } else if (record.vertical === 'propiedades') {
                const basic = (rawData?.basic ?? {}) as Record<string, unknown>;
                if (basic.propertyType) specs.push({ label: 'Tipo', value: String(basic.propertyType), icon: 'building' });
                if (basic.bedrooms) specs.push({ label: 'Dorm.', value: String(basic.bedrooms), icon: 'bed' });
                if (basic.bathrooms) specs.push({ label: 'Baños', value: String(basic.bathrooms), icon: 'bath' });
                if (basic.surface || basic.totalSurface) {
                    const surface = basic.totalSurface || basic.surface;
                    specs.push({ label: 'Superficie', value: String(surface), icon: 'ruler' });
                }
            }

            const rawDataBadges = rawData ?? {};
            const discountPercent = Number((rawDataBadges as Record<string, unknown>).discountPercent)
                || Number((rawDataBadges as Record<string, unknown>).discount)
                || 0;
            const financing = Boolean((rawDataBadges as Record<string, unknown>).financing);
            const exchange = Boolean((rawDataBadges as Record<string, unknown>).exchange)
                || Boolean((rawDataBadges as Record<string, unknown>).permuta);
            const negotiable = Boolean((rawDataBadges as Record<string, unknown>).negotiable)
                || Boolean((rawDataBadges as Record<string, unknown>).conversable);

            return [{
                id: record.id,
                vertical: record.vertical,
                section: socialSection,
                href: record.href,
                title: record.title,
                price: record.price || deps.publicSectionLabel(record.section),
                location: record.location || 'Chile',
                authorId: record.ownerId,
                mediaType: 'video',
                mediaUrl: videoUrl,
                posterUrl,
                views: record.views,
                saves: record.favs,
                publishedAt: record.updatedAt,
                featured: featuredListingIds.has(record.id),
                specs: specs.slice(0, 4),
                discountPercent: discountPercent > 0 ? discountPercent : undefined,
                financing,
                exchange,
                negotiable,
            } satisfies SocialFeedClip];
        });
}
