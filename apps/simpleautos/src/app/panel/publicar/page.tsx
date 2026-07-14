'use client';

// =============================================================================
// SIMPLE AUTOS - PUBLICAR V2 (3 PASOS ULTRA SIMPLE)
// Mobile-first, publicar en segundos, mejorar después
// =============================================================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, } from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconArrowLeft, IconArrowRight, IconCheck, IconCamera, IconPhoto, IconX, IconUpload, IconMapPin, IconCurrencyDollar, IconCar, IconMotorbike, IconTruck, IconBus, IconTractor, IconAnchor, IconPlane, IconTag, IconKey, IconHammer, IconTool, IconBox, IconSparkles, IconShare3, IconBrandWhatsapp, IconLoader2, IconPlus, IconTrash, IconGripVertical, IconStar, IconGauge, IconEngine, IconSteeringWheel, IconRocket, IconCalendar, IconGasStation, IconManualGearbox, IconBrandInstagram, IconExternalLink, IconLock, IconVideo, IconCalculator,
} from '@tabler/icons-react';
import Link from 'next/link';
import {
    type PublishWizardCatalog, type VehicleCatalogType, getBrandsForVehicleType, getModelsForBrand, loadPublishWizardCatalog, } from '@/lib/publish-wizard-catalog';
import { ShareToSocialPanel } from '@/components/panel/share-to-social-panel';
import {
    createPanelListing, updatePanelListing, fetchPanelListingDetail, fetchPanelListingDraft, savePanelListingDraft, deletePanelListingDraft, type CreatePanelListingInput, } from '@/lib/panel-listings';
import { mergeAutosPublishDraft, prepareAutosDraftMedia, serializeAutosPublishDraft, type AutosPublishStep } from '@/lib/autos-publish-draft';
import { useAuth } from '@simple/auth';
import { mapPanelListingToPublishForm } from '@/lib/map-listing-to-publish-form';
import { PanelButton, optimizeListingPhotoFile, PanelChoiceCard, PanelIconButton, PanelSummaryCard, PanelScrollModal } from '@simple/ui/panel';
import { PanelCard, PanelNotice, MarketplacePublishMessageNotice, MarketplacePublishPlanLimitNotice, useMarketplacePublishPlanLimit, isMarketplacePublishBlockedByPlan, useMarketplaceOperatorPublishDefaults } from '@simple/ui/panel';
import { MarketplaceOperatorPublishHint, MarketplaceAutosFleetRentFields, MarketplaceAutosConsignmentFields, MarketplaceListingCopyFields } from '@simple/ui/publish';
import { SimplePublishLayout, SimplePublishCtaCard, SimplePublishSuccessScreen, SimplePublishPageFrame, SimplePublishScreenHeader, SimplePublishPreviewCard, SimplePublishMediaScreen, SimplePublishVideoBlock, SimplePublishMediaUploadNotice, SimplePublishPhotoProcessNotice, SimplePublishSection, SimplePublishOptionalSection, SimplePublishPriceBlock, SimplePublishRequiredMark, formatClPriceInput, parseDigits, resolveOfferPriceValue, getOfferPriceValidationError, scrollToFirstPublishError, type SimplePublishPhotoProcessProgress, type SimplePublishPreviewCardProps } from '@simple/ui/simple-publish';
import { generateAutosListingDescription, generateAutosListingTitle, isSupportedExternalVideoUrl, validatePublishVideoFile, type DraftMediaUploadProgress, estimateVehicleValue, buildVehicleFeatureCodes, getVehicleEquipmentLabels, vehicleAppearanceOptionsForType, vehicleTechEquipmentOptionsForType, DEFAULT_VEHICLE_CONDITION, vehicleConditionsForPublisher, type VehicleConditionValue, buildVehicleCardSummaryTags, getVerticalConfig, getPublishTypeDefinitions, PUBLISH_SELECTOR_TITLE, isCatalogPublishType, createOperatorService, createOperatorProduct, operatorServiceToPublication, operatorProductToPublication, getOperatorServiceCategories, getOperatorProductCategories, type PublishType } from '@simple/utils';
import type { AutosOperatorPublishContext } from '@simple/utils';
import type { VehicleValuationEstimate, VehicleValuationRequest } from '@simple/types';
import { ModernSelect } from '@simple/ui/forms';
import { abbreviateListingSpecLabel, vehicleSpecIconForLabel } from '@simple/ui/listings';
import { ColorPicker } from '@/components/ui/color-picker';
import { fetchPublishAddressBook, pickDefaultPublishAddress, uploadMediaFile, geocodeListingLocation, getCommunesForRegion, LOCATION_COMMUNES, LOCATION_REGIONS, resolveLocationNames, createAddressBookEntry } from '@simple/utils';
import type { AddressBookEntry, ListingLocation } from '@simple/types';
import { applyAddressBookEntryToLocation, createEmptyListingLocation, patchListingLocation } from '@simple/types';
import { ListingLocationEditor, pickListingLocationFieldErrors } from '@simple/ui/location';
import { useGoogleMapsBrowserKey } from '@simple/ui/address-book';
import { AUTOS_PUBLISH_STEPS } from '@/components/panel/publish/publish-steps';
import dynamic from 'next/dynamic';

const PublishLocationMap = dynamic(() => import('@/components/map/publish-location-map'), {
    ssr: false,
    loading: () => <div className="mt-3 h-52 animate-pulse rounded-xl border bg-(--bg-subtle)" />,
});

// =============================================================================
// TIPOS
// =============================================================================

type Step = 1 | 2 | 3 | 4 | 'success';
type ListingType = PublishType;

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
    catalogCategory: string;
    servicePricingMode: 'fixed' | 'quote';
    
    // Paso 2: Estado (expandible)
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
    // Historial (chips)
    maintenanceUpToDate: boolean;
    technicalReviewUpToDate: boolean;
    papersUpToDate: boolean;
    noAccidents: boolean;
    warranty: boolean;
    featureCodes: string[];
    // Dueños
    ownerCount: '1' | '2' | '3+' | '';
    
    // Ubicación
    location: ListingLocation;
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
    catalogCategory: 'other',
    servicePricingMode: 'fixed',
    mileage: '',
    color: '',
    interiorColor: '',
    offerPriceMode: '$',
    fuelType: 'Bencina',
    transmission: 'Manual',
    engineSize: '',
    traction: '',
    doors: '',
    version: '',
    condition: DEFAULT_VEHICLE_CONDITION,
    maintenanceUpToDate: false,
    technicalReviewUpToDate: false,
    papersUpToDate: false,
    noAccidents: false,
    warranty: false,
    featureCodes: [],
    ownerCount: '',
    location: createEmptyListingLocation({
        sourceMode: 'custom',
        countryCode: 'CL',
        visibilityMode: 'commune_only',
        publicMapEnabled: true,
    }),
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

function createEmptyAutosForm(): FormData {
    return {
        ...EMPTY_FORM,
        photos: [],
        reelVideo: null,
        location: createEmptyListingLocation({
            sourceMode: 'custom',
            countryCode: 'CL',
            visibilityMode: 'commune_only',
            publicMapEnabled: true,
        }),
    };
}

function revokeAutosFormMedia(current: FormData) {
    current.photos.forEach((photo) => {
        if (photo.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(photo.preview);
        }
    });
    if (current.reelVideo?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(current.reelVideo.preview);
    }
}

function isAutosLocationComplete(location: ListingLocation): boolean {
    if (!location.regionId || !location.communeId) return false;
    if (!location.addressLine1?.trim()) return false;
    if (location.sourceMode === 'saved_address' && !location.sourceAddressId) return false;
    return true;
}

const PUBLISH_STEPS = AUTOS_PUBLISH_STEPS;

const AUTOS_STEP_COPY: Record<number, { title: string; description: string }> = {
    1: {
        title: 'Fotos y video',
        description: 'La primera foto es la portada.',
    },
    2: {
        title: 'Datos del vehículo',
        description: 'Identidad, ubicación y precio.',
    },
    3: {
        title: 'Detalles del vehículo',
        description: 'Nada es obligatorio. Estos datos mejoran búsquedas y la confianza del aviso.',
    },
    4: {
        title: 'Publicar',
        description: 'Revisa el título y la descripción generados antes de publicar.',
    },
};

function buildAutosPreviewCardProps(form: FormData, catalog: PublishWizardCatalog | null): SimplePublishPreviewCardProps {
    if (isCatalogPublishType(form.listingType)) {
        const priceDigits = parseDigits(form.price);
        const price = form.listingType === 'service' && form.servicePricingMode === 'quote'
            ? 'A cotizar'
            : (priceDigits ? `$${formatClPriceInput(priceDigits)}` : '$Consultar');
        return {
            title: form.title.trim() || (form.listingType === 'service' ? 'Nuevo servicio' : 'Nuevo producto'),
            location: form.listingType === 'service' ? 'Servicio' : 'Producto',
            badge: form.listingType === 'service' ? 'Servicio' : 'Producto',
            price,
            coverUrl: form.photos.find((p) => p.isCover)?.preview || form.photos[0]?.preview,
            specs: [],
            ctaLabel: 'Ver detalle',
        };
    }
    const brandName = form.brandId === '__custom__' ? form.customBrand : catalog?.brands.find((b) => b.id === form.brandId)?.name || '';
    const modelName = form.modelId === '__custom__' ? form.customModel : catalog?.models.find((m) => m.id === form.modelId)?.name || '';
    const title = form.title || [brandName, modelName, form.year].filter(Boolean).join(' ') || 'Título del aviso';
    const location = form.location.communeName
        || form.location.publicLabel
        || form.location.regionName
        || 'Ubicación pendiente';
    const badge = form.listingType === 'sale' ? 'Venta' : form.listingType === 'rent' ? 'Arriendo' : 'Subasta';
    const mainPriceDigits = parseDigits(form.price);
    const offerPriceDigits = parseDigits(resolveOfferPriceValue({
        mainPrice: form.price,
        offerPrice: form.offerPrice,
        discountPercent: form.discountPercent,
        offerPriceMode: form.offerPriceMode,
    }));
    const priceDigits = offerPriceDigits || mainPriceDigits;
    const price = priceDigits ? `$${formatClPriceInput(priceDigits)}` : '$Consultar';
    const priceOriginal = offerPriceDigits && mainPriceDigits && offerPriceDigits !== mainPriceDigits
        ? `$${formatClPriceInput(mainPriceDigits)}`
        : undefined;
    const discountPercent = offerPriceDigits && mainPriceDigits && Number(offerPriceDigits) < Number(mainPriceDigits)
        ? Math.round((1 - Number(offerPriceDigits) / Number(mainPriceDigits)) * 100)
        : undefined;

    const vehicleTypeLabel = VEHICLE_TYPES.find((item) => item.value === form.vehicleType)?.label;
    const specs: SimplePublishPreviewCardProps['specs'] = buildVehicleCardSummaryTags({
        vehicleType: form.vehicleType,
        vehicleTypeLabel,
        mileage: form.mileage,
        fuelType: form.fuelType,
        transmission: form.transmission,
    })
        .filter((label) => !/^(19|20)\d{2}$/.test(label))
        .slice(0, 4)
        .map((label, index) => ({
            icon: vehicleSpecIconForLabel(label, index),
            label: abbreviateListingSpecLabel(label),
        }));

    const extraChips: SimplePublishPreviewCardProps['extraChips'] = [];
    if (form.financing) extraChips.push({ label: 'Financiamiento' });
    if (form.exchange) extraChips.push({ label: 'Permuta' });
    else if (form.negotiable) extraChips.push({ label: 'Conversable' });

    return {
        badge,
        price,
        priceOriginal,
        discountPercent: discountPercent && discountPercent > 0 && discountPercent < 100 ? discountPercent : undefined,
        title,
        location,
        accent: 'autos',
        photoUrls: form.photos.map((photo) => photo.preview).filter(Boolean),
        videoUrl: form.reelVideo?.preview ?? null,
        specs,
        extraChips,
        ctaLabel: form.listingType === 'rent' ? 'Ver disponibilidad' : form.listingType === 'auction' ? 'Ver subasta' : 'Ver detalle',
        sellerName: 'Tu negocio',
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

const PUBLISH_TYPE_ICONS: Record<PublishType, typeof IconTag> = {
    sale: IconTag,
    rent: IconKey,
    auction: IconHammer,
    project: IconRocket,
    service: IconTool,
    product: IconBox,
};

const AUTOS_PUBLISH_TYPE_OPTIONS = getPublishTypeDefinitions(getVerticalConfig('autos').publishTypes);

const FUEL_TYPES = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'];
const TRANSMISSIONS = ['Manual', 'Automática', 'CVT', 'Secuencial', 'DCT / DSG', 'Tiptronic'];
const PUBLISH_YEAR_MAX = new Date().getFullYear() + 1;
const PUBLISH_YEAR_MIN = 1950;
const YEAR_OPTIONS = Array.from({ length: PUBLISH_YEAR_MAX - PUBLISH_YEAR_MIN + 1 }, (_, index) => {
    const year = String(PUBLISH_YEAR_MAX - index);
    return { value: year, label: year };
});

const VEHICLE_TYPE_BY_VALUE = Object.fromEntries(
    VEHICLE_TYPES.map((item) => [item.value, item]),
) as Record<VehicleCatalogType, (typeof VEHICLE_TYPES)[number]>;

function VehicleTypePicker({
    value,
    onChange,
}: {
    value: VehicleCatalogType;
    onChange: (value: VehicleCatalogType) => void;
}) {
    const isOtherMobile = value !== 'car';
    const isOtherDesktop = value !== 'car' && value !== 'motorcycle';
    const [showOthersMobile, setShowOthersMobile] = useState(isOtherMobile);
    const [showOthersDesktop, setShowOthersDesktop] = useState(isOtherDesktop);

    useEffect(() => {
        if (isOtherMobile) setShowOthersMobile(true);
        if (isOtherDesktop) setShowOthersDesktop(true);
    }, [isOtherMobile, isOtherDesktop]);

    const mobileOthers = VEHICLE_TYPES.filter((item) => item.value !== 'car');
    const desktopOthers = VEHICLE_TYPES.filter((item) => item.value !== 'car' && item.value !== 'motorcycle');

    const renderTypeCard = (
        item: { value: VehicleCatalogType; label: string; Icon: (typeof VEHICLE_TYPES)[number]['Icon'] },
        options?: { className?: string; collapseOthers?: 'mobile' | 'desktop' | 'both' },
    ) => (
        <PanelChoiceCard
            key={item.value}
            onClick={() => {
                onChange(item.value);
                if (options?.collapseOthers === 'mobile' || options?.collapseOthers === 'both') {
                    setShowOthersMobile(false);
                }
                if (options?.collapseOthers === 'desktop' || options?.collapseOthers === 'both') {
                    setShowOthersDesktop(false);
                }
            }}
            selected={value === item.value}
            className={options?.className ?? 'min-h-[52px] px-3'}
        >
            <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                    <item.Icon size={15} />
                </span>
                <p className="truncate text-sm font-medium text-(--fg)">{item.label}</p>
            </div>
        </PanelChoiceCard>
    );

    return (
        <div className="space-y-2">
            {/* Móvil: Auto | Otro tipo */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
                {renderTypeCard({ ...VEHICLE_TYPE_BY_VALUE.car, label: 'Auto' }, { collapseOthers: 'mobile' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersMobile((current) => !current)}
                    selected={isOtherMobile}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium text-(--fg)">Otro tipo</p>
                    </div>
                </PanelChoiceCard>
            </div>
            {showOthersMobile ? (
                <div className="grid grid-cols-2 gap-2 md:hidden">
                    {mobileOthers.map((item) => renderTypeCard(item))}
                </div>
            ) : null}

            {/* Desktop: Auto | Moto | Otro tipo */}
            <div className="hidden grid-cols-3 gap-2 md:grid">
                {renderTypeCard({ ...VEHICLE_TYPE_BY_VALUE.car, label: 'Auto' }, { collapseOthers: 'desktop' })}
                {renderTypeCard(VEHICLE_TYPE_BY_VALUE.motorcycle, { collapseOthers: 'desktop' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersDesktop((current) => !current)}
                    selected={isOtherDesktop}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium text-(--fg)">Otro tipo</p>
                    </div>
                </PanelChoiceCard>
            </div>
            {showOthersDesktop ? (
                <div className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-3">
                    {desktopOthers.map((item) => renderTypeCard(item))}
                </div>
            ) : null}
        </div>
    );
}

function requiresVehicleCondition(listingType: FormData['listingType']): boolean {
    return listingType === 'sale' || listingType === 'auction';
}

function validateAutosStep(step: 1 | 2 | 3 | 4, form: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    const isCatalog = isCatalogPublishType(form.listingType);

    if (step === 1) {
        if (!isCatalog && form.photos.length < 1) errors.photos = '';
        if (form.videoExternalUrl.trim() && !isSupportedExternalVideoUrl(form.videoExternalUrl.trim())) {
            errors.video = '';
        }
    }

    if (step === 2) {
        if (isCatalog) {
            if (!form.title.trim()) errors.title = '';
            if (form.listingType === 'product' && !parseDigits(form.price)) errors.price = '';
            if (form.listingType === 'service' && form.servicePricingMode === 'fixed' && !parseDigits(form.price)) {
                errors.price = '';
            }
            return errors;
        }
        if (!form.brandId) {
            errors.brandId = '';
        } else if (form.brandId === '__custom__' && !form.customBrand.trim()) {
            errors.customBrand = '';
        }
        if (!form.modelId) {
            errors.modelId = '';
        } else if (form.modelId === '__custom__' && !form.customModel.trim()) {
            errors.customModel = '';
        }
        if (!form.year.trim()) errors.year = '';
        if (requiresVehicleCondition(form.listingType) && !form.condition) {
            errors.condition = '';
        }
        if (!parseDigits(form.price)) errors.price = '';
        const offerError = getOfferPriceValidationError({
            mainPrice: form.price,
            offerPrice: form.offerPrice,
            discountPercent: form.discountPercent,
            offerPriceMode: form.offerPriceMode,
        });
        if (offerError) errors.offerPrice = offerError;
        if (!form.location.regionId) errors['location.regionId'] = '';
        if (!form.location.communeId) errors['location.communeId'] = '';
        if (!form.location.addressLine1?.trim()) errors['location.addressLine1'] = '';
        if (form.location.sourceMode === 'saved_address' && !form.location.sourceAddressId) {
            errors['location.sourceAddressId'] = '';
        }
    }

    return errors;
}

function isAutosFieldInvalid(fieldErrors: Record<string, string>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(fieldErrors, key);
}

function autosInvalidClass(fieldErrors: Record<string, string>, key: string): string {
    return isAutosFieldInvalid(fieldErrors, key) ? ' form-input-error' : '';
}

function formatClpAmount(value: number): string {
    return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatSignedPercent(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return 'Sin dato';
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function formatSeriesLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

function parseMileageKm(mileage: string): number | null {
    const digits = mileage.replace(/\D/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolveBrandName(form: FormData, catalog: PublishWizardCatalog | null): string {
    if (form.brandId === '__custom__') return form.customBrand.trim();
    return catalog?.brands.find((brand) => brand.id === form.brandId)?.name || form.brandId.trim();
}

function resolveModelName(form: FormData, catalog: PublishWizardCatalog | null): string {
    if (form.modelId === '__custom__') return form.customModel.trim();
    return catalog?.models.find((model) => model.id === form.modelId)?.name || form.modelId.trim();
}

function buildVehicleValuationRequest(form: FormData, catalog: PublishWizardCatalog | null): VehicleValuationRequest | null {
    if (form.listingType === 'auction') return null;

    const brand = resolveBrandName(form, catalog);
    const model = resolveModelName(form, catalog);
    const year = Number.parseInt(form.year, 10);

    if (
        !form.vehicleType
        || !brand
        || !model
        || !Number.isFinite(year)
        || !form.location.regionId
        || !form.location.communeId
        || !form.location.addressLine1?.trim()
    ) {
        return null;
    }

    return {
        operationType: form.listingType === 'rent' ? 'rent' : 'sale',
        vehicleType: form.vehicleType,
        brand,
        model,
        version: null,
        year,
        mileageKm: parseMileageKm(form.mileage),
        condition: form.condition || null,
        fuelType: form.fuelType || null,
        transmission: form.transmission || null,
        traction: null,
        bodyType: null,
        regionId: form.location.regionId,
        communeId: form.location.communeId,
        addressLine1: form.location.addressLine1.trim(),
    };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PublicarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { requireAuth } = useAuth();
    
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    const planLimit = useMarketplacePublishPlanLimit('autos');
    const publishBlocked = isMarketplacePublishBlockedByPlan(planLimit, isEditing);

    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const { hint: operatorHint, defaults: operatorDefaults, context: operatorContext, ready: operatorDefaultsReady } = useMarketplaceOperatorPublishDefaults('autos', { enabled: true, autosListingType: form.listingType });
    const [operatorDefaultsApplied, setOperatorDefaultsApplied] = useState(false);
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [loading, setLoading] = useState(false);
    const [published, setPublished] = useState<{ id: string; href: string; title: string; hasVideo: boolean } | null>(null);
const googleMapsApiKey = useGoogleMapsBrowserKey();
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [estimate, setEstimate] = useState<VehicleValuationEstimate | null>(null);
    const [estimating, setEstimating] = useState(false);
    const locationCommunes = useMemo(
        () => getCommunesForRegion(form.location.regionId || ''),
        [form.location.regionId],
    );
    const valuationRequest = useMemo(() => buildVehicleValuationRequest(form, catalog), [form, catalog]);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [draftSavedNote, setDraftSavedNote] = useState<string | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [mediaUploadProgress, setMediaUploadProgress] = useState<DraftMediaUploadProgress | null>(null);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [photoProcessProgress, setPhotoProcessProgress] = useState<SimplePublishPhotoProcessProgress | null>(null);
    const processingPhotos = photoProcessProgress != null;
    const [editingLoading, setEditingLoading] = useState(false);
    const [editLoadFailed, setEditLoadFailed] = useState(false);
    const [resettingWizard, setResettingWizard] = useState(false);
    const formRef = useRef<FormData>(form);
    const stepRef = useRef<Step>(step);

    useEffect(() => {
        formRef.current = form;
    }, [form]);

    useEffect(() => {
        const autosCtx = operatorContext as AutosOperatorPublishContext;
        if (!operatorDefaultsReady || autosCtx.canSelectNewCondition) return;
        if (form.condition !== 'Nuevo') return;
        setForm((current) => (
            current.condition === 'Nuevo'
                ? { ...current, condition: DEFAULT_VEHICLE_CONDITION }
                : current
        ));
    }, [operatorContext, operatorDefaultsReady, form.condition]);

    useEffect(() => {
        stepRef.current = step;
    }, [step]);
    
    // Cargar catálogo
    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog).catch(() => null);
    }, []);

    useEffect(() => {
        let mounted = true;
        void fetchPublishAddressBook('autos').then((result) => {
            if (!mounted) return;
            if (result.ok) setAddressBook(result.items);
            setAddressBookLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (addressBookLoading || isEditing || draftLoaded || addressBook.length === 0) return;
        setForm((current) => {
            if (isAutosLocationComplete(current.location)) return current;
            const defaultAddr = pickDefaultPublishAddress(addressBook, 'autos');
            if (!defaultAddr) return current;
            return {
                ...current,
                location: applyAddressBookEntryToLocation(defaultAddr, current.location),
            };
        });
    }, [addressBook, addressBookLoading, isEditing, draftLoaded]);
    
    useEffect(() => {
        if (!draftSavedNote) return;
        const timer = window.setTimeout(() => setDraftSavedNote(null), 2400);
        return () => window.clearTimeout(timer);
    }, [draftSavedNote]);

    // Cargar borrador o edición
    useEffect(() => {
        if (isEditing) {
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
            return;
        }

        let active = true;
        const loadDraft = async () => {
            const result = await fetchPanelListingDraft('autos');
            if (!active) return;
            if (result.ok && result.draft) {
                const merged = mergeAutosPublishDraft(result.draft);
                if (!merged) {
                    setStorageError('El borrador guardado está dañado y no se pudo restaurar.');
                    return;
                }
                setDraftLoaded(true);
                setForm(merged.form);
                setStep(merged.step);
                setDraftSavedNote(
                    merged.form.photos.length > 0
                        ? 'Borrador restaurado. Si alguna foto no muestra preview, súbela nuevamente.'
                        : 'Borrador restaurado.',
                );
                setStorageError(null);
                return;
            }
            if (result.error && !result.unauthorized) {
                setStorageError(result.error);
            }
        };

        void loadDraft();
        return () => {
            active = false;
        };
    }, [editingId, isEditing]);

    useEffect(() => {
        if (!operatorDefaultsReady || operatorDefaultsApplied || isEditing || draftLoaded || !operatorDefaults?.autos) return;
        setForm((current) => {
            if (isCatalogPublishType(current.listingType)) return current;
            return { ...current, listingType: operatorDefaults.autos!.listingType };
        });
        setOperatorDefaultsApplied(true);
    }, [operatorDefaultsReady, operatorDefaults, operatorDefaultsApplied, isEditing, draftLoaded]);

    useEffect(() => {
        const op = searchParams.get('op');
        if (op !== 'service' && op !== 'product') return;
        setForm((current) => ({ ...current, listingType: op }));
    }, [searchParams]);
    
    const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleGeocodeLocation = useCallback(async () => {
        setGeocoding(true);
        try {
            const result = await geocodeListingLocation(form.location);
            if (!result.ok || !result.location) {
                setPublishError(result.error || 'No pudimos verificar la dirección.');
                return;
            }
            updateForm('location', result.location);
        } finally {
            setGeocoding(false);
        }
    }, [form.location, updateForm]);

    const runValuation = useCallback(async () => {
        if (!valuationRequest) {
            setStorageError('Completa marca, modelo, año y ubicación para usar el tasador.');
            return;
        }
        setEstimating(true);
        setStorageError(null);
        const result = await estimateVehicleValue(valuationRequest);
        setEstimating(false);
        if (!result.ok || !result.estimate) {
            setStorageError(result.error || 'No se pudo calcular la estimación.');
            return;
        }
        setEstimate(result.estimate);
        setDraftSavedNote('Estimación calculada correctamente.');
    }, [valuationRequest]);
    
    const saveDraft = async (manual: boolean, nextStep?: AutosPublishStep): Promise<boolean> => {
        const currentStep = stepRef.current;
        if (currentStep === 'success') return true;
        const stepToSave = nextStep ?? (typeof currentStep === 'number' ? currentStep : 1);
        setSavingDraft(true);
        setMediaUploadProgress(null);
        try {
        const prepared = await prepareAutosDraftMedia(formRef.current, {
            onMediaProgress: setMediaUploadProgress,
        });
        if (!prepared.ok || !prepared.form) {
            setStorageError(prepared.error || 'No se pudieron subir los archivos del borrador.');
            return false;
        }
        formRef.current = prepared.form;
        setForm(prepared.form);
        const serialized = serializeAutosPublishDraft(prepared.form, stepToSave);
        const result = await savePanelListingDraft('autos', serialized);
        if (!result.ok) {
            if (result.unauthorized) {
                requireAuth();
            }
            setStorageError(result.error || 'No se pudo guardar el borrador.');
            return false;
        }
        setStorageError(null);
        if (manual) setDraftSavedNote('Borrador guardado');
        return true;
        } finally {
            setSavingDraft(false);
            setMediaUploadProgress(null);
        }
    };

    const resetWizard = async (options?: { confirm?: boolean }) => {
        if (options?.confirm !== false && !window.confirm('¿Reiniciar el borrador? Se borrarán todos los datos y volverás al paso 1.')) {
            return;
        }
        setResettingWizard(true);
        try {
            revokeAutosFormMedia(formRef.current);
            await deletePanelListingDraft('autos').catch(() => null);
            const fresh = createEmptyAutosForm();
            formRef.current = fresh;
            setForm(fresh);
            setStep(1);
            setEstimate(null);
            setPublishError(null);
            setStorageError(null);
            setDraftSavedNote(options?.confirm === false ? null : 'Borrador reiniciado');
            setDraftLoaded(true);
            setFieldErrors({});
        } finally {
            setResettingWizard(false);
        }
    };

    const goNext = async () => {
        if (typeof step !== 'number' || step >= 4) return;
        const nextErrors = validateAutosStep(step, form);
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setPublishError(null);
            scrollToFirstPublishError();
            return;
        }
        setPublishError(null);
        const nextStep = (
            isCatalogPublishType(form.listingType) && step === 2
                ? 4
                : (step + 1)
        ) as AutosPublishStep;
        const saved = await saveDraft(false, nextStep);
        if (!saved) return;
        setFieldErrors({});
        setStep(nextStep);
    };
    
    const handlePublish = async () => {
        if (publishBlocked) {
            setPublishError('Alcanzaste el límite de avisos de tu plan. Mejora tu plan para publicar más.');
            return;
        }

        setLoading(true);
        setPublishError(null);
        try {
            for (const stepNumber of [1, 2] as const) {
                const stepValidationErrors = validateAutosStep(stepNumber, form);
                if (Object.keys(stepValidationErrors).length > 0) {
                    setFieldErrors(stepValidationErrors);
                    setStep(stepNumber);
                    setPublishError(null);
                    scrollToFirstPublishError({ delayMs: 80 });
                    return;
                }
            }

            if (isCatalogPublishType(form.listingType)) {
                let imageUrl: string | undefined;
                const cover = form.photos.find((p) => p.isCover) ?? form.photos[0];
                if (cover?.file) {
                    const uploadResult = await uploadMediaFile(cover.file, { fileType: 'image' });
                    if (!uploadResult.ok || !uploadResult.result) {
                        setPublishError(uploadResult.error || 'No se pudo subir la foto.');
                        return;
                    }
                    imageUrl = uploadResult.result.publicUrl || uploadResult.result.url;
                } else if (cover?.preview && !cover.preview.startsWith('blob:')) {
                    imageUrl = cover.preview;
                }

                const name = form.title.trim();
                const description = form.description.trim() || null;
                const priceDigits = parseDigits(form.price);

                if (form.listingType === 'service') {
                    const result = await createOperatorService('autos', {
                        name,
                        description,
                        imageUrl: imageUrl ?? null,
                        category: form.catalogCategory || 'other',
                        pricingMode: form.servicePricingMode,
                        price: form.servicePricingMode === 'quote' ? null : (priceDigits || null),
                        currency: 'CLP',
                        isActive: true,
                    });
                    if (!result.ok || !result.item) {
                        setPublishError(result.error || 'No se pudo publicar el servicio.');
                        return;
                    }
                    const publication = operatorServiceToPublication(result.item, { verticalId: 'autos' });
                    setPublished({
                        id: publication.id,
                        title: publication.title,
                        href: publication.href,
                        hasVideo: false,
                    });
                } else {
                    const result = await createOperatorProduct('autos', {
                        name,
                        description,
                        imageUrl: imageUrl ?? null,
                        category: form.catalogCategory || 'other',
                        price: priceDigits,
                        currency: 'CLP',
                        isActive: true,
                    });
                    if (!result.ok || !result.item) {
                        setPublishError(result.error || 'No se pudo publicar el producto.');
                        return;
                    }
                    const publication = operatorProductToPublication(result.item, { verticalId: 'autos' });
                    setPublished({
                        id: publication.id,
                        title: publication.title,
                        href: publication.href,
                        hasVideo: false,
                    });
                }
                setStep('success');
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
                setFieldErrors({ photos: '' });
                setStep(1);
                setPublishError(null);
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
                setFieldErrors({ video: '' });
                setStep(1);
                setPublishError(null);
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
            const offerPriceValue = resolveOfferPriceValue({
                mainPrice: form.price,
                offerPrice: form.offerPrice,
                discountPercent: form.discountPercent,
                offerPriceMode: form.offerPriceMode,
            });
            
            // PASO 3: Construir priceLabel
            const renderMoney = (value: string | undefined, suffix = '') => {
                if (!value) return '';
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
            
            // Ubicación normalizada (misma lógica que Propiedades)
            const { regionName, communeName } = resolveLocationNames(form.location.regionId, form.location.communeId);
            const locationData = patchListingLocation(form.location, {
                regionName: regionName || form.location.regionName,
                communeName: communeName || form.location.communeName,
            });
            const locationLabel = locationData.publicLabel
                || locationData.addressLine1?.trim()
                || [locationData.neighborhood, communeName || form.location.communeId, regionName || form.location.regionId].filter(Boolean).join(', ');
            
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
                    version: form.version || '',
                    versionMode: form.version ? 'custom' : 'catalog',
                    color: form.color || '',
                    mileage: parseDigits(form.mileage),
                    condition: form.condition || '',
                    bodyType: '',
                    fuelType: form.fuelType || '',
                    transmission: form.transmission || '',
                    traction: form.traction || '',
                    engineSize: form.engineSize || '',
                    powerHp: '',
                    doors: form.doors || '',
                    seats: '',
                    exteriorColor: form.color || '',
                    interiorColor: form.interiorColor || '',
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
                    featureCodes: buildVehicleFeatureCodes(form.featureCodes, form.warranty),
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
                location: locationData,
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
                location: locationLabel,
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
                await deletePanelListingDraft('autos').catch(() => null);
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
        if (step !== 4 || !catalog) return;
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
                equipmentLabels: getVehicleEquipmentLabels(current.featureCodes),
                listingType: current.listingType,
                platformName: 'SimpleAutos',
            }).slice(0, 1000),
        }));
    }, [step, catalog, form.brandId, form.modelId, form.customBrand, form.customModel, form.year, form.title, form.description]);

    // Scroll to top cuando cambia el paso
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);
    
    // =============================================================================
    // RENDER PASOS
    // =============================================================================
    
    const stepIndex = step === 'success' ? 3 : (step as number) - 1;

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
                onReset={() => {
                    setPublished(null);
                    void resetWizard({ confirm: false });
                }}
                onGoToListings={() => router.push('/panel/publicaciones')}
            />
        ) : (
        <SimplePublishLayout
            title="Nueva publicación"
            subtitle={isEditing ? 'Actualiza los datos de tu aviso.' : 'Multimedia, datos básicos y publicación.'}
            steps={PUBLISH_STEPS.map((item) => ({ key: item.key, label: item.label, helper: item.helper }))}
            stepIndex={stepIndex}
            isEditing={isEditing}
            onBack={() => {
                setFieldErrors({});
                setStep((prev) => ((prev as number) - 1) as Step);
            }}
            onClose={() => router.push('/panel')}
            onStepChange={(key) => {
                const target = Number(key);
                if (!Number.isNaN(target) && target <= (step as number)) {
                    setFieldErrors({});
                    setStep(target as Step);
                }
            }}
            headerReset={!isEditing ? {
                onClick: () => { void resetWizard({ confirm: true }); },
                loading: resettingWizard,
                disabled: loading || savingDraft || editingLoading || resettingWizard,
                ariaLabel: 'Reiniciar borrador',
            } : undefined}
            headerSave={!isEditing ? {
                onClick: () => { void saveDraft(true); },
                ariaLabel: 'Guardar borrador',
                loading: savingDraft,
                disabled: savingDraft || loading || editingLoading,
            } : undefined}
            headerContinue={{
                label: step === 4
                    ? (isEditing ? 'Guardar en Simple' : 'Publicar en Simple')
                    : 'Continuar',
                icon: step === 4 ? 'check' : 'arrow',
                onClick: () => {
                    if (step === 4) void handlePublish();
                    else void goNext();
                },
                disabled: loading || savingDraft || editingLoading || editLoadFailed || processingPhotos || (step === 4 && publishBlocked),
                loading: loading || savingDraft || processingPhotos,
            }}
            notices={(
                <>
                    <MarketplacePublishPlanLimitNotice vertical="autos" isEditing={isEditing} planLimit={planLimit} />
                    {!isEditing ? <MarketplaceOperatorPublishHint message={operatorHint} /> : null}
                    {editingLoading ? <PanelNotice tone="neutral">Cargando publicación para editar...</PanelNotice> : null}
                    {publishError ? <MarketplacePublishMessageNotice message={publishError} /> : null}
                    {storageError ? <PanelNotice tone="error">{storageError}</PanelNotice> : null}
                    <SimplePublishMediaUploadNotice progress={mediaUploadProgress} />
                    {draftSavedNote ? <PanelNotice tone="success">{draftSavedNote}</PanelNotice> : null}
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
                            <Step1PhotosAndIdentity
                                form={form}
                                updateForm={updateForm}
                                catalog={catalog}
                                section="media"
                                fieldErrors={fieldErrors}
                                onPhotoProcessProgressChange={setPhotoProcessProgress}
                            />
                        )}
                        {step === 2 && (
                            <div className="space-y-5">
                                <Step1PhotosAndIdentity form={form} updateForm={updateForm} catalog={catalog} section="identity" operatorContext={operatorContext as AutosOperatorPublishContext} fieldErrors={fieldErrors} />
                                {!isCatalogPublishType(form.listingType) ? (
                                    <>
                                        <StepAutosLocation
                                            location={form.location}
                                            onLocationChange={(next) => updateForm('location', next)}
                                            addressBook={addressBook}
                                            addressBookLoading={addressBookLoading}
                                            onAddressBookChange={setAddressBook}
                                            communes={locationCommunes}
                                            geocoding={geocoding}
                                            onGeocodeLocation={() => void handleGeocodeLocation()}
                                            googleMapsApiKey={googleMapsApiKey}
                                            fieldErrors={fieldErrors}
                                        />
                                        <StepAutosPrice
                                            form={form}
                                            updateForm={updateForm}
                                            estimate={estimate}
                                            estimating={estimating}
                                            valuationRequest={valuationRequest}
                                            onRunValuation={runValuation}
                                            fieldErrors={fieldErrors}
                                        />
                                    </>
                                ) : null}
                            </div>
                        )}
                        {step === 3 && !isCatalogPublishType(form.listingType) && (
                            <StepAutosDetails
                                form={form}
                                updateForm={updateForm}
                                operatorContext={operatorContext as AutosOperatorPublishContext}
                            />
                        )}
                        {step === 4 && (
                            isCatalogPublishType(form.listingType) ? (
                                <SimplePublishSection title="Revisión">
                                    <div className="space-y-2 text-sm text-(--fg)">
                                        <p><span className="text-(--fg-muted)">Tipo:</span> {form.listingType === 'service' ? 'Servicio' : 'Producto'}</p>
                                        <p><span className="text-(--fg-muted)">Nombre:</span> {form.title || '—'}</p>
                                        <p><span className="text-(--fg-muted)">Precio:</span> {form.listingType === 'service' && form.servicePricingMode === 'quote' ? 'A cotizar' : (form.price ? `$${form.price}` : '—')}</p>
                                    </div>
                                </SimplePublishSection>
                            ) : (
                            <StepAutosPublish
                                form={form}
                                updateForm={updateForm}
                                catalog={catalog}
                            />
                            )
                        )}
                        <SimplePublishCtaCard
                            label={step === 4
                                ? (isEditing ? 'Guardar en Simple' : 'Publicar en Simple')
                                : step === 1
                                    ? 'Continuar'
                                    : 'Continuar'}
                            loadingLabel={processingPhotos
                                ? 'Optimizando fotos…'
                                : step === 4
                                    ? (isEditing ? 'Guardando...' : 'Publicando...')
                                    : 'Avanzando...'}
                            onClick={() => {
                                if (step === 4) void handlePublish();
                                else void goNext();
                            }}
                            disabled={editingLoading || editLoadFailed || processingPhotos || (step === 4 && publishBlocked)}
                            loading={loading || processingPhotos}
                            preamble={step === 1 ? <SimplePublishPhotoProcessNotice progress={photoProcessProgress} /> : undefined}
                            hint={step === 4 ? 'Al publicar, tu aviso quedará visible en SimpleAutos de inmediato.' : undefined}
                            icon={step === 4 ? <IconCheck size={18} /> : <IconArrowRight size={18} />}
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

// =============================================================================
// CAMPOS DEL VEHÍCULO (paso 2)
// =============================================================================

function AutosConditionFields({
    form,
    updateForm,
    canSelectNew,
    invalid = false,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    canSelectNew: boolean;
    invalid?: boolean;
}) {
    const options = vehicleConditionsForPublisher(canSelectNew);

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Condición<SimplePublishRequiredMark /></label>
            <ModernSelect
                value={form.condition || DEFAULT_VEHICLE_CONDITION}
                onChange={(value) => {
                    const next = (value || DEFAULT_VEHICLE_CONDITION) as VehicleConditionValue;
                    updateForm('condition', next);
                    if (next === 'Siniestrado' && form.noAccidents) {
                        updateForm('noAccidents', false);
                    }
                }}
                options={options.map((cond) => ({ value: cond, label: cond }))}
                triggerClassName={invalid ? 'form-input-error' : undefined}
                ariaLabel="Seleccionar condición"
            />
        </div>
    );
}

function AutosMileageField({
    form,
    updateForm,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
    const vehicleType = form.vehicleType;
    const mileageLabel = vehicleType === 'nautical' ? 'Horas de motor' : vehicleType === 'machinery' || vehicleType === 'aerial' ? 'Horas de uso' : 'Kilometraje';
    const mileagePlaceholder = vehicleType === 'nautical' ? '320' : vehicleType === 'machinery' || vehicleType === 'aerial' ? '1.200' : '45.000';
    const mileageSuffix = vehicleType === 'nautical' || vehicleType === 'machinery' || vehicleType === 'aerial' ? 'h' : 'km';

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-(--fg)">{mileageLabel}</label>
            <div className="relative">
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder={mileagePlaceholder}
                    value={form.mileage}
                    onChange={(e) => updateForm('mileage', formatNumber(e.target.value))}
                    className="form-input pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--fg-muted)">{mileageSuffix}</span>
            </div>
        </div>
    );
}

function AutosFuelAndTransmissionFields({
    form,
    updateForm,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
    const isMotorcycle = form.vehicleType === 'motorcycle';

    return (
        <>
            <div className={isMotorcycle ? 'col-span-2' : undefined}>
                <label className="mb-1.5 block text-sm font-medium text-(--fg)">Combustible</label>
                <ModernSelect
                    value={form.fuelType}
                    onChange={(value) => updateForm('fuelType', value)}
                    options={FUEL_TYPES.map((fuel) => ({ value: fuel, label: fuel }))}
                    placeholder="Seleccionar"
                    ariaLabel="Seleccionar combustible"
                />
            </div>
            {!isMotorcycle ? (
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-(--fg)">Transmisión</label>
                    <ModernSelect
                        value={form.transmission}
                        onChange={(value) => updateForm('transmission', value)}
                        options={TRANSMISSIONS.map((trans) => ({ value: trans, label: trans }))}
                        placeholder="Seleccionar"
                        ariaLabel="Seleccionar transmisión"
                    />
                </div>
            ) : null}
        </>
    );
}

function Step1PhotosAndIdentity({
    form,
    updateForm,
    catalog,
    section = 'all',
    operatorContext,
    fieldErrors = {},
    onPhotoProcessProgressChange,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    catalog: PublishWizardCatalog | null;
    section?: 'media' | 'identity' | 'all';
    operatorContext?: AutosOperatorPublishContext;
    fieldErrors?: Record<string, string>;
    onPhotoProcessProgressChange?: (progress: SimplePublishPhotoProcessProgress | null) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoGalleryInputRef = useRef<HTMLInputElement>(null);
    const videoCameraInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processingPhotos, setProcessingPhotos] = useState(false);
    const [photoProcessError, setPhotoProcessError] = useState<string | null>(null);
    const [videoProcessError, setVideoProcessError] = useState<string | null>(null);

    const reportPhotoProgress = (progress: SimplePublishPhotoProcessProgress | null) => {
        onPhotoProcessProgressChange?.(progress);
    };

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
        reportPhotoProgress({ current: 0, total: toAdd.length });

        try {
            const newPhotos: FormData['photos'] = [];
            for (let index = 0; index < toAdd.length; index += 1) {
                const sourceFile = toAdd[index];
                reportPhotoProgress({ current: index + 1, total: toAdd.length });
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
            reportPhotoProgress(null);
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

    const handleVideoFile = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        setVideoProcessError(null);
        const validation = await validatePublishVideoFile(file);
        if (!validation.ok) {
            setVideoProcessError(validation.error);
            return;
        }
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
        setVideoProcessError(null);
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
        <div className="space-y-5 pb-8">
            {showMedia ? (
                <>
                    <SimplePublishMediaScreen
                        photos={form.photos.map((photo) => ({
                            id: photo.id,
                            previewUrl: photo.preview.trim(),
                            isCover: photo.isCover,
                        }))}
                        recommendedPhotos={5}
                        photoError={photoProcessError || undefined}
                        photoInvalid={isAutosFieldInvalid(fieldErrors, 'photos')}
                        photosBusy={processingPhotos}
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
                                    error={videoProcessError || undefined}
                                    invalid={isAutosFieldInvalid(fieldErrors, 'video')}
                                    onPickGallery={() => videoGalleryInputRef.current?.click()}
                                    onPickCamera={() => videoCameraInputRef.current?.click()}
                                    onClearUpload={removeVideo}
                                    onExternalUrlChange={handleExternalVideoUrl}
                                />
                                <input
                                    ref={videoGalleryInputRef}
                                    type="file"
                                    accept="video/*"
                                    onChange={(event) => void handleVideoFile(event.target.files)}
                                    className="hidden"
                                />
                                <input
                                    ref={videoCameraInputRef}
                                    type="file"
                                    accept="video/*"
                                    capture="environment"
                                    onChange={(event) => void handleVideoFile(event.target.files)}
                                    className="hidden"
                                />
                            </>
                        )}
                    />
                </>
            ) : null}
            
            {showIdentity ? (
            <>
            
            <SimplePublishSection title={PUBLISH_SELECTOR_TITLE}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {AUTOS_PUBLISH_TYPE_OPTIONS.map((option) => {
                        const Icon = PUBLISH_TYPE_ICONS[option.type];
                        return (
                        <PanelChoiceCard
                            key={option.type}
                            onClick={() => updateForm('listingType', option.type)}
                            selected={form.listingType === option.type}
                            className="h-16 px-2 text-center"
                        >
                            <div className="flex h-full flex-col items-center justify-center gap-1.5">
                                <span className="h-7 w-7 rounded-full inline-flex items-center justify-center shrink-0 panel-publish-icon">
                                    <Icon size={15} />
                                </span>
                                <span className="text-xs font-medium leading-none">{option.label}</span>
                            </div>
                        </PanelChoiceCard>
                        );
                    })}
                </div>
            </SimplePublishSection>

            {isCatalogPublishType(form.listingType) ? (
                <SimplePublishSection title={form.listingType === 'service' ? 'Datos del servicio' : 'Datos del producto'}>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Nombre<SimplePublishRequiredMark /></label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => updateForm('title', e.target.value)}
                                placeholder={form.listingType === 'service' ? 'Ej. Lavado premium' : 'Ej. Cubre asientos'}
                                className={`form-input${autosInvalidClass(fieldErrors, 'title')}`}
                            />
                        </div>
                        {form.listingType === 'service' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <PanelChoiceCard
                                    selected={form.servicePricingMode === 'fixed'}
                                    onClick={() => updateForm('servicePricingMode', 'fixed')}
                                    className="h-12 px-3 text-sm"
                                >
                                    Precio fijo
                                </PanelChoiceCard>
                                <PanelChoiceCard
                                    selected={form.servicePricingMode === 'quote'}
                                    onClick={() => updateForm('servicePricingMode', 'quote')}
                                    className="h-12 px-3 text-sm"
                                >
                                    A cotizar
                                </PanelChoiceCard>
                            </div>
                        ) : null}
                        {form.listingType === 'product' || form.servicePricingMode === 'fixed' ? (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-(--fg)">Precio<SimplePublishRequiredMark /></label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.price}
                                    onChange={(e) => updateForm('price', formatClPriceInput(e.target.value))}
                                    placeholder="0"
                                    className={`form-input${autosInvalidClass(fieldErrors, 'price')}`}
                                />
                            </div>
                        ) : null}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Categoría</label>
                            <ModernSelect
                                value={form.catalogCategory}
                                onChange={(v) => updateForm('catalogCategory', v)}
                                options={(form.listingType === 'service'
                                    ? getOperatorServiceCategories('autos')
                                    : getOperatorProductCategories('autos')
                                ).map((item) => ({ value: item.id, label: item.label }))}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Descripción</label>
                            <textarea
                                rows={3}
                                value={form.description}
                                onChange={(e) => updateForm('description', e.target.value.slice(0, 1000))}
                                placeholder="Opcional"
                                className="form-input resize-y min-h-[88px]"
                            />
                        </div>
                    </div>
                </SimplePublishSection>
            ) : (
            <>
            <SimplePublishSection title="Tipo de vehículo">
                <VehicleTypePicker
                    value={form.vehicleType}
                    onChange={(value) => updateForm('vehicleType', value)}
                />
            </SimplePublishSection>
            
            <SimplePublishSection title="Datos del vehículo">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3">
                    {requiresVehicleCondition(form.listingType) ? (
                        <div className="col-span-2">
                            <AutosConditionFields
                                form={form}
                                updateForm={updateForm}
                                canSelectNew={Boolean(operatorContext?.canSelectNewCondition)}
                                invalid={isAutosFieldInvalid(fieldErrors, 'condition')}
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-(--fg)">Marca<SimplePublishRequiredMark /></label>
                        <ModernSelect
                            value={form.brandId}
                            onChange={(v) => {
                                updateForm('brandId', v);
                                updateForm('modelId', '');
                            }}
                            triggerClassName={isAutosFieldInvalid(fieldErrors, 'brandId') || isAutosFieldInvalid(fieldErrors, 'customBrand') ? 'form-input-error' : undefined}
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
                                className={`form-input mt-2${autosInvalidClass(fieldErrors, 'customBrand')}`}
                            />
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-(--fg)">Modelo<SimplePublishRequiredMark /></label>
                        <ModernSelect
                            value={form.modelId}
                            onChange={(v) => updateForm('modelId', v)}
                            disabled={!form.brandId}
                            triggerClassName={isAutosFieldInvalid(fieldErrors, 'modelId') || isAutosFieldInvalid(fieldErrors, 'customModel') ? 'form-input-error' : undefined}
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
                                className={`form-input mt-2${autosInvalidClass(fieldErrors, 'customModel')}`}
                            />
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-(--fg)">Año<SimplePublishRequiredMark /></label>
                        <ModernSelect
                            value={form.year}
                            onChange={(value) => updateForm('year', value)}
                            options={
                                form.year && !YEAR_OPTIONS.some((option) => option.value === form.year)
                                    ? [{ value: form.year, label: form.year }, ...YEAR_OPTIONS]
                                    : YEAR_OPTIONS
                            }
                            placeholder="Seleccionar"
                            triggerClassName={isAutosFieldInvalid(fieldErrors, 'year') ? 'form-input-error' : undefined}
                            ariaLabel="Seleccionar año"
                        />
                    </div>

                    <AutosMileageField form={form} updateForm={updateForm} />

                    <AutosFuelAndTransmissionFields form={form} updateForm={updateForm} />
                </div>
            </SimplePublishSection>
            </>
            )}
            </>
            ) : null}
        </div>
    );
}

function AutosSaleOptionsContent({
    form,
    updateForm,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
    return (
        <div className="flex flex-col gap-3">
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
        </div>
    );
}

function StepAutosDetails({
    form,
    updateForm,
    operatorContext,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    operatorContext?: AutosOperatorPublishContext;
}) {
    const showAppearanceColors = form.vehicleType === 'car'
        || form.vehicleType === 'motorcycle'
        || form.vehicleType === 'truck';
    const showTechSheet = form.vehicleType === 'car'
        || form.vehicleType === 'truck'
        || form.vehicleType === 'motorcycle';
    const appearanceOptions = vehicleAppearanceOptionsForType(form.vehicleType);
    const techOptions = vehicleTechEquipmentOptionsForType(form.vehicleType);
    const isWrecked = form.condition === 'Siniestrado';
    const [openSections, setOpenSections] = useState<Record<'appearance' | 'tech' | 'saleOptions' | 'owners' | 'history' | 'equipment' | 'fleet' | 'consignment', boolean>>({
        appearance: true,
        tech: false,
        saleOptions: false,
        owners: false,
        history: false,
        equipment: false,
        fleet: false,
        consignment: false,
    });

    useEffect(() => {
        setOpenSections((current) => ({
            ...current,
            appearance: true,
            tech: false,
            history: false,
            owners: false,
        }));
    }, [form.vehicleType]);

    const toggle = (key: keyof typeof openSections) => {
        setOpenSections((current) => ({ ...current, [key]: !current[key] }));
    };

    const toggleFeature = (code: string) => {
        const next = form.featureCodes.includes(code)
            ? form.featureCodes.filter((item) => item !== code)
            : [...form.featureCodes, code];
        updateForm('featureCodes', next);
    };

    return (
        <div className="space-y-5">
            <p className="text-sm leading-relaxed text-(--fg-muted)">
                Nada es obligatorio. Completar estos datos mejora búsquedas y la confianza del aviso.
            </p>

            <SimplePublishOptionalSection
                title="Apariencia"
                description="Color y detalles de estilo según el tipo de vehículo."
                open={openSections.appearance}
                onToggle={() => toggle('appearance')}
            >
                <div className="space-y-4">
                    {showAppearanceColors ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-(--fg)">Color exterior</label>
                                <ColorPicker value={form.color} onChange={(c) => updateForm('color', c)} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-(--fg)">Color interior</label>
                                <ColorPicker value={form.interiorColor} onChange={(c) => updateForm('interiorColor', c)} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-(--fg-muted)">Para este tipo de vehículo prioriza historial y ficha técnica.</p>
                    )}
                    {appearanceOptions.length > 0 ? (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-(--fg)">Estilo y detalles estéticos</label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {appearanceOptions.map((option) => (
                                    <SelectableChip
                                        key={option.code}
                                        label={option.label}
                                        active={form.featureCodes.includes(option.code)}
                                        onToggle={() => toggleFeature(option.code)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </SimplePublishOptionalSection>

            {showTechSheet ? (
                <SimplePublishOptionalSection
                    title="Ficha técnica"
                    description="Versión, cilindrada, tracción y puertas."
                    open={openSections.tech}
                    onToggle={() => toggle('tech')}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Versión / trim</label>
                            <input
                                className="form-input"
                                value={form.version}
                                onChange={(event) => updateForm('version', event.target.value)}
                                placeholder="Ej: Limited, GLX, Sport"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-(--fg)">Cilindrada</label>
                            <input
                                className="form-input"
                                value={form.engineSize}
                                onChange={(event) => updateForm('engineSize', event.target.value)}
                                placeholder="Ej: 1.6, 2.0"
                            />
                        </div>
                        {form.vehicleType !== 'motorcycle' ? (
                            <>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-(--fg)">Tracción</label>
                                    <ModernSelect
                                        value={form.traction}
                                        onChange={(value) => updateForm('traction', value)}
                                        placeholder="Seleccionar"
                                        options={[
                                            { value: '', label: 'Seleccionar' },
                                            { value: '2WD', label: '2WD' },
                                            { value: '4x2', label: '4x2' },
                                            { value: '4x4', label: '4x4' },
                                            { value: 'AWD', label: 'AWD' },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-(--fg)">Puertas</label>
                                    <ModernSelect
                                        value={form.doors}
                                        onChange={(value) => updateForm('doors', value)}
                                        placeholder="Seleccionar"
                                        options={[
                                            { value: '', label: 'Seleccionar' },
                                            { value: '2', label: '2' },
                                            { value: '3', label: '3' },
                                            { value: '4', label: '4' },
                                            { value: '5', label: '5' },
                                        ]}
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                </SimplePublishOptionalSection>
            ) : null}

            {form.listingType !== 'rent' ? (
                <SimplePublishOptionalSection
                    title="Opciones de venta"
                    description="Conversable, permuta y financiamiento. Aparecen como chips en la tarjeta."
                    open={openSections.saleOptions}
                    onToggle={() => toggle('saleOptions')}
                >
                    <AutosSaleOptionsContent form={form} updateForm={updateForm} />
                </SimplePublishOptionalSection>
            ) : null}

            <SimplePublishOptionalSection
                title="Historial de propietarios"
                description="Cantidad de dueños anteriores del vehículo."
                open={openSections.owners}
                onToggle={() => toggle('owners')}
            >
                <div>
                    <label className="block text-sm font-medium mb-2 text-(--fg)">Número de dueños</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['1', '2', '3+'] as const).map((count) => (
                            <PanelChoiceCard
                                key={count}
                                onClick={() => updateForm('ownerCount', count)}
                                selected={form.ownerCount === count}
                                className="min-h-[44px] px-2 text-center"
                            >
                                <span className="text-sm font-medium">
                                    {count === '1' ? '1° dueño' : count === '2' ? '2° dueño' : '3° o más'}
                                </span>
                            </PanelChoiceCard>
                        ))}
                    </div>
                </div>
            </SimplePublishOptionalSection>

            <SimplePublishOptionalSection
                title="Historial del vehículo"
                description="Mantenciones, revisión técnica y documentación."
                open={openSections.history}
                onToggle={() => toggle('history')}
            >
                <div className="flex flex-col gap-3">
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
                    {!isWrecked ? (
                        <ToggleChip
                            label="Sin siniestros declarados"
                            checked={form.noAccidents}
                            onChange={(v) => updateForm('noAccidents', v)}
                        />
                    ) : (
                        <p className="text-xs text-(--fg-muted)">
                            Condición «Siniestrado»: no aplica el claim de sin siniestros.
                        </p>
                    )}
                    <ToggleChip
                        label="Garantía vigente"
                        checked={form.warranty}
                        onChange={(v) => updateForm('warranty', v)}
                    />
                </div>
            </SimplePublishOptionalSection>

            {techOptions.length > 0 ? (
                <SimplePublishOptionalSection
                    title="Equipamiento"
                    description="Seguridad, confort y tecnología relevantes para este vehículo."
                    open={openSections.equipment}
                    onToggle={() => toggle('equipment')}
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {techOptions.map((option) => (
                            <SelectableChip
                                key={option.code}
                                label={option.label}
                                active={form.featureCodes.includes(option.code)}
                                onToggle={() => toggleFeature(option.code)}
                            />
                        ))}
                    </div>
                </SimplePublishOptionalSection>
            ) : null}

            {operatorContext?.showFleetRentFields ? (
                <SimplePublishOptionalSection
                    title="Arriendo y flota"
                    description="Condiciones de arriendo para operadores."
                    open={openSections.fleet}
                    onToggle={() => toggle('fleet')}
                >
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
                </SimplePublishOptionalSection>
            ) : null}

            {operatorContext?.showConsignmentFields ? (
                <SimplePublishOptionalSection
                    title="Consignación"
                    description="Comisión y términos de consignación."
                    open={openSections.consignment}
                    onToggle={() => toggle('consignment')}
                >
                    <MarketplaceAutosConsignmentFields
                        consignmentCommission={form.consignmentCommission}
                        consignmentTerms={form.consignmentTerms}
                        onChange={(patch) => {
                            for (const [key, value] of Object.entries(patch)) {
                                updateForm(key as keyof FormData, value as FormData[keyof FormData]);
                            }
                        }}
                    />
                </SimplePublishOptionalSection>
            ) : null}
        </div>
    );
}

// =============================================================================
// PASO 4: PUBLICAR
// =============================================================================

// =============================================================================
// TASADOR ONLINE
// =============================================================================

function VehicleValuationModal(props: {
    open: boolean;
    onClose: () => void;
    listingType: ListingType;
    estimate: VehicleValuationEstimate | null;
    estimating: boolean;
    valuationRequest: VehicleValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onApplyPrice: (price: number) => void;
}) {
    const { open, onClose, listingType, estimate, estimating, valuationRequest, onRunValuation, onApplyPrice } = props;
    const isAuction = listingType === 'auction';

    return (
        <PanelScrollModal
            open={open}
            onClose={onClose}
            size="2xl"
            height="tall"
            titleId="vehicle-valuation-modal-title"
            bodyClassName="px-4 py-4 sm:px-5"
            headerContent={(
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-(--bg-muted) text-(--fg)">
                            <IconCalculator size={17} />
                        </span>
                        <h3 id="vehicle-valuation-modal-title" className="text-base font-semibold text-(--fg)">Tasador online</h3>
                    </div>
                    <p className="mt-2 text-sm text-(--fg-secondary)">
                        Referencia de mercado con rango, confianza y tendencia para ayudarte a fijar el precio.
                    </p>
                </div>
            )}
            footer={estimate && !isAuction ? (
                <div className="flex flex-wrap gap-2">
                    <PanelButton
                        type="button"
                        variant="primary"
                        onClick={() => {
                            onApplyPrice(Math.round(estimate.estimatedPrice));
                            onClose();
                        }}
                    >
                        Usar precio estimado
                    </PanelButton>
                    <PanelButton type="button" variant="secondary" onClick={onClose}>
                        Cerrar
                    </PanelButton>
                </div>
            ) : undefined}
        >
            <div className="space-y-4">
                        <PanelButton
                            type="button"
                            variant="primary"
                            className="w-full"
                            onClick={() => void onRunValuation()}
                            disabled={estimating || !valuationRequest || isAuction}
                        >
                            {estimating ? 'Calculando estimación...' : estimate ? 'Recalcular estimación' : 'Calcular estimación'}
                        </PanelButton>

                        {isAuction ? (
                            <PanelNotice tone="neutral">El tasador aplica solo a venta y arriendo.</PanelNotice>
                        ) : !valuationRequest ? (
                            <PanelNotice tone="neutral">Completa marca, modelo, año y ubicación en este paso para habilitar el tasador.</PanelNotice>
                        ) : !estimate ? (
                            <PanelNotice tone="neutral">Obtén una referencia antes de definir el precio de publicación.</PanelNotice>
                        ) : null}

                        {estimate ? (
                            <div className="space-y-3">
                                <PanelSummaryCard
                                    eyebrow="Precio estimado de mercado"
                                    title={formatClpAmount(estimate.estimatedPrice)}
                                    rows={[
                                        { label: 'Rango bajo', value: formatClpAmount(estimate.minPrice) },
                                        { label: 'Rango alto', value: formatClpAmount(estimate.maxPrice) },
                                        { label: 'Confianza', value: `${estimate.confidenceScore}%` },
                                        { label: 'Liquidez', value: estimate.estimatedLiquidityDays != null ? `${estimate.estimatedLiquidityDays} días` : 'Sin dato' },
                                        { label: 'Tendencia 30d', value: formatSignedPercent(estimate.marketTrendPct30d) },
                                    ]}
                                />
                                {estimate.historicalSeries.length > 0 ? (
                                    <div className="rounded-xl border p-4 border-(--border)">
                                        <p className="text-sm font-semibold">Tendencia del segmento</p>
                                        <div className="space-y-2 mt-3">
                                            {estimate.historicalSeries.map((point) => (
                                                <div key={point.ts} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                                                    <span className="text-(--fg-secondary)">{formatSeriesLabel(point.ts)}</span>
                                                    <div className="h-2 rounded-full prop-chart-track">
                                                        <div className="h-full rounded-full prop-chart-bar" style={{ width: `${Math.max(12, Math.min(100, estimate.maxPrice > 0 ? (point.medianPrice / estimate.maxPrice) * 100 : 12))}%` }} />
                                                    </div>
                                                    <span className="font-medium">{formatClpAmount(point.medianPrice)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {estimate.notes.length > 0 ? (
                                    <div className="rounded-xl border p-4 border-(--border)">
                                        <p className="text-sm font-semibold">Notas del tasador</p>
                                        <div className="space-y-2 mt-3">
                                            {estimate.notes.map((note) => (
                                                <div key={note} className="flex items-start gap-2 text-sm text-(--fg-secondary)">
                                                    <IconSparkles size={15} className="mt-0.5 shrink-0" />
                                                    <span>{note}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
            </div>
        </PanelScrollModal>
    );
}

function StepAutosPrice({
    form,
    updateForm,
    estimate,
    estimating,
    valuationRequest,
    onRunValuation,
    fieldErrors = {},
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    estimate: VehicleValuationEstimate | null;
    estimating: boolean;
    valuationRequest: VehicleValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    fieldErrors?: Record<string, string>;
}) {
    const [valuationOpen, setValuationOpen] = useState(false);

    return (
        <>
            <SimplePublishSection title="Precio" className="space-y-4">
                <SimplePublishPriceBlock
                    mainPrice={form.price}
                    onMainPriceChange={(value) => updateForm('price', value)}
                    mainPriceLabel="Precio normal"
                    mainPriceRequired
                    mainPriceInvalid={isAutosFieldInvalid(fieldErrors, 'price')}
                    mainPricePlaceholder="18.990.000"
                    formatThousands
                    offer={{
                        offerPrice: form.offerPrice,
                        discountPercent: form.discountPercent,
                        offerPriceMode: form.offerPriceMode,
                        onOfferPriceChange: (value) => updateForm('offerPrice', value),
                        onDiscountPercentChange: (value) => updateForm('discountPercent', value),
                        onOfferPriceModeChange: (value) => updateForm('offerPriceMode', value),
                        formatThousands: true,
                        error: fieldErrors.offerPrice,
                        invalid: isAutosFieldInvalid(fieldErrors, 'offerPrice'),
                    }}
                />
                {form.listingType !== 'auction' ? (
                    <div className="flex flex-col gap-2 pt-1">
                        <PanelButton
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => setValuationOpen(true)}
                        >
                            <span className="inline-flex items-center justify-center gap-2">
                                <IconCalculator size={16} />
                                Consultar tasador online
                            </span>
                        </PanelButton>
                        {estimate ? (
                            <p className="text-xs text-(--fg-muted)">
                                Referencia: {formatClpAmount(estimate.estimatedPrice)}
                                {' · '}
                                {formatClpAmount(estimate.minPrice)} – {formatClpAmount(estimate.maxPrice)}
                            </p>
                        ) : (
                            <p className="text-xs text-(--fg-muted)">
                                Compara tu precio con el valor de mercado antes de publicar.
                            </p>
                        )}
                    </div>
                ) : null}
            </SimplePublishSection>
            <VehicleValuationModal
                open={valuationOpen}
                onClose={() => setValuationOpen(false)}
                listingType={form.listingType}
                estimate={estimate}
                estimating={estimating}
                valuationRequest={valuationRequest}
                onRunValuation={onRunValuation}
                onApplyPrice={(price) => updateForm('price', formatClPriceInput(String(price)))}
            />
        </>
    );
}

// =============================================================================
// PASO 2: UBICACIÓN (datos básicos)
// =============================================================================

function StepAutosLocation({
    location,
    onLocationChange,
    addressBook,
    addressBookLoading,
    onAddressBookChange,
    communes,
    geocoding,
    onGeocodeLocation,
    googleMapsApiKey,
    fieldErrors = {},
}: {
    location: ListingLocation;
    onLocationChange: (next: ListingLocation) => void;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    onAddressBookChange: (next: AddressBookEntry[]) => void;
    communes: Array<{ id: string; name: string }>;
    geocoding: boolean;
    onGeocodeLocation: () => void | Promise<void>;
    googleMapsApiKey?: string;
    fieldErrors?: Record<string, string>;
}) {
    const [savingAddress, setSavingAddress] = useState(false);
    const [saveAddressNote, setSaveAddressNote] = useState<string | null>(null);

    const handleSaveToAddressBook = async () => {
        if (savingAddress) return;
        if (!location.addressLine1?.trim() || !location.regionId || !location.communeId) {
            setSaveAddressNote('Completa dirección, región y comuna antes de guardar.');
            return;
        }
        setSavingAddress(true);
        setSaveAddressNote(null);
        const result = await createAddressBookEntry({
            kind: 'branch',
            scope: 'business',
            vertical: 'autos',
            label: location.label?.trim() || location.addressLine1.trim(),
            countryCode: location.countryCode || 'CL',
            regionId: location.regionId,
            regionName: location.regionName,
            communeId: location.communeId,
            communeName: location.communeName,
            neighborhood: location.neighborhood,
            addressLine1: location.addressLine1,
            addressLine2: location.addressLine2,
            postalCode: location.postalCode,
            arrivalInstructions: location.arrivalInstructions,
            geoPoint: location.geoPoint,
            isDefault: addressBook.filter((item) => item.scope === 'business').length === 0,
        });
        setSavingAddress(false);
        if (!result.ok) {
            setSaveAddressNote(result.error || 'No se pudo guardar la dirección.');
            return;
        }
        const refreshed = await fetchPublishAddressBook('autos');
        if (refreshed.ok) onAddressBookChange(refreshed.items);
        setSaveAddressNote('Dirección guardada en la libreta.');
    };

    return (
        <SimplePublishSection title="Ubicación">
            <ListingLocationEditor
                showHeader={false}
                framed={false}
                simpleMode
                googleMapsApiKey={googleMapsApiKey}
                location={location}
                onChange={onLocationChange}
                regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                communes={communes.map((item) => ({ value: item.id, label: item.name }))}
                allCommunes={LOCATION_COMMUNES.map((item) => ({ value: item.id, label: item.name }))}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                allowAreaOnly={false}
                addressRequired
                addressFirst
                showSourceSelector={false}
                showVisibilityField={false}
                showSimpleVisibilityToggle={false}
                showAddressLine2={false}
                showGoogleMapsLink={false}
                showPublicPreviewCard={false}
                showActionBar={false}
                publishVertical="autos"
                geocoding={geocoding}
                onGeocode={onGeocodeLocation}
                onSaveToAddressBook={() => void handleSaveToAddressBook()}
                errors={pickListingLocationFieldErrors(fieldErrors)}
            />
            {location.geoPoint.latitude != null
                && location.geoPoint.longitude != null
                && location.geoPoint.provider !== 'catalog_seed' ? (
                <div className="mt-3 space-y-2">
                    <PublishLocationMap
                        latitude={location.geoPoint.latitude}
                        longitude={location.geoPoint.longitude}
                    />
                    <p className="text-xs">
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.geoPoint.latitude},${location.geoPoint.longitude}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-(--fg-muted) underline-offset-2 hover:underline hover:text-(--fg)"
                        >
                            Abrir en Google Maps
                        </a>
                    </p>
                </div>
            ) : null}
            {savingAddress ? (
                <p className="mt-2 text-xs text-(--fg-muted)">Guardando dirección…</p>
            ) : saveAddressNote ? (
                <p className="mt-2 text-xs text-(--fg-muted)">{saveAddressNote}</p>
            ) : null}
        </SimplePublishSection>
    );
}

// =============================================================================
// PASO 3: DETALLES OPCIONALES + PUBLICAR
// =============================================================================

function StepAutosPublish({
    form,
    updateForm,
    catalog,
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    catalog: PublishWizardCatalog | null;
}) {
    const getBrandName = (brandId: string) => {
        if (brandId === '__custom__') return form.customBrand || 'Marca personalizada';
        return catalog?.brands.find((b) => b.id === brandId)?.name || brandId;
    };

    const getModelName = (modelId: string) => {
        if (modelId === '__custom__') return form.customModel || 'Modelo personalizado';
        return catalog?.models.find((m) => m.id === modelId)?.name || modelId;
    };

    return (
        <div className="space-y-5">
            <SimplePublishSection
                title="Título y descripción"
                description="Se generan según los datos que ingresaste. Puedes editarlos antes de publicar."
            >
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
                            equipmentLabels: getVehicleEquipmentLabels(form.featureCodes),
                            listingType: form.listingType,
                            platformName: 'SimpleAutos',
                        }).slice(0, 1000));
                    }}
                    titlePlaceholder="Toyota Yaris 2020"
                    descriptionPlaceholder="Descripción para tu ficha y redes sociales"
                    descriptionMaxLength={1000}
                />
            </SimplePublishSection>
        </div>
    );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function SelectableChip(props: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onToggle}
            className={`w-full rounded-card border px-3 py-3 text-sm text-left transition-colors panel-publish-select-chip ${props.active ? 'panel-publish-select-chip--active' : ''}`}
        >
            <span className="flex items-center gap-3">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border panel-publish-select-chip-dot ${props.active ? 'panel-publish-select-chip-dot--active' : ''}`}>
                    {props.active ? <IconCheck size={13} /> : null}
                </span>
                <span className="font-medium text-(--fg)">{props.label}</span>
            </span>
        </button>
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
        <SelectableChip
            label={label}
            active={checked}
            onToggle={() => onChange(!checked)}
        />
    );
}

// =============================================================================
// UTILIDADES
// =============================================================================

function formatPrice(value: string): string {
    return formatClPriceInput(value);
}

function formatNumber(value: string): string {
    return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
