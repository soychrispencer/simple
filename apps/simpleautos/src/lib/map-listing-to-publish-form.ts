import type { PanelListing } from '@/lib/panel-listings';
import type { VehicleCatalogType } from '@/lib/publish-wizard-catalog';

export type PublishFormPhoto = {
    id: string;
    file?: File;
    preview: string;
    isCover: boolean;
};

export type PublishFormData = {
    photos: PublishFormPhoto[];
    reelVideo: { id: string; preview: string; name: string; mimeType: string; sizeBytes: number } | null;
    listingType: 'sale' | 'rent' | 'auction';
    vehicleType: VehicleCatalogType;
    brandId: string;
    customBrand: string;
    modelId: string;
    customModel: string;
    year: string;
    price: string;
    offerPrice: string;
    discountPercent: string;
    mileage: string;
    color: string;
    offerPriceMode: '$' | '%';
    fuelType: string;
    transmission: string;
    condition: 'Nuevo' | 'Seminuevo' | 'Usado' | '';
    maintenanceUpToDate: boolean;
    technicalReviewUpToDate: boolean;
    papersUpToDate: boolean;
    noAccidents: boolean;
    warranty: boolean;
    ownerCount: '1' | '2' | '3+' | '';
    regionId: string;
    communeId: string;
    title: string;
    description: string;
    negotiable: boolean;
    financing: boolean;
    exchange: boolean;
};

type RawBlock = Record<string, unknown>;

function asRecord(value: unknown): RawBlock {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawBlock) : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown): boolean {
    return value === true;
}

/** Mapea un listing del panel API al estado del wizard de publicación. */
export function mapPanelListingToPublishForm(listing: PanelListing): PublishFormData {
    const raw = asRecord(listing.rawData);
    const setup = asRecord(raw.setup);
    const basic = asRecord(raw.basic);
    const specs = asRecord(raw.specs);
    const media = asRecord(raw.media);
    const commercial = asRecord(raw.commercial);
    const location = asRecord(raw.location ?? listing.locationData);

    const listingType = (setup.listingType ?? listing.section) as PublishFormData['listingType'];
    const photosRaw = Array.isArray(media.photos) ? media.photos : [];

    const photos: PublishFormPhoto[] = photosRaw.map((item, index) => {
        const photo = asRecord(item);
        const preview = asString(photo.previewUrl) || asString(photo.dataUrl) || asString(photo.url);
        return {
            id: asString(photo.id, `photo-${index}`),
            preview,
            isCover: photo.isCover === true || index === 0,
        };
    });
    const rawVideo = asRecord(media.discoverVideo);
    const videoPreview = asString(rawVideo.previewUrl) || asString(rawVideo.dataUrl) || asString(media.videoUrl);

    const priceDigits = asString(listing.price).replace(/\D/g, '') || asString(commercial.price).replace(/\D/g, '');
    const offerDigits = asString(commercial.offerPrice).replace(/\D/g, '');

    const owners = asRecord(basic.complementary).owners_count;
    let ownerCount: PublishFormData['ownerCount'] = '';
    if (owners === '1' || owners === 1) ownerCount = '1';
    else if (owners === '2' || owners === 2) ownerCount = '2';
    else if (owners === '3+' || owners === 3) ownerCount = '3+';

    return {
        photos,
        reelVideo: videoPreview ? {
            id: asString(rawVideo.id, 'video-1'),
            preview: videoPreview,
            name: asString(rawVideo.name, 'video-publicacion'),
            mimeType: asString(rawVideo.mimeType, 'video/mp4'),
            sizeBytes: Number(rawVideo.sizeBytes ?? 0),
        } : null,
        listingType: listingType === 'rent' || listingType === 'auction' ? listingType : 'sale',
        vehicleType: (setup.vehicleType as VehicleCatalogType) ?? 'car',
        brandId: asString(basic.brandId),
        customBrand: asString(basic.customBrand),
        modelId: asString(basic.modelId),
        customModel: asString(basic.customModel),
        year: asString(basic.year),
        price: priceDigits,
        offerPrice: offerDigits,
        discountPercent: '',
        mileage: basic.mileage != null ? String(basic.mileage) : '',
        color: asString(basic.color) || asString(basic.exteriorColor),
        offerPriceMode: '$',
        fuelType: asString(basic.fuelType, 'Bencina'),
        transmission: asString(basic.transmission, 'Manual'),
        condition: (basic.condition as PublishFormData['condition']) || '',
        maintenanceUpToDate: asBool(specs.maintenanceBook),
        technicalReviewUpToDate: asBool(specs.technicalReview),
        papersUpToDate: asBool(specs.paidPermit),
        noAccidents: asBool(specs.noAccidents),
        warranty: Array.isArray(specs.featureCodes) && specs.featureCodes.includes('warranty'),
        ownerCount,
        regionId: asString(location.regionId) || asString(location.regionName),
        communeId: asString(location.communeId) || asString(location.communeName),
        title: listing.title || asString(basic.title),
        description: listing.description || asString(basic.description),
        negotiable: asBool(commercial.negotiable),
        financing: asBool(commercial.financingAvailable),
        exchange: asBool(commercial.exchangeAvailable),
    };
}
