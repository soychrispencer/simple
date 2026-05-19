import { asObject, asString } from '../shared/helpers.js';

export type SocialFeedListingSection = 'sale' | 'rent' | 'auction' | 'project';

export type SocialFeedClip = {
    id: string;
    vertical: string;
    section: 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
    href: string;
    title: string;
    price: string;
    location: string;
    authorId: string;
    mediaType: 'video' | 'image';
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

function buildSocialPlaceholderMedia(record: SocialFeedListingRecord): string {
    const autosPalettes = [
        ['#0f172a', '#1d4ed8'],
        ['#111827', '#374151'],
        ['#1f2937', '#475569'],
    ];
    const propiedadesPalettes = [
        ['#111827', '#1e3a8a'],
        ['#0f172a', '#334155'],
        ['#1e293b', '#475569'],
    ];
    const palettes = record.vertical === 'autos' ? autosPalettes : propiedadesPalettes;
    const seed = Array.from(record.title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const pair = palettes[seed % palettes.length];
    return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

function extractListingFeedMedia(
    deps: SocialFeedDeps,
    record: SocialFeedListingRecord,
): {
    mediaType: SocialFeedClip['mediaType'];
    mediaUrl: string;
    posterUrl?: string;
} {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const discoverVideo = asObject(media.discoverVideo);
    const videoUrl = asString(discoverVideo.dataUrl) || asString(discoverVideo.url);
    const imageUrls = deps.extractListingMediaUrls(record);
    const posterUrl = asString(discoverVideo.previewUrl) || imageUrls[0] || undefined;

    if (videoUrl) {
        return {
            mediaType: 'video',
            mediaUrl: videoUrl,
            posterUrl,
        };
    }

    return {
        mediaType: 'image',
        mediaUrl: imageUrls[0] || buildSocialPlaceholderMedia(record),
    };
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

            const media = extractListingFeedMedia(deps, record);
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
                mediaType: media.mediaType,
                mediaUrl: media.mediaUrl,
                posterUrl: media.posterUrl,
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
