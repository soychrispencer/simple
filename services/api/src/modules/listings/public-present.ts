import type { BoostSection } from '../../lib/domain-types.js';
import { asObject, asString } from '../shared/helpers.js';

export type { BoostSection };

/** Compatible con ListingRecord del monolito (campos extra permitidos). */
export type ListingPublicRecord = {
    id: string;
    ownerId?: string;
    vertical: string;
    section: BoostSection;
    listingType?: BoostSection;
    title: string;
    description?: string;
    price?: string;
    href?: string;
    location?: string;
    locationData?: unknown;
    views?: number;
    favs?: number;
    leads?: number;
    status: string;
    createdAt: number;
    updatedAt: number;
    rawData?: unknown;
    integrations?: unknown;
    [key: string]: unknown;
};

export type ListingPublicPresentDeps = {
    toPublicMediaUrl: (value: unknown) => string;
    publicSectionLabel: (section: BoostSection) => string;
    buildLocationPublicLabel: (locationData: unknown) => string;
    humanizePublicLocationFallback: (location: string) => string;
    listingAgeDays: (createdAt: number) => number;
    formatAgo: (updatedAt: number) => string;
    usernameFromName: (name: string) => string;
    usersById: Map<string, { id: string; name: string; email: string; phone?: string | null; avatar?: string }>;
    getPublishedSellerProfile: (
        userId: string,
        vertical: string,
    ) => {
        displayName?: string;
        slug?: string;
        avatarImageUrl?: string | null;
        publicEmail?: string | null;
        publicPhone?: string | null;
        publicWhatsapp?: string | null;
    } | null;
};

function parseNumberFromString(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = asString(value).replace(/[^\d]/g, '');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

export function extractListingSlugCandidate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const segments = new URL(trimmed).pathname.split('/').filter(Boolean);
            return segments.at(-1) ?? null;
        } catch {
            return null;
        }
    }

    const normalizedPath = trimmed.replace(/^\/+|\/+$/g, '');
    if (!normalizedPath) return null;
    const segments = normalizedPath.split('/').filter(Boolean);
    return segments.at(-1) ?? normalizedPath;
}

export function createListingPublicPresent(deps: ListingPublicPresentDeps) {
    const {
        toPublicMediaUrl,
        publicSectionLabel,
        buildLocationPublicLabel,
        humanizePublicLocationFallback,
        listingAgeDays,
        formatAgo,
        usernameFromName,
        usersById,
        getPublishedSellerProfile,
    } = deps;

    function extractListingMediaUrls(record: ListingPublicRecord): string[] {
        const payload = asObject(record.rawData);
        const media = asObject(payload.media);
        const photos = Array.isArray(media.photos) ? media.photos : [];
        const urls = photos
            .map((photo) => toPublicMediaUrl(photo))
            .filter((url) => url.length > 0)
            .slice(0, 8);
        const remoteUrls = urls.filter((url) => !url.startsWith('data:'));
        return remoteUrls.length > 0 ? remoteUrls : urls;
    }

    function extractListingVideoUrl(record: ListingPublicRecord): string | null {
        const payload = asObject(record.rawData);
        const media = asObject(payload.media);
        const discoverVideo = asObject(media.discoverVideo);
        const direct = toPublicMediaUrl(media.videoUrl);
        if (direct) return direct;
        const uploaded = toPublicMediaUrl(discoverVideo);
        return uploaded || null;
    }

    function appendUniqueSummary(summary: string[], value: string) {
        const normalized = value.trim();
        if (!normalized) return;
        if (summary.includes(normalized)) return;
        summary.push(normalized);
    }

    function extractAutosSummary(record: ListingPublicRecord): string[] {
        const payload = asObject(record.rawData);
        const basic = asObject(payload.basic);
        const summary: string[] = [];

        appendUniqueSummary(summary, asString(basic.year));
        appendUniqueSummary(summary, asString(basic.bodyType));

        const mileage = parseNumberFromString(basic.mileage);
        if (mileage != null) appendUniqueSummary(summary, `${mileage.toLocaleString('es-CL')} km`);

        appendUniqueSummary(summary, asString(basic.fuelType));
        appendUniqueSummary(summary, asString(basic.transmission));
        appendUniqueSummary(summary, asString(basic.condition));

        return summary.slice(0, 5);
    }

    function extractPropertiesSummary(record: ListingPublicRecord): string[] {
        const payload = asObject(record.rawData);
        const setup = asObject(payload.setup);
        const basic = asObject(payload.basic);
        const project = asObject(payload.project);
        const summary: string[] = [];
        const isProject = record.section === 'project' || asString(setup.operationType) === 'project';

        if (isProject) {
            appendUniqueSummary(summary, asString(project.projectName));
            const availableUnits = parseNumberFromString(project.availableUnits);
            if (availableUnits != null) appendUniqueSummary(summary, `${availableUnits.toLocaleString('es-CL')} unidades`);

            const usableAreaFrom = parseNumberFromString(project.usableAreaFrom);
            const usableAreaTo = parseNumberFromString(project.usableAreaTo);
            if (usableAreaFrom != null && usableAreaTo != null && usableAreaTo > usableAreaFrom) {
                appendUniqueSummary(summary, `${usableAreaFrom.toLocaleString('es-CL')}-${usableAreaTo.toLocaleString('es-CL')} m²`);
            } else if (usableAreaFrom != null) {
                appendUniqueSummary(summary, `Desde ${usableAreaFrom.toLocaleString('es-CL')} m²`);
            }

            appendUniqueSummary(summary, asString(project.deliveryStatus));
            appendUniqueSummary(summary, asString(project.salesStage));
            return summary.slice(0, 5);
        }

        const rooms = parseNumberFromString(basic.rooms);
        if (rooms != null) appendUniqueSummary(summary, `${rooms.toLocaleString('es-CL')}D`);

        const bathrooms = parseNumberFromString(basic.bathrooms);
        if (bathrooms != null) appendUniqueSummary(summary, `${bathrooms.toLocaleString('es-CL')}B`);

        const totalArea = parseNumberFromString(basic.totalArea ?? basic.surface);
        if (totalArea != null) appendUniqueSummary(summary, `${totalArea.toLocaleString('es-CL')} m²`);

        const parkingSpaces = parseNumberFromString(basic.parkingSpaces);
        if (parkingSpaces != null) appendUniqueSummary(summary, `${parkingSpaces.toLocaleString('es-CL')} est.`);

        const storageUnits = parseNumberFromString(basic.storageUnits);
        if (storageUnits != null) appendUniqueSummary(summary, `${storageUnits.toLocaleString('es-CL')} bod.`);

        appendUniqueSummary(summary, asString(basic.propertyType));
        return summary.slice(0, 5);
    }

    function extractListingSummary(record: ListingPublicRecord): string[] {
        const summary = record.vertical === 'autos'
            ? extractAutosSummary(record)
            : extractPropertiesSummary(record);
        return summary.length > 0 ? summary : [publicSectionLabel(record.section)];
    }

    function isPublicListingVisible(record: ListingPublicRecord): boolean {
        return record.status === 'active';
    }

    function matchesListingSlug(record: ListingPublicRecord, slug: string): boolean {
        if (record.id === slug) return true;
        const hrefSlug = (record.href ?? '').split('/').filter(Boolean).at(-1) ?? '';
        return hrefSlug === slug;
    }

    function listingToPublicResponse(record: ListingPublicRecord) {
        const owner = record.ownerId ? usersById.get(record.ownerId) : undefined;
        const sellerProfile = owner ? getPublishedSellerProfile(owner.id, record.vertical) : null;
        const sellerName = sellerProfile?.displayName ?? owner?.name ?? 'Cuenta verificada';
        const username = sellerProfile?.slug ?? usernameFromName(sellerName);
        const profileAvatar = toPublicMediaUrl(sellerProfile?.avatarImageUrl);
        const accountAvatar = toPublicMediaUrl(owner?.avatar);
        const avatarUrl = profileAvatar || accountAvatar || null;
        const sellerEmail = sellerProfile?.publicEmail?.trim() || owner?.email || null;
        const sellerPhone = sellerProfile?.publicPhone?.trim()
            || sellerProfile?.publicWhatsapp?.trim()
            || owner?.phone
            || null;
        const sellerWhatsapp = sellerProfile?.publicWhatsapp?.trim()
            || sellerProfile?.publicPhone?.trim()
            || owner?.phone
            || null;

        return {
            id: record.id,
            vertical: record.vertical,
            section: record.section,
            sectionLabel: publicSectionLabel(record.section),
            title: record.title,
            description: record.description,
            price: record.price,
            href: record.href,
            location: buildLocationPublicLabel(record.locationData) || humanizePublicLocationFallback(record.location ?? '') || '',
            views: record.views ?? 0,
            favs: record.favs ?? 0,
            leads: record.leads ?? 0,
            days: listingAgeDays(record.createdAt),
            publishedAgo: formatAgo(record.updatedAt),
            updatedAt: record.updatedAt,
            images: extractListingMediaUrls(record),
            videoUrl: extractListingVideoUrl(record),
            summary: extractListingSummary(record),
            seller: owner ? {
                id: owner.id,
                name: sellerName,
                username,
                profileHref: sellerProfile ? `/perfil/${username}` : null,
                avatarUrl,
                email: sellerEmail,
                phone: sellerPhone,
                whatsapp: sellerWhatsapp,
            } : null,
        };
    }

    return {
        extractListingMediaUrls,
        extractListingVideoUrl,
        extractListingSummary,
        isPublicListingVisible,
        matchesListingSlug,
        listingToPublicResponse,
    };
}
