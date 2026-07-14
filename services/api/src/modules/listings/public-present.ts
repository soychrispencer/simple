import type { BoostSection } from '../../lib/domain-types.js';
import { asObject, asString } from '../shared/helpers.js';
import {
    buildPropertyCardSummaryTags,
    buildVehicleCardSummaryTags,
} from '@simple/utils';

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

/** Coerce JSON payload fields for card summary helpers (string | number | null). */
function asCardScalar(value: unknown): string | number | null {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return value;
    const text = asString(value).trim();
    return text || null;
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

    function extractAutosCondition(record: ListingPublicRecord): string | null {
        const payload = asObject(record.rawData);
        const basic = asObject(payload.basic);
        const condition = asString(basic.condition).trim();
        return condition || null;
    }

    function extractAutosYear(record: ListingPublicRecord): string | null {
        const payload = asObject(record.rawData);
        const basic = asObject(payload.basic);
        const year = asString(basic.year).trim();
        return /^(19|20)\d{2}$/.test(year) ? year : null;
    }

    /** Precio lista + % descuento cuando hay oferta distinta al precio publicado. */
    function extractPublicOfferPricing(record: ListingPublicRecord): {
        priceOriginal: string | null;
        discountPercent: number | null;
    } {
        const payload = asObject(record.rawData);
        const commercial = asObject(payload.commercial);
        const listDigits = asString(commercial.price).replace(/\D/g, '');
        const offerDigits = asString(commercial.offerPrice).replace(/\D/g, '');
        const list = listDigits ? Number(listDigits) : NaN;
        const offer = offerDigits ? Number(offerDigits) : NaN;
        if (!Number.isFinite(list) || !Number.isFinite(offer) || offer <= 0 || list <= offer) {
            return { priceOriginal: null, discountPercent: null };
        }

        const currency = asString(commercial.currency).toUpperCase() || 'CLP';
        const formatted = list.toLocaleString('es-CL');
        const priceOriginal = currency === 'UF'
            ? `UF ${formatted}`
            : currency === 'USD'
                ? `USD ${formatted}`
                : `$ ${formatted}`;
        const discountPercent = Math.round((1 - offer / list) * 100);
        return {
            priceOriginal,
            discountPercent: discountPercent > 0 && discountPercent < 100 ? discountPercent : null,
        };
    }

    function extractAutosSummary(record: ListingPublicRecord): string[] {
        const payload = asObject(record.rawData);
        const basic = asObject(payload.basic);
        const setup = asObject(payload.setup);

        return buildVehicleCardSummaryTags({
            vehicleType: asString(setup.vehicleType) || asString(basic.vehicleType),
            bodyType: asString(basic.bodyType),
            year: extractAutosYear(record),
            mileage: asCardScalar(basic.mileage),
            fuelType: asString(basic.fuelType),
            transmission: asString(basic.transmission),
        });
    }

    function extractPropertiesSummary(record: ListingPublicRecord): string[] {
        const payload = asObject(record.rawData);
        const setup = asObject(payload.setup);
        const basic = asObject(payload.basic);
        const project = asObject(payload.project);

        return buildPropertyCardSummaryTags({
            propertyType: asString(basic.propertyType) || asString(setup.propertyType),
            operationType: asString(setup.operationType),
            section: record.section,
            rooms: asCardScalar(basic.rooms),
            bathrooms: asCardScalar(basic.bathrooms),
            parkingSpaces: asCardScalar(basic.parkingSpaces),
            storageUnits: asCardScalar(basic.storageUnits),
            totalArea: asCardScalar(basic.totalArea ?? basic.surface),
            usableArea: asCardScalar(basic.usableArea),
            commercialUse: asString(basic.commercialUse),
            condition: asString(basic.condition),
            availableUnits: asCardScalar(project.availableUnits),
            usableAreaFrom: asCardScalar(project.usableAreaFrom),
            usableAreaTo: asCardScalar(project.usableAreaTo),
            deliveryStatus: asString(project.deliveryStatus),
            salesStage: asString(project.salesStage),
        });
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
        // Solo logo del negocio/perfil público; sin fallback a avatar personal.
        const avatarUrl = profileAvatar || null;
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
            ...(() => {
                const offerPricing = extractPublicOfferPricing(record);
                return {
                    priceOriginal: offerPricing.priceOriginal,
                    discountPercent: offerPricing.discountPercent,
                };
            })(),
            ...(record.vertical === 'autos'
                ? {
                    year: extractAutosYear(record),
                    condition: extractAutosCondition(record),
                }
                : {}),
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
        extractAutosCondition,
        extractPublicOfferPricing,
        isPublicListingVisible,
        matchesListingSlug,
        listingToPublicResponse,
    };
}
