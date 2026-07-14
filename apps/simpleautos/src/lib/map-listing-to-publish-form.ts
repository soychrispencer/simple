import type { PanelListing } from '@/lib/panel-listings';
import type { VehicleCatalogType } from '@/lib/publish-wizard-catalog';
import { isSupportedExternalVideoUrl, parseVehicleEquipmentCodes, parseVehicleCondition, DEFAULT_VEHICLE_CONDITION, type VehicleConditionValue } from '@simple/utils';
import { createEmptyListingLocation, patchListingLocation, type ListingLocation } from '@simple/types';

export type PublishFormPhoto = {
    id: string;
    file?: File;
    preview: string;
    isCover: boolean;
};

export type PublishFormData = {
    photos: PublishFormPhoto[];
    reelVideo: { id: string; preview: string; name: string; mimeType: string; sizeBytes: number } | null;
    videoExternalUrl: string;
    listingType: 'sale' | 'rent' | 'auction' | 'service' | 'product';
    vehicleType: VehicleCatalogType;
    brandId: string;
    customBrand: string;
    modelId: string;
    customModel: string;
    year: string;
    price: string;
    offerPrice: string;
    discountPercent: string;
    catalogCategory: string;
    servicePricingMode: 'fixed' | 'quote';
    catalogPromoPrice: string;
    serviceDurationMinutes: string;
    serviceIsOnline: boolean;
    serviceIsPresential: boolean;
    productStock: string;
    productSku: string;
    mileage: string;
    color: string;
    interiorColor: string;
    offerPriceMode: '$' | '%';
    fuelType: string;
    transmission: string;
    engineSize: string;
    traction: string;
    doors: string;
    version: string;
    condition: VehicleConditionValue | '';
    maintenanceUpToDate: boolean;
    technicalReviewUpToDate: boolean;
    papersUpToDate: boolean;
    noAccidents: boolean;
    warranty: boolean;
    featureCodes: string[];
    ownerCount: '1' | '2' | '3+' | '';
    location: ListingLocation;
    title: string;
    description: string;
    negotiable: boolean;
    financing: boolean;
    exchange: boolean;
    rentDaily: string;
    rentMinDays: string;
    rentKmPerDayIncluded: string;
    rentDeposit: string;
    rentRequirements: string;
    rentInsuranceIncluded: boolean;
    consignmentCommission: string;
    consignmentTerms: string;
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
    const locationRecord = asRecord(raw.location ?? listing.locationData);

    const listingType = (setup.listingType ?? listing.section) as PublishFormData['listingType'];
    const photosRaw = Array.isArray(media.photos) ? media.photos : [];

    const photos: PublishFormPhoto[] = photosRaw
        .map((item, index) => {
            const photo = asRecord(item);
            const preview = asString(photo.previewUrl) || asString(photo.dataUrl) || asString(photo.url);
            return {
                id: asString(photo.id, `photo-${index}`),
                preview,
                isCover: photo.isCover === true || index === 0,
            };
        })
        .filter((photo) => photo.preview.length > 0);

    const rawVideo = asRecord(media.discoverVideo);
    const videoUrlStr = asString(media.videoUrl).trim();
    const uploadUrl = asString(rawVideo.previewUrl) || asString(rawVideo.dataUrl);

    let reelVideo: PublishFormData['reelVideo'] = null;
    let videoExternalUrl = '';

    if (videoUrlStr && isSupportedExternalVideoUrl(videoUrlStr)) {
        videoExternalUrl = videoUrlStr;
    } else if (uploadUrl) {
        reelVideo = {
            id: asString(rawVideo.id, 'video-1'),
            preview: uploadUrl,
            name: asString(rawVideo.name, 'video-publicacion'),
            mimeType: asString(rawVideo.mimeType, 'video/mp4'),
            sizeBytes: Number(rawVideo.sizeBytes ?? 0),
        };
    } else if (videoUrlStr.startsWith('http')) {
        reelVideo = {
            id: asString(rawVideo.id, 'video-1'),
            preview: videoUrlStr,
            name: asString(rawVideo.name, 'video-publicacion'),
            mimeType: asString(rawVideo.mimeType, 'video/mp4'),
            sizeBytes: Number(rawVideo.sizeBytes ?? 0),
        };
    }

    const priceDigits = asString(listing.price).replace(/\D/g, '') || asString(commercial.price).replace(/\D/g, '');
    const offerDigits = asString(commercial.offerPrice).replace(/\D/g, '');

    const owners = asRecord(basic.complementary).owners_count;
    let ownerCount: PublishFormData['ownerCount'] = '';
    if (owners === '1' || owners === 1) ownerCount = '1';
    else if (owners === '2' || owners === 2) ownerCount = '2';
    else if (owners === '3+' || owners === 3) ownerCount = '3+';

    const listingLocation = patchListingLocation(createEmptyListingLocation({
        sourceMode: 'custom',
        countryCode: 'CL',
        visibilityMode: 'commune_only',
        publicMapEnabled: true,
    }), {
        sourceMode: locationRecord.sourceMode === 'saved_address' || locationRecord.sourceMode === 'area_only' || locationRecord.sourceMode === 'custom'
            ? locationRecord.sourceMode
            : 'custom',
        sourceAddressId: asString(locationRecord.sourceAddressId) || null,
        countryCode: asString(locationRecord.countryCode, 'CL') || 'CL',
        regionId: asString(locationRecord.regionId) || null,
        regionName: asString(locationRecord.regionName) || null,
        communeId: asString(locationRecord.communeId) || null,
        communeName: asString(locationRecord.communeName) || null,
        neighborhood: asString(locationRecord.neighborhood) || null,
        addressLine1: asString(locationRecord.addressLine1) || null,
        addressLine2: asString(locationRecord.addressLine2) || null,
        postalCode: asString(locationRecord.postalCode) || null,
        visibilityMode: (locationRecord.visibilityMode as ListingLocation['visibilityMode']) || 'commune_only',
        publicMapEnabled: locationRecord.publicMapEnabled !== false,
        publicLabel: asString(locationRecord.publicLabel) || '',
        label: asString(locationRecord.label) || null,
        arrivalInstructions: asString(locationRecord.arrivalInstructions) || null,
    });

    return {
        photos,
        reelVideo,
        videoExternalUrl,
        listingType: listingType === 'rent'
            || listingType === 'auction'
            || listingType === 'service'
            || listingType === 'product'
            ? listingType
            : 'sale',
        vehicleType: (setup.vehicleType as VehicleCatalogType) ?? 'car',
        brandId: asString(basic.brandId),
        customBrand: asString(basic.customBrand),
        modelId: asString(basic.modelId),
        customModel: asString(basic.customModel),
        year: asString(basic.year),
        price: priceDigits,
        offerPrice: offerDigits,
        discountPercent: '',
        catalogCategory: 'other',
        servicePricingMode: 'fixed',
        catalogPromoPrice: '',
        serviceDurationMinutes: '',
        serviceIsOnline: false,
        serviceIsPresential: true,
        productStock: '',
        productSku: '',
        mileage: basic.mileage != null ? String(basic.mileage) : '',
        color: asString(basic.color) || asString(basic.exteriorColor),
        interiorColor: asString(basic.interiorColor),
        offerPriceMode: '$',
        fuelType: asString(basic.fuelType, 'Bencina'),
        transmission: asString(basic.transmission, 'Manual'),
        engineSize: asString(basic.engineSize),
        traction: asString(basic.traction),
        doors: asString(basic.doors),
        version: asString(basic.version),
        condition: parseVehicleCondition(basic.condition, DEFAULT_VEHICLE_CONDITION),
        maintenanceUpToDate: asBool(specs.maintenanceBook),
        technicalReviewUpToDate: asBool(specs.technicalReview),
        papersUpToDate: asBool(specs.paidPermit),
        noAccidents: asBool(specs.noAccidents),
        warranty: Array.isArray(specs.featureCodes) && specs.featureCodes.includes('warranty'),
        featureCodes: parseVehicleEquipmentCodes(specs.featureCodes),
        ownerCount,
        location: listingLocation,
        title: listing.title || asString(basic.title),
        description: listing.description || asString(basic.description),
        negotiable: asBool(commercial.negotiable),
        financing: asBool(commercial.financingAvailable),
        exchange: asBool(commercial.exchangeAvailable),
        rentDaily: asString(commercial.rentDaily),
        rentMinDays: asString(commercial.rentMinDays),
        rentKmPerDayIncluded: asString(commercial.rentKmPerDayIncluded),
        rentDeposit: asString(commercial.rentDeposit),
        rentRequirements: asString(commercial.rentRequirements),
        rentInsuranceIncluded: asBool(commercial.rentInsuranceIncluded),
        consignmentCommission: asString(commercial.consignmentCommission),
        consignmentTerms: asString(commercial.consignmentTerms),
    };
}
