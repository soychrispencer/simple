import { createListingDraftEnvelope, draftPersistableUrl, persistDraftMediaUrl, parseVehicleEquipmentCodes, parseVehicleCondition, DEFAULT_VEHICLE_CONDITION, type DraftMediaUploadProgress, type ListingDraftEnvelope } from '@simple/utils';
import { patchListingLocation, createEmptyListingLocation, type ListingLocation } from '@simple/types';
import type { PublishFormData } from '@/lib/map-listing-to-publish-form';

export type AutosPublishStep = 1 | 2 | 3 | 4;

export type AutosPersistedDraft = ListingDraftEnvelope<
    Omit<PublishFormData, 'photos' | 'reelVideo'> & {
        photos: Array<{ id: string; preview: string; isCover: boolean }>;
        reelVideo: { id: string; preview: string; name: string; mimeType: string; sizeBytes: number } | null;
    },
    { step: AutosPublishStep }
>;

const EMPTY_LOCATION = createEmptyListingLocation({
    sourceMode: 'custom',
    countryCode: 'CL',
    visibilityMode: 'commune_only',
    publicMapEnabled: true,
});

export async function prepareAutosDraftMedia(form: PublishFormData & {
    photos: Array<PublishFormData['photos'][number] & { file?: File }>;
    reelVideo: (NonNullable<PublishFormData['reelVideo']> & { file?: File }) | null;
}, options?: {
    onMediaProgress?: (progress: DraftMediaUploadProgress) => void;
}): Promise<{ ok: boolean; form?: typeof form; error?: string }> {
    const photos: typeof form.photos = [];
    for (const photo of form.photos) {
        const result = await persistDraftMediaUrl({
            url: photo.preview,
            file: photo.file,
            fileType: 'image',
            name: photo.file?.name || 'foto.webp',
            mimeType: photo.file?.type || 'image/webp',
            onProgress: options?.onMediaProgress,
        });
        if (!result.ok) return { ok: false, error: result.error };
        photos.push({
            ...photo,
            file: undefined,
            preview: result.url || photo.preview,
        });
    }

    let reelVideo = form.reelVideo;
    if (reelVideo) {
        const result = await persistDraftMediaUrl({
            url: reelVideo.preview,
            file: reelVideo.file,
            fileType: 'video',
            name: reelVideo.file?.name || reelVideo.name || 'video.mp4',
            mimeType: reelVideo.file?.type || reelVideo.mimeType || 'video/mp4',
            onProgress: options?.onMediaProgress,
        });
        if (!result.ok) return { ok: false, error: result.error };
        reelVideo = {
            ...reelVideo,
            file: undefined,
            preview: result.url || reelVideo.preview,
        };
    }

    return { ok: true, form: { ...form, photos, reelVideo } };
}

export function serializeAutosPublishDraft(form: PublishFormData, step: AutosPublishStep): AutosPersistedDraft {
    const { photos, reelVideo, location, ...rest } = form;
    return createListingDraftEnvelope(
        {
            ...rest,
            location,
            photos: photos.map((photo) => ({
                id: photo.id,
                preview: draftPersistableUrl(photo.preview),
                isCover: photo.isCover,
            })),
            reelVideo: reelVideo
                ? {
                    id: reelVideo.id,
                    preview: draftPersistableUrl(reelVideo.preview),
                    name: reelVideo.name,
                    mimeType: reelVideo.mimeType,
                    sizeBytes: reelVideo.sizeBytes,
                }
                : null,
        },
        { step },
    );
}

export function mergeAutosPublishDraft(raw: unknown): { form: PublishFormData; step: AutosPublishStep } | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;

    if (!record.data && (record.brandId != null || Array.isArray(record.photos))) {
        const photos = Array.isArray(record.photos) ? record.photos : [];
        const location = record.location as Partial<ListingLocation> | undefined;
        const step: AutosPublishStep = photos.length > 0
            ? (record.year && record.price && location?.regionId && location?.communeId ? 3 : 2)
            : 1;
        return mergeAutosPublishDraft({ version: 1, savedAt: '', step, data: record });
    }

    const parsed = raw as Partial<AutosPersistedDraft>;
    if (!parsed.data || typeof parsed.data !== 'object') return null;

    const data = parsed.data;
    const step: AutosPublishStep = parsed.step === 2 || parsed.step === 3 || parsed.step === 4 ? parsed.step : 1;

    const form: PublishFormData = {
        photos: Array.isArray(data.photos)
            ? data.photos.map((photo, index) => ({
                id: typeof photo?.id === 'string' ? photo.id : `photo-${index + 1}`,
                preview: typeof photo?.preview === 'string'
                    ? photo.preview
                    : (typeof (photo as { url?: string })?.url === 'string' ? (photo as { url?: string }).url! : ''),
                isCover: !!photo?.isCover,
            }))
            : [],
        reelVideo: data.reelVideo
            ? {
                id: data.reelVideo.id,
                preview: draftPersistableUrl(data.reelVideo.preview),
                name: data.reelVideo.name,
                mimeType: data.reelVideo.mimeType,
                sizeBytes: data.reelVideo.sizeBytes,
            }
            : null,
        videoExternalUrl: data.videoExternalUrl ?? '',
        listingType: data.listingType ?? 'sale',
        vehicleType: data.vehicleType ?? 'car',
        brandId: data.brandId ?? '',
        customBrand: data.customBrand ?? '',
        modelId: data.modelId ?? '',
        customModel: data.customModel ?? '',
        year: data.year ?? '',
        price: data.price ?? '',
        offerPrice: data.offerPrice ?? '',
        discountPercent: data.discountPercent ?? '',
        mileage: data.mileage ?? '',
        color: data.color ?? '',
        interiorColor: typeof data.interiorColor === 'string' ? data.interiorColor : '',
        offerPriceMode: data.offerPriceMode === '%' ? '%' : '$',
        fuelType: data.fuelType ?? 'Bencina',
        transmission: data.transmission ?? 'Manual',
        engineSize: typeof data.engineSize === 'string' ? data.engineSize : '',
        traction: typeof data.traction === 'string' ? data.traction : '',
        doors: typeof data.doors === 'string' ? data.doors : '',
        version: typeof data.version === 'string' ? data.version : '',
        condition: parseVehicleCondition(data.condition, DEFAULT_VEHICLE_CONDITION),
        maintenanceUpToDate: !!data.maintenanceUpToDate,
        technicalReviewUpToDate: !!data.technicalReviewUpToDate,
        papersUpToDate: !!data.papersUpToDate,
        noAccidents: !!data.noAccidents,
        warranty: !!data.warranty,
        featureCodes: parseVehicleEquipmentCodes(data.featureCodes),
        ownerCount: data.ownerCount === '1' || data.ownerCount === '2' || data.ownerCount === '3+' ? data.ownerCount : '',
        location: patchListingLocation(EMPTY_LOCATION, (data.location ?? {}) as Partial<ListingLocation>),
        title: data.title ?? '',
        description: data.description ?? '',
        negotiable: !!data.negotiable,
        financing: !!data.financing,
        exchange: !!data.exchange,
        rentDaily: data.rentDaily ?? '',
        rentMinDays: data.rentMinDays ?? '',
        rentKmPerDayIncluded: data.rentKmPerDayIncluded ?? '',
        rentDeposit: data.rentDeposit ?? '',
        rentRequirements: data.rentRequirements ?? '',
        rentInsuranceIncluded: !!data.rentInsuranceIncluded,
        consignmentCommission: data.consignmentCommission ?? '',
        consignmentTerms: data.consignmentTerms ?? '',
    };

    return { form, step };
}
