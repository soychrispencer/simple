'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuickPhoto, QuickBasicData, GeneratedText, QuickPublishStep } from '@/components/quick-publish/types';
import type { ListingLocation } from '@simple/types';
import { generateListingText } from '@/actions/generate-listing-text';
import { createPanelListing, fetchPanelListingDraft, savePanelListingDraft, deletePanelListingDraft } from '@/lib/panel-listings';
import { uploadMediaFile } from '@/lib/media-upload';

const MAX_PHOTOS = 20;
import { processQuickFile } from '@/lib/quick-image-utils';

// ─── Price formatting ─────────────────────────────────────────────────────────

export function formatPrice(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return '$ ' + Number(digits).toLocaleString('es-CL');
}

export function formatMileage(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-CL');
}

// ─── Session persistence ──────────────────────────────────────────────────────

const DRAFT_KEY = 'qp-draft-v1';
const PHOTOS_KEY = 'qp-photos-v1';

type PricingData = { price: string; offerPrice: string; offerPriceMode: '$' | '%'; negotiable: boolean; financingAvailable: boolean };

type DraftData = {
    step: QuickPublishStep;
    basicData: QuickBasicData | null;
    generatedText: GeneratedText | null;
    pricing: PricingData;
    savedAt: number;
};

type ServerDraftPayload = DraftData & { photoCount: number };

const defaultPricing: PricingData = { price: '', offerPrice: '', offerPriceMode: '$', negotiable: true, financingAvailable: false };

function readDraft(): DraftData | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as DraftData) : null;
    } catch { return null; }
}

function writeDraft(data: Omit<DraftData, 'savedAt'> & { savedAt?: number }) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: data.savedAt ?? Date.now() })); } catch { /* quota */ }
}

function readPhotos(): QuickPhoto[] {
    try {
        const raw = sessionStorage.getItem(PHOTOS_KEY);
        return raw ? (JSON.parse(raw) as QuickPhoto[]) : [];
    } catch { return []; }
}

function writePhotos(photos: QuickPhoto[]) {
    try { sessionStorage.setItem(PHOTOS_KEY, JSON.stringify(photos)); } catch { /* quota exceeded — skip silently */ }
}

function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(PHOTOS_KEY); } catch { /* */ }
}

// ─── rawData builder ──────────────────────────────────────────────────────────

function buildRawData(basicData: QuickBasicData, generatedText: GeneratedText, photos: QuickPhoto[]) {
    const brand = basicData.brandId === '__custom__' ? basicData.customBrand : basicData.brandId;
    const model = basicData.modelId === '__custom__' ? basicData.customModel : basicData.modelId;

    return {
        setup: { listingType: basicData.listingType, vehicleType: basicData.vehicleType ?? 'car' },
        basic: {
            brandId: basicData.brandId,
            customBrand: basicData.customBrand,
            modelId: basicData.modelId,
            customModel: basicData.customModel,
            title: generatedText.titulo,
            description: generatedText.descripcion,
            year: basicData.year,
            version: basicData.version,
            versionMode: 'catalog',
            color: basicData.color ?? '',
            mileage: basicData.mileage.replace(/\D/g, ''),
            condition: basicData.condition ?? '',
            bodyType: basicData.bodyType ?? '',
            fuelType: basicData.fuelType ?? '',
            transmission: basicData.transmission,
            traction: basicData.traction ?? '',
            engineSize: '',
            powerHp: '',
            doors: '',
            seats: '',
            exteriorColor: basicData.color ?? '',
            interiorColor: '',
            vin: '',
            plate: '',
            specific: basicData.ownerCount ? { ownerCount: basicData.ownerCount } : {},
            _quickPublish: true,
            _brandName: brand,
            _modelName: model,
        },
        specs: {
            maintenanceBook: false,
            technicalReview: false,
            paidPermit: false,
            newTires: false,
            singleOwner: false,
            noAccidents: false,
            featureCodes: [],
            notes: '',
        },
        media: {
            photos: photos.map((p) => ({
                id: p.id,
                name: p.name,
                dataUrl: p.dataUrl,
                previewUrl: p.previewUrl,
                isCover: p.isCover,
                width: p.width,
                height: p.height,
                sizeBytes: p.sizeBytes,
                mimeType: p.mimeType,
            })),
            video: null,
            discoverVideo: null,
            documents: [],
        },
        location: null,
        commercial: {
            price: basicData.price.replace(/\D/g, ''),
            offerPrice: (() => {
                const main = parseInt(basicData.price.replace(/\D/g, '') || '0', 10);
                if (basicData.offerPriceMode === '%' && basicData.offerPrice && main > 0) {
                    const pct = parseInt(basicData.offerPrice, 10);
                    return pct > 0 && pct < 100 ? String(Math.round(main * (1 - pct / 100))) : '';
                }
                return basicData.offerPrice?.replace(/\D/g, '') ?? '';
            })(),
            rentDaily: '',
            rentWeekly: '',
            rentMonthly: '',
            rentMinDays: '',
            rentAvailableFrom: '',
            auction: null,
            duration: 30,
            featured: false,
            urgent: false,
            negotiable: basicData.negotiable ?? true,
            exchangeAccepted: basicData.exchangeAvailable ?? false,
            financingAvailable: basicData.financingAvailable ?? false,
            slug: '',
            customCta: '',
            seoTitle: '',
            seoDescription: '',
        },
        review: { acceptedTerms: true },
    };
}

// ─── Upload photos to B2 ──────────────────────────────────────────────────────

async function uploadPhotosToB2(photos: QuickPhoto[]): Promise<{ ok: boolean; photos?: QuickPhoto[]; error?: string }> {
    if (photos.length === 0) return { ok: true, photos: [] };

    const uploadedPhotos: QuickPhoto[] = [];
    const failedPhotos: string[] = [];

    for (const photo of photos) {
        try {
            // Convert dataUrl to File
            const response = await fetch(photo.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], photo.name, { type: photo.mimeType });

            // Upload to B2
            const uploadResult = await uploadMediaFile(file, { fileType: 'image' });

            if (uploadResult.ok && uploadResult.result) {
                // Replace dataUrl with B2 URL
                uploadedPhotos.push({
                    id: photo.id,
                    name: photo.name,
                    dataUrl: uploadResult.result.url, // B2 URL instead of dataUrl
                    previewUrl: uploadResult.result.url,
                    isCover: photo.isCover,
                    width: photo.width,
                    height: photo.height,
                    sizeBytes: photo.sizeBytes,
                    mimeType: photo.mimeType,
                });
            } else {
                failedPhotos.push(photo.name);
            }
        } catch {
            failedPhotos.push(photo.name);
        }
    }

    if (failedPhotos.length > 0) {
        return {
            ok: false,
            error: `No se pudieron subir las siguientes fotos: ${failedPhotos.join(', ')}`,
        };
    }

    return { ok: true, photos: uploadedPhotos };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface QuickPublishState {
    step: QuickPublishStep;
    photos: QuickPhoto[];
    basicData: QuickBasicData | null;
    generatedText: GeneratedText | null;
    isGenerating: boolean;
    isPublishing: boolean;
    publishError: string | null;
    publishedId: string | null;
    publishedHref: string | null;
    publishedTitle: string | null;
    restoredPhotoCount: number;
    detectedColor: string | null;
}

const defaultState: QuickPublishState = {
    step: 1,
    photos: [],
    basicData: null,
    generatedText: null,
    isGenerating: false,
    isPublishing: false,
    publishError: null,
    publishedId: null,
    publishedHref: null,
    publishedTitle: null,
    restoredPhotoCount: 0,
    detectedColor: null,
};

export function useQuickPublish() {
    const [state, setState] = useState<QuickPublishState>(() => {
        const draft = readDraft();
        if (!draft) return defaultState;
        const validStep = ([1, 2, 3, 'success'] as QuickPublishStep[]).includes(draft.step) ? draft.step : 1;
        return {
            ...defaultState,
            step: validStep,
            basicData: draft.basicData,
            generatedText: draft.generatedText,
            photos: readPhotos(),
        };
    });

    const processingRef = useRef(false);
    const pricingRef = useRef<PricingData>(defaultPricing);
    const pricingInitialized = useRef(false);
    if (!pricingInitialized.current) {
        pricingInitialized.current = true;
        const draft = readDraft();
        if (draft?.pricing) pricingRef.current = draft.pricing;
    }
    const locationRef = useRef<ListingLocation | null>(null);
    // Always-current state ref for callbacks that need latest state without deps
    const stateRef = useRef(state);
    stateRef.current = state;

    // Load server draft on mount — apply if newer than local session draft
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const result = await fetchPanelListingDraft('autos-quick');
            if (cancelled || !result.ok) return;
            const serverDraft = result.draft as ServerDraftPayload | null | undefined;
            if (!serverDraft?.savedAt) return;
            const serverStep = ([1, 2, 3, 'success'] as QuickPublishStep[]).includes(serverDraft.step) ? serverDraft.step : 1;

            const localDraft = readDraft();
            if (serverDraft.savedAt <= (localDraft?.savedAt ?? 0)) return;

            pricingRef.current = serverDraft.pricing ?? defaultPricing;
            writeDraft(serverDraft);
            setState((prev) => ({
                ...prev,
                step: serverStep,
                basicData: serverDraft.basicData,
                generatedText: serverDraft.generatedText,
                restoredPhotoCount: serverDraft.photoCount > 0 && prev.photos.length === 0
                    ? serverDraft.photoCount
                    : prev.restoredPhotoCount,
            }));
        })();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep session storage in sync with state (local only — no server round-trip)
    useEffect(() => {
        if (state.step === 'success') return;
        writeDraft({
            step: state.step,
            basicData: state.basicData,
            generatedText: state.generatedText,
            pricing: pricingRef.current,
        });
    }, [state.step, state.basicData, state.generatedText]);

    // Persist photos separately (may fail silently if too large)
    useEffect(() => {
        if (state.step === 'success') return;
        writePhotos(state.photos);
    }, [state.photos, state.step]);

    // ── Save to server on step transition ────────────────────────────────────

    function serverSave(overrides: Partial<DraftData> & { photoCount?: number }) {
        const { basicData, generatedText, photos } = stateRef.current;
        const payload: ServerDraftPayload = {
            step: overrides.step ?? stateRef.current.step,
            basicData: overrides.basicData !== undefined ? overrides.basicData : basicData,
            generatedText: overrides.generatedText !== undefined ? overrides.generatedText : generatedText,
            pricing: pricingRef.current,
            savedAt: Date.now(),
            photoCount: overrides.photoCount ?? photos.length,
        };
        writeDraft(payload);
        void savePanelListingDraft('autos-quick', payload);
    }

    // ─────────────────────────────────────────────────────────────────────────

    const updatePricing = useCallback((data: Partial<QuickBasicData & PricingData>) => {
        pricingRef.current = {
            price: data.price ?? pricingRef.current.price,
            offerPrice: data.offerPrice ?? pricingRef.current.offerPrice,
            offerPriceMode: data.offerPriceMode ?? pricingRef.current.offerPriceMode,
            negotiable: data.negotiable !== undefined ? data.negotiable : pricingRef.current.negotiable,
            financingAvailable: data.financingAvailable !== undefined ? data.financingAvailable : pricingRef.current.financingAvailable,
        };
        
        // Update React state with pricing changes
        setState(prev => prev.basicData ? {
            ...prev,
            basicData: {
                ...prev.basicData,
                price: data.price ?? prev.basicData.price,
                offerPrice: data.offerPrice ?? prev.basicData.offerPrice,
                offerPriceMode: data.offerPriceMode ?? prev.basicData.offerPriceMode,
                negotiable: data.negotiable !== undefined ? data.negotiable : prev.basicData.negotiable,
                financingAvailable: data.financingAvailable !== undefined ? data.financingAvailable : prev.basicData.financingAvailable,
                exchangeAvailable: data.exchangeAvailable !== undefined ? data.exchangeAvailable : prev.basicData.exchangeAvailable,
            }
        } : prev);
        
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            const draft = raw ? (JSON.parse(raw) as DraftData) : null;
            if (draft) writeDraft({ ...draft, pricing: pricingRef.current });
        } catch { /* */ }
    }, []);

    const updateLocation = useCallback((data: ListingLocation | null) => {
        locationRef.current = data;
    }, []);

    const addPhotos = useCallback(async (files: FileList | File[]) => {
        if (processingRef.current) return;
        processingRef.current = true;

        const fileArray = Array.from(files);
        const available = MAX_PHOTOS - stateRef.current.photos.length;
        const toProcess = fileArray.slice(0, available);

        try {
            const processed = await Promise.all(
                toProcess.map((file, index) =>
                    processQuickFile(file, stateRef.current.photos.length === 0 && index === 0)
                )
            );
            setState((prev) => ({ ...prev, photos: [...prev.photos, ...processed], restoredPhotoCount: 0 }));
        } catch {
            // silently skip failed images
        } finally {
            processingRef.current = false;
        }

        return fileArray.length > available;
    }, []);

    const removePhoto = useCallback((id: string) => {
        setState((prev) => {
            const next = prev.photos.filter((p) => p.id !== id);
            if (next.length > 0 && !next.some((p) => p.isCover)) {
                next[0] = { ...next[0], isCover: true };
            }
            return { ...prev, photos: next };
        });
    }, []);

    const setCoverPhoto = useCallback((id: string) => {
        setState((prev) => ({
            ...prev,
            photos: prev.photos.map((p) => ({ ...p, isCover: p.id === id })),
        }));
    }, []);

    const reorderPhotos = useCallback((activeId: string, overId: string) => {
        setState((prev) => {
            const from = prev.photos.findIndex((p) => p.id === activeId);
            const to = prev.photos.findIndex((p) => p.id === overId);
            if (from === -1 || to === -1 || from === to) return prev;
            const reordered = [...prev.photos];
            const [removed] = reordered.splice(from, 1);
            reordered.splice(to, 0, removed);
            return {
                ...prev,
                photos: reordered.map((p, i) => ({ ...p, isCover: i === 0 })),
            };
        });
    }, []);

    const goToStep = useCallback((step: QuickPublishStep) => {
        setState((prev) => ({ ...prev, step, publishError: null }));
        serverSave({ step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitBasicData = useCallback((data: QuickBasicData) => {
        const prev = stateRef.current;
        const coreChanged = !prev.basicData ||
            prev.basicData.brandId !== data.brandId ||
            prev.basicData.modelId !== data.modelId ||
            prev.basicData.year !== data.year ||
            prev.basicData.version !== data.version ||
            prev.basicData.vehicleType !== data.vehicleType ||
            prev.basicData.listingType !== data.listingType;
        const nextGeneratedText = coreChanged ? null : prev.generatedText;
        setState((s) => ({ ...s, basicData: data, step: 3, generatedText: nextGeneratedText }));
        serverSave({ step: 3, basicData: data, generatedText: nextGeneratedText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateText = useCallback(async () => {
        const { basicData, photos } = stateRef.current;
        if (!basicData) return;

        setState((prev) => ({ ...prev, isGenerating: true, generatedText: null, detectedColor: null }));

        const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];

        const pricing = pricingRef.current;
        const mergedData: typeof basicData = {
            ...basicData,
            price: pricing.price || basicData.price,
            offerPrice: pricing.offerPrice || basicData.offerPrice,
            offerPriceMode: pricing.offerPriceMode,
            negotiable: pricing.negotiable,
            financingAvailable: pricing.financingAvailable,
        };
        const communeName = locationRef.current?.communeName ?? undefined;

        const [result] = await Promise.all([
            generateListingText(mergedData, coverPhoto?.dataUrl, { communeName }),
            new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);

        const generated = result as GeneratedText;

        // Enrich description with commercial conditions
        let enrichedDescription = generated.descripcion;
        const conditions: string[] = [];
        
        if (pricing.negotiable) conditions.push('Precio negociable');
        if (pricing.financingAvailable) conditions.push('Financiamiento disponible');
        if (basicData.exchangeAvailable) {
            conditions.push('Acepta permuta');
        }
        
        if (conditions.length > 0) {
            enrichedDescription += `\n\n✓ ${conditions.join(' • ')}`;
        }

        const colorDetected = generated.colorDetectado && !basicData.color
            ? generated.colorDetectado
            : null;

        const finalData = colorDetected
            ? { ...basicData, color: colorDetected }
            : basicData;

        setState((prev) => ({
            ...prev,
            isGenerating: false,
            basicData: finalData,
            generatedText: { titulo: generated.titulo, descripcion: enrichedDescription },
            detectedColor: colorDetected,
        }));
    }, []);

    const updateGeneratedText = useCallback((titulo: string, descripcion: string) => {
        setState((prev) => ({
            ...prev,
            generatedText: prev.generatedText ? { titulo, descripcion } : null,
        }));
    }, []);

    const publish = useCallback(async () => {
        const { basicData, generatedText, photos } = stateRef.current;
        if (!basicData) return;

        const mergedBasicData = { ...basicData, ...pricingRef.current };

        // Build fallback title if the user hasn't generated AI text
        const brandName = mergedBasicData.brandName ?? mergedBasicData.customBrand ?? mergedBasicData.brandId;
        const modelName = mergedBasicData.modelName ?? mergedBasicData.customModel ?? mergedBasicData.modelId;
        const fallbackTitle = [brandName, modelName, mergedBasicData.year].filter(Boolean).join(' ');
        const resolvedText = generatedText ?? { titulo: fallbackTitle, descripcion: '' };

        setState((prev) => ({ ...prev, isPublishing: true, publishError: null }));

        try {
            // Upload photos to B2 first
            const uploadResult = await uploadPhotosToB2(photos);
            if (!uploadResult.ok || !uploadResult.photos) {
                setState((prev) => ({
                    ...prev,
                    isPublishing: false,
                    publishError: uploadResult.error ?? 'No se pudieron subir las fotos.',
                }));
                return;
            }

            const photosWithB2Urls = uploadResult.photos;

            const priceDigits = mergedBasicData.price.replace(/\D/g, '');
            const priceLabel = priceDigits ? `$ ${Number(priceDigits).toLocaleString('es-CL')}` : '$0';

            const loc = locationRef.current;
            const result = await createPanelListing({
                vertical: 'autos',
                listingType: mergedBasicData.listingType,
                title: resolvedText.titulo,
                description: resolvedText.descripcion,
                priceLabel,
                rawData: buildRawData(mergedBasicData, resolvedText, photosWithB2Urls),
                ...(loc ? {
                    location: [loc.communeName, loc.regionName].filter(Boolean).join(', '),
                    locationData: loc,
                } : {}),
            });

            if (result.ok && result.item) {
                clearDraft();
                void deletePanelListingDraft('autos-quick');
                setState((prev) => ({
                    ...prev,
                    isPublishing: false,
                    step: 'success',
                    publishedId: result.item!.id,
                    publishedHref: result.item!.href,
                    publishedTitle: resolvedText.titulo,
                }));
            } else if (result.unauthorized) {
                setState((prev) => ({
                    ...prev,
                    isPublishing: false,
                    publishError: 'Tu sesión expiró. Recarga la página y vuelve a intentarlo.',
                }));
            } else {
                setState((prev) => ({
                    ...prev,
                    isPublishing: false,
                    publishError: result.error ?? 'No se pudo publicar. Intenta de nuevo.',
                }));
            }
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isPublishing: false,
                publishError: error instanceof Error ? error.message : 'Error desconocido durante la publicación.',
            }));
        }
    }, []);

    const reset = useCallback(() => {
        clearDraft();
        void deletePanelListingDraft('autos-quick');
        pricingRef.current = defaultPricing;
        locationRef.current = null;
        setState(defaultState);
    }, []);

    return {
        ...state,
        savedPricing: pricingRef.current,
        addPhotos,
        removePhoto,
        setCoverPhoto,
        reorderPhotos,
        goToStep,
        submitBasicData,
        generateText,
        updateGeneratedText,
        updatePricing,
        updateLocation,
        publish,
        reset,
    };
}
