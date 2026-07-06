'use client';

// =============================================================================
// SIMPLE AUTOS - PUBLICAR V2 (3 PASOS ULTRA SIMPLE)
// Mobile-first, publicar en segundos, mejorar después
// =============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, } from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconArrowLeft, IconArrowRight, IconCheck, IconCamera, IconPhoto, IconX, IconUpload, IconMapPin, IconCurrencyDollar, IconCar, IconMotorbike, IconTruck, IconBus, IconTractor, IconAnchor, IconPlane, IconTag, IconKey, IconHammer, IconChevronDown, IconChevronUp, IconSparkles, IconShare3, IconBrandWhatsapp, IconLoader2, IconPlus, IconTrash, IconGripVertical, IconStar, IconGauge, IconEngine, IconSteeringWheel, IconRocket, IconCalendar, IconGasStation, IconManualGearbox, IconBrandInstagram, IconExternalLink, IconLock, IconVideo, } from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@simple/auth';
import {
    type PublishWizardCatalog, type VehicleCatalogType, getBrandsForVehicleType, getModelsForBrand, loadPublishWizardCatalog, } from '@/lib/publish-wizard-catalog';
import { ShareToSocialPanel } from '@/components/panel/share-to-social-panel';
import {
    createPanelListing, updatePanelListing, fetchPanelListingDetail, fetchPanelListingDraft, deletePanelListingDraft, type CreatePanelListingInput, } from '@/lib/panel-listings';
import { mapPanelListingToPublishForm } from '@/lib/map-listing-to-publish-form';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelNotice, MarketplacePublishMessageNotice, MarketplacePublishPlanLimitNotice, useMarketplacePublishPlanLimit, isMarketplacePublishBlockedByPlan, useMarketplaceOperatorPublishDefaults } from '@simple/ui/panel';
import { MarketplaceOperatorPublishHint, MarketplaceAutosFleetRentFields, MarketplaceAutosConsignmentFields, MarketplaceListingCopyFields } from '@simple/ui/publish';
import { SimplePublishLayout, SimplePublishCtaCard, SimplePublishSuccessScreen, SimplePublishPageFrame, SimplePublishScreenHeader, SimplePublishPreviewCard, SimplePublishMediaScreen, SimplePublishVideoBlock, type SimplePublishPreviewCardProps } from '@simple/ui/simple-publish';
import { generateAutosListingDescription, generateAutosListingTitle, isSupportedExternalVideoUrl } from '@simple/utils';
import type { AutosOperatorPublishContext } from '@simple/utils';
import { ModernSelect } from '@simple/ui/forms';
import { ColorPicker } from '@/components/ui/color-picker';
import { fetchAddressBook, uploadMediaFile, optimizeListingPhotoFile } from '@simple/utils';
import type { AddressBookEntry } from '@simple/types';
import { createEmptyListingLocation } from '@simple/types';

// =============================================================================
// TIPOS
// =============================================================================

type Step = 1 | 2 | 3 | 'success';
type ListingType = 'sale' | 'rent' | 'auction';

interface FormData {
    // Paso 1: Identidad
    photos: Array<{ id: string; file?: File; preview: string; isCover: boolean }>;
    reelVideo: { id: string; file?: File; preview: string; name: string; mimeType: string; sizeBytes: number } | null;
    videoExternalUrl: string;
    listingType: ListingType;
    vehicleType: VehicleCatalogType;
    brandId: string;
    customBrand: string;
    modelId: string;
    customModel: string;
    year: string;
    price: string;
    offerPrice: string;
    discountPercent: string;
    
    // Paso 2: Estado (expandible)
    mileage: string;
    color: string;
    offerPriceMode: '$' | '%';
    fuelType: string;
    transmission: string;
    condition: 'Nuevo' | 'Seminuevo' | 'Usado' | '';
    // Historial (chips)
    maintenanceUpToDate: boolean;
    technicalReviewUpToDate: boolean;
    papersUpToDate: boolean;
    noAccidents: boolean;
    warranty: boolean;
    // Dueños
    ownerCount: '1' | '2' | '3+' | '';
    
    // Paso 3: Ubicación y contacto
    regionId: string;
    communeId: string;
    title: string;
    description: string;
    // Opciones
    negotiable: boolean;
    financing: boolean;
    exchange: boolean;
    // Arriendo / flota
    rentDaily: string;
    rentMinDays: string;
    rentKmPerDayIncluded: string;
    rentDeposit: string;
    rentRequirements: string;
    rentInsuranceIncluded: boolean;
    // Consignación
    consignmentCommission: string;
    consignmentTerms: string;
}

const EMPTY_FORM: FormData = {
    photos: [],
    reelVideo: null,
    videoExternalUrl: '',
    listingType: 'sale',
    vehicleType: 'car',
    brandId: '',
    customBrand: '',
    modelId: '',
    customModel: '',
    year: '',
    price: '',
    offerPrice: '',
    discountPercent: '',
    mileage: '',
    color: '',
    offerPriceMode: '$',
    fuelType: 'Bencina',
    transmission: 'Manual',
    condition: '',
    maintenanceUpToDate: false,
    technicalReviewUpToDate: false,
    papersUpToDate: false,
    noAccidents: false,
    warranty: false,
    ownerCount: '',
    regionId: '',
    communeId: '',
    title: '',
    description: '',
    negotiable: false,
    financing: false,
    exchange: false,
    rentDaily: '',
    rentMinDays: '',
    rentKmPerDayIncluded: '',
    rentDeposit: '',
    rentRequirements: '',
    rentInsuranceIncluded: false,
    consignmentCommission: '',
    consignmentTerms: '',
};

const PUBLISH_STEPS = [
    { key: '1', label: 'Multimedia', helper: 'Fotos y video' },
    { key: '2', label: 'Detalles', helper: 'Vehículo y precio' },
    { key: '3', label: 'Publicar', helper: 'Ubicación y revisión' },
] as const;

const AUTOS_STEP_COPY: Record<number, { title: string; description: string }> = {
    1: {
        title: 'Fotos y video',
        description: 'Sube lo esencial para tu tarjeta. La primera foto será la portada.',
    },
    2: {
        title: 'Detalles del vehículo',
        description: 'Tipo de operación, marca, modelo, año y precio.',
    },
    3: {
        title: 'Revisar y publicar',
        description: 'Ubicación, título, descripción y confirmación final.',
    },
};

function buildAutosPreviewCardProps(form: FormData, catalog: PublishWizardCatalog | null): SimplePublishPreviewCardProps {
    const brandName = form.brandId === '__custom__' ? form.customBrand : catalog?.brands.find((b) => b.id === form.brandId)?.name || '';
    const modelName = form.modelId === '__custom__' ? form.customModel : catalog?.models.find((m) => m.id === form.modelId)?.name || '';
    const title = form.title || [brandName, modelName, form.year].filter(Boolean).join(' ') || 'Título del aviso';
    const regionName = catalog?.regions.find((r) => r.id === form.regionId)?.name || '';
    const communeName = catalog?.communes.find((c) => c.id === form.communeId)?.name || '';
    const location = [communeName, regionName].filter(Boolean).join(', ') || 'Ubicación pendiente';
    const badge = form.listingType === 'sale' ? 'Venta' : form.listingType === 'rent' ? 'Arriendo' : 'Subasta';
    const priceValue = form.offerPrice || form.price;
    const price = priceValue ? `$${priceValue}` : '$Consultar';

    const specs: SimplePublishPreviewCardProps['specs'] = [];
    if (form.year) specs.push({ icon: <IconCalendar size={13} />, label: form.year });
    if (form.mileage) specs.push({ icon: <IconGauge size={13} />, label: `${form.mileage} km` });
    if (form.fuelType) specs.push({ icon: <IconGasStation size={13} />, label: form.fuelType });
    if (form.transmission) specs.push({ icon: <IconManualGearbox size={13} />, label: form.transmission });

    return {
        badge,
        price,
        title,
        location,
        photoUrls: form.photos.map((photo) => photo.preview).filter(Boolean),
        videoUrl: form.reelVideo?.preview ?? null,
        specs,
        brandLabel: 'Simple',
        footerHint: 'Así se verá en SimpleAutos',
    };
}

const VEHICLE_TYPES = [
    { value: 'car', label: 'Auto / SUV', Icon: IconCar },
    { value: 'motorcycle', label: 'Moto', Icon: IconMotorbike },
    { value: 'truck', label: 'Camión', Icon: IconTruck },
    { value: 'bus', label: 'Bus', Icon: IconBus },
    { value: 'machinery', label: 'Maquinaria', Icon: IconTractor },
    { value: 'nautical', label: 'Náutico', Icon: IconAnchor },
    { value: 'aerial', label: 'Aéreo', Icon: IconPlane },
] as const;

const LISTING_TYPES = [
    { value: 'sale', label: 'Venta', Icon: IconTag, color: 'var(--color-success)' },
    { value: 'rent', label: 'Arriendo', Icon: IconKey, color: 'var(--accent)' },
    { value: 'auction', label: 'Subasta', Icon: IconHammer, color: 'var(--color-warning)' },
] as const;

const FUEL_TYPES = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'];
const TRANSMISSIONS = ['Manual', 'Automática', 'CVT'];
const CONDITIONS = ['Nuevo', 'Seminuevo', 'Usado'];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PublicarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    const planLimit = useMarketplacePublishPlanLimit('autos');
    const publishBlocked = isMarketplacePublishBlockedByPlan(planLimit, isEditing);

    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const { hint: operatorHint, defaults: operatorDefaults, context: operatorContext, ready: operatorDefaultsReady } = useMarketplaceOperatorPublishDefaults('autos', { enabled: !isEditing, autosListingType: form.listingType });
    const [operatorDefaultsApplied, setOperatorDefaultsApplied] = useState(false);
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [loading, setLoading] = useState(false);
    const [published, setPublished] = useState<{ id: string; href: string; title: string; hasVideo: boolean } | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        details: false,
        history: false,
        equipment: false,
    });
    const [draftNotice, setDraftNotice] = useState<string | null>(null);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [editingLoading, setEditingLoading] = useState(false);
    const [editLoadFailed, setEditLoadFailed] = useState(false);
    
    // Cargar catálogo
    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog).catch(() => null);
    }, []);
    
    // Cargar borrador o edición
    useEffect(() => {
        if (!isEditing) {
            // Intentar cargar borrador
            fetchPanelListingDraft('autos-quick').then((result) => {
                if (result.ok && result.draft) {
                    const draft = result.draft as any;
                    const brandName = draft.brandId === '__custom__' ? draft.customBrand : draft.brandName ?? '';
                    const modelName = draft.modelId === '__custom__' ? draft.customModel : draft.modelName ?? '';
                    const vehicleLabel = [brandName, modelName, draft.year].filter(Boolean).join(' ') || null;
                    const stepNum = draft.photos?.length > 0 ? (draft.regionId ? 3 : 2) : 1;
                    const detailText = vehicleLabel
                        ? `${vehicleLabel} · Paso ${stepNum} de 3`
                        : `Paso ${stepNum} de 3`;
                    setDraftNotice(detailText);
                }
            }).catch(() => null);
        } else {
            setEditingLoading(true);
            setEditLoadFailed(false);
            setPublishError(null);
            fetchPanelListingDetail(editingId!).then((result) => {
                if (result.ok && result.item) {
                    setForm(mapPanelListingToPublishForm(result.item));
                } else {
                    setEditLoadFailed(true);
                    setPublishError(result.error || 'No se pudo cargar la publicación para editar.');
                }
                setEditingLoading(false);
            }).catch(() => {
                setEditLoadFailed(true);
                setPublishError('No se pudo cargar la publicación para editar.');
                setEditingLoading(false);
            });
        }
    }, [editingId]);

    useEffect(() => {
        if (!operatorDefaultsReady || operatorDefaultsApplied || isEditing || !operatorDefaults?.autos) return;
        setForm((current) => ({ ...current, listingType: operatorDefaults.autos!.listingType }));
        setOperatorDefaultsApplied(true);
    }, [operatorDefaultsReady, operatorDefaults, operatorDefaultsApplied, isEditing]);
    
    const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);
    
    const hasIdentityFields = Boolean(
        form.year && form.price && form.brandId && form.modelId
        && (form.brandId !== '__custom__' || form.customBrand.trim())
        && (form.modelId !== '__custom__' || form.customModel.trim()),
    );

    const canProceed = () => {
        if (step === 1) {
            return form.photos.length >= 1;
        }
        if (step === 2) {
            if (!hasIdentityFields) {
                return false;
            }
            return true; // Todo opcional en paso 2
        }
        if (step === 3) {
            return form.regionId && form.communeId;
        }
        return false;
    };
    
    const handlePublish = async () => {
        if (publishBlocked) {
            setPublishError('Alcanzaste el límite de avisos de tu plan. Mejora tu plan para publicar más.');
            return;
        }

        setLoading(true);
        setPublishError(null);
        try {
            if (form.photos.length < 1) {
                setPublishError('Agrega al menos una foto antes de publicar.');
                return;
            }
            if (!hasIdentityFields) {
                setPublishError('Completa marca, modelo, año y precio antes de publicar.');
                return;
            }
            if (!form.regionId || !form.communeId) {
                setPublishError('Selecciona región y comuna antes de publicar.');
                return;
            }

            // PASO 1: Subir fotos primero
            const uploadedPhotos: Array<{
                id: string;
                name: string;
                dataUrl: string;
                previewUrl: string;
                isCover: boolean;
                width: number;
                height: number;
                sizeBytes: number;
                mimeType: string;
            }> = [];
            
            const photoFiles = form.photos.filter((p): p is typeof p & { file: File } => Boolean(p.file));

            for (const photo of form.photos.filter((p) => !p.file && p.preview)) {
                uploadedPhotos.push({
                    id: photo.id,
                    name: 'foto-existente',
                    dataUrl: photo.preview,
                    previewUrl: photo.preview,
                    isCover: photo.isCover,
                    width: 0,
                    height: 0,
                    sizeBytes: 0,
                    mimeType: 'image/jpeg',
                });
            }
            
            for (const photo of photoFiles) {
                const uploadResult = await uploadMediaFile(photo.file as File, {
                    fileType: 'image',
                });

                if (!uploadResult.ok || !uploadResult.result) {
                    setPublishError(
                        uploadResult.error || `No se pudo subir la foto "${(photo.file as File).name}".`,
                    );
                    return;
                }

                uploadedPhotos.push({
                    id: photo.id,
                    name: (photo.file as File).name,
                    dataUrl: uploadResult.result.publicUrl || uploadResult.result.url,
                    previewUrl: uploadResult.result.publicUrl || uploadResult.result.url,
                    isCover: photo.isCover,
                    width: 0,
                    height: 0,
                    sizeBytes: (photo.file as File).size,
                    mimeType: (photo.file as File).type || 'image/webp',
                });
            }

            if (uploadedPhotos.length < 1) {
                setPublishError('Debes tener al menos una foto subida para publicar.');
                return;
            }

            let uploadedVideo: {
                id: string;
                name: string;
                dataUrl: string;
                previewUrl: string;
                width: number;
                height: number;
                sizeBytes: number;
                mimeType: string;
                durationSeconds: number;
            } | null = null;

            const externalVideoUrl = form.videoExternalUrl.trim();
            if (externalVideoUrl && !isSupportedExternalVideoUrl(externalVideoUrl)) {
                setPublishError('Usa un enlace de YouTube o Vimeo para el video.');
                return;
            }

            if (form.reelVideo) {
                if (form.reelVideo.file) {
                    const uploadResult = await uploadMediaFile(form.reelVideo.file, {
                        fileType: 'video',
                    });
                    if (!uploadResult.ok || !uploadResult.result) {
                        setPublishError(uploadResult.error || 'No se pudo subir el video.');
                        return;
                    }
                    const url = uploadResult.result.publicUrl || uploadResult.result.url;
                    uploadedVideo = {
                        id: form.reelVideo.id,
                        name: form.reelVideo.name,
                        dataUrl: url,
                        previewUrl: url,
                        width: 0,
                        height: 0,
                        sizeBytes: form.reelVideo.sizeBytes,
                        mimeType: form.reelVideo.mimeType,
                        durationSeconds: 0,
                    };
                } else {
                    uploadedVideo = {
                        id: form.reelVideo.id,
                        name: form.reelVideo.name,
                        dataUrl: form.reelVideo.preview,
                        previewUrl: form.reelVideo.preview,
                        width: 0,
                        height: 0,
                        sizeBytes: form.reelVideo.sizeBytes,
                        mimeType: form.reelVideo.mimeType,
                        durationSeconds: 0,
                    };
                }
            }
            
            // PASO 2: Calcular precio oferta si aplica
            const parseDigits = (value: string | undefined): string => (value ?? '').replace(/\D/g, '');
            const mainPrice = parseInt(parseDigits(form.price) || '0', 10);
            let offerPriceValue = '';
            
            if (form.offerPrice && mainPrice > 0) {
                if (form.offerPriceMode === '%' && form.discountPercent) {
                    const pct = parseInt(form.discountPercent, 10);
                    if (pct > 0 && pct < 100) {
                        offerPriceValue = String(Math.round(mainPrice * (1 - pct / 100)));
                    }
                } else {
                    const op = parseInt(parseDigits(form.offerPrice) || '0', 10);
                    if (op > 0 && op < mainPrice) {
                        offerPriceValue = String(op);
                    }
                }
            }
            
            // PASO 3: Construir priceLabel
            const renderMoney = (value: string | undefined, suffix = '') => {
                const digits = parseDigits(value);
                if (!digits) return '';
                return `$ ${Number(digits).toLocaleString('es-CL')}${suffix}`;
            };
            
            const priceLabel = (form.listingType === 'rent' 
                ? renderMoney(form.price, ' / mes') || '$0'
                : form.listingType === 'auction'
                    ? renderMoney(form.price) || '$0'
                    : renderMoney(offerPriceValue || form.price) || '$0').slice(0, 100);
            
            // PASO 4: Construir datos
            const brandName = form.brandId === '__custom__' ? form.customBrand : 
                catalog?.brands.find(b => b.id === form.brandId)?.name || form.brandId;
            const modelName = form.modelId === '__custom__' ? form.customModel : 
                catalog?.models.find(m => m.id === form.modelId)?.name || form.modelId;
            
            // Región y comuna del catálogo (form ya guarda IDs del catálogo)
            const regionId = form.regionId;
            const regionName = catalog?.regions.find(r => r.id === regionId)?.name || '';
            const communeId = form.communeId;
            const communeName = catalog?.communes.find(c => c.id === communeId)?.name || communeId;
            
            const locationData = createEmptyListingLocation({
                sourceMode: 'area_only',
                countryCode: 'CL',
                regionId,
                regionName,
                communeId,
                communeName,
                visibilityMode: 'commune_only',
                publicMapEnabled: true,
                publicLabel: `${communeName}, ${regionName}`,
            });
            
            // PASO 5: Construir rawData con estructura correcta
            const rawData = {
                setup: { listingType: form.listingType, vehicleType: form.vehicleType },
                basic: {
                    brandId: form.brandId,
                    customBrand: form.customBrand,
                    modelId: form.modelId,
                    customModel: form.customModel,
                    title: form.title || `${brandName} ${modelName} ${form.year}`.trim(),
                    description: form.description || '',
                    year: form.year,
                    version: '',
                    versionMode: 'catalog',
                    color: form.color || '',
                    mileage: parseDigits(form.mileage),
                    condition: form.condition || '',
                    bodyType: '',
                    fuelType: form.fuelType || '',
                    transmission: form.transmission || '',
                    traction: '',
                    engineSize: '',
                    powerHp: '',
                    doors: '',
                    seats: '',
                    exteriorColor: form.color || '',
                    interiorColor: '',
                    vin: '',
                    plate: '',
                    specific: {},
                    complementary: form.ownerCount ? { owners_count: form.ownerCount } : {},
                    _quickPublish: true,
                    _brandName: brandName,
                    _modelName: modelName,
                },
                specs: {
                    maintenanceBook: form.maintenanceUpToDate,
                    technicalReview: form.technicalReviewUpToDate,
                    paidPermit: form.papersUpToDate,
                    newTires: false,
                    singleOwner: form.ownerCount === '1',
                    noAccidents: form.noAccidents,
                    featureCodes: form.warranty ? ['warranty'] : [],
                    notes: '',
                },
                media: {
                    photos: uploadedPhotos.map((p) => ({
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
                    videoUrl: uploadedVideo?.dataUrl ?? externalVideoUrl,
                    discoverVideo: uploadedVideo,
                    documents: [],
                },
                location: createEmptyListingLocation({
                    sourceMode: 'area_only',
                    countryCode: 'CL',
                    regionId,
                    regionName,
                    communeId,
                    communeName,
                    visibilityMode: 'commune_only',
                    publicMapEnabled: true,
                    publicLabel: `${communeName}, ${regionName}`,
                }),
                commercial: {
                    currency: 'CLP',
                    price: parseDigits(form.price),
                    offerPrice: offerPriceValue,
                    rentDaily: parseDigits(form.rentDaily),
                    rentWeekly: '',
                    rentMonthly: form.listingType === 'rent' ? parseDigits(form.price) : '',
                    rentMinDays: form.rentMinDays.replace(/\D/g, ''),
                    rentKmPerDayIncluded: form.rentKmPerDayIncluded.replace(/\D/g, ''),
                    rentInsuranceIncluded: form.rentInsuranceIncluded,
                    rentAvailableFrom: '',
                    rentAvailableTo: '',
                    rentDeposit: parseDigits(form.rentDeposit),
                    rentRequirements: form.rentRequirements.trim(),
                    consignmentCommission: form.consignmentCommission.trim(),
                    consignmentTerms: form.consignmentTerms.trim(),
                    auctionStartPrice: form.listingType === 'auction' ? parseDigits(form.price) : '',
                    auctionReservePrice: '',
                    auctionMinIncrement: '',
                    auctionStartAt: '',
                    auctionEndAt: '',
                    durationDays: '30',
                    autoRenew: false,
                    featured: false,
                    urgent: false,
                    negotiable: form.negotiable,
                    exchangeAvailable: form.exchange,
                    financingAvailable: form.financing,
                    slug: '',
                    metaTitle: '',
                    metaDescription: '',
                },
                review: { acceptTerms: true },
            };
            
            // PASO 6: Crear payload
            const payload: CreatePanelListingInput = {
                vertical: 'autos',
                listingType: form.listingType,
                title: form.title || `${brandName} ${modelName} ${form.year}`.trim(),
                description: form.description || '',
                priceLabel,
                location: [communeName, regionName].filter(Boolean).join(', '),
                locationData,
                status: 'active',
                rawData,
            };
            
            // PASO 7: Crear o actualizar el listing
            const result = isEditing && editingId
                ? await updatePanelListing(editingId, payload)
                : await createPanelListing(payload);
            
            if (result.ok && result.item) {
                setPublished({
                    id: result.item.id,
                    href: result.item.href || `/vehiculo/${result.item.id}`,
                    title: result.item.title,
                    hasVideo: Boolean(uploadedVideo?.dataUrl || externalVideoUrl),
                });
                setStep('success');
                await deletePanelListingDraft('autos-quick').catch(() => null);
            } else {
                setPublishError(result.error || (isEditing ? 'No se pudo guardar la publicación.' : 'No se pudo publicar. Intenta de nuevo.'));
            }
        } catch (error) {
            console.error('Error al publicar:', error);
            setPublishError('Ocurrió un error al publicar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (step !== 3 || !catalog) return;
        if (form.title.trim() && form.description.trim()) return;
        const brand = form.brandId === '__custom__' ? form.customBrand : catalog.brands.find((b) => b.id === form.brandId)?.name || form.brandId;
        const model = form.modelId === '__custom__' ? form.customModel : catalog.models.find((m) => m.id === form.modelId)?.name || form.modelId;
        setForm((current) => ({
            ...current,
            title: current.title.trim() || generateAutosListingTitle({ brandName: brand, modelName: model, year: current.year }),
            description: current.description.trim() || generateAutosListingDescription({
                brandName: brand,
                modelName: model,
                year: current.year,
                vehicleType: current.vehicleType,
                condition: current.condition,
                color: current.color,
                mileage: current.mileage,
                transmission: current.transmission,
                fuelType: current.fuelType,
                ownerCount: current.ownerCount,
                price: current.price,
                negotiable: current.negotiable,
                financing: current.financing,
                exchange: current.exchange,
                maintenanceUpToDate: current.maintenanceUpToDate,
                technicalReviewUpToDate: current.technicalReviewUpToDate,
                papersUpToDate: current.papersUpToDate,
                noAccidents: current.noAccidents,
                warranty: current.warranty,
                listingType: current.listingType,
                platformName: 'SimpleAutos',
            }).slice(0, 1000),
        }));
    }, [step, catalog, form.brandId, form.modelId, form.customBrand, form.customModel, form.year, form.title, form.description]);

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    // Scroll to top cuando cambia el paso
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);
    
    // =============================================================================
    // RENDER PASOS
    // =============================================================================
    
    const stepIndex = step === 'success' ? 2 : (step as number) - 1;

    return (
        <>
        {step === 'success' && published ? (
            <SimplePublishSuccessScreen
                title={published.title}
                brandName="SimpleAutos"
                shareHub={(
                    <ShareToSocialPanel
                        listingId={published.id}
                        listingHref={published.href}
                        listingTitle={published.title}
                        hasVideo={published.hasVideo}
                        shareText={`Mira este vehículo en SimpleAutos: ${published.title}`}
                    />
                )}
                onReset={() => window.location.reload()}
                onGoToListings={() => router.push('/panel/publicaciones')}
            />
        ) : (
        <SimplePublishLayout
            title="Nueva publicación"
            subtitle={isEditing ? 'Actualiza los datos de tu aviso.' : 'Multimedia, detalles y publicación.'}
            steps={PUBLISH_STEPS.map((item) => ({ key: item.key, label: item.label, helper: item.helper }))}
            stepIndex={stepIndex}
            isEditing={isEditing}
            onBack={() => setStep((prev) => ((prev as number) - 1) as Step)}
            onClose={() => router.push('/panel')}
            onStepChange={(key) => {
                const target = Number(key);
                if (!Number.isNaN(target) && target <= (step as number)) setStep(target as Step);
            }}
            headerContinue={{
                label: step === 3
                    ? (isEditing ? 'Guardar en Simple' : 'Publicar en Simple')
                    : 'Continuar',
                onClick: () => {
                    if (step === 3) void handlePublish();
                    else setStep((prev) => ((prev as number) + 1) as Step);
                },
                disabled: !canProceed() || loading || editingLoading || editLoadFailed || (step === 3 && publishBlocked),
                loading,
            }}
            notices={(
                <>
                    <MarketplacePublishPlanLimitNotice vertical="autos" isEditing={isEditing} planLimit={planLimit} />
                    {!isEditing ? <MarketplaceOperatorPublishHint message={operatorHint} /> : null}
                    {editingLoading ? <PanelNotice tone="neutral">Cargando publicación para editar...</PanelNotice> : null}
                    {publishError ? <MarketplacePublishMessageNotice message={publishError} /> : null}
                    {draftNotice ? (
                        <PanelNotice tone="warning">
                            <div className="flex items-center gap-2">
                                <span className="flex-1">
                                    <strong>Borrador guardado.</strong> {draftNotice}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDraftNotice(null)}
                                    className="text-xs underline shrink-0"
                                >
                                    Descartar
                                </button>
                            </div>
                        </PanelNotice>
                    ) : null}
                </>
            )}
        >
            {typeof step === 'number' ? (
                <>
                    <SimplePublishScreenHeader
                        title={AUTOS_STEP_COPY[step].title}
                        description={AUTOS_STEP_COPY[step].description}
                    />
                    <SimplePublishPageFrame
                        preview={<SimplePublishPreviewCard {...buildAutosPreviewCardProps(form, catalog)} />}
                    >
                        {step === 1 && (
                            <Step1PhotosAndIdentity form={form} updateForm={updateForm} catalog={catalog} section="media" />
                        )}
                        {step === 2 && (
                            <div className="space-y-5">
                                <Step1PhotosAndIdentity form={form} updateForm={updateForm} catalog={catalog} section="identity" operatorContext={operatorContext as AutosOperatorPublishContext} />
                                <Step2Condition
                                    form={form}
                                    updateForm={updateForm}
                                    expandedSections={expandedSections}
                                    toggleSection={toggleSection}
                                    catalog={catalog}
                                />
                            </div>
                        )}
                        {step === 3 && (
                            <Step3LocationAndPublish
                                form={form}
                                updateForm={updateForm}
                                user={user}
                                catalog={catalog}
                            />
                        )}
                        <SimplePublishCtaCard
                            label={step === 3
                                ? (isEditing ? 'Guardar en Simple' : 'Publicar en Simple')
                                : step === 1
                                    ? 'Continuar'
                                    : 'Continuar'}
                            loadingLabel={step === 3
                                ? (isEditing ? 'Guardando...' : 'Publicando...')
                                : 'Avanzando...'}
                            onClick={() => {
                                if (step === 3) void handlePublish();
                                else setStep((prev) => ((prev as number) + 1) as Step);
                            }}
                            disabled={!canProceed() || editingLoading || editLoadFailed || (step === 3 && publishBlocked)}
                            loading={loading}
                            hint={step === 3 ? 'Al publicar, tu aviso quedará visible en SimpleAutos de inmediato.' : undefined}
                            icon={step === 3 ? <IconRocket size={18} /> : <IconArrowRight size={18} />}
                        />
                    </SimplePublishPageFrame>
                </>
            ) : null}
        </SimplePublishLayout>
        )}
        </>
    );
}

// =============================================================================
// PASO 1: FOTOS E IDENTIDAD
// =============================================================================

// Sortable photo item component
function SortablePhotoItem({
    photo,
    index,
    onRemove,
    isCover,
}: {
    photo: { id: string; preview: string };
    index: number;
    onRemove: (id: string) => void;
    isCover: boolean;
}) {
    const {
        setNodeRef,
        transform,
        transition,
        isDragging,
        attributes,
        listeners,
    } = useSortable({ id: photo.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
                touchAction: 'none',
            }}
            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group cursor-move
                ${isCover ? 'border-[var(--accent)] shadow-md' : 'border-[var(--border)]'}
                ${isDragging ? 'opacity-30 shadow-none z-50' : ''}`}
            {...attributes}
            {...listeners}
        >
            <img
                src={photo.preview}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
            />
            {/* Badge Portada */}
            {index === 0 && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[var(--accent)] text-[var(--accent-contrast)]">
                    <IconStar size={8} fill="currentColor" />
                    Portada
                </div>
            )}
            {/* Número de orden con drag hint */}
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center font-medium">
                    {index + 1}
                </div>
                <span className="text-[9px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    ⠿
                </span>
            </div>
            {/* Botón eliminar */}
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white 
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <IconX size={12} />
            </button>
            {/* Drag overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <IconGripVertical size={20} className="text-white" />
            </div>
        </div>
    );
}

function Step1PhotosAndIdentity({
    form,
    updateForm,
    catalog,
    section = 'all',
    operatorContext,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    catalog: PublishWizardCatalog | null;
    section?: 'media' | 'identity' | 'all';
    operatorContext?: AutosOperatorPublishContext;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processingPhotos, setProcessingPhotos] = useState(false);
    const [photoProcessError, setPhotoProcessError] = useState<string | null>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleFiles = async (files: FileList | null) => {
        if (!files || processingPhotos) return;
        const toAdd = Array.from(files).slice(0, 20 - form.photos.length);
        if (toAdd.length === 0) return;

        setProcessingPhotos(true);
        setPhotoProcessError(null);

        try {
            const newPhotos: FormData['photos'] = [];
            for (const sourceFile of toAdd) {
                const optimized = await optimizeListingPhotoFile(sourceFile);
                const blob = await fetch(optimized.dataUrl).then((response) => response.blob());
                const file = new File([blob], optimized.name, { type: optimized.mimeType });
                newPhotos.push({
                    id: Math.random().toString(36).slice(2),
                    file,
                    preview: optimized.previewUrl,
                    isCover: false,
                });
            }

            const wasEmpty = form.photos.length === 0;
            const added = newPhotos.map((photo, index) => ({
                ...photo,
                isCover: wasEmpty && index === 0,
            }));
            updateForm('photos', [...form.photos, ...added]);
        } catch (error) {
            setPhotoProcessError(error instanceof Error ? error.message : 'No se pudieron procesar las fotos.');
        } finally {
            setProcessingPhotos(false);
        }
    };

    const removePhoto = (id: string) => {
        const photoToRemove = form.photos.find(p => p.id === id);
        if (photoToRemove?.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(photoToRemove.preview);
        }
        const newPhotos = form.photos.filter(p => p.id !== id);
        if (newPhotos.length > 0 && !newPhotos.some(p => p.isCover)) {
            newPhotos[0].isCover = true;
        }
        updateForm('photos', newPhotos);
    };

    const handleVideoFile = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        if (form.reelVideo?.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(form.reelVideo.preview);
        }
        updateForm('videoExternalUrl', '');
        updateForm('reelVideo', {
            id: Math.random().toString(36).slice(2),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            mimeType: file.type || 'video/mp4',
            sizeBytes: file.size,
        });
    };

    const handleExternalVideoUrl = (value: string) => {
        if (value.trim() && form.reelVideo) {
            if (form.reelVideo.preview?.startsWith('blob:')) {
                URL.revokeObjectURL(form.reelVideo.preview);
            }
            updateForm('reelVideo', null);
        }
        updateForm('videoExternalUrl', value);
    };

    const removeVideo = () => {
        if (form.reelVideo?.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(form.reelVideo.preview);
        }
        updateForm('reelVideo', null);
    };
    
    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            form.photos.forEach(p => {
                if (p.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(p.preview);
                }
            });
            if (form.reelVideo?.preview?.startsWith('blob:')) {
                URL.revokeObjectURL(form.reelVideo.preview);
            }
        };
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = form.photos.findIndex(p => p.id === active.id);
            const newIndex = form.photos.findIndex(p => p.id === over.id);
            const newPhotos = arrayMove(form.photos, oldIndex, newIndex);
            // Ensure first photo is marked as cover
            if (newPhotos.length > 0) {
                newPhotos[0].isCover = true;
                newPhotos.slice(1).forEach(p => p.isCover = false);
            }
            updateForm('photos', newPhotos);
        }
    };
    
    const brands = catalog ? getBrandsForVehicleType(catalog, form.vehicleType) : [];
    const models = catalog && form.brandId && form.brandId !== '__custom__'
        ? getModelsForBrand(catalog, form.brandId, form.vehicleType)
        : [];
    
    const showMedia = section === 'media' || section === 'all';
    const showIdentity = section === 'identity' || section === 'all';
    
    return (
        <div className="space-y-8 pb-8">
            {showMedia ? (
                <>
                    <SimplePublishMediaScreen
                        photos={form.photos.map((photo) => ({
                            id: photo.id,
                            previewUrl: photo.preview,
                            isCover: photo.isCover,
                        }))}
                        recommendedPhotos={5}
                        photoError={photoProcessError ?? undefined}
                        onAddFiles={(files) => void handleFiles(files)}
                        onRemovePhoto={removePhoto}
                        onReorderPhotos={(photos) => {
                            const reordered = photos.map((photo, index) => {
                                const existing = form.photos.find((item) => item.id === photo.id);
                                if (!existing) return null;
                                return { ...existing, isCover: index === 0 };
                            }).filter(Boolean) as FormData['photos'];
                            updateForm('photos', reordered);
                        }}
                        videoBlock={(
                            <>
                                <SimplePublishVideoBlock
                                    uploadPreviewUrl={form.reelVideo?.preview ?? null}
                                    uploadFileName={form.reelVideo?.name ?? null}
                                    externalUrl={form.videoExternalUrl}
                                    error={
                                        form.videoExternalUrl.trim() && !isSupportedExternalVideoUrl(form.videoExternalUrl.trim())
                                            ? 'Usa un enlace de YouTube o Vimeo.'
                                            : undefined
                                    }
                                    onPickUpload={() => videoInputRef.current?.click()}
                                    onClearUpload={removeVideo}
                                    onExternalUrlChange={handleExternalVideoUrl}
                                />
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/*"
                                    capture="environment"
                                    onChange={(event) => handleVideoFile(event.target.files)}
                                    className="hidden"
                                />
                            </>
                        )}
                    />
                </>
            ) : null}
            
            {showIdentity ? (
            <>
            
            {/* Tipo de publicación - Premium cards */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm">
                <label className="block text-sm font-semibold mb-4 text-[var(--fg)]">Tipo de publicación *</label>
                <div className="grid grid-cols-3 gap-3">
                    {LISTING_TYPES.map(({ value, label, Icon, color }) => (
                        <button
                            key={value}
                            onClick={() => updateForm('listingType', value as ListingType)}
                            className={`group p-4 rounded-xl border-2 text-center transition-all duration-200
                                ${form.listingType === value 
                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md' 
                                    : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50 hover:shadow-sm'}`}
                        >
                            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center transition-all
                                ${form.listingType === value
                                    ? 'bg-[var(--accent)] text-[var(--accent-contrast,white)]'
                                    : 'bg-[var(--bg-subtle)] group-hover:bg-[var(--accent-subtle)]'}`}
                                style={form.listingType === value ? undefined : { color }}
                            >
                                <Icon size={24} />
                            </div>
                            <span className={`text-sm font-semibold ${form.listingType === value ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </section>
            
            {/* Categoría - Premium cards */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm">
                <label className="block text-sm font-semibold mb-4 text-[var(--fg)]">Categoría *</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 lg:gap-3">
                    {VEHICLE_TYPES.slice(0, 4).map(({ value, label, Icon }) => (
                        <button
                            key={value}
                            onClick={() => updateForm('vehicleType', value)}
                            className={`group p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all duration-200
                                ${form.vehicleType === value 
                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md' 
                                    : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50 hover:shadow-sm'}`}
                        >
                            <Icon size={22} className={`transition-colors ${form.vehicleType === value ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)] group-hover:text-[var(--accent)]'}`} />
                            <span className={`text-xs font-medium leading-tight text-center ${form.vehicleType === value ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
                
                {/* Dropdown para más categorías */}
                <div className="mt-4">
                    <ModernSelect
                        value={VEHICLE_TYPES.slice(4).some(v => v.value === form.vehicleType) ? form.vehicleType : ''}
                        onChange={(v) => updateForm('vehicleType', v as VehicleCatalogType)}
                        options={[
                            { value: '', label: 'Más categorías... (Camión, Bus, Maquinaria, Náutico, Aéreo)' },
                            ...VEHICLE_TYPES.slice(4).map(({ value, label }) => ({ value, label }))
                        ]}
                    />
                </div>
            </section>
            
            {/* Marca y Modelo - Premium layout */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <label className="block text-sm font-semibold text-[var(--fg)]">Marca y Modelo *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Marca *</label>
                        <ModernSelect
                            value={form.brandId}
                            onChange={(v) => {
                                updateForm('brandId', v);
                                updateForm('modelId', '');
                            }}
                            options={[
                                { value: '', label: 'Seleccionar' },
                                ...brands.map(b => ({ value: b.id, label: b.name })),
                                { value: '__custom__', label: 'Otra marca' }
                            ]}
                        />
                        {form.brandId === '__custom__' && (
                            <input
                                type="text"
                                placeholder="Nombre marca"
                                value={form.customBrand}
                                onChange={(e) => updateForm('customBrand', e.target.value)}
                                className="mt-2 w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm"
                            />
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Modelo *</label>
                        <ModernSelect
                            value={form.modelId}
                            onChange={(v) => updateForm('modelId', v)}
                            disabled={!form.brandId}
                            options={[
                                { value: '', label: form.brandId ? 'Seleccionar' : 'Primero marca' },
                                ...models.map(m => ({ value: m.id, label: m.name })),
                                { value: '__custom__', label: 'Otro modelo' }
                            ]}
                        />
                        {form.modelId === '__custom__' && (
                            <input
                                type="text"
                                placeholder="Nombre modelo"
                                value={form.customModel}
                                onChange={(e) => updateForm('customModel', e.target.value)}
                                className="mt-2 w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm"
                            />
                        )}
                    </div>
                </div>
            </section>
            
            {/* Año, Color, Precio y Oferta - Premium layout */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                {/* Año y Color - en la misma fila */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Año */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Año *</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            placeholder="2020"
                            min={1900}
                            max={2027}
                            value={form.year}
                            onChange={(e) => {
                                const val = e.target.value.slice(0, 4);
                                const num = parseInt(val);
                                if (val === '' || (num >= 0 && num <= 2027)) {
                                    updateForm('year', val);
                                }
                            }}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm"
                        />
                    </div>
                    
                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Color</label>
                        <ColorPicker value={form.color} onChange={(c) => updateForm('color', c)} />
                    </div>
                </div>
                
                {/* Precio */}
                <div>
                    <label className="block text-sm font-medium mb-1.5">Precio *</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="18.990.000"
                        value={form.price}
                        onChange={(e) => updateForm('price', formatPrice(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm"
                    />
                </div>
                
                {/* Precio oferta - estilo premium */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--accent)]">
                        Precio oferta (opcional)
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center h-11 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-subtle)]/30 overflow-hidden">
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder={form.offerPriceMode === '%' ? '10' : '16.990.000'}
                                value={form.offerPriceMode === '%' ? form.discountPercent : form.offerPrice}
                                onChange={(e) => {
                                    if (form.offerPriceMode === '%') {
                                        const pct = e.target.value.replace(/\D/g, '').slice(0, 2);
                                        updateForm('discountPercent', pct);
                                        // Auto-calcular precio
                                        if (form.price && pct) {
                                            const priceNum = parseInt(form.price.replace(/\D/g, ''));
                                            const offer = Math.round(priceNum * (1 - parseInt(pct) / 100));
                                            updateForm('offerPrice', offer.toLocaleString('es-CL'));
                                        }
                                    } else {
                                        const val = formatPrice(e.target.value);
                                        updateForm('offerPrice', val);
                                        // Auto-calcular %
                                        if (form.price && val) {
                                            const priceNum = parseInt(form.price.replace(/\D/g, ''));
                                            const offerNum = parseInt(val.replace(/\D/g, ''));
                                            const pct = Math.round((1 - offerNum / priceNum) * 100);
                                            if (pct > 0) updateForm('discountPercent', pct.toString());
                                        }
                                    }
                                }}
                                className="flex-1 bg-transparent border-none outline-none h-full text-sm px-3 font-medium"
                            />
                            <span className="pr-3 text-sm font-bold text-[var(--accent)]">
                                {form.offerPriceMode === '%' ? '%' : '$'}
                            </span>
                        </div>
                        <div className="w-20 shrink-0">
                            <ModernSelect
                                value={form.offerPriceMode}
                                onChange={(v) => {
                                    updateForm('offerPriceMode', v as '$' | '%');
                                    updateForm('offerPrice', '');
                                    updateForm('discountPercent', '');
                                }}
                                options={[
                                    { value: '$', label: '$' },
                                    { value: '%', label: '%' }
                                ]}
                            />
                        </div>
                    </div>
                    {/* Preview del precio final */}
                    {form.offerPrice && (
                        <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)]">
                            <span className="text-xs text-[var(--fg-muted)]">Precio final:</span>
                            <div className="flex items-center gap-2">
                                {form.offerPriceMode === '%' && form.discountPercent && (
                                    <span className="text-xs text-[var(--accent)]">-{form.discountPercent}%</span>
                                )}
                                <span className="font-bold text-[var(--accent)]">${form.offerPrice}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {operatorContext?.showFleetRentFields ? (
                <MarketplaceAutosFleetRentFields
                    rentDaily={form.rentDaily}
                    rentMinDays={form.rentMinDays}
                    rentKmPerDayIncluded={form.rentKmPerDayIncluded}
                    rentDeposit={form.rentDeposit}
                    rentRequirements={form.rentRequirements}
                    rentInsuranceIncluded={form.rentInsuranceIncluded}
                    onChange={(patch) => {
                        for (const [key, value] of Object.entries(patch)) {
                            updateForm(key as keyof FormData, value as FormData[keyof FormData]);
                        }
                    }}
                />
            ) : null}

            {operatorContext?.showConsignmentFields ? (
                <MarketplaceAutosConsignmentFields
                    consignmentCommission={form.consignmentCommission}
                    consignmentTerms={form.consignmentTerms}
                    onChange={(patch) => {
                        for (const [key, value] of Object.entries(patch)) {
                            updateForm(key as keyof FormData, value as FormData[keyof FormData]);
                        }
                    }}
                />
            ) : null}
            </>
            ) : null}
        </div>
    );
}

// =============================================================================
// PASO 2: ESTADO Y CONDICIÓN
// =============================================================================

function Step2Condition({
    form,
    updateForm,
    expandedSections,
    toggleSection,
    catalog
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    expandedSections: Record<string, boolean>;
    toggleSection: (key: string) => void;
    catalog: PublishWizardCatalog | null;
}) {
    // Helper functions to get names
    const getBrandName = (brandId: string) => {
        if (brandId === '__custom__') return form.customBrand || 'Marca personalizada';
        const brand = catalog?.brands.find(b => b.id === brandId);
        return brand?.name || brandId;
    };
    
    const getModelName = (modelId: string) => {
        if (modelId === '__custom__') return form.customModel || 'Modelo personalizado';
        const model = catalog?.models.find(m => m.id === modelId);
        return model?.name || modelId;
    };
    
    // Auto-generar título cuando cambian marca/modelo/año
    // Solo actualiza si el título actual parece autogenerado (no fue editado manualmente)
    useEffect(() => {
        if (!form.brandId) return;
        const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
        const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
        const newTitle = [brand, model, form.year].filter(Boolean).join(' ').trim();
        if (!newTitle) return;

        // Si el título está vacío, generar directamente
        if (!form.title) {
            updateForm('title', newTitle);
            return;
        }

        // Si el título actual coincide con un patrón autogenerado anterior, actualizarlo
        // (esto permite que se actualice cuando el usuario cambia marca/modelo/año)
        const previousBrand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
        const previousModel = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
        const previousTitles = [
            [previousBrand, previousModel, form.year, form.color].filter(Boolean).join(' ').trim(),
            [previousBrand, previousModel, form.year].filter(Boolean).join(' ').trim(),
            [previousBrand, previousModel].filter(Boolean).join(' ').trim(),
        ];
        if (previousTitles.includes(form.title.trim())) {
            updateForm('title', newTitle);
        }
    }, [form.brandId, form.modelId, form.year, form.color, form.customBrand, form.customModel, catalog]);
    return (
        <div className="space-y-8 pb-32">
            {/* Header Premium */}
            <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold mb-3">
                    <IconGauge size={14} />
                    Paso 2 de 3
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[var(--fg)] tracking-tight">
                    ¿En qué estado está?
                </h1>
                <p className="text-[var(--fg-muted)] text-base mt-2 max-w-lg">
                    Los compradores buscan estos datos. Los avisos completos generan 3x más confianza.
                </p>
            </div>
            
            {/* Datos básicos - Premium card */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-5">
                {/* Kilometraje */}
                <div>
                    <label className="block text-sm font-medium mb-1.5">Kilometraje</label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="45.000"
                            value={form.mileage}
                            onChange={(e) => updateForm('mileage', formatNumber(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">km</span>
                    </div>
                </div>
                
                
                {/* Combustible - Premium chips */}
                <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--fg)]">Combustible</label>
                    <div className="flex flex-wrap gap-2">
                        {FUEL_TYPES.map(fuel => (
                            <button
                                key={fuel}
                                onClick={() => updateForm('fuelType', fuel)}
                                className={`px-4 py-2.5 rounded-full text-sm font-medium border-2 transition-all duration-200
                                    ${form.fuelType === fuel 
                                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm' 
                                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50'}`}
                            >
                                {fuel}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Transmisión - Premium buttons */}
                <div>
                    <label className="block text-sm font-semibold mb-3 text-[var(--fg)]">Transmisión</label>
                    <div className="grid grid-cols-3 gap-3">
                        {TRANSMISSIONS.map(trans => (
                            <button
                                key={trans}
                                onClick={() => updateForm('transmission', trans)}
                                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200
                                    ${form.transmission === trans 
                                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm' 
                                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50'}`}
                            >
                                {trans}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Expandible: Condición y dueños */}
            <ExpandibleSection
                title="Condición del vehículo"
                subtitle="Estos datos aumentan las visitas a tu aviso"
                expanded={expandedSections.details}
                onToggle={() => toggleSection('details')}
            >
                <div className="space-y-4 pt-2">
                    {/* Condición */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Estado general</label>
                        <div className="flex gap-2">
                            {CONDITIONS.map(cond => (
                                <button
                                    key={cond}
                                    onClick={() => updateForm('condition', cond as FormData['condition'])}
                                    className={`flex-1 py-2 rounded-xl text-sm border transition-all
                                        ${form.condition === cond 
                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-medium' 
                                            : 'border-[var(--border)] hover:border-[var(--fg-muted)]'}`}
                                >
                                    {cond}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Dueños */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Número de dueños</label>
                        <div className="flex gap-2">
                            {['1', '2', '3+'].map(count => (
                                <button
                                    key={count}
                                    onClick={() => updateForm('ownerCount', count as FormData['ownerCount'])}
                                    className={`flex-1 py-2 rounded-xl text-sm border transition-all
                                        ${form.ownerCount === count 
                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-medium' 
                                            : 'border-[var(--border)] hover:border-[var(--fg-muted)]'}`}
                                >
                                    {count === '1' ? '1° dueño' : count === '2' ? '2° dueño' : '3° o más'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </ExpandibleSection>
            
            {/* Expandible: Historial (chips toggles) */}
            <ExpandibleSection
                title="Historial del vehículo"
                subtitle="Los avisos con historial completo generan más confianza"
                expanded={expandedSections.history}
                onToggle={() => toggleSection('history')}
            >
                <div className="space-y-2 pt-2">
                    <ToggleChip 
                        label="Mantenciones al día"
                        checked={form.maintenanceUpToDate}
                        onChange={(v) => updateForm('maintenanceUpToDate', v)}
                    />
                    <ToggleChip 
                        label="Revisión técnica vigente"
                        checked={form.technicalReviewUpToDate}
                        onChange={(v) => updateForm('technicalReviewUpToDate', v)}
                    />
                    <ToggleChip 
                        label="Papeles al día"
                        checked={form.papersUpToDate}
                        onChange={(v) => updateForm('papersUpToDate', v)}
                    />
                    <ToggleChip 
                        label="Sin siniestros declarados"
                        checked={form.noAccidents}
                        onChange={(v) => updateForm('noAccidents', v)}
                    />
                    <ToggleChip 
                        label="Garantía vigente"
                        checked={form.warranty}
                        onChange={(v) => updateForm('warranty', v)}
                    />
                </div>
            </ExpandibleSection>
            
            {/* Mensaje de calidad */}
            <PanelCard className="bg-[var(--accent-subtle)] border-[var(--accent-border)]">
                <div className="flex items-start gap-3">
                    <IconSparkles size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Tip para vender más rápido</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            Los avisos con historial verificado reciben 3x más contactos
                        </p>
                    </div>
                </div>
            </PanelCard>
        </div>
    );
}

// =============================================================================
// PASO 3: UBICACIÓN Y PUBLICAR
// =============================================================================

function Step3LocationAndPublish({
    form,
    updateForm,
    user,
    catalog
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    user: any;
    catalog: PublishWizardCatalog | null;
}) {
    const regions = catalog?.regions ?? [];
    const communes = catalog?.communes.filter(c => c.regionId === form.regionId) ?? [];
    const [savedAddresses, setSavedAddresses] = useState<AddressBookEntry[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    
    // Helper functions to get names
    const getBrandName = (brandId: string) => {
        if (brandId === '__custom__') return form.customBrand || 'Marca personalizada';
        const brand = catalog?.brands.find(b => b.id === brandId);
        return brand?.name || brandId;
    };
    
    const getModelName = (modelId: string) => {
        if (modelId === '__custom__') return form.customModel || 'Modelo personalizado';
        const model = catalog?.models.find(m => m.id === modelId);
        return model?.name || modelId;
    };
    
    // Cargar direcciones guardadas
    useEffect(() => {
        const loadAddresses = async () => {
            const result = await fetchAddressBook();
            if (result.ok) {
                setSavedAddresses(result.items);
                const defaultAddr = result.items.find(a => a.isDefault);
                if (defaultAddr?.regionId && defaultAddr.communeId && !form.regionId) {
                    setSelectedAddressId(defaultAddr.id);
                    updateForm('regionId', defaultAddr.regionId);
                    updateForm('communeId', defaultAddr.communeId);
                }
            }
        };
        void loadAddresses();
    }, []);
    
    // Seleccionar dirección guardada
    const handleSelectAddress = (addressId: string) => {
        setSelectedAddressId(addressId);
        const address = savedAddresses.find(a => a.id === addressId);
        if (address && address.regionId && address.communeId) {
            updateForm('regionId', address.regionId);
            updateForm('communeId', address.communeId);
        }
    };
    
    // Obtener nombres de la dirección seleccionada
    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
    const regionName = selectedAddress?.regionName || regions.find(r => r.id === form.regionId)?.name;
    const communeName = selectedAddress?.communeName || communes.find(c => c.id === form.communeId)?.name || form.communeId;
    
    return (
        <div className="space-y-8 pb-32">
            {/* Header Premium */}
            <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold mb-3">
                    <IconMapPin size={14} />
                    Paso 3 de 3
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[var(--fg)] tracking-tight">
                    ¿Dónde está el vehículo?
                </h1>
                <p className="text-[var(--fg-muted)] text-base mt-2 max-w-lg">
                    Los compradores cercanos te verán primero. Revisa tu aviso antes de publicar.
                </p>
            </div>
            
            {/* Direcciones guardadas */}
            {savedAddresses.length > 0 && (
                <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                    <label className="block text-sm font-medium">Direcciones guardadas</label>
                    <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((addr) => (
                            <button
                                key={addr.id}
                                onClick={() => handleSelectAddress(addr.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all
                                    ${selectedAddressId === addr.id
                                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                        : 'border-[var(--border)] hover:border-[var(--fg-muted)]'}`}
                            >
                                <IconMapPin size={16} />
                                <span className="font-medium">{addr.label}</span>
                                <span className="text-xs opacity-70">{addr.communeName}, {addr.regionName}</span>
                                {addr.isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white">Default</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setSelectedAddressId('');
                            updateForm('regionId', '');
                            updateForm('communeId', '');
                        }}
                        className="text-xs text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                        + Usar ubicación diferente
                    </button>
                </section>
            )}
            
            {/* Ubicación - autocompletada o manual */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <label className="text-sm font-semibold text-[var(--fg)]">Ubicación del vehículo</label>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* Región */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-[var(--fg-muted)]">
                            Región
                        </label>
                        {selectedAddressId ? (
                            <div className="w-full h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-sm flex items-center gap-2 overflow-hidden">
                                <IconMapPin size={16} className="text-[var(--accent)] shrink-0" />
                                <span className="font-medium text-[var(--fg)] truncate">
                                    {regionName}
                                </span>
                            </div>
                        ) : (
                            <ModernSelect
                                value={form.regionId}
                                onChange={(v) => {
                                    updateForm('regionId', v);
                                    updateForm('communeId', '');
                                }}
                                options={[
                                    { value: '', label: 'Selecciona región' },
                                    ...regions.map(r => ({ value: r.id, label: r.name }))
                                ]}
                            />
                        )}
                    </div>
                    
                    {/* Comuna */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-[var(--fg-muted)]">
                            Comuna
                        </label>
                        {selectedAddressId ? (
                            <div className="w-full h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-sm flex items-center gap-2 overflow-hidden">
                                <IconMapPin size={16} className="text-[var(--accent)] shrink-0" />
                                <span className="font-medium text-[var(--fg)] truncate">
                                    {communeName}
                                </span>
                            </div>
                        ) : (
                            <ModernSelect
                                value={form.communeId}
                                onChange={(v) => updateForm('communeId', v)}
                                disabled={!form.regionId}
                                options={[
                                    { value: '', label: form.regionId ? 'Selecciona comuna' : 'Primero región' },
                                    ...communes.map(c => ({ value: c.id, label: c.name }))
                                ]}
                            />
                        )}
                    </div>
                </div>
            </section>
            
            {/* Opciones - Premium card */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-3">
                <p className="text-sm font-medium mb-2">Opciones de venta</p>
                <ToggleChip 
                    label="Precio conversable"
                    checked={form.negotiable}
                    onChange={(v) => updateForm('negotiable', v)}
                />
                <ToggleChip 
                    label="Acepto permuta"
                    checked={form.exchange}
                    onChange={(v) => updateForm('exchange', v)}
                />
                <ToggleChip 
                    label="Ofrezco financiamiento"
                    checked={form.financing}
                    onChange={(v) => updateForm('financing', v)}
                />
            </section>
            
            <MarketplaceListingCopyFields
                title={form.title}
                description={form.description}
                onTitleChange={(value) => updateForm('title', value)}
                onDescriptionChange={(value) => updateForm('description', value.slice(0, 1000))}
                onRegenerateTitle={() => {
                    const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
                    const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
                    updateForm('title', generateAutosListingTitle({ brandName: brand, modelName: model, year: form.year }));
                }}
                onRegenerateDescription={() => {
                    const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
                    const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
                    updateForm('description', generateAutosListingDescription({
                        brandName: brand,
                        modelName: model,
                        year: form.year,
                        vehicleType: form.vehicleType,
                        condition: form.condition,
                        color: form.color,
                        mileage: form.mileage,
                        transmission: form.transmission,
                        fuelType: form.fuelType,
                        ownerCount: form.ownerCount,
                        price: form.price,
                        negotiable: form.negotiable,
                        financing: form.financing,
                        exchange: form.exchange,
                        maintenanceUpToDate: form.maintenanceUpToDate,
                        technicalReviewUpToDate: form.technicalReviewUpToDate,
                        papersUpToDate: form.papersUpToDate,
                        noAccidents: form.noAccidents,
                        warranty: form.warranty,
                        listingType: form.listingType,
                        platformName: 'SimpleAutos',
                    }).slice(0, 1000));
                }}
                titlePlaceholder="Toyota Yaris 2020"
                descriptionPlaceholder="Descripción para tu ficha y redes sociales"
                descriptionMaxLength={1000}
            />
        </div>
    );
}

// =============================================================================
// LISTING PREVIEW CARD - Vista previa en vivo del aviso
// =============================================================================

function ListingPreviewCard({ form, catalog }: { form: FormData; catalog: PublishWizardCatalog | null }) {
    const brandName = form.brandId === '__custom__' ? form.customBrand : catalog?.brands.find(b => b.id === form.brandId)?.name || '';
    const modelName = form.modelId === '__custom__' ? form.customModel : catalog?.models.find(m => m.id === form.modelId)?.name || '';
    const title = form.title || [brandName, modelName, form.year].filter(Boolean).join(' ') || 'Título del vehículo';
    const regionName = catalog?.regions.find(r => r.id === form.regionId)?.name || '';
    const communeName = catalog?.communes.find(c => c.id === form.communeId)?.name || '';
    const location = [communeName, regionName].filter(Boolean).join(', ') || 'Ubicación pendiente';
    const listingLabel = form.listingType === 'sale' ? 'Venta' : form.listingType === 'rent' ? 'Arriendo' : 'Subasta';

    const specs: Array<{ icon: React.ReactNode; label: string }> = [];
    if (form.year) specs.push({ icon: <IconCalendar size={13} />, label: form.year });
    if (form.mileage) specs.push({ icon: <IconGauge size={13} />, label: `${form.mileage} km` });
    if (form.fuelType) specs.push({ icon: <IconGasStation size={13} />, label: form.fuelType });
    if (form.transmission) specs.push({ icon: <IconManualGearbox size={13} />, label: form.transmission });

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-md">
            {/* Media area — 9:14 like real card */}
            <div className="relative aspect-[9/14] bg-[#09090b] overflow-hidden">
                {form.photos[0] ? (
                    <img src={form.photos[0].preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center" style={{ background: 'radial-gradient(circle at 50% 20%, color-mix(in oklab, var(--accent) 20%, transparent), transparent 42%), #111827' }}>
                        <IconCamera size={28} className="text-white/60" />
                        <span className="text-xs font-semibold text-white/80">Sube la portada</span>
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                {/* Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur font-bold">
                        {listingLabel}
                    </span>
                </div>
                {/* Photo count */}
                {form.photos.length > 1 && (
                    <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-black/40 text-white backdrop-blur font-medium">
                            1 / {form.photos.length}
                        </span>
                    </div>
                )}
                {/* Bottom info — centered like real card */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <p className="text-white font-bold text-xl text-center drop-shadow-sm">
                        {form.offerPrice ? `$${form.offerPrice}` : `$${form.price || 'Consultar'}`}
                    </p>
                    <h3 className="text-white font-semibold text-sm leading-tight text-center line-clamp-1 mt-0.5">{title}</h3>
                    {specs.length > 0 && (
                        <div className="flex items-center justify-center gap-3 mt-2">
                            {specs.map((s, i) => (
                                <div key={i} className="flex flex-col items-center gap-0.5">
                                    <span className="text-white/50">{s.icon}</span>
                                    <span className="text-[10px] text-white/80">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-1 text-white/60 text-[10px] mt-2">
                        <IconMapPin size={10} />
                        <span className="truncate">{location}</span>
                    </div>
                </div>
            </div>
            {/* Footer label */}
            <div className="flex items-center justify-between px-3 py-2">
                <p className="text-[10px] text-[var(--fg-muted)]">Así verá tu aviso el comprador</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-medium">Simple</span>
            </div>
        </div>
    );
}

// =============================================================================
// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function ExpandibleSection({ 
    title, 
    subtitle,
    expanded, 
    onToggle, 
    children 
}: { 
    title: string;
    subtitle?: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div>
                    <span className="font-medium">{title}</span>
                    {subtitle && <p className="text-xs text-[var(--fg-muted)]">{subtitle}</p>}
                </div>
                {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
            </button>
            {expanded && (
                <div className="px-4 pb-4 border-t border-[var(--border)]">
                    {children}
                </div>
            )}
        </div>
    );
}

function ToggleChip({ 
    label, 
    checked, 
    onChange 
}: { 
    label: string; 
    checked: boolean; 
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                ${checked 
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                    : 'border-[var(--border)] hover:border-[var(--fg-muted)]'}`}
        >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors
                ${checked ? 'bg-[var(--accent)]' : 'border border-[var(--border)]'}`}>
                {checked && <IconCheck size={14} className="text-white" />}
            </div>
            <span className={`text-sm ${checked ? 'font-medium' : ''}`}>{label}</span>
        </button>
    );
}

// =============================================================================
// UTILIDADES
// =============================================================================

function formatPrice(value: string): string {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatNumber(value: string): string {
    return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
