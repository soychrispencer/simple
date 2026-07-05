'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconArrowLeft,
    IconArrowRight,
    IconBath,
    IconBed,
    IconBuildingCommunity,
    IconBuildingSkyscraper,
    IconBuildingStore,
    IconCalculator,
    IconCamera,
    IconCheck,
    IconCircleCheck,
    IconCopy,
    IconDeviceFloppy,
    IconExternalLink,
    IconHome2,
    IconKey,
    IconMapPin,
    IconPhoto,
    IconPlus,
    IconRuler,
    IconShare3,
    IconSparkles,
    IconStar,
    IconTrash,
    IconVideo,
    IconX,
    IconGripVertical,
} from '@tabler/icons-react';
import { MarketplacePublishProfileCta, MarketplaceOperatorPublishHint, MarketplacePropiedadesRentAdminHint, MarketplaceListingCopyFields } from '@simple/ui/publish';
import { SimplePublishLayout, SimplePublishCtaCard, SimplePublishSuccessScreen, SimplePublishPageFrame, SimplePublishScreenHeader, SimplePublishPreviewCard, SimplePublishMediaScreen, SimplePublishVideoBlock, type SimplePublishPreviewCardProps } from '@simple/ui/simple-publish';
import { ShareToSocialPanel } from '@/components/panel/share-to-social-panel';
import { generatePropertyListingDescription, generatePropertyListingTitle, isSupportedExternalVideoUrl, listingHasPublishVideo } from '@simple/utils';
import type { PropiedadesOperatorPublishContext } from '@simple/utils';
import { ModernSelect } from '@simple/ui/forms';
import { useAuth } from '@simple/auth';
import { uploadMediaFile } from '@simple/utils';
import { getPublicationLifecyclePolicy, type PublicationLifecyclePolicy } from '@simple/config';
import {
    createPanelListing, deletePanelListingDraft, fetchPanelListingDetail, fetchPanelListingDraft, savePanelListingDraft, updatePanelListing, type PanelListing,
} from '@/lib/panel-listings';
import {
    createEmptyListingLocation, type AddressBookEntry, type ListingLocation, patchListingLocation, type PropertyValuationEstimate, type PropertyValuationRequest, type PropertyValuationSourceStatus,
} from '@simple/types';
import {
    estimatePropertyValue, fetchAddressBook, fetchPropertyValuationSources, geocodeListingLocation, getCommunesForRegion, LOCATION_COMMUNES, LOCATION_REGIONS, refreshPropertyValuationSources, resolveLocationNames,
} from '@simple/utils';
import { PanelActions, PanelBlockHeader, PanelButton, PanelCard, PanelChoiceCard, PanelNotice, PanelSummaryCard, MarketplacePublishMessageNotice, MarketplacePublishPlanLimitNotice, useMarketplacePublishPlanLimit, isMarketplacePublishBlockedByPlan, useMarketplaceOperatorPublishDefaults, type PanelDocumentAsset, type PanelMediaAsset, type PanelVideoAsset } from '@simple/ui/panel';
import { ListingLocationEditor } from '@simple/ui/location';
import { PROPERTY_PUBLISH_STEPS } from '@/components/panel/publish/publish-steps';

type StepId = 'media' | 'details' | 'publish';
type PublishedListing = { id: string; href: string; title: string; hasVideo?: boolean };
type PropertyOperation = 'sale' | 'rent' | 'project';
type Currency = 'UF' | 'CLP' | 'USD';
type ProjectUnitModel = {
    id: string;
    label: string;
    bedrooms: string;
    bathrooms: string;
    usableAreaFrom: string;
    usableAreaTo: string;
    totalAreaFrom: string;
    totalAreaTo: string;
    priceFrom: string;
    priceTo: string;
};

type WizardData = {
    setup: {
        operationType: PropertyOperation;
        propertyType: string;
    };
    basic: {
        title: string;
        description: string;
        condition: string;
        rooms: string;
        bathrooms: string;
        totalArea: string;
        usableArea: string;
        terraceArea: string;
        parkingSpaces: string;
        storageUnits: string;
        propertyAge: string;
        maxOccupants: string;
        unitNumber: string;
        floorNumber: string;
        unitsPerFloor: string;
        totalFloors: string;
        towerNumber: string;
        orientation: string;
        departmentType: string;
        petsAllowed: string;
        furnished: string;
        commercialUse: string;
        securityType: string;
        specialConditions: string;
    };
    project: {
        projectName: string;
        developerName: string;
        builderName: string;
        salesStage: string;
        deliveryStatus: string;
        deliveryDate: string;
        availableUnits: string;
        totalUnits: string;
        usableAreaFrom: string;
        usableAreaTo: string;
        totalAreaFrom: string;
        totalAreaTo: string;
        parkingFrom: string;
        storageFrom: string;
        pilotApartment: string;
        financingSupport: string;
        subsidyEligible: string;
        models: ProjectUnitModel[];
    };
    specs: {
        amenityCodes: string[];
        serviceCodes: string[];
        environmentCodes: string[];
        securityCodes: string[];
        notes: string;
    };
    media: {
        photos: PanelMediaAsset[];
        videoUrl: string;
        tour360Url: string;
        discoverVideo: PanelVideoAsset | null;
        documents: PanelDocumentAsset[];
    };
    location: ListingLocation;
    commercial: {
        currency: Currency;
        price: string;
        priceTo: string;
        commonExpenseType: string;
        commonExpenses: string;
        availableFrom: string;
        contactName: string;
        contactPhone: string;
        contactWhatsapp: string;
        contactEmail: string;
        negotiable: boolean;
        featured: boolean;
        urgent: boolean;
        slug: string;
        metaTitle: string;
        metaDescription: string;
    };
    review: {
        acceptTerms: boolean;
    };
};

interface PersistedDraft {
    version: number;
    savedAt: string;
    valuationEstimate: PropertyValuationEstimate | null;
    data: Omit<WizardData, 'media'> & {
        media: Omit<WizardData['media'], 'photos' | 'discoverVideo'> & {
            photos: Array<Pick<PanelMediaAsset, 'id' | 'name' | 'dataUrl' | 'previewUrl' | 'isCover' | 'width' | 'height' | 'sizeBytes' | 'mimeType'>>;
            discoverVideo: Pick<PanelVideoAsset, 'id' | 'name' | 'dataUrl' | 'previewUrl' | 'width' | 'height' | 'sizeBytes' | 'mimeType' | 'durationSeconds'> | null;
            documents: PanelDocumentAsset[];
        };
    };
}

const MAX_PHOTOS = 20;
const STEPS = PROPERTY_PUBLISH_STEPS;

const PROPERTY_STEP_COPY: Record<StepId, { title: string; description: string }> = {
    media: {
        title: 'Fotos y video',
        description: 'Sube lo esencial para tu tarjeta. La primera foto será la portada.',
    },
    details: {
        title: 'Detalles del inmueble',
        description: 'Tipo de operación, atributos, precio y opciones avanzadas.',
    },
    publish: {
        title: 'Revisar y publicar',
        description: 'Ubicación, título, descripción y confirmación final.',
    },
};

function buildPropertyPreviewCardProps(data: WizardData): SimplePublishPreviewCardProps {
    const title = data.setup.operationType === 'project'
        ? data.project.projectName || data.basic.title || 'Título del aviso'
        : data.basic.title || 'Título del aviso';
    const video = data.media.discoverVideo;
    const location = buildPreviewLocation(data);
    const badge = getOperationLabel(data.setup.operationType);
    const price = data.commercial.price.trim() ? buildPriceLabel(data) : '$Consultar';

    const specs: SimplePublishPreviewCardProps['specs'] = [];
    if (data.setup.operationType !== 'project') {
        if (data.basic.rooms) specs.push({ icon: <IconBed size={13} />, label: `${data.basic.rooms} dorm` });
        if (data.basic.bathrooms) specs.push({ icon: <IconBath size={13} />, label: `${data.basic.bathrooms} baños` });
        if (data.basic.totalArea) specs.push({ icon: <IconRuler size={13} />, label: `${data.basic.totalArea} m²` });
    }

    return {
        badge,
        price,
        title,
        location,
        photoUrls: data.media.photos
            .map((photo) => photo.previewUrl || photo.dataUrl)
            .filter(Boolean),
        videoUrl: video?.previewUrl || video?.dataUrl || null,
        specs,
        brandLabel: 'Simple',
        footerHint: 'Así se verá en SimplePropiedades',
    };
}

const OPERATION_CARDS: Array<{ value: PropertyOperation; label: string; icon: React.ReactNode }> = [
    { value: 'sale', label: 'Venta', icon: <IconHome2 size={15} /> },
    { value: 'rent', label: 'Arriendo', icon: <IconKey size={15} /> },
    { value: 'project', label: 'Proyecto', icon: <IconBuildingCommunity size={15} /> },
];

const PROPERTY_TYPE_CARDS: Array<{ value: string; label: string; icon: React.ReactNode }> = [
    { value: 'Departamento', label: 'Departamento', icon: <IconBuildingSkyscraper size={15} /> },
    { value: 'Casa', label: 'Casa', icon: <IconHome2 size={15} /> },
    { value: 'Oficina', label: 'Oficina', icon: <IconBuildingCommunity size={15} /> },
    { value: 'Local comercial', label: 'Local comercial', icon: <IconBuildingStore size={15} /> },
    { value: 'Bodega', label: 'Bodega', icon: <IconBuildingCommunity size={15} /> },
    { value: 'Terreno', label: 'Terreno', icon: <IconMapPin size={15} /> },
    { value: 'Parcela', label: 'Parcela', icon: <IconMapPin size={15} /> },
];

const CONDITION_OPTIONS = ['Nuevo', 'Entrega inmediata', 'Usado', 'Remodelado', 'A refaccionar', 'En verde'].map((value) => ({ value, label: value }));
const CURRENCY_OPTIONS = ['UF', 'CLP', 'USD'].map((value) => ({ value, label: value }));
const YES_NO_OPTIONS = ['Sí', 'No'].map((value) => ({ value, label: value }));
const ORIENTATION_OPTIONS = ['Norte', 'Sur', 'Oriente', 'Poniente', 'Nororiente', 'Norponiente', 'Suroriente', 'Surponiente'].map((value) => ({ value, label: value }));
const DEPARTMENT_TYPE_OPTIONS = ['Estudio', 'Tradicional', 'Dúplex', 'Tríplex', 'Loft', 'Penthouse'].map((value) => ({ value, label: value }));
const SECURITY_TYPE_OPTIONS = ['Conserjería 24/7', 'Control de acceso', 'Circuito cerrado', 'Seguridad privada', 'Portería simple', 'Sin seguridad formal'].map((value) => ({ value, label: value }));
const COMMON_EXPENSE_TYPE_OPTIONS = ['No informa', 'Fijo', 'Variable', 'Incluido', 'No aplica'].map((value) => ({ value, label: value }));
const COMMERCIAL_USE_OPTIONS = ['Retail', 'Oficinas', 'Restaurant/Cafetería', 'Bodega/Logística', 'Industria', 'Salud', 'Educación', 'Servicios'].map((value) => ({ value, label: value }));
const PROJECT_SALES_STAGE_OPTIONS = ['Lanzamiento', 'Preventa', 'En verde', 'En blanco', 'Últimas unidades', 'Entrega inmediata'].map((value) => ({ value, label: value }));
const PROJECT_DELIVERY_STATUS_OPTIONS = ['Entrega inmediata', 'Entrega este año', 'Entrega futura', 'Por confirmar'].map((value) => ({ value, label: value }));

const AMENITY_OPTIONS = [
    { code: 'wheelchair_ramp', label: 'Rampa para silla de ruedas' },
    { code: 'elevator', label: 'Ascensor' },
    { code: 'fireplace', label: 'Chimenea' },
    { code: 'visitor_parking', label: 'Estacionamiento de visitas' },
    { code: 'gym', label: 'Gimnasio' },
    { code: 'kids_area', label: 'Área de juegos infantiles' },
    { code: 'cowork', label: 'Cowork' },
    { code: 'tennis_court', label: 'Cancha de tenis' },
    { code: 'reception', label: 'Recepción' },
    { code: 'rooftop', label: 'Azotea' },
    { code: 'party_room', label: 'Salón de fiestas' },
    { code: 'multipurpose_courts', label: 'Canchas multiuso' },
    { code: 'green_areas', label: 'Con áreas verdes' },
    { code: 'soccer_court', label: 'Cancha de fútbol' },
    { code: 'basketball_court', label: 'Cancha de básquetbol' },
    { code: 'paddle_court', label: 'Cancha de paddle' },
    { code: 'sauna', label: 'Sauna' },
    { code: 'cinema_room', label: 'Área de cine' },
    { code: 'refrigerator', label: 'Refrigerador' },
] as const;

const SERVICE_OPTIONS = [
    { code: 'internet', label: 'Acceso a internet' },
    { code: 'water', label: 'Agua corriente' },
    { code: 'natural_gas', label: 'Gas natural' },
    { code: 'phone_line', label: 'Línea telefónica' },
    { code: 'cable_tv', label: 'TV por cable' },
    { code: 'air_conditioning', label: 'Aire acondicionado' },
    { code: 'heating', label: 'Calefacción' },
    { code: 'cistern', label: 'Cisterna' },
    { code: 'generator', label: 'Generador eléctrico' },
    { code: 'boiler', label: 'Caldera' },
    { code: 'laundry_hookup', label: 'Conexión para lavadora' },
    { code: 'solar_energy', label: 'Energía solar' },
    { code: 'satellite_tv', label: 'TV satelital' },
] as const;

const ENVIRONMENT_OPTIONS = [
    { code: 'breakfast_area', label: 'Comedor de diario' },
    { code: 'balcony', label: 'Balcón' },
    { code: 'kitchen', label: 'Cocina' },
    { code: 'dining_room', label: 'Comedor' },
    { code: 'suite_bedroom', label: 'Dormitorio en suite' },
    { code: 'homeoffice', label: 'Homeoffice' },
    { code: 'jacuzzi', label: 'Jacuzzi' },
    { code: 'living_room', label: 'Living' },
    { code: 'patio', label: 'Patio' },
    { code: 'closets', label: 'Closets' },
    { code: 'playroom', label: 'Playroom' },
    { code: 'walk_in_closet', label: 'Walk-in clóset' },
    { code: 'loggia', label: 'Logia' },
    { code: 'service_bed_bath', label: 'Dormitorio y baño de servicio' },
    { code: 'garden', label: 'Jardín' },
    { code: 'grill', label: 'Parrilla' },
    { code: 'pool', label: 'Piscina' },
    { code: 'terrace', label: 'Terraza' },
    { code: 'guest_bathroom', label: 'Baño de visitas' },
    { code: 'laundry_room', label: 'Lavandería' },
    { code: 'multiuse_room', label: 'Salón de usos múltiples' },
] as const;

const SECURITY_OPTIONS = [
    { code: 'commercial_use', label: 'Uso comercial' },
    { code: 'gated_community', label: 'Con condominio cerrado' },
    { code: 'concierge', label: 'Conserjería' },
    { code: 'controlled_access', label: 'Acceso controlado' },
    { code: 'security_cameras', label: 'Cámaras de seguridad' },
] as const;

function getOperationLabel(operationType: PropertyOperation) {
    if (operationType === 'rent') return 'Arriendo';
    if (operationType === 'project') return 'Proyecto';
    return 'Venta';
}

function getDefaultCurrencyForOperation(operationType: PropertyOperation): Currency {
    return operationType === 'rent' ? 'CLP' : 'UF';
}

function createProjectUnitModel(id = 'unit-model-1'): ProjectUnitModel {
    return {
        id,
        label: '',
        bedrooms: '',
        bathrooms: '',
        usableAreaFrom: '',
        usableAreaTo: '',
        totalAreaFrom: '',
        totalAreaTo: '',
        priceFrom: '',
        priceTo: '',
    };
}

function createDefaultData(): WizardData {
    return {
        setup: {
            operationType: 'sale',
            propertyType: 'Departamento',
        },
        basic: {
            title: '',
            description: '',
            condition: '',
            rooms: '',
            bathrooms: '',
            totalArea: '',
            usableArea: '',
            terraceArea: '',
            parkingSpaces: '',
            storageUnits: '',
            propertyAge: '',
            maxOccupants: '',
            unitNumber: '',
            floorNumber: '',
            unitsPerFloor: '',
            totalFloors: '',
            towerNumber: '',
            orientation: '',
            departmentType: '',
            petsAllowed: '',
            furnished: '',
            commercialUse: '',
            securityType: '',
            specialConditions: '',
        },
        project: {
            projectName: '',
            developerName: '',
            builderName: '',
            salesStage: '',
            deliveryStatus: '',
            deliveryDate: '',
            availableUnits: '',
            totalUnits: '',
            usableAreaFrom: '',
            usableAreaTo: '',
            totalAreaFrom: '',
            totalAreaTo: '',
            parkingFrom: '',
            storageFrom: '',
            pilotApartment: '',
            financingSupport: '',
            subsidyEligible: '',
            models: [createProjectUnitModel()],
        },
        specs: {
            amenityCodes: [],
            serviceCodes: [],
            environmentCodes: [],
            securityCodes: [],
            notes: '',
        },
        media: {
            photos: [],
            videoUrl: '',
            tour360Url: '',
            discoverVideo: null,
            documents: [],
        },
        location: createEmptyListingLocation({
            sourceMode: 'custom',
            countryCode: 'CL',
            visibilityMode: 'exact',
            publicMapEnabled: true,
        }),
        commercial: {
            currency: 'UF',
            price: '',
            priceTo: '',
            commonExpenseType: 'No informa',
            commonExpenses: '',
            availableFrom: '',
            contactName: '',
            contactPhone: '',
            contactWhatsapp: '',
            contactEmail: '',
            negotiable: false,
            featured: false,
            urgent: false,
            slug: '',
            metaTitle: '',
            metaDescription: '',
        },
        review: {
            acceptTerms: false,
        },
    };
}

function parseNumber(value: string): number | null {
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value: number, currency: Currency): string {
    const formatted = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value);
    if (currency === 'UF') return `UF ${formatted}`;
    if (currency === 'USD') return `USD ${formatted}`;
    return `$${formatted}`;
}

function formatSignedPercent(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return 'Sin dato';
    const rounded = value.toFixed(1);
    return `${value > 0 ? '+' : ''}${rounded}%`;
}

function formatSeriesLabel(timestamp: number): string {
    return new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' }).format(timestamp);
}

function slugify(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function mergeDraft(raw: unknown): { data: WizardData; valuationEstimate: PropertyValuationEstimate | null } | null {
    if (!raw || typeof raw !== 'object') return null;
    const parsed = raw as PersistedDraft;
    if (!parsed.data) return null;
    const defaults = createDefaultData();
    const next: WizardData = {
        setup: { ...defaults.setup, ...(parsed.data.setup || {}) },
        basic: { ...defaults.basic, ...(parsed.data.basic || {}) },
        project: {
            ...defaults.project,
            ...(parsed.data.project || {}),
            models: Array.isArray(parsed.data.project?.models) && parsed.data.project.models.length > 0
                ? parsed.data.project.models.map((model, index) => ({
                    ...createProjectUnitModel(model?.id || `unit-model-${index + 1}`),
                    ...(model || {}),
                    id: typeof model?.id === 'string' && model.id.trim() ? model.id : `unit-model-${index + 1}`,
                }))
                : defaults.project.models,
        },
        specs: {
            ...defaults.specs,
            ...(parsed.data.specs || {}),
            amenityCodes: Array.isArray(parsed.data.specs?.amenityCodes) ? parsed.data.specs.amenityCodes : [],
            serviceCodes: Array.isArray(parsed.data.specs?.serviceCodes) ? parsed.data.specs.serviceCodes : [],
            environmentCodes: Array.isArray(parsed.data.specs?.environmentCodes) ? parsed.data.specs.environmentCodes : [],
            securityCodes: Array.isArray(parsed.data.specs?.securityCodes) ? parsed.data.specs.securityCodes : [],
        },
        media: {
            ...defaults.media,
            ...(parsed.data.media || {}),
            photos: Array.isArray(parsed.data.media?.photos)
                ? parsed.data.media.photos.map((photo) => ({
                        id: photo.id,
                        name: photo.name,
                        dataUrl: (typeof photo.dataUrl === 'string' ? photo.dataUrl : (typeof (photo as { url?: string }).url === 'string' ? (photo as { url?: string }).url : '')) || '',
                        previewUrl: (typeof photo.previewUrl === 'string' ? photo.previewUrl : (typeof (photo as { url?: string }).url === 'string' ? (photo as { url?: string }).url : '')) || '',
                        isCover: !!photo.isCover,
                        width: typeof photo.width === 'number' ? photo.width : 0,
                        height: typeof photo.height === 'number' ? photo.height : 0,
                        sizeBytes: typeof photo.sizeBytes === 'number' ? photo.sizeBytes : 0,
                        mimeType: typeof photo.mimeType === 'string' ? photo.mimeType : 'image/webp',
                    }))
                    : [],
                discoverVideo: parsed.data.media?.discoverVideo
                    ? {
                        id: parsed.data.media.discoverVideo.id,
                        name: parsed.data.media.discoverVideo.name,
                        dataUrl: (typeof parsed.data.media.discoverVideo.dataUrl === 'string' ? parsed.data.media.discoverVideo.dataUrl : (typeof (parsed.data.media.discoverVideo as { url?: string }).url === 'string' ? (parsed.data.media.discoverVideo as { url?: string }).url : '')) || '',
                        previewUrl: (typeof parsed.data.media.discoverVideo.previewUrl === 'string' ? parsed.data.media.discoverVideo.previewUrl : (typeof (parsed.data.media.discoverVideo as { url?: string }).url === 'string' ? (parsed.data.media.discoverVideo as { url?: string }).url : '')) || '',
                        width: typeof parsed.data.media.discoverVideo.width === 'number' ? parsed.data.media.discoverVideo.width : 0,
                        height: typeof parsed.data.media.discoverVideo.height === 'number' ? parsed.data.media.discoverVideo.height : 0,
                        sizeBytes: typeof parsed.data.media.discoverVideo.sizeBytes === 'number' ? parsed.data.media.discoverVideo.sizeBytes : 0,
                        mimeType: typeof parsed.data.media.discoverVideo.mimeType === 'string' ? parsed.data.media.discoverVideo.mimeType : 'video/mp4',
                        durationSeconds: typeof parsed.data.media.discoverVideo.durationSeconds === 'number' ? parsed.data.media.discoverVideo.durationSeconds : 0,
                    }
                    : null,
            documents: Array.isArray(parsed.data.media?.documents)
                ? parsed.data.media.documents.map((item) => ({
                    id: item.id,
                    name: item.name,
                    sizeBytes: typeof item.sizeBytes === 'number' ? item.sizeBytes : 0,
                    mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'application/pdf',
                }))
                : [],
        },
        location: patchListingLocation(defaults.location, {
            ...((parsed.data.location || {}) as Partial<ListingLocation>),
            sourceMode: parsed.data.location?.sourceMode === 'area_only'
                ? 'custom'
                : (((parsed.data.location || {}) as Partial<ListingLocation>).sourceMode ?? defaults.location.sourceMode),
        }),
        commercial: { ...defaults.commercial, ...(parsed.data.commercial || {}) },
        review: { ...defaults.review, ...(parsed.data.review || {}) },
    };
    return {
        data: next,
        valuationEstimate: parsed.valuationEstimate ?? null,
    };
}

function serializeDraft(data: WizardData, valuationEstimate: PropertyValuationEstimate | null): PersistedDraft {
    return {
        version: 1,
        savedAt: new Date().toISOString(),
        valuationEstimate,
        data: {
            ...data,
            media: {
                ...data.media,
                photos: data.media.photos.map((photo) => ({
                    id: photo.id,
                    name: photo.name,
                    dataUrl: photo.dataUrl,
                    previewUrl: photo.previewUrl,
                    isCover: photo.isCover,
                    width: photo.width,
                    height: photo.height,
                    sizeBytes: photo.sizeBytes,
                    mimeType: photo.mimeType,
                })),
                discoverVideo: data.media.discoverVideo
                    ? {
                        id: data.media.discoverVideo.id,
                        name: data.media.discoverVideo.name,
                        dataUrl: data.media.discoverVideo.dataUrl,
                        previewUrl: data.media.discoverVideo.previewUrl,
                        width: data.media.discoverVideo.width,
                        height: data.media.discoverVideo.height,
                        sizeBytes: data.media.discoverVideo.sizeBytes,
                        mimeType: data.media.discoverVideo.mimeType,
                        durationSeconds: data.media.discoverVideo.durationSeconds,
                    }
                    : null,
                documents: data.media.documents.map((item) => ({
                    id: item.id,
                    name: item.name,
                    sizeBytes: item.sizeBytes,
                    mimeType: item.mimeType,
                })),
            },
        },
    };
}

function parseNumberString(value: string): string {
    return value.replace(/[^\d]/g, '');
}

function parseSlugFromHref(href: string): string {
    const parts = href.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}

function toPropertyOperation(section: PanelListing['section']): PropertyOperation {
    if (section === 'rent' || section === 'project') return section;
    return 'sale';
}

function buildEditPayload(listing: PanelListing): { data: WizardData; valuationEstimate: PropertyValuationEstimate | null } {
    if (listing.rawData && typeof listing.rawData === 'object') {
        const rawRecord = listing.rawData as Record<string, unknown>;
        const merged = mergeDraft({
            data: rawRecord,
            valuationEstimate: (rawRecord.valuation as PropertyValuationEstimate | null | undefined) ?? null,
        });
        if (merged) return merged;
    }

    const defaults = createDefaultData();
    const next: WizardData = {
        ...defaults,
        setup: {
            ...defaults.setup,
            operationType: toPropertyOperation(listing.section),
        },
        basic: {
            ...defaults.basic,
            title: listing.title,
            description: listing.description,
        },
        location: patchListingLocation(defaults.location, listing.locationData ?? {}),
        commercial: {
            ...defaults.commercial,
            slug: parseSlugFromHref(listing.href),
        },
    };

    const numericPrice = parseNumberString(listing.price);
    if (listing.section === 'project') {
        next.commercial.price = numericPrice;
        next.commercial.priceTo = numericPrice;
    } else {
        next.commercial.price = numericPrice;
    }

    return { data: next, valuationEstimate: null };
}

function buildValuationRequest(data: WizardData): PropertyValuationRequest | null {
    if (data.setup.operationType === 'project') return null;
    const areaM2 = parseNumber(data.basic.totalArea);
    if (!data.setup.propertyType || !data.location.regionId || !data.location.communeId || !data.location.addressLine1 || areaM2 == null) return null;

    const age = parseNumber(data.basic.propertyAge);
    const currentYear = new Date().getFullYear();
    const inferredYearBuilt = age != null ? Math.max(1900, currentYear - age) : null;

    return {
        operationType: data.setup.operationType,
        propertyType: data.setup.propertyType,
        regionId: data.location.regionId,
        communeId: data.location.communeId,
        neighborhood: data.location.neighborhood?.trim() || null,
        addressLine1: data.location.addressLine1?.trim() || null,
        areaM2,
        builtAreaM2: parseNumber(data.basic.usableArea),
        bedrooms: parseNumber(data.basic.rooms),
        bathrooms: parseNumber(data.basic.bathrooms),
        parkingSpaces: parseNumber(data.basic.parkingSpaces),
        storageUnits: parseNumber(data.basic.storageUnits),
        yearBuilt: inferredYearBuilt,
        condition: data.basic.condition.trim() || null,
    };
}

function validateStep(step: StepId, data: WizardData): Record<string, string> {
    const errors: Record<string, string> = {};

    if (step === 'details') {
        if (!data.setup.propertyType) errors['setup.propertyType'] = 'Selecciona el tipo de propiedad.';
        if (!data.setup.operationType) errors['setup.operationType'] = 'Selecciona la operación.';
        if (!data.basic.title.trim()) errors['basic.title'] = 'Ingresa un título para la publicación.';
        if (data.setup.operationType === 'project') {
            if (!data.project.projectName.trim()) errors['project.projectName'] = 'Ingresa el nombre del proyecto.';
            if (!data.project.developerName.trim()) errors['project.developerName'] = 'Ingresa la inmobiliaria o desarrollador.';
            if (parseNumber(data.project.availableUnits) == null) errors['project.availableUnits'] = 'Ingresa las unidades disponibles.';
            if (data.project.models.length === 0) {
                errors['project.models'] = 'Agrega al menos una tipología del proyecto.';
            }
        } else {
            const pt = data.setup.propertyType;
            const isLand = pt === 'Terreno' || pt === 'Parcela';
            const isResidential = pt === 'Casa' || pt === 'Departamento';
            if (parseNumber(data.basic.totalArea) == null) errors['basic.totalArea'] = isLand ? 'La superficie del terreno es obligatoria.' : 'La superficie total es obligatoria.';
            if (isResidential) {
                if (parseNumber(data.basic.rooms) == null) errors['basic.rooms'] = 'Ingresa la cantidad de dormitorios.';
                if (parseNumber(data.basic.bathrooms) == null) errors['basic.bathrooms'] = 'Ingresa la cantidad de baños.';
            }
        }
        if (parseNumber(data.commercial.price) == null) errors['commercial.price'] = 'Ingresa un precio válido.';
    }

    if (step === 'publish') {
        if (data.basic.description.trim().length < 40) errors['basic.description'] = 'La descripción debe tener al menos 40 caracteres.';
        if (!data.location.regionId) errors['location.regionId'] = 'Selecciona la región.';
        if (!data.location.communeId) errors['location.communeId'] = 'Selecciona la comuna.';
        if (!data.location.addressLine1?.trim()) errors['location.addressLine1'] = 'La dirección exacta es obligatoria.';
        if (data.location.sourceMode === 'saved_address' && !data.location.sourceAddressId) errors['location.sourceAddressId'] = 'Selecciona una dirección guardada.';
        if (!data.review.acceptTerms) {
            errors['review.acceptTerms'] = 'Debes aceptar los términos antes de publicar.';
        }
    }

    if (step === 'media') {
        if (data.media.photos.length < 1) errors['media.photos'] = 'Sube al menos 1 foto.';
        if (data.media.videoUrl.trim() && !isSupportedExternalVideoUrl(data.media.videoUrl.trim())) {
            errors['media.video'] = 'Usa un enlace de YouTube o Vimeo.';
        }
        if (data.media.tour360Url.trim()) {
            try {
                new URL(data.media.tour360Url.trim());
            } catch {
                errors['media.tour360Url'] = 'Usa una URL válida para el tour 360.';
            }
        }
    }

    return errors;
}

function qualityScore(data: WizardData, estimate: PropertyValuationEstimate | null): number {
    let score = 0;
    const featureCount = data.specs.amenityCodes.length + data.specs.serviceCodes.length + data.specs.environmentCodes.length + data.specs.securityCodes.length;
    if (data.media.photos.length >= 10) score += 20;
    if (featureCount >= 8) score += 20;
    if (data.location.regionId && data.location.communeId && data.location.addressLine1) score += 20;
    if (data.setup.operationType === 'project') {
        if (
            data.project.projectName.trim()
            && data.project.developerName.trim()
            && parseNumber(data.project.availableUnits) != null
            && parseNumber(data.project.usableAreaFrom) != null
            && data.project.models.some((model) => model.label.trim() && parseNumber(model.priceFrom) != null)
        ) {
            score += 20;
        }
    } else if (parseNumber(data.basic.totalArea) != null && parseNumber(data.basic.usableArea) != null && parseNumber(data.basic.rooms) != null && parseNumber(data.basic.bathrooms) != null) {
        score += 20;
    }
    if (parseNumber(data.commercial.price) != null) score += 10;
    if (data.setup.operationType === 'project') {
        score += 10;
    } else if (estimate) {
        score += 10;
    }
    return Math.min(score, 100);
}

function buildPriceLabel(data: WizardData): string {
    const prefix = data.commercial.currency === 'UF' ? 'UF ' : data.commercial.currency === 'USD' ? 'USD ' : '$';
    if (data.setup.operationType === 'project') {
        if (data.commercial.price.trim() && data.commercial.priceTo.trim()) {
            return `${prefix}${data.commercial.price.trim()} - ${prefix}${data.commercial.priceTo.trim()}`;
        }
        if (data.commercial.price.trim()) {
            return `Desde ${prefix}${data.commercial.price.trim()}`;
        }
    }
    return `${prefix}${data.commercial.price.trim() || '0'}`;
}

function countPropertyAttributes(data: WizardData): number {
    if (data.setup.operationType === 'project') {
        const fields = [
            data.project.builderName,
            data.project.totalUnits,
            data.project.deliveryDate,
            data.project.usableAreaTo,
            data.project.totalAreaFrom,
            data.project.totalAreaTo,
            data.project.parkingFrom,
            data.project.storageFrom,
            data.project.pilotApartment,
            data.project.financingSupport,
            data.project.subsidyEligible,
        ];
        return fields.filter((value) => value.trim().length > 0).length;
    }

    const fields = [
        data.basic.terraceArea,
        data.basic.maxOccupants,
        data.basic.unitNumber,
        data.basic.floorNumber,
        data.basic.unitsPerFloor,
        data.basic.totalFloors,
        data.basic.towerNumber,
        data.basic.orientation,
        data.basic.departmentType,
        data.basic.securityType,
        data.basic.specialConditions,
    ];
    return fields.filter((value) => value.trim().length > 0).length;
}

function createPropertyBasicForPayload(data: WizardData) {
    if (data.setup.operationType === 'project') {
        return {
            ...data.basic,
            propertyType: data.setup.propertyType,
            type: data.setup.propertyType,
            operationType: data.setup.operationType,
            projectName: data.project.projectName,
            developerName: data.project.developerName,
            builderName: data.project.builderName,
            salesStage: data.project.salesStage,
            deliveryStatus: data.project.deliveryStatus,
            deliveryDate: data.project.deliveryDate,
            availableUnits: data.project.availableUnits,
            totalUnits: data.project.totalUnits,
            usableAreaFrom: data.project.usableAreaFrom,
            usableAreaTo: data.project.usableAreaTo,
            totalAreaFrom: data.project.totalAreaFrom,
            totalAreaTo: data.project.totalAreaTo,
            parkingFrom: data.project.parkingFrom,
            storageFrom: data.project.storageFrom,
            pilotApartment: data.project.pilotApartment,
            financingSupport: data.project.financingSupport,
            subsidyEligible: data.project.subsidyEligible,
            unitModels: data.project.models,
        };
    }

    return {
        ...data.basic,
        propertyType: data.setup.propertyType,
        type: data.setup.propertyType,
        operationType: data.setup.operationType,
        rooms: data.basic.rooms,
        bedrooms: data.basic.rooms,
        bathrooms: data.basic.bathrooms,
        totalArea: data.basic.totalArea,
        surface: data.basic.totalArea,
        usableArea: data.basic.usableArea,
    };
}

function buildProgramLabel(data: WizardData): string {
    if (data.setup.operationType === 'project') {
        const models = data.project.models.filter((model) => model.label.trim());
        if (models.length > 0) return `${models.length} tipologías`;
        return data.project.availableUnits.trim() ? `${data.project.availableUnits.trim()} unidades` : 'Proyecto inmobiliario';
    }

    const parts = [
        data.basic.rooms.trim() ? `${data.basic.rooms.trim()}D` : null,
        data.basic.bathrooms.trim() ? `${data.basic.bathrooms.trim()}B` : null,
        data.basic.totalArea.trim() ? `${data.basic.totalArea.trim()} m²` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : data.setup.propertyType || 'Propiedad';
}

function buildPreviewLocation(data: WizardData): string {
    return data.location.publicLabel
        || data.location.communeName
        || data.location.communeId
        || data.location.regionName
        || 'Ubicación pendiente';
}

function ListingLivePreview(props: { data: WizardData; compact?: boolean }) {
    const { data, compact = false } = props;
    const title = data.setup.operationType === 'project'
        ? data.project.projectName || data.basic.title || 'Tu proyecto aparecerá aquí'
        : data.basic.title || 'Tu propiedad aparecerá aquí';
    const photo = data.media.photos[0];
    const video = data.media.discoverVideo;
    const location = buildPreviewLocation(data);
    const operation = getOperationLabel(data.setup.operationType);
    const price = data.commercial.price.trim() ? buildPriceLabel(data) : 'Precio pendiente';

    const specs: Array<{ icon: React.ReactNode; label: string }> = [];
    if (data.setup.operationType !== 'project') {
        if (data.basic.rooms) specs.push({ icon: <IconBed size={13} />, label: `${data.basic.rooms} dorm` });
        if (data.basic.bathrooms) specs.push({ icon: <IconBath size={13} />, label: `${data.basic.bathrooms} baños` });
        if (data.basic.totalArea) specs.push({ icon: <IconRuler size={13} />, label: `${data.basic.totalArea} m²` });
    }

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-md">
            {/* Media area — 9:14 like real card */}
            <div className="relative aspect-[9/14] bg-[#09090b] overflow-hidden">
                {video?.previewUrl || video?.dataUrl ? (
                    <video src={video.previewUrl || video.dataUrl} className="h-full w-full object-cover" muted playsInline loop />
                ) : photo?.previewUrl || photo?.dataUrl ? (
                    <img src={photo.previewUrl || photo.dataUrl} alt={title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center" style={{ background: 'radial-gradient(circle at 50% 20%, color-mix(in oklab, var(--accent) 20%, transparent), transparent 42%), #111827' }}>
                        <IconCamera size={28} className="text-white/60" />
                        <span className="text-xs font-semibold text-white/80">Sube la portada</span>
                    </div>
                )}
                {/* Gradient overlay — matches real card */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                {/* Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur font-bold">
                        {operation}
                    </span>
                </div>
                {/* Bottom info — centered like real card */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <p className="text-white font-bold text-xl text-center drop-shadow-sm">{price}</p>
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
                <p className="text-[10px] text-[var(--fg-muted)]">Así verá tu publicación</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-medium">Simple</span>
            </div>
        </div>
    );
}

type WizardSetter = React.Dispatch<React.SetStateAction<WizardData>>;

function ErrorText(props: { text: string }) {
    return <p className="mt-2 text-xs prop-field-error">{props.text}</p>;
}

function Field(props: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1 prop-field-label">
                {props.label}
                {props.required ? <abbr title="requerido" className="text-(--color-error) no-underline"> *</abbr> : null}
            </label>
            {props.children}
            {props.hint ? <p className="text-xs mt-1 prop-field-hint">{props.hint}</p> : null}
            {props.error ? <ErrorText text={props.error} /> : null}
        </div>
    );
}

function AccordionGroup(props: { title: string; description?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <section className="border-b pb-3 prop-section-border">
            <button type="button" onClick={props.onToggle} className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left cursor-pointer">
                <span>
                    <span className="block text-sm font-medium">{props.title}</span>
                    {props.description ? <span className="block text-xs mt-0.5 prop-field-hint">{props.description}</span> : null}
                </span>
                <span className="text-xs mt-0.5 prop-field-hint">
                    {props.open ? 'Contraer' : 'Expandir'}
                </span>
            </button>
            {props.open ? <div className="px-4 pb-2 pt-1">{props.children}</div> : null}
        </section>
    );
}

function ToggleCard(props: { title: string; description?: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onToggle}
            className={`rounded-lg border px-3 py-3 text-left prop-toggle-card ${props.active ? 'prop-toggle-card--active' : ''}`}
        >
            <p className="text-sm font-medium">{props.title}</p>
            {props.description ? (
                <p className="text-xs mt-1 prop-field-hint">
                    {props.description}
                </p>
            ) : null}
            <p className="text-xs mt-1 text-(--fg-secondary)">{props.active ? 'Activado' : 'Desactivado'}</p>
        </button>
    );
}

function SelectableChip(props: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onToggle}
            className={`rounded-2xl border px-3 py-3 text-sm text-left transition-colors prop-select-chip ${props.active ? 'prop-select-chip--active' : ''}`}
        >
            <span className="flex items-center gap-3">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border prop-select-chip-dot ${props.active ? 'prop-select-chip-dot--active' : ''}`}>
                    {props.active ? <IconCheck size={13} /> : null}
                </span>
                <span className="font-medium text-(--fg)">{props.label}</span>
            </span>
        </button>
    );
}

function QualityItem(props: { label: string; ok: boolean }) {
    return (
        <div className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm prop-section-border">
            <span className="text-(--fg-secondary)">{props.label}</span>
            <span className={props.ok ? 'prop-quality-ok' : 'prop-quality-muted'}>
                <IconCircleCheck size={14} />
            </span>
        </div>
    );
}

function StepSetup(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    operatorHint?: string | null;
    operatorContext?: PropiedadesOperatorPublishContext | null;
}) {
    const { data, setData, errors, operatorHint, operatorContext } = props;
    const recommendedOperation: PropertyOperation | null = operatorContext?.emphasizeProjectOperation
        ? 'project'
        : operatorContext?.showRentAdminFields
            ? 'rent'
            : null;

    return (
        <section className="space-y-6">
            <h2 className="type-section-title">Tipo y categoría</h2>
            <MarketplaceOperatorPublishHint message={operatorHint ?? null} />
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em] prop-field-hint">
                    Operación del aviso
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {OPERATION_CARDS.map((card) => (
                        <PanelChoiceCard
                            key={card.value}
                            onClick={() => setData((current) => ({
                                ...current,
                                setup: { ...current.setup, operationType: card.value },
                                commercial: { ...current.commercial, currency: getDefaultCurrencyForOperation(card.value) },
                            }))}
                            selected={data.setup.operationType === card.value}
                            className="h-20 px-3 text-center"
                        >
                            <div className="flex h-full flex-col items-center justify-center gap-2">
                                <span className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 prop-publish-icon">
                                    {card.icon}
                                </span>
                                <span className="text-sm font-medium leading-none">{card.label}</span>
                                {recommendedOperation === card.value ? (
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-(--accent)">
                                        Recomendado
                                    </span>
                                ) : null}
                            </div>
                        </PanelChoiceCard>
                    ))}
                </div>
                {errors['setup.operationType'] ? <ErrorText text={errors['setup.operationType']} /> : null}
            </div>
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em] prop-field-hint">
                    Tipo de propiedad
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {PROPERTY_TYPE_CARDS.map((option) => (
                        <PanelChoiceCard
                            key={option.value}
                            onClick={() => setData((current) => ({
                                ...current,
                                setup: { ...current.setup, propertyType: option.value },
                            }))}
                            selected={data.setup.propertyType === option.value}
                            className="min-h-[78px] px-3"
                        >
                            <div className="flex items-center gap-3">
                                <span className="h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 prop-publish-icon">
                                    {option.icon}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate prop-publish-fg">{option.label}</p>
                                    <p className="text-xs mt-1 prop-field-hint">Define los campos específicos del inmueble.</p>
                                </div>
                            </div>
                        </PanelChoiceCard>
                    ))}
                </div>
                {errors['setup.propertyType'] ? <ErrorText text={errors['setup.propertyType']} /> : null}
            </div>
        </section>
    );
}

function StepBasic(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    communes: Array<{ id: string; name: string }>;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
    variant?: 'full' | 'details' | 'location';
    showRentAdminFields?: boolean;
}) {
    const { data, setData, errors, addressBook, addressBookLoading, communes, onGeocodeLocation, geocoding, variant = 'full', showRentAdminFields = false } = props;
    const [openSections, setOpenSections] = useState<Record<'main' | 'secondary' | 'location', boolean>>({
        main: true,
        secondary: variant !== 'details',
        location: true,
    });
    const isProject = data.setup.operationType === 'project';

    const updateProjectModel = (modelId: string, patch: Partial<ProjectUnitModel>) => {
        setData((current) => ({
            ...current,
            project: {
                ...current.project,
                models: current.project.models.map((item) => (item.id === modelId ? { ...item, ...patch } : item)),
            },
        }));
    };

    const showLocation = variant === 'full' || variant === 'location';
    const showDetails = variant === 'full' || variant === 'details';

    return (
        <section className="space-y-4">
            {showDetails ? (
                variant === 'details' ? null : (
                <h2 className="type-section-title">{isProject ? 'Datos del proyecto' : 'Datos del inmueble'}</h2>
                )
            ) : (
                <h2 className="type-section-title">Ubicación</h2>
            )}
            {showRentAdminFields && data.setup.operationType === 'rent' && showDetails ? (
                <MarketplacePropiedadesRentAdminHint />
            ) : null}

            {showLocation ? (
            <AccordionGroup
                title="Ubicación del aviso"
                description="Elige una dirección guardada o escribe una nueva. Completa dirección, región y comuna y decide si quieres ocultar la dirección exacta."
                open={openSections.location}
                onToggle={() => setOpenSections((current) => ({ ...current, location: !current.location }))}
            >
                <ListingLocationEditor
                    showHeader={false}
                    framed={false}
                    simpleMode
                    location={data.location}
                    onChange={(next) => setData((current) => ({ ...current, location: next }))}
                    regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                    communes={communes.map((item) => ({ value: item.id, label: item.name }))}
                    allCommunes={LOCATION_COMMUNES.map((item) => ({ value: item.id, label: item.name }))}
                    addressBook={addressBook}
                    addressBookLoading={addressBookLoading}
                    errors={{
                        regionId: errors['location.regionId'],
                        communeId: errors['location.communeId'],
                        sourceAddressId: errors['location.sourceAddressId'],
                        addressLine1: errors['location.addressLine1'],
                    }}
                    allowAreaOnly={false}
                    addressRequired
                    addressFirst
                    showSourceSelector={false}
                    showVisibilityField={false}
                    showGoogleMapsLink
                    showPublicPreviewCard={false}
                    showActionBar={false}
                    geocoding={geocoding}
                    onGeocode={onGeocodeLocation}
                />
            </AccordionGroup>
            ) : null}

            {showDetails ? (
            <>
            <AccordionGroup
                title={isProject ? 'Identidad del proyecto' : variant === 'details' ? 'Datos esenciales' : 'Datos principales'}
                description={isProject ? 'Nombre del proyecto, inmobiliaria, etapa, entrega y descripción comercial.' : variant === 'details' ? 'Programa, superficie y condición. Lo mínimo para publicar rápido.' : 'Titular, descripción y atributos obligatorios del inmueble.'}
                open={openSections.main}
                onToggle={() => setOpenSections((current) => ({ ...current, main: !current.main }))}
            >
                {isProject ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <Field label="Título publicitario" required error={errors['basic.title']} hint="Titular comercial que aparecerá en la publicación.">
                                <input className="form-input" value={data.basic.title} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))} placeholder="Ej: Proyecto con entrega inmediata en Ñuñoa" />
                            </Field>
                            <Field label="Nombre del proyecto" required error={errors['project.projectName']} hint="Nombre comercial o nombre del condominio.">
                                <input className="form-input" value={data.project.projectName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, projectName: event.target.value } }))} placeholder="Ej: Vista Parque Ñuñoa" />
                            </Field>
                            <Field label="Inmobiliaria / desarrollador" required error={errors['project.developerName']}>
                                <input className="form-input" value={data.project.developerName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, developerName: event.target.value } }))} placeholder="Ej: Inmobiliaria Andes" />
                            </Field>
                            <Field label="Constructora">
                                <input className="form-input" value={data.project.builderName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, builderName: event.target.value } }))} placeholder="Ej: Constructora Central" />
                            </Field>
                            <Field label="Etapa comercial" required error={errors['project.salesStage']}>
                                <ModernSelect value={data.project.salesStage} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, salesStage: value } }))} placeholder="Seleccionar" options={PROJECT_SALES_STAGE_OPTIONS} ariaLabel="Seleccionar etapa comercial" />
                            </Field>
                            <Field label="Estado de entrega" required error={errors['project.deliveryStatus']}>
                                <ModernSelect value={data.project.deliveryStatus} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, deliveryStatus: value } }))} placeholder="Seleccionar" options={PROJECT_DELIVERY_STATUS_OPTIONS} ariaLabel="Seleccionar estado de entrega" />
                            </Field>
                            <Field label="Entrega estimada">
                                <input className="form-input" type="date" value={data.project.deliveryDate} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, deliveryDate: event.target.value } }))} />
                            </Field>
                            <Field label="Unidades disponibles" required error={errors['project.availableUnits']}>
                                <input className="form-input" type="number" min={0} value={data.project.availableUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, availableUnits: event.target.value } }))} placeholder="24" />
                            </Field>
                            <Field label="Unidades totales">
                                <input className="form-input" type="number" min={0} value={data.project.totalUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, totalUnits: event.target.value } }))} placeholder="80" />
                            </Field>
                            <Field label="Condición">
                                <ModernSelect value={data.basic.condition} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))} placeholder="Seleccionar" options={CONDITION_OPTIONS} ariaLabel="Seleccionar condición" />
                            </Field>
                        </div>
                        {variant !== 'details' ? (
                        <Field label="Descripción" required error={errors['basic.description']}>
                            <textarea className="form-textarea" rows={5} value={data.basic.description} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))} placeholder="Describe el proyecto, sus diferenciales, entorno, conectividad, amenidades y por qué destaca frente a otras alternativas." />
                            <p className="text-xs mt-1 prop-field-hint">{data.basic.description.length} / 2500</p>
                        </Field>
                        ) : null}
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <Field label="Condición">
                                <ModernSelect value={data.basic.condition} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))} placeholder="Seleccionar" options={CONDITION_OPTIONS} ariaLabel="Seleccionar condición" />
                            </Field>
                        </div>
                        {variant !== 'details' ? (
                        <Field label="Descripción" required error={errors['basic.description']}>
                            <textarea className="form-textarea" rows={5} value={data.basic.description} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))} placeholder="Distribución, terminaciones, orientación, entorno, conectividad y cualquier ventaja competitiva del inmueble." />
                            <p className="text-xs mt-1 prop-field-hint">{data.basic.description.length} / 2500</p>
                        </Field>
                        ) : null}
                        {(() => {
                            const pt = data.setup.propertyType;
                            const isLand = pt === 'Terreno' || pt === 'Parcela';
                            const isOficina = pt === 'Oficina';
                            const isResidential = pt === 'Casa' || pt === 'Departamento';
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                                    {/* Superficie total — always visible */}
                                    <Field label={isLand ? 'Superficie del terreno (m²)' : 'Superficie total (m²)'} required error={errors['basic.totalArea']}><input className="form-input" type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder={isLand ? '500' : '92'} /></Field>

                                    {/* Residential-only fields */}
                                    {isResidential && (
                                        <>
                                            <Field label="Dormitorios" required error={errors['basic.rooms']}><div className="relative"><IconBed size={15} className="absolute left-3 top-1/2 -translate-y-1/2 prop-field-hint" /><input className="form-input pl-10" type="number" min={0} value={data.basic.rooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, rooms: event.target.value } }))} placeholder="3" /></div></Field>
                                            <Field label="Baños" required error={errors['basic.bathrooms']}><div className="relative"><IconBath size={15} className="absolute left-3 top-1/2 -translate-y-1/2 prop-field-hint" /><input className="form-input pl-10" type="number" min={0} value={data.basic.bathrooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, bathrooms: event.target.value } }))} placeholder="2" /></div></Field>
                                            <Field label="Superficie útil (m²)"><input className="form-input" type="number" min={0} value={data.basic.usableArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, usableArea: event.target.value } }))} placeholder="84" /></Field>
                                            <Field label="Estacionamientos"><input className="form-input" type="number" min={0} value={data.basic.parkingSpaces} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, parkingSpaces: event.target.value } }))} placeholder="1" /></Field>
                                            <Field label="Bodegas"><input className="form-input" type="number" min={0} value={data.basic.storageUnits} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, storageUnits: event.target.value } }))} placeholder="1" /></Field>
                                            <Field label="Admite mascotas">
                                                <ModernSelect value={data.basic.petsAllowed} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, petsAllowed: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si admite mascotas" />
                                            </Field>
                                            <Field label="Amoblado">
                                                <ModernSelect value={data.basic.furnished} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, furnished: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si está amoblado" />
                                            </Field>
                                        </>
                                    )}

                                    {/* Commercial-use field for land and commercial types */}
                                    {(isLand || !isResidential) && (
                                        <Field label="Uso de suelo / tipo de local">
                                            <ModernSelect value={data.basic.commercialUse} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, commercialUse: value } }))} placeholder="Seleccionar" options={COMMERCIAL_USE_OPTIONS} ariaLabel="Seleccionar uso de suelo" />
                                        </Field>
                                    )}

                                    {/* Floor number for Oficina */}
                                    {isOficina && (
                                        <Field label="Nro. piso">
                                            <input className="form-input" type="number" min={0} value={data.basic.floorNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, floorNumber: event.target.value } }))} placeholder="5" />
                                        </Field>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
            </AccordionGroup>

            <AccordionGroup
                title={isProject ? 'Tipologías y rangos del proyecto' : variant === 'details' ? 'Más detalles (opcional)' : 'Características secundarias'}
                description={isProject ? 'Rangos generales del proyecto y detalle por tipología o unidad modelo.' : variant === 'details' ? 'Completa solo si quieres enriquecer la ficha. No es obligatorio para publicar.' : 'Campos adicionales para alinear la ficha con portales inmobiliarios grandes.'}
                open={openSections.secondary}
                onToggle={() => setOpenSections((current) => ({ ...current, secondary: !current.secondary }))}
            >
                {isProject ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <Field label="Superficie útil desde (m²)" required error={errors['project.usableAreaFrom']}><input className="form-input" type="number" min={0} value={data.project.usableAreaFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, usableAreaFrom: event.target.value } }))} placeholder="39" /></Field>
                            <Field label="Superficie útil hasta (m²)"><input className="form-input" type="number" min={0} value={data.project.usableAreaTo} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, usableAreaTo: event.target.value } }))} placeholder="112" /></Field>
                            <Field label="Superficie total desde (m²)"><input className="form-input" type="number" min={0} value={data.project.totalAreaFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, totalAreaFrom: event.target.value } }))} placeholder="45" /></Field>
                            <Field label="Superficie total hasta (m²)"><input className="form-input" type="number" min={0} value={data.project.totalAreaTo} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, totalAreaTo: event.target.value } }))} placeholder="130" /></Field>
                            <Field label="Estacionamientos desde"><input className="form-input" type="number" min={0} value={data.project.parkingFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, parkingFrom: event.target.value } }))} placeholder="1" /></Field>
                            <Field label="Bodegas desde"><input className="form-input" type="number" min={0} value={data.project.storageFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, storageFrom: event.target.value } }))} placeholder="0" /></Field>
                            <Field label="Piloto disponible">
                                <ModernSelect value={data.project.pilotApartment} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, pilotApartment: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si tiene piloto" />
                            </Field>
                            <Field label="Apoyo en financiamiento">
                                <ModernSelect value={data.project.financingSupport} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, financingSupport: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si ofrece apoyo en financiamiento" />
                            </Field>
                            <Field label="Compatible con subsidio">
                                <ModernSelect value={data.project.subsidyEligible} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, subsidyEligible: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si es compatible con subsidio" />
                            </Field>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">Tipologías o unidades modelo</p>
                                    <p className="text-xs mt-1 prop-field-hint">
                                        Define el inventario comercial del proyecto con rangos y precios por tipología.
                                    </p>
                                </div>
                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setData((current) => ({
                                        ...current,
                                        project: {
                                            ...current.project,
                                            models: [...current.project.models, createProjectUnitModel(`unit-model-${Date.now()}`)],
                                        },
                                    }))}
                                >
                                    Agregar tipología
                                </PanelButton>
                            </div>
                            {errors['project.models'] ? <ErrorText text={errors['project.models']} /> : null}
                            <div className="hidden xl:grid xl:grid-cols-[minmax(180px,1.3fr)_80px_80px_120px_120px_140px_140px_86px] gap-2 px-3 text-[11px] uppercase tracking-[0.08em] text-(--fg-muted)">
                                <span>Tipología</span>
                                <span>Dorm.</span>
                                <span>Baños</span>
                                <span>m² útiles</span>
                                <span>m² totales</span>
                                <span>Precio desde</span>
                                <span>Precio hasta</span>
                                <span />
                            </div>
                            <div className="space-y-2">
                                {data.project.models.map((model, index) => (
                                    <div key={model.id} className="rounded-2xl border p-3 prop-publish-card">
                                        <div className="xl:grid xl:grid-cols-[minmax(180px,1.3fr)_80px_80px_120px_120px_140px_140px_86px] xl:gap-2 xl:items-start">
                                            <div className="mb-3 xl:mb-0">
                                                <Field label="Tipología" required error={errors[`project.models.${index}.label`]}>
                                                    <input className="form-input" value={model.label} onChange={(event) => updateProjectModel(model.id, { label: event.target.value })} placeholder="Ej: Tipo A / 2D+2B" />
                                                </Field>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 xl:contents">
                                                <Field label="Dorm." required error={errors[`project.models.${index}.bedrooms`]}><input className="form-input" type="number" min={0} value={model.bedrooms} onChange={(event) => updateProjectModel(model.id, { bedrooms: event.target.value })} placeholder="2" /></Field>
                                                <Field label="Baños" required error={errors[`project.models.${index}.bathrooms`]}><input className="form-input" type="number" min={0} value={model.bathrooms} onChange={(event) => updateProjectModel(model.id, { bathrooms: event.target.value })} placeholder="2" /></Field>
                                                <Field label="m² útiles" required error={errors[`project.models.${index}.usableAreaFrom`]}>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input className="form-input" type="number" min={0} value={model.usableAreaFrom} onChange={(event) => updateProjectModel(model.id, { usableAreaFrom: event.target.value })} placeholder="52" />
                                                        <input className="form-input" type="number" min={0} value={model.usableAreaTo} onChange={(event) => updateProjectModel(model.id, { usableAreaTo: event.target.value })} placeholder="58" />
                                                    </div>
                                                </Field>
                                                <Field label="m² totales">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input className="form-input" type="number" min={0} value={model.totalAreaFrom} onChange={(event) => updateProjectModel(model.id, { totalAreaFrom: event.target.value })} placeholder="60" />
                                                        <input className="form-input" type="number" min={0} value={model.totalAreaTo} onChange={(event) => updateProjectModel(model.id, { totalAreaTo: event.target.value })} placeholder="66" />
                                                    </div>
                                                </Field>
                                                <Field label="Precio desde" required error={errors[`project.models.${index}.priceFrom`]}><input className="form-input" type="number" min={0} value={model.priceFrom} onChange={(event) => updateProjectModel(model.id, { priceFrom: event.target.value })} placeholder="4200" /></Field>
                                                <Field label="Precio hasta"><input className="form-input" type="number" min={0} value={model.priceTo} onChange={(event) => updateProjectModel(model.id, { priceTo: event.target.value })} placeholder="4700" /></Field>
                                            </div>
                                            <div className="mt-3 xl:mt-0 xl:pt-7 flex justify-end">
                                                {data.project.models.length > 1 ? (
                                                    <PanelButton
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setData((current) => ({
                                                            ...current,
                                                            project: {
                                                                ...current.project,
                                                                models: current.project.models.filter((item) => item.id !== model.id),
                                                            },
                                                        }))}
                                                    >
                                                        Quitar
                                                    </PanelButton>
                                                ) : <span />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <Field label="Superficie de terraza (m²)"><input className="form-input" type="number" min={0} value={data.basic.terraceArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, terraceArea: event.target.value } }))} placeholder="12" /></Field>
                            <Field label="Máximo de habitantes"><input className="form-input" type="number" min={0} value={data.basic.maxOccupants} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, maxOccupants: event.target.value } }))} placeholder="4" /></Field>
                            <Field label="Número de unidad"><input className="form-input" value={data.basic.unitNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, unitNumber: event.target.value } }))} placeholder="608" /></Field>
                            <Field label="Piso de la unidad"><input className="form-input" type="number" min={0} value={data.basic.floorNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, floorNumber: event.target.value } }))} placeholder="6" /></Field>
                            <Field label="Departamentos por piso"><input className="form-input" type="number" min={0} value={data.basic.unitsPerFloor} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, unitsPerFloor: event.target.value } }))} placeholder="4" /></Field>
                            <Field label="Cantidad de pisos"><input className="form-input" type="number" min={0} value={data.basic.totalFloors} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalFloors: event.target.value } }))} placeholder="18" /></Field>
                            <Field label="Número de torre"><input className="form-input" value={data.basic.towerNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, towerNumber: event.target.value } }))} placeholder="Torre B" /></Field>
                            <Field label="Antigüedad (años)"><input className="form-input" type="number" min={0} value={data.basic.propertyAge} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, propertyAge: event.target.value } }))} placeholder="6" /></Field>
                            <Field label="Tipo de departamento">
                                <ModernSelect value={data.basic.departmentType} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, departmentType: value } }))} placeholder="Seleccionar" options={DEPARTMENT_TYPE_OPTIONS} ariaLabel="Seleccionar tipo de departamento" />
                            </Field>
                            <Field label="Orientación">
                                <ModernSelect value={data.basic.orientation} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, orientation: value } }))} placeholder="Seleccionar" options={ORIENTATION_OPTIONS} ariaLabel="Seleccionar orientación" />
                            </Field>
                            <Field label="Tipo de seguridad">
                                <ModernSelect value={data.basic.securityType} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, securityType: value } }))} placeholder="Seleccionar" options={SECURITY_TYPE_OPTIONS} ariaLabel="Seleccionar tipo de seguridad" />
                            </Field>
                            <Field label="Uso comercial">
                                <ModernSelect value={data.basic.commercialUse} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, commercialUse: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar uso comercial" />
                            </Field>
                        </div>
                        <Field label="Condiciones especiales" hint="Ej: disponible para empresas, arriendo temporal o entrega inmediata.">
                            <input className="form-input mt-3" value={data.basic.specialConditions} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, specialConditions: event.target.value } }))} placeholder="Ej: disponible desde abril, admite giro comercial, entrega inmediata" />
                        </Field>
                    </>
                )}
            </AccordionGroup>
            </>
            ) : null}

        </section>
    );
}

function StepSpecs(props: { data: WizardData; setData: WizardSetter }) {
    const { data, setData } = props;
    const [openSections, setOpenSections] = useState<Record<'amenities' | 'services' | 'environment' | 'security', boolean>>({
        amenities: true,
        services: true,
        environment: true,
        security: true,
    });

    const toggleSpecCode = (scope: 'amenityCodes' | 'serviceCodes' | 'environmentCodes' | 'securityCodes', code: string) => {
        setData((current) => ({
            ...current,
            specs: {
                ...current.specs,
                [scope]: current.specs[scope].includes(code)
                    ? current.specs[scope].filter((item) => item !== code)
                    : [...current.specs[scope], code],
            },
        }));
    };

    return (
        <section className="space-y-4">
            <h2 className="type-section-title">{data.setup.operationType === 'project' ? 'Características del proyecto' : 'Características y equipamiento'}</h2>

            <AccordionGroup title="Comodidades y equipamiento" description={data.setup.operationType === 'project' ? 'Amenidades del proyecto, espacios comunes y atributos diferenciales de la comunidad.' : 'Amenidades, equipamiento del edificio y atributos de valor percibido.'} open={openSections.amenities} onToggle={() => setOpenSections((current) => ({ ...current, amenities: !current.amenities }))}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {AMENITY_OPTIONS.map((item) => (
                        <SelectableChip key={item.code} label={item.label} active={data.specs.amenityCodes.includes(item.code)} onToggle={() => toggleSpecCode('amenityCodes', item.code)} />
                    ))}
                </div>
            </AccordionGroup>

            <AccordionGroup title="Servicios" description={data.setup.operationType === 'project' ? 'Servicios e infraestructura disponible para las unidades o áreas comunes.' : 'Servicios instalados o disponibles en la propiedad.'} open={openSections.services} onToggle={() => setOpenSections((current) => ({ ...current, services: !current.services }))}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {SERVICE_OPTIONS.map((item) => (
                        <SelectableChip key={item.code} label={item.label} active={data.specs.serviceCodes.includes(item.code)} onToggle={() => toggleSpecCode('serviceCodes', item.code)} />
                    ))}
                </div>
            </AccordionGroup>

            <AccordionGroup title="Ambientes y espacios" description={data.setup.operationType === 'project' ? 'Espacios interiores, exteriores y atributos de las tipologías del proyecto.' : 'Ambientes interiores, exteriores y espacios de apoyo.'} open={openSections.environment} onToggle={() => setOpenSections((current) => ({ ...current, environment: !current.environment }))}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {ENVIRONMENT_OPTIONS.map((item) => (
                        <SelectableChip key={item.code} label={item.label} active={data.specs.environmentCodes.includes(item.code)} onToggle={() => toggleSpecCode('environmentCodes', item.code)} />
                    ))}
                </div>
            </AccordionGroup>

            <AccordionGroup title="Seguridad y condiciones especiales" description={data.setup.operationType === 'project' ? 'Seguridad del proyecto, control de acceso y notas comerciales para portales.' : 'Seguridad, control de acceso y condiciones de uso del inmueble.'} open={openSections.security} onToggle={() => setOpenSections((current) => ({ ...current, security: !current.security }))}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
                    {SECURITY_OPTIONS.map((item) => (
                        <SelectableChip key={item.code} label={item.label} active={data.specs.securityCodes.includes(item.code)} onToggle={() => toggleSpecCode('securityCodes', item.code)} />
                    ))}
                </div>
                <Field label="Notas adicionales">
                    <textarea className="form-textarea" rows={4} value={data.specs.notes} onChange={(event) => setData((current) => ({ ...current, specs: { ...current.specs, notes: event.target.value } }))} placeholder="Ej: excelente orientación térmica, remodelación 2024, ideal para renta corta o empresa." />
                </Field>
            </AccordionGroup>
        </section>
    );
}

function SortablePhotoTile({ photo, index, onRemove }: { photo: PanelMediaAsset; index: number; onRemove: (id: string) => void }) {
    const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: photo.id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition: transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)', touchAction: 'none' }}
            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group cursor-move ${photo.isCover ? 'border-[var(--accent)] shadow-md' : 'border-[var(--border)]'} ${isDragging ? 'opacity-30 shadow-none z-50' : ''}`}
            {...attributes}
            {...listeners}
        >
            <img src={photo.previewUrl || photo.dataUrl} alt={`Foto ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
            {index === 0 && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                    <IconStar size={8} fill="currentColor" /> Portada
                </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center font-medium">{index + 1}</div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }} onPointerDown={(e) => e.stopPropagation()} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <IconX size={12} />
            </button>
        </div>
    );
}

function StepMedia(props: { data: WizardData; setData: WizardSetter; errors: Record<string, string> }) {
    const { data, setData, errors } = props;
    const videoInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (files: FileList) => {
        Array.from(files).slice(0, MAX_PHOTOS - data.media.photos.length).forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const newPhoto: PanelMediaAsset = {
                    id: Math.random().toString(36).slice(2),
                    name: file.name,
                    dataUrl,
                    previewUrl: dataUrl,
                    isCover: data.media.photos.length === 0,
                    width: 0, height: 0, sizeBytes: file.size, mimeType: file.type || 'image/jpeg',
                };
                setData((current) => ({ ...current, media: { ...current.media, photos: [...current.media.photos, newPhoto] } }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (id: string) => {
        const newPhotos = data.media.photos.filter((photo) => photo.id !== id);
        if (newPhotos.length > 0 && !newPhotos.some((photo) => photo.isCover)) newPhotos[0].isCover = true;
        setData((current) => ({ ...current, media: { ...current.media, photos: newPhotos } }));
    };

    const handleVideoFile = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setData((current) => ({
            ...current,
            media: {
                ...current.media,
                videoUrl: '',
                discoverVideo: {
                    id: Math.random().toString(36).slice(2),
                    name: file.name,
                    dataUrl: previewUrl,
                    previewUrl,
                    width: 0,
                    height: 0,
                    sizeBytes: file.size,
                    mimeType: file.type || 'video/mp4',
                    durationSeconds: 0,
                },
            },
        }));
    };

    const clearUploadVideo = () => {
        const preview = data.media.discoverVideo?.previewUrl || data.media.discoverVideo?.dataUrl;
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        setData((current) => ({
            ...current,
            media: { ...current.media, discoverVideo: null },
        }));
    };

    const handleExternalVideoUrl = (value: string) => {
        setData((current) => {
            if (value.trim() && current.media.discoverVideo) {
                const preview = current.media.discoverVideo.previewUrl || current.media.discoverVideo.dataUrl;
                if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
            }
            return {
                ...current,
                media: {
                    ...current.media,
                    videoUrl: value,
                    discoverVideo: value.trim() ? null : current.media.discoverVideo,
                },
            };
        });
    };

    const uploadPreview = data.media.discoverVideo?.previewUrl || data.media.discoverVideo?.dataUrl || null;

    return (
        <>
            <SimplePublishMediaScreen
                photos={data.media.photos.map((photo) => ({
                    id: photo.id,
                    previewUrl: photo.previewUrl || photo.dataUrl,
                    isCover: photo.isCover,
                }))}
                maxPhotos={MAX_PHOTOS}
                recommendedPhotos={8}
                photoError={errors['media.photos']}
                onAddFiles={handleFiles}
                onRemovePhoto={removePhoto}
                onReorderPhotos={(photos) => {
                    const reordered = photos.map((photo, index) => {
                        const existing = data.media.photos.find((item) => item.id === photo.id);
                        if (!existing) return null;
                        return { ...existing, isCover: index === 0 };
                    }).filter(Boolean) as PanelMediaAsset[];
                    setData((current) => ({ ...current, media: { ...current.media, photos: reordered } }));
                }}
                videoBlock={(
                    <>
                        <SimplePublishVideoBlock
                            uploadPreviewUrl={uploadPreview}
                            uploadFileName={data.media.discoverVideo?.name ?? null}
                            externalUrl={data.media.videoUrl}
                            error={errors['media.video']}
                            onPickUpload={() => videoInputRef.current?.click()}
                            onClearUpload={clearUploadVideo}
                            onExternalUrlChange={handleExternalVideoUrl}
                        />
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/*"
                            onChange={(event) => handleVideoFile(event.target.files)}
                            className="hidden"
                        />
                    </>
                )}
            />
        </>
    );
}

function StepCommercial(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    estimate: PropertyValuationEstimate | null;
    estimating: boolean;
    valuationSources: PropertyValuationSourceStatus[];
    refreshingSources: boolean;
    valuationRequest: PropertyValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onRefreshValuationSources: () => void | Promise<void>;
    lifecyclePolicy: PublicationLifecyclePolicy;
    compact?: boolean;
}) {
    const { data, setData, errors, estimate, estimating, valuationRequest, onRunValuation, lifecyclePolicy, compact = false } = props;
    const isProject = data.setup.operationType === 'project';

    if (compact) {
        return (
            <section className="space-y-4">
                <h2 className="type-section-title">Precio</h2>
                <PanelCard size="md" className="space-y-4">
                    {isProject ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Precio desde" required error={errors['commercial.price']}>
                                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                                    <input className="form-input" type="number" min={0} value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder="4200" />
                                    <ModernSelect value={data.commercial.currency} onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as Currency } }))} options={CURRENCY_OPTIONS} placeholder="Moneda" ariaLabel="Seleccionar moneda" />
                                </div>
                            </Field>
                            <Field label="Precio hasta">
                                <input className="form-input" type="number" min={0} value={data.commercial.priceTo} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, priceTo: event.target.value } }))} placeholder="5600" />
                            </Field>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Precio" required error={errors['commercial.price']}>
                                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                                    <input className="form-input" type="number" min={0} value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder={data.setup.operationType === 'rent' ? '650000' : '5200'} />
                                    <ModernSelect value={data.commercial.currency} onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as Currency } }))} options={CURRENCY_OPTIONS} placeholder="Moneda" ariaLabel="Seleccionar moneda" />
                                </div>
                            </Field>
                            <Field label="Disponible desde">
                                <input className="form-input" type="date" value={data.commercial.availableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, availableFrom: event.target.value } }))} />
                            </Field>
                        </div>
                    )}
                    {!isProject ? (
                        <ToggleCard title="Precio negociable" description="Indica si el valor es conversable." active={data.commercial.negotiable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))} />
                    ) : null}
                </PanelCard>
                <PanelNotice tone="neutral">{lifecyclePolicy.notice}</PanelNotice>
            </section>
        );
    }

    return (
        <section className={compact ? 'space-y-4' : 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'}>
            <div className="space-y-4">
                <h2 className="type-section-title">{isProject ? 'Precio y proyecto' : 'Precio y publicación'}</h2>
                <PanelNotice tone="neutral">
                    {lifecyclePolicy.notice}
                </PanelNotice>
                <AccordionGroup title={isProject ? 'Precio y disponibilidad del proyecto' : 'Precio y disponibilidad'} description={isProject ? 'Rango comercial del proyecto, moneda y fecha desde la que se puede comercializar.' : 'Valor de publicación, gastos comunes y fecha de disponibilidad real del inmueble.'} open={true} onToggle={() => {}}>
                    {isProject ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <Field label="Precio desde" required error={errors['commercial.price']}>
                                    <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                                        <input className="form-input" type="number" min={0} value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder="4200" />
                                        <ModernSelect value={data.commercial.currency} onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as Currency } }))} options={CURRENCY_OPTIONS} placeholder="Moneda" ariaLabel="Seleccionar moneda" />
                                    </div>
                                </Field>
                                <Field label="Precio hasta">
                                    <input className="form-input" type="number" min={0} value={data.commercial.priceTo} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, priceTo: event.target.value } }))} placeholder="5600" />
                                </Field>
                                <Field label="Disponible desde">
                                    <input className="form-input" type="date" value={data.commercial.availableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, availableFrom: event.target.value } }))} />
                                </Field>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <Field label="Precio" required error={errors['commercial.price']}>
                                    <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                                        <input className="form-input" type="number" min={0} value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder={data.setup.operationType === 'rent' ? '650000' : '5200'} />
                                        <ModernSelect value={data.commercial.currency} onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as Currency } }))} options={CURRENCY_OPTIONS} placeholder="Moneda" ariaLabel="Seleccionar moneda" />
                                    </div>
                                </Field>
                                <Field label="Disponible desde">
                                    <input className="form-input" type="date" value={data.commercial.availableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, availableFrom: event.target.value } }))} />
                                </Field>
                                <Field label="Tipo de gastos comunes (si aplica)">
                                    <ModernSelect value={data.commercial.commonExpenseType} onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, commonExpenseType: value } }))} options={COMMON_EXPENSE_TYPE_OPTIONS} placeholder="Seleccionar" ariaLabel="Seleccionar tipo de gastos comunes" />
                                </Field>
                                <Field label="Gastos comunes (si aplica)">
                                    <input className="form-input" type="number" min={0} value={data.commercial.commonExpenses} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, commonExpenses: event.target.value } }))} placeholder="150000" />
                                </Field>
                            </div>
                        </>
                    )}
                </AccordionGroup>

                {!isProject ? (
                    <AccordionGroup title="Condiciones comerciales" description="Opciones útiles para cerrar mejor el aviso, sin mezclar promoción." open={true} onToggle={() => {}}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <ToggleCard title="Precio negociable" description="Deja claro si hay espacio para conversar el valor." active={data.commercial.negotiable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))} />
                        </div>
                    </AccordionGroup>
                ) : null}
            </div>

            {!compact ? (
            <div className="space-y-4">
                <PanelCard tone="subtle" size="md">
                    <div className="flex items-start gap-3">
                        <span className="h-10 w-10 rounded-2xl inline-flex items-center justify-center bg-(--bg-muted) text-(--fg)">
                            <IconCalculator size={18} />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold">Tasador online</h3>
                            <p className="text-sm mt-1 text-(--fg-secondary)">
                                {data.setup.operationType === 'project'
                                    ? 'Disponible para venta y arriendo. En proyectos todavía publicas sin tasación automática.'
                                    : 'Referencia de mercado para venta o arriendo con comparables, tendencia y confianza del modelo.'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        <PanelButton type="button" variant="primary" className="w-full" onClick={() => void onRunValuation()} disabled={estimating || !valuationRequest || data.setup.operationType === 'project'}>
                            {estimating ? 'Calculando estimación...' : 'Calcular estimación'}
                        </PanelButton>
                        {data.setup.operationType === 'project' ? (
                            <PanelNotice tone="neutral">La operación Proyecto ya se puede publicar. El tasador se mantiene solo para venta y arriendo.</PanelNotice>
                        ) : !valuationRequest ? <PanelNotice tone="neutral">Completa tipología, superficie total y ubicación para habilitar el tasador.</PanelNotice> : !estimate ? <PanelNotice tone="neutral">Obtén una referencia de precio, rango y confianza antes de publicar el aviso.</PanelNotice> : null}
                    </div>
                    {estimate ? (
                        <div className="mt-4 space-y-3">
                            <PanelSummaryCard
                                eyebrow="Resultado"
                                title={formatAmount(estimate.estimatedPrice, estimate.currency as Currency)}
                                rows={[
                                    { label: 'Rango bajo', value: formatAmount(estimate.minPrice, estimate.currency as Currency) },
                                    { label: 'Rango alto', value: formatAmount(estimate.maxPrice, estimate.currency as Currency) },
                                    { label: 'Confianza', value: `${estimate.confidenceScore}%` },
                                    { label: 'Precio por m²', value: estimate.estimatedPricePerM2 != null ? formatAmount(Math.round(estimate.estimatedPricePerM2), estimate.currency as Currency) : 'Sin dato' },
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
                                                <span className="font-medium">{formatAmount(point.medianPrice, estimate.currency as Currency)}</span>
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
                </PanelCard>
            </div>
            ) : null}
        </section>
    );
}

function StepDetails(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    operatorHint?: string | null;
    operatorContext?: PropiedadesOperatorPublishContext | null;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    communes: Array<{ id: string; name: string }>;
    estimate: PropertyValuationEstimate | null;
    estimating: boolean;
    valuationSources: PropertyValuationSourceStatus[];
    refreshingSources: boolean;
    valuationRequest: PropertyValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onRefreshValuationSources: () => void | Promise<void>;
    lifecyclePolicy: PublicationLifecyclePolicy;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
}) {
    const { data, setData, errors, operatorHint, operatorContext, lifecyclePolicy, addressBook, addressBookLoading, communes, onGeocodeLocation, geocoding, ...commercialProps } = props;
    return (
        <div className="space-y-6">
            <StepSetup data={data} setData={setData} errors={errors} operatorHint={operatorHint} operatorContext={operatorContext} />
            <StepBasic
                data={data}
                setData={setData}
                errors={errors}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                communes={communes}
                onGeocodeLocation={onGeocodeLocation}
                geocoding={geocoding}
                variant="details"
                showRentAdminFields={operatorContext?.showRentAdminFields ?? false}
            />
            <StepCommercial
                data={data}
                setData={setData}
                errors={errors}
                lifecyclePolicy={lifecyclePolicy}
                compact
                {...commercialProps}
            />
        </div>
    );
}

function StepPublish(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    communes: Array<{ id: string; name: string }>;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
    lifecyclePolicy: PublicationLifecyclePolicy;
}) {
    const {
        data,
        setData,
        errors,
        addressBook,
        addressBookLoading,
        communes,
        onGeocodeLocation,
        geocoding,
        lifecyclePolicy,
    } = props;

    const propertyCopyInput = {
        operationType: data.setup.operationType,
        propertyType: data.setup.propertyType,
        rooms: data.basic.rooms,
        bathrooms: data.basic.bathrooms,
        totalArea: data.basic.totalArea,
        usableArea: data.basic.usableArea,
        communeName: data.location.communeName || communes.find((item) => item.id === data.location.communeId)?.name,
        regionName: data.location.regionName,
        priceLabel: buildPriceLabel(data),
        condition: data.basic.condition,
        projectName: data.project.projectName,
        developerName: data.project.developerName,
        platformName: 'SimplePropiedades',
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="type-section-title">Revisa y publica</h2>
                <p className="text-sm text-(--fg-secondary)">
                    Confirma título, descripción y ubicación. Simple es tu canal principal; después podrás compartir donde tengas integraciones activas.
                </p>
            </div>

            <MarketplaceListingCopyFields
                title={data.basic.title}
                description={data.basic.description}
                titleError={errors['basic.title']}
                descriptionError={errors['basic.description']}
                onTitleChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, title: value } }))}
                onDescriptionChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, description: value } }))}
                onRegenerateTitle={() => setData((current) => ({
                    ...current,
                    basic: { ...current.basic, title: generatePropertyListingTitle(propertyCopyInput) },
                }))}
                onRegenerateDescription={() => setData((current) => ({
                    ...current,
                    basic: { ...current.basic, description: generatePropertyListingDescription(propertyCopyInput) },
                }))}
                titlePlaceholder="Ej: Departamento 3D+2B en Providencia"
                descriptionPlaceholder="Describe distribución, entorno y ventajas del inmueble."
            />

            <StepBasic
                data={data}
                setData={setData}
                errors={errors}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                communes={communes}
                onGeocodeLocation={onGeocodeLocation}
                geocoding={geocoding}
                variant="location"
            />

            <StepReview
                data={data}
                errors={errors}
                setData={setData}
                lifecyclePolicy={lifecyclePolicy}
            />
        </div>
    );
}

function StepReview(props: { data: WizardData; errors: Record<string, string>; setData: WizardSetter; lifecyclePolicy: PublicationLifecyclePolicy }) {
    const { data, errors, setData, lifecyclePolicy } = props;

    return (
        <section className="space-y-5">
            <ListingLivePreview data={data} />

            <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3 prop-terms-box ${errors['review.acceptTerms'] ? 'prop-terms-box--error' : ''}`}>
                <input type="checkbox" checked={data.review.acceptTerms} onChange={(event) => setData((current) => ({ ...current, review: { ...current.review, acceptTerms: event.target.checked } }))} className="mt-1" />
                <span className="text-sm text-(--fg-secondary)">
                    Confirmo que la información puede publicarse en {lifecyclePolicy.summaryLabel ? lifecyclePolicy.summaryLabel.toLowerCase() : 'SimplePropiedades'}.
                </span>
            </label>
            {errors['review.acceptTerms'] ? <p className="text-xs prop-field-error-text">{errors['review.acceptTerms']}</p> : null}
        </section>
    );
}

function StepSuccess(props: { published: PublishedListing; onReset: () => void }) {
    const { published, onReset } = props;
    const [copied, setCopied] = useState(false);
    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${published.href}`
        : published.href;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    const shareListing = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: published.title,
                    text: `Mira esta propiedad publicada en SimplePropiedades: ${published.title}`,
                    url: publicUrl,
                });
                return;
            } catch {
                // El usuario puede cancelar el share nativo.
            }
        }
        await copyLink();
    };

    return (
        <div className="container-app panel-page max-w-5xl py-4 lg:py-8">
            <PanelCard size="lg" className="prop-success-card">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center">
                    <div className="space-y-5">
                        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold prop-media-pill">
                            <IconCircleCheck size={15} />
                            Publicación lista
                        </span>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-(--fg)">
                                Tu propiedad ya está publicada
                            </h1>
                            <p className="mt-2 max-w-xl text-sm text-(--fg-secondary)">
                                Ahora compártela con interesados o en tus redes. Mientras más rápido la muevas, más rápido llegan consultas.
                            </p>
                        </div>
                        <div className="rounded-2xl border p-3 prop-success-link">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--fg-muted)">Link público</p>
                            <p className="mt-1 truncate text-sm font-medium text-(--fg)">{publicUrl}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <PanelButton type="button" variant="primary" onClick={() => window.open(published.href, '_blank', 'noopener,noreferrer')}>
                                <IconExternalLink size={15} />
                                Ver publicación
                            </PanelButton>
                            <PanelButton type="button" variant="secondary" onClick={() => void shareListing()}>
                                <IconShare3 size={15} />
                                Compartir
                            </PanelButton>
                            <PanelButton type="button" variant="secondary" onClick={() => void copyLink()}>
                                <IconCopy size={15} />
                                {copied ? 'Copiado' : 'Copiar link'}
                            </PanelButton>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <PanelButton type="button" variant="secondary" onClick={onReset}>
                                Publicar otra
                            </PanelButton>
                            <PanelButton type="button" variant="secondary" onClick={() => window.location.href = '/panel/publicaciones'}>
                                Ir a publicaciones
                            </PanelButton>
                        </div>
                    </div>
                    <div className="rounded-[28px] border p-4 prop-media-hero">
                        <p className="text-sm font-semibold text-(--fg)">Siguiente paso</p>
                        <div className="mt-4 space-y-3">
                            {['Responder consultas desde el panel', 'Compartir el link por WhatsApp', 'Activar boost si quieres más visibilidad'].map((item) => (
                                <div key={item} className="flex items-center gap-3 rounded-2xl border p-3 prop-media-mini-card">
                                    <IconCheck size={16} />
                                    <span className="text-sm font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PanelCard>
        </div>
    );
}

export default function PublishWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { requireAuth, refreshSession } = useAuth();
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    const planLimit = useMarketplacePublishPlanLimit('propiedades');
    const publishBlocked = isMarketplacePublishBlockedByPlan(planLimit, isEditing);
    const { hint: operatorHint, defaults: operatorDefaults, context: operatorContext, ready: operatorDefaultsReady } = useMarketplaceOperatorPublishDefaults('propiedades', { enabled: !isEditing });
    const [editingLoading, setEditingLoading] = useState(false);
    const [editLoadFailed, setEditLoadFailed] = useState(false);
    const [step, setStep] = useState<StepId>('media');
    const [data, setData] = useState<WizardData>(() => createDefaultData());
    const [operatorDefaultsApplied, setOperatorDefaultsApplied] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [, setLastSavedAt] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [draftSavedNote, setDraftSavedNote] = useState<string | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState<PublishedListing | null>(null);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [estimate, setEstimate] = useState<PropertyValuationEstimate | null>(null);
    const [valuationSources, setValuationSources] = useState<PropertyValuationSourceStatus[]>([]);
    const [refreshingSources, setRefreshingSources] = useState(false);
    const dataRef = useRef<WizardData>(data);
    const estimateRef = useRef<PropertyValuationEstimate | null>(estimate);
    const stepIndex = STEPS.findIndex((item) => item.id === step);
    const score = qualityScore(data, estimate);
    const lifecyclePolicy = useMemo(() => getPublicationLifecyclePolicy('simplepropiedades', data.setup.operationType), [data.setup.operationType]);
    const communes = useMemo(() => getCommunesForRegion(data.location.regionId || ''), [data.location.regionId]);
    const valuationRequest = useMemo(() => buildValuationRequest(data), [data]);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        estimateRef.current = estimate;
    }, [estimate]);

    useEffect(() => {
        if (!operatorDefaultsReady || operatorDefaultsApplied || isEditing || draftLoaded || !operatorDefaults?.propiedades) return;
        const operationType = operatorDefaults.propiedades.operationType;
        setData((current) => ({
            ...current,
            setup: { ...current.setup, operationType },
            commercial: { ...current.commercial, currency: getDefaultCurrencyForOperation(operationType) },
        }));
        setOperatorDefaultsApplied(true);
    }, [operatorDefaultsReady, operatorDefaults, operatorDefaultsApplied, isEditing, draftLoaded]);

    useEffect(() => {
        if (!operatorDefaultsReady || isEditing || draftLoaded) return;
        const prefill = operatorContext && 'prefillDeveloperName' in operatorContext
            ? operatorContext.prefillDeveloperName
            : null;
        if (!prefill) return;
        setData((current) => {
            if (current.setup.operationType !== 'project') return current;
            if (current.project.developerName.trim()) return current;
            return {
                ...current,
                project: { ...current.project, developerName: prefill },
            };
        });
    }, [operatorDefaultsReady, operatorContext, isEditing, draftLoaded]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const result = await fetchAddressBook();
            if (!mounted) return;
            setAddressBook(result.items);
            setAddressBookLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const result = await fetchPropertyValuationSources();
            if (!mounted) return;
            if (result.ok) setValuationSources(result.sources);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (isEditing) return;
        let active = true;

        const loadDraft = async () => {
            const result = await fetchPanelListingDraft('propiedades');
            if (!active) return;
            if (result.ok && result.draft) {
                const merged = mergeDraft(result.draft);
                if (!merged) {
                    setStorageError('El borrador guardado está dañado y no se pudo restaurar.');
                    return;
                }
                const persisted = result.draft as Partial<PersistedDraft>;
                setDraftLoaded(true);
                setData(merged.data);
                setEstimate(merged.valuationEstimate);
                setLastSavedAt(typeof persisted.savedAt === 'string' ? persisted.savedAt : null);
                setDraftSavedNote(
                    merged.data.media.photos.length > 0
                        ? 'Borrador restaurado. Si alguna foto no muestra preview, súbela nuevamente.'
                        : 'Borrador restaurado.'
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
    }, [isEditing]);

    useEffect(() => {
        if (!editingId) return;
        let mounted = true;
        setEditingLoading(true);
        setEditLoadFailed(false);
        setMessage(null);
        (async () => {
            const result = await fetchPanelListingDetail(editingId);
            if (!mounted) return;
            setEditingLoading(false);
            if (!result.ok || !result.item) {
                setEditLoadFailed(true);
                if (result.unauthorized) {
                    requireAuth(() => {
                        router.refresh();
                    });
                    return;
                }
                setMessage(result.error || 'No se pudo cargar la publicación para editar.');
                return;
            }
            const hydrated = buildEditPayload(result.item);
            setData(hydrated.data);
            setEstimate(hydrated.valuationEstimate);
            setDraftSavedNote('Editando publicación existente.');
        })();
        return () => {
            mounted = false;
        };
    }, [editingId, requireAuth, router]);

    useEffect(() => {
        if (!draftSavedNote) return;
        const timer = window.setTimeout(() => setDraftSavedNote(null), 2400);
        return () => window.clearTimeout(timer);
    }, [draftSavedNote]);

    useEffect(() => {
        if (step !== 'publish') return;
        if (data.basic.title.trim() && data.basic.description.trim()) return;
        const copyInput = {
            operationType: data.setup.operationType,
            propertyType: data.setup.propertyType,
            rooms: data.basic.rooms,
            bathrooms: data.basic.bathrooms,
            totalArea: data.basic.totalArea,
            usableArea: data.basic.usableArea,
            communeName: data.location.communeName,
            regionName: data.location.regionName,
            priceLabel: buildPriceLabel(data),
            condition: data.basic.condition,
            projectName: data.project.projectName,
            developerName: data.project.developerName,
            platformName: 'SimplePropiedades',
        };
        setData((current) => ({
            ...current,
            basic: {
                ...current.basic,
                title: current.basic.title.trim() || generatePropertyListingTitle(copyInput),
                description: current.basic.description.trim() || generatePropertyListingDescription(copyInput),
            },
        }));
    }, [step]);

    useEffect(() => {
        setErrors(validateStep(step, data));
    }, [step, data]);

    useEffect(() => {
        const nextSlug = slugify(data.basic.title);
        if (!nextSlug || data.commercial.slug.trim()) return;
        setData((current) => ({
            ...current,
            commercial: {
                ...current.commercial,
                slug: nextSlug,
            },
        }));
    }, [data.basic.title, data.commercial.slug]);

    const saveDraft = async (manual: boolean) => {
        const serialized = serializeDraft(dataRef.current, estimateRef.current);
        const result = await savePanelListingDraft('propiedades', serialized);
        if (!result.ok) {
            if (result.unauthorized) {
                requireAuth();
            }
            setStorageError(result.error || 'No se pudo guardar el borrador.');
            return;
        }
        setLastSavedAt(serialized.savedAt);
        setStorageError(null);
        if (manual) setDraftSavedNote('Borrador guardado');
    };

    const goNext = () => {
        const nextErrors = validateStep(step, data);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        if (stepIndex < STEPS.length - 1) {
            void saveDraft(false);
            setStep(STEPS[stepIndex + 1].id);
        }
    };

    const goBack = () => {
        if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id);
    };

    const refreshLocationMap = async () => {
        setGeocoding(true);
        const result = await geocodeListingLocation(data.location);
        setGeocoding(false);
        if (!result.ok || !result.location) {
            setMessage(result.error || 'No pudimos actualizar la ubicación.');
            return;
        }
        setData((current) => ({ ...current, location: result.location! }));
        setMessage(result.provider === 'external'
            ? 'Ubicación verificada en el mapa.'
            : (result.error || 'No pudimos confirmar automáticamente el punto exacto. Revisa la dirección en Google Maps.'));
    };

    const runValuation = async () => {
        if (!valuationRequest) {
            setMessage('Completa tipología, superficie y ubicación para usar el tasador.');
            return;
        }
        setEstimating(true);
        setMessage(null);
        const result = await estimatePropertyValue(valuationRequest);
        setEstimating(false);
        if (!result.ok || !result.estimate) {
            setMessage(result.error || 'No se pudo calcular la estimación.');
            return;
        }
        setEstimate(result.estimate);
        setMessage('Estimación calculada correctamente.');
    };

    const refreshValuationConnectors = async () => {
        setRefreshingSources(true);
        const result = await refreshPropertyValuationSources();
        setRefreshingSources(false);
        if (!result.ok) {
            setMessage(result.error || 'No se pudieron actualizar las fuentes.');
            return;
        }
        setValuationSources(result.sources);
        setMessage(result.totalRecords != null
            ? `Fuentes actualizadas. ${result.totalRecords} registros consolidados.`
            : 'Fuentes actualizadas correctamente.');
    };

    const publishNow = async () => {
        if (publishBlocked) {
            setMessage('Alcanzaste el límite de avisos de tu plan. Mejora tu plan para publicar más.');
            return;
        }

        for (const stepItem of STEPS) {
            const stepErrors = validateStep(stepItem.id, data);
            if (Object.keys(stepErrors).length > 0) {
                setStep(stepItem.id);
                setErrors(stepErrors);
                setMessage('Faltan campos por completar antes de publicar.');
                return;
            }
        }

        const activeUser = await refreshSession();
        if (!activeUser) {
            const granted = requireAuth(() => {
                void publishNow();
            });
            if (!granted) {
                setMessage('Inicia sesión para publicar en tu cuenta real.');
                return;
            }
            return;
        }

        const { regionName, communeName } = resolveLocationNames(data.location.regionId, data.location.communeId);
        const normalizedLocation = patchListingLocation(data.location, {
            regionName: regionName || data.location.regionName,
            communeName: communeName || data.location.communeName,
        });
        const locationLabel = normalizedLocation.publicLabel
            || normalizedLocation.addressLine1?.trim()
            || [normalizedLocation.neighborhood, communeName || data.location.communeId, regionName || data.location.regionId].filter(Boolean).join(', ');

        setPublishing(true);
        setMessage(null);

        try {
        // Subir media a Cloudflare R2 si aún está en base64
        const uploadedPhotos: PanelMediaAsset[] = [];
        for (const photo of data.media.photos) {
            if (photo.dataUrl.startsWith('data:')) {
                try {
                    const blob = await fetch(photo.dataUrl).then((r) => r.blob());
                    const file = new File([blob], photo.name, { type: photo.mimeType });
                    const result = await uploadMediaFile(file, { fileType: 'image' });
                    if (result.ok && result.result) {
                        const url = result.result.publicUrl || result.result.url;
                        uploadedPhotos.push({
                            ...photo,
                            dataUrl: url,
                            previewUrl: url,
                        });
                        continue;
                    }
                    setMessage(result.error || `No se pudo subir la foto "${photo.name}".`);
                    return;
                } catch (e) {
                    console.error('Failed to upload photo to R2:', e);
                    setMessage(`No se pudo subir la foto "${photo.name}".`);
                    return;
                }
            }
            uploadedPhotos.push(photo);
        }

        const uploadedVideo = data.media.discoverVideo ? { ...data.media.discoverVideo } : null;
        if (uploadedVideo && uploadedVideo.dataUrl.startsWith('data:')) {
            try {
                const blob = await fetch(uploadedVideo.dataUrl).then((r) => r.blob());
                const file = new File([blob], uploadedVideo.name, { type: uploadedVideo.mimeType });
                const result = await uploadMediaFile(file, { fileType: 'video' });
                if (result.ok && result.result) {
                    const url = result.result.publicUrl || result.result.url;
                    uploadedVideo.dataUrl = url;
                    uploadedVideo.previewUrl = url;
                } else {
                    setMessage(result.error || 'No se pudo subir el video.');
                    return;
                }
            } catch (e) {
                console.error('Failed to upload video to R2:', e);
                setMessage('No se pudo subir el video.');
                return;
            }
        }

        const finalData = {
            ...data,
            media: {
                ...data.media,
                photos: uploadedPhotos,
                discoverVideo: uploadedVideo,
                videoUrl: uploadedVideo?.dataUrl ?? data.media.videoUrl.trim(),
            },
        };

        const payload = {
            listingType: data.setup.operationType,
            title: data.basic.title.trim(),
            description: data.basic.description.trim(),
            priceLabel: buildPriceLabel(data),
            location: locationLabel || undefined,
            locationData: normalizedLocation,
            href: data.commercial.slug.trim() ? `/propiedad/${data.commercial.slug.trim()}` : undefined,
            rawData: {
                ...finalData,
                basic: createPropertyBasicForPayload(finalData),
                media: {
                    ...finalData.media,
                    photos: finalData.media.photos,
                },
                location: normalizedLocation,
                valuation: estimate,
                publicationLifecycle: lifecyclePolicy,
            },
        };
        const result = isEditing && editingId
            ? await updatePanelListing(editingId, payload)
            : await createPanelListing({
                vertical: 'propiedades',
                ...payload,
            });

        if (!result.ok) {
            if (result.unauthorized) {
                const granted = requireAuth(() => {
                    void publishNow();
                });
                if (!granted) {
                    setMessage('Tu sesión expiró. Inicia sesión nuevamente para publicar.');
                    return;
                }
            }
            setMessage(result.error || (isEditing ? 'No se pudo guardar la publicación.' : 'No se pudo crear la publicación.'));
            return;
        }

        void deletePanelListingDraft('propiedades');
        setEstimate(null);
        setDraftSavedNote(null);
        setLastSavedAt(null);
        setMessage(null);
        setPublished({
            id: result.item?.id ?? editingId ?? '',
            href: result.item?.href ?? payload.href ?? '/panel/publicaciones',
            title: result.item?.title ?? payload.title,
            hasVideo: listingHasPublishVideo({
                uploadPreviewUrl: data.media.discoverVideo?.dataUrl || data.media.discoverVideo?.previewUrl,
                externalUrl: data.media.videoUrl,
            }),
        });
        } finally {
            setPublishing(false);
        }
    };

    const resetForNewListing = () => {
        setPublished(null);
        setData(createDefaultData());
        setEstimate(null);
        setErrors({});
        setMessage(null);
        setStep('media');
    };

    if (published) {
        return (
            <SimplePublishSuccessScreen
                title={published.title}
                brandName="SimplePropiedades"
                shareHub={(
                    <ShareToSocialPanel
                        listingId={published.id}
                        listingTitle={published.title}
                        listingHref={published.href}
                        hasVideo={published.hasVideo}
                        shareText={`Mira esta propiedad en SimplePropiedades: ${published.title}`}
                    />
                )}
                onReset={resetForNewListing}
                onGoToListings={() => { window.location.href = '/panel/publicaciones'; }}
            />
        );
    }

    const continueLabel = step === 'publish'
        ? (isEditing ? 'Guardar en Simple' : 'Publicar en Simple')
        : 'Continuar';

    return (
        <SimplePublishLayout
            title="Nueva publicación"
            subtitle={isEditing ? 'Actualiza los datos de tu aviso.' : 'Multimedia, detalles y publicación.'}
            steps={STEPS.map((item) => ({ key: item.id, label: item.label, helper: item.helper }))}
            stepIndex={stepIndex}
            isEditing={isEditing}
            onBack={goBack}
            onClose={() => router.push('/panel')}
            onStepChange={(key) => {
                const targetIndex = STEPS.findIndex((item) => item.id === key);
                if (targetIndex <= stepIndex) setStep(key as StepId);
            }}
            headerActions={(
                <PanelButton type="button" variant="ghost" size="sm" onClick={() => void saveDraft(true)} aria-label="Guardar borrador">
                    <IconDeviceFloppy size={16} />
                </PanelButton>
            )}
            headerContinue={{
                label: continueLabel,
                onClick: () => {
                    if (step === 'publish') void publishNow();
                    else goNext();
                },
                disabled: publishing || editingLoading || editLoadFailed || (step === 'publish' && publishBlocked),
                loading: publishing,
            }}
            notices={(
                <>
                    <MarketplacePublishPlanLimitNotice vertical="propiedades" isEditing={isEditing} planLimit={planLimit} />
                    {message ? <MarketplacePublishMessageNotice message={message} /> : null}
                    {storageError ? <PanelNotice tone="error">{storageError}</PanelNotice> : null}
                    {draftSavedNote ? <PanelNotice tone="success">{draftSavedNote}</PanelNotice> : null}
                    {editingLoading ? <PanelNotice tone="neutral">Cargando publicación para editar...</PanelNotice> : null}
                </>
            )}
        >
            <SimplePublishScreenHeader
                title={PROPERTY_STEP_COPY[step].title}
                description={PROPERTY_STEP_COPY[step].description}
            />
            <SimplePublishPageFrame
                preview={<SimplePublishPreviewCard {...buildPropertyPreviewCardProps(data)} />}
            >
                {step === 'media' && <StepMedia data={data} setData={setData} errors={errors} />}
                {step === 'details' && (
                    <StepDetails
                        data={data}
                        setData={setData}
                        errors={errors}
                        operatorHint={operatorHint}
                        operatorContext={operatorContext as PropiedadesOperatorPublishContext}
                        addressBook={addressBook}
                        addressBookLoading={addressBookLoading}
                        communes={communes}
                        onGeocodeLocation={refreshLocationMap}
                        geocoding={geocoding}
                        estimate={estimate}
                        estimating={estimating}
                        valuationSources={valuationSources}
                        refreshingSources={refreshingSources}
                        valuationRequest={valuationRequest}
                        onRunValuation={runValuation}
                        onRefreshValuationSources={refreshValuationConnectors}
                        lifecyclePolicy={lifecyclePolicy}
                    />
                )}
                {step === 'publish' && (
                    <StepPublish
                        data={data}
                        setData={setData}
                        errors={errors}
                        addressBook={addressBook}
                        addressBookLoading={addressBookLoading}
                        communes={communes}
                        onGeocodeLocation={refreshLocationMap}
                        geocoding={geocoding}
                        lifecyclePolicy={lifecyclePolicy}
                    />
                )}
                <SimplePublishCtaCard
                    label={continueLabel}
                    loadingLabel={step === 'publish'
                        ? (isEditing ? 'Guardando...' : 'Publicando...')
                        : undefined}
                    onClick={() => {
                        if (step === 'publish') void publishNow();
                        else goNext();
                    }}
                    disabled={publishing || editingLoading || editLoadFailed || (step === 'publish' && publishBlocked)}
                    loading={publishing}
                    hint={step === 'publish' ? 'Al publicar, tu aviso quedará visible en SimplePropiedades de inmediato.' : undefined}
                    icon={step === 'publish' ? <IconCheck size={18} /> : <IconArrowRight size={18} />}
                />
            </SimplePublishPageFrame>
        </SimplePublishLayout>
    );
}
