'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconArrowRight,
    IconBath,
    IconBed,
    IconBuildingCommunity,
    IconBuildingSkyscraper,
    IconBuildingStore,
    IconCalculator,
    IconCheck,
    IconCircleCheck,
    IconDeviceFloppy,
    IconHome2,
    IconKey,
    IconMapPin,
    IconSparkles,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import ModernSelect from '@/components/ui/modern-select';
import { useAuth } from '@/context/auth-context';
import { uploadMediaFile } from '@/lib/media-upload';
import { getPublicationLifecyclePolicy, type PublicationLifecyclePolicy } from '@simple/config';
import {
    createPanelListing,
    deletePanelListingDraft,
    fetchPanelListingDetail,
    fetchPanelListingDraft,
    type PanelListing,
    savePanelListingDraft,
    updatePanelListing,
} from '@/lib/panel-listings';
import {
    createEmptyListingLocation,
    type AddressBookEntry,
    type ListingLocation,
    patchListingLocation,
    type PropertyValuationEstimate,
    type PropertyValuationRequest,
    type PropertyValuationSourceStatus,
} from '@simple/types';
import {
    estimatePropertyValue,
    fetchAddressBook,
    fetchPropertyValuationSources,
    geocodeListingLocation,
    getCommunesForRegion,
    LOCATION_COMMUNES,
    LOCATION_REGIONS,
    refreshPropertyValuationSources,
    resolveLocationNames,
} from '@simple/utils';
import {
    ListingLocationEditor,
    PanelActions,
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelChoiceCard,
    PanelDocumentUploader,
    PanelMediaUploader,
    PanelNotice,
    PanelStepNav,
    PanelSummaryCard,
    PanelVideoUploader,
    type PanelDocumentAsset,
    type PanelMediaAsset,
    type PanelVideoAsset,
} from '@simple/ui';

type StepId = 'setup' | 'basic' | 'specs' | 'media' | 'commercial' | 'review';
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
const PROPERTY_MEDIA_GUIDE_SLOTS = [
    { key: 'cover', label: 'Portada' },
    { key: 'facade', label: 'Fachada' },
    { key: 'living', label: 'Living' },
    { key: 'kitchen', label: 'Cocina' },
    { key: 'bedroom', label: 'Dormitorio' },
    { key: 'bathroom', label: 'Baño' },
    { key: 'terrace', label: 'Terraza / patio' },
    { key: 'parking', label: 'Estacionamiento' },
    { key: 'view', label: 'Vista / entorno' },
    { key: 'amenities', label: 'Amenities' },
] as const;

const STEPS: Array<{ id: StepId; label: string; helper: string }> = [
    { id: 'setup', label: 'Tipo', helper: 'Operación y tipología' },
    { id: 'basic', label: 'Datos', helper: 'Ficha principal y ubicación' },
    { id: 'specs', label: 'Ant. y equip.', helper: 'Características y amenities' },
    { id: 'media', label: 'Multimedia', helper: 'Fotos y video' },
    { id: 'commercial', label: 'Comercial', helper: 'Precio, contacto y tasación' },
    { id: 'review', label: 'Revisión', helper: 'Validación final' },
];

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
const PROJECT_SALES_STAGE_OPTIONS = ['Lanzamiento', 'Preventa', 'En verde', 'En blanco', 'Últimas unidades', 'Entrega inmediata'].map((value) => ({ value, label: value }));
const PROJECT_DELIVERY_STATUS_OPTIONS = ['Entrega inmediata', 'Entrega este año', 'Entrega futura', 'Por confirmar'].map((value) => ({ value, label: value }));

function isSupportedExternalVideoUrl(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com'
            || host === 'youtu.be'
            || host === 'm.youtube.com'
            || host === 'vimeo.com'
            || host.endsWith('.vimeo.com');
    } catch {
        return false;
    }
}

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

function fixBrokenB2Url(url: string): string {
    if (!url || !url.startsWith('http')) return url;
    if (url.includes('backblazeb2.com')) {
        const bucketName = 'simple-media';
        
        let key = '';
        if (url.includes(`/file/${bucketName}/`)) {
            key = url.split(`/file/${bucketName}/`)[1];
        } else if (url.includes(`backblazeb2.com/${bucketName}/`)) {
            key = url.split(`backblazeb2.com/${bucketName}/`)[1];
        } else {
            const parts = url.split('.backblazeb2.com/');
            if (parts.length === 2) {
                const pathParts = parts[1].split('/');
                if (pathParts[0] === 'file') pathParts.shift();
                if (pathParts[0] === bucketName) pathParts.shift();
                key = pathParts.join('/');
            }
        }

        if (key) {
            return `https://f005.backblazeb2.com/file/${bucketName}/${key}`;
        }
    }
    return url;
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
                        dataUrl: fixBrokenB2Url(typeof (photo as any).dataUrl === 'string' ? (photo as any).dataUrl : (typeof (photo as any).url === 'string' ? (photo as any).url : '')),
                        previewUrl: fixBrokenB2Url(typeof (photo as any).previewUrl === 'string' ? (photo as any).previewUrl : (typeof (photo as any).url === 'string' ? (photo as any).url : '')),
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
                        dataUrl: fixBrokenB2Url(typeof (parsed.data.media.discoverVideo as any).dataUrl === 'string' ? (parsed.data.media.discoverVideo as any).dataUrl : (typeof (parsed.data.media.discoverVideo as any).url === 'string' ? (parsed.data.media.discoverVideo as any).url : '')),
                        previewUrl: fixBrokenB2Url(typeof (parsed.data.media.discoverVideo as any).previewUrl === 'string' ? (parsed.data.media.discoverVideo as any).previewUrl : (typeof (parsed.data.media.discoverVideo as any).url === 'string' ? (parsed.data.media.discoverVideo as any).url : '')),
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

    if (step === 'setup') {
        if (!data.setup.propertyType) errors['setup.propertyType'] = 'Selecciona el tipo de propiedad.';
        if (!data.setup.operationType) errors['setup.operationType'] = 'Selecciona la operación.';
    }

    if (step === 'basic') {
        if (!data.basic.title.trim()) errors['basic.title'] = 'Ingresa un título para la publicación.';
        if (data.basic.description.trim().length < 80) errors['basic.description'] = 'La descripción debe tener al menos 80 caracteres.';
        if (data.setup.operationType === 'project') {
            if (!data.project.projectName.trim()) errors['project.projectName'] = 'Ingresa el nombre del proyecto.';
            if (!data.project.developerName.trim()) errors['project.developerName'] = 'Ingresa la inmobiliaria o desarrollador.';
            if (!data.project.salesStage) errors['project.salesStage'] = 'Selecciona la etapa comercial.';
            if (!data.project.deliveryStatus) errors['project.deliveryStatus'] = 'Selecciona el estado de entrega.';
            if (parseNumber(data.project.availableUnits) == null) errors['project.availableUnits'] = 'Ingresa las unidades disponibles.';
            if (parseNumber(data.project.usableAreaFrom) == null) errors['project.usableAreaFrom'] = 'Ingresa la superficie útil desde.';
            if (data.project.models.length === 0) {
                errors['project.models'] = 'Agrega al menos una tipología del proyecto.';
            } else {
                data.project.models.forEach((model, index) => {
                    if (!model.label.trim()) errors[`project.models.${index}.label`] = 'Nombra la tipología.';
                    if (parseNumber(model.bedrooms) == null) errors[`project.models.${index}.bedrooms`] = 'Indica dormitorios.';
                    if (parseNumber(model.bathrooms) == null) errors[`project.models.${index}.bathrooms`] = 'Indica baños.';
                    if (parseNumber(model.usableAreaFrom) == null) errors[`project.models.${index}.usableAreaFrom`] = 'Indica m² útiles desde.';
                    if (parseNumber(model.priceFrom) == null) errors[`project.models.${index}.priceFrom`] = 'Indica precio desde.';
                });
            }
        } else {
            if (parseNumber(data.basic.totalArea) == null) errors['basic.totalArea'] = 'La superficie total es obligatoria.';
            if (parseNumber(data.basic.usableArea) == null) errors['basic.usableArea'] = 'La superficie útil es obligatoria.';
            if (parseNumber(data.basic.rooms) == null) errors['basic.rooms'] = 'Ingresa la cantidad de dormitorios.';
            if (parseNumber(data.basic.bathrooms) == null) errors['basic.bathrooms'] = 'Ingresa la cantidad de baños.';
            if (parseNumber(data.basic.parkingSpaces) == null) errors['basic.parkingSpaces'] = 'Ingresa la cantidad de estacionamientos.';
            if (parseNumber(data.basic.storageUnits) == null) errors['basic.storageUnits'] = 'Ingresa la cantidad de bodegas.';
            if (!data.basic.petsAllowed) errors['basic.petsAllowed'] = 'Indica si admite mascotas.';
            if (!data.basic.furnished) errors['basic.furnished'] = 'Indica si se publica amoblado.';
        }
        if (!data.location.regionId) errors['location.regionId'] = 'Selecciona la región.';
        if (!data.location.communeId) errors['location.communeId'] = 'Selecciona la comuna.';
        if (!data.location.addressLine1?.trim()) errors['location.addressLine1'] = 'La dirección exacta es obligatoria.';
        if (data.location.sourceMode === 'saved_address' && !data.location.sourceAddressId) errors['location.sourceAddressId'] = 'Selecciona una dirección guardada.';
    }

    if (step === 'media') {
        if (data.media.photos.length < 1) errors['media.photos'] = 'Sube al menos 1 foto.';
        if (data.media.videoUrl.trim() && !isSupportedExternalVideoUrl(data.media.videoUrl.trim())) errors['media.videoUrl'] = 'Usa un enlace externo de YouTube o Vimeo.';
        if (data.media.tour360Url.trim()) {
            try {
                new URL(data.media.tour360Url.trim());
            } catch {
                errors['media.tour360Url'] = 'Usa una URL válida para el tour 360.';
            }
        }
    }

    if (step === 'commercial') {
        if (parseNumber(data.commercial.price) == null) errors['commercial.price'] = 'Ingresa un precio válido.';
    }

    if (step === 'review' && !data.review.acceptTerms) {
        errors['review.acceptTerms'] = 'Debes aceptar los términos antes de publicar.';
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

type WizardSetter = React.Dispatch<React.SetStateAction<WizardData>>;

function ErrorText(props: { text: string }) {
    return <p className="mt-2 text-xs" style={{ color: '#b42318' }}>{props.text}</p>;
}

function Field(props: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>
                {props.label}
                {props.required ? <span style={{ color: '#ef4444' }}> *</span> : null}
            </label>
            {props.children}
            {props.hint ? <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{props.hint}</p> : null}
            {props.error ? <ErrorText text={props.error} /> : null}
        </div>
    );
}

function AccordionGroup(props: { title: string; description?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <section className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={props.onToggle} className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left cursor-pointer">
                <span>
                    <span className="block text-sm font-medium">{props.title}</span>
                    {props.description ? <span className="block text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{props.description}</span> : null}
                </span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
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
            className="rounded-lg border px-3 py-3 text-left"
            style={{
                borderColor: props.active ? 'var(--fg)' : 'var(--border)',
                background: props.active ? 'var(--bg-muted)' : 'transparent',
            }}
        >
            <p className="text-sm font-medium">{props.title}</p>
            {props.description ? (
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                    {props.description}
                </p>
            ) : null}
            <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>{props.active ? 'Activado' : 'Desactivado'}</p>
        </button>
    );
}

function SelectableChip(props: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onToggle}
            className="rounded-2xl border px-3 py-3 text-sm text-left transition-colors"
            style={{
                borderColor: props.active ? 'var(--fg)' : 'var(--border)',
                background: props.active ? 'var(--bg-subtle)' : 'var(--surface)',
                color: 'var(--fg-secondary)',
            }}
        >
            <span className="flex items-center gap-3">
                <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    style={{
                        borderColor: props.active ? 'var(--fg)' : 'var(--border)',
                        background: props.active ? 'var(--fg)' : 'var(--bg-muted)',
                        color: props.active ? 'var(--bg)' : 'var(--fg-muted)',
                    }}
                >
                    {props.active ? <IconCheck size={13} /> : null}
                </span>
                <span className="font-medium" style={{ color: 'var(--fg)' }}>{props.label}</span>
            </span>
        </button>
    );
}

function QualityItem(props: { label: string; ok: boolean }) {
    return (
        <div className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--fg-secondary)' }}>{props.label}</span>
            <span style={{ color: props.ok ? '#16a34a' : 'var(--fg-muted)' }}>
                <IconCircleCheck size={14} />
            </span>
        </div>
    );
}

function StepSetup(props: { data: WizardData; setData: WizardSetter; errors: Record<string, string> }) {
    const { data, setData, errors } = props;

    return (
        <section className="space-y-6">
            <h2 className="type-section-title">Tipo y categoría</h2>
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>
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
                                <span className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                    {card.icon}
                                </span>
                                <span className="text-sm font-medium leading-none">{card.label}</span>
                            </div>
                        </PanelChoiceCard>
                    ))}
                </div>
                {errors['setup.operationType'] ? <ErrorText text={errors['setup.operationType']} /> : null}
            </div>
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>
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
                                <span className="h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                    {option.icon}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{option.label}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Define los campos específicos del inmueble.</p>
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
}) {
    const { data, setData, errors, addressBook, addressBookLoading, communes, onGeocodeLocation, geocoding } = props;
    const [openSections, setOpenSections] = useState<Record<'main' | 'secondary' | 'location', boolean>>({
        main: true,
        secondary: true,
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

    return (
        <section className="space-y-4">
            <h2 className="type-section-title">{isProject ? 'Datos del proyecto' : 'Datos del inmueble'}</h2>

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

            <AccordionGroup
                title={isProject ? 'Identidad y estado del proyecto' : 'Datos principales'}
                description={isProject ? 'Nombre del proyecto, inmobiliaria, etapa, entrega y descripción comercial.' : 'Titular, descripción y atributos obligatorios del inmueble.'}
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
                        <Field label="Descripción" required error={errors['basic.description']}>
                            <textarea className="form-textarea" rows={5} value={data.basic.description} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))} placeholder="Describe el proyecto, sus diferenciales, entorno, conectividad, amenidades y por qué destaca frente a otras alternativas." />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{data.basic.description.length} / 2500</p>
                        </Field>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <Field label="Título" required error={errors['basic.title']} hint="Titular claro con tipología, programa y sector.">
                                <input className="form-input" value={data.basic.title} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))} placeholder="Ej: Departamento 3D+2B con terraza en Providencia" />
                            </Field>
                            <Field label="Condición">
                                <ModernSelect value={data.basic.condition} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))} placeholder="Seleccionar" options={CONDITION_OPTIONS} ariaLabel="Seleccionar condición" />
                            </Field>
                        </div>
                        <Field label="Descripción" required error={errors['basic.description']}>
                            <textarea className="form-textarea" rows={5} value={data.basic.description} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))} placeholder="Distribución, terminaciones, orientación, entorno, conectividad y cualquier ventaja competitiva del inmueble." />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{data.basic.description.length} / 2500</p>
                        </Field>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                            <Field label="Dormitorios" required error={errors['basic.rooms']}><div className="relative"><IconBed size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} /><input className="form-input pl-10" type="number" min={0} value={data.basic.rooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, rooms: event.target.value } }))} placeholder="3" /></div></Field>
                            <Field label="Baños" required error={errors['basic.bathrooms']}><div className="relative"><IconBath size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} /><input className="form-input pl-10" type="number" min={0} value={data.basic.bathrooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, bathrooms: event.target.value } }))} placeholder="2" /></div></Field>
                            <Field label="Superficie total (m²)" required error={errors['basic.totalArea']}><input className="form-input" type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder="92" /></Field>
                            <Field label="Superficie útil (m²)" required error={errors['basic.usableArea']}><input className="form-input" type="number" min={0} value={data.basic.usableArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, usableArea: event.target.value } }))} placeholder="84" /></Field>
                            <Field label="Estacionamientos" required error={errors['basic.parkingSpaces']}><input className="form-input" type="number" min={0} value={data.basic.parkingSpaces} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, parkingSpaces: event.target.value } }))} placeholder="1" /></Field>
                            <Field label="Bodegas" required error={errors['basic.storageUnits']}><input className="form-input" type="number" min={0} value={data.basic.storageUnits} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, storageUnits: event.target.value } }))} placeholder="1" /></Field>
                            <Field label="Admite mascotas" required error={errors['basic.petsAllowed']}>
                                <ModernSelect value={data.basic.petsAllowed} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, petsAllowed: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si admite mascotas" />
                            </Field>
                            <Field label="Amoblado" required error={errors['basic.furnished']}>
                                <ModernSelect value={data.basic.furnished} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, furnished: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si está amoblado" />
                            </Field>
                        </div>
                    </>
                )}
            </AccordionGroup>

            <AccordionGroup
                title={isProject ? 'Tipologías y rangos del proyecto' : 'Características secundarias'}
                description={isProject ? 'Rangos generales del proyecto y detalle por tipología o unidad modelo.' : 'Campos adicionales para alinear la ficha con portales inmobiliarios grandes.'}
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
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
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
                            <div className="hidden xl:grid xl:grid-cols-[minmax(180px,1.3fr)_80px_80px_120px_120px_140px_140px_86px] gap-2 px-3 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>
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
                                    <div key={model.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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

function StepMedia(props: { data: WizardData; setData: WizardSetter; errors: Record<string, string> }) {
    const { data, setData, errors } = props;
    const isProject = data.setup.operationType === 'project';

    return (
        <section className="space-y-4">
            <h2 className="type-section-title">Multimedia</h2>
            <PanelCard tone="surface" size="lg">
                <div className="space-y-4">
                    <PanelMediaUploader
                        items={data.media.photos}
                        onChange={(photos) => setData((current) => ({ ...current, media: { ...current.media, photos } }))}
                        minItems={1}
                        recommendedItems={12}
                        maxItems={MAX_PHOTOS}
                        minWidth={600}
                        minHeight={400}
                        maxWidth={2000}
                        maxHeight={1500}
                        targetBytes={450_000}
                        dropzoneTitle="Fotos"
                        helperText={isProject ? 'Mínimo 1 · Máximo 20 · Fachada, piloto, amenities y entorno.' : 'Mínimo 1 · Máximo 20 · Fachada, interiores y exteriores.'}
                        guidedSlots={PROPERTY_MEDIA_GUIDE_SLOTS}
                        emptyHint="Arrastra o selecciona"
                    />
                    {errors['media.photos'] ? <ErrorText text={errors['media.photos']} /> : null}
                </div>
            </PanelCard>

            <PanelCard tone="surface" size="lg">
                <div className="space-y-5">
                    <PanelBlockHeader
                        title="Video"
                        description="Video externo para el aviso, tour 360 y material promocional para Descubre."
                    />
                    <div className="space-y-4">
                        <Field label="Video del aviso" error={errors['media.videoUrl']}>
                            <input className="form-input" placeholder="https://www.youtube.com/... o https://vimeo.com/..." value={data.media.videoUrl} onChange={(event) => setData((current) => ({ ...current, media: { ...current.media, videoUrl: event.target.value } }))} />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Solo YouTube o Vimeo.</p>
                        </Field>
                        <Field label="Tour 360" error={errors['media.tour360Url']}>
                            <input className="form-input" placeholder="https://..." value={data.media.tour360Url} onChange={(event) => setData((current) => ({ ...current, media: { ...current.media, tour360Url: event.target.value } }))} />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Opcional. Puedes enlazar Matterport, Kuula u otra vista 360 externa.</p>
                        </Field>
                        <PanelVideoUploader
                            asset={data.media.discoverVideo}
                            onChange={(discoverVideo) => setData((current) => ({ ...current, media: { ...current.media, discoverVideo } }))}
                            title="Clip para Descubre"
                            description=""
                            helperText="MP4, WEBM o MOV · hasta 10 MB · 9:16."
                        />
                        <PanelDocumentUploader
                            items={data.media.documents}
                            onChange={(documents) => setData((current) => ({ ...current, media: { ...current.media, documents } }))}
                            title="Documentos y PDF"
                            description={isProject ? 'Brochure, memoria de terminaciones, documentos legales o material comercial del proyecto.' : 'Documentos legales, reglamentos, brochure o antecedentes del inmueble.'}
                        />
                    </div>
                </div>
            </PanelCard>
        </section>
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
}) {
    const { data, setData, errors, estimate, estimating, valuationRequest, onRunValuation, lifecyclePolicy } = props;
    const isProject = data.setup.operationType === 'project';

    return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
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

            <div className="space-y-4">
                <PanelCard tone="subtle" size="md">
                    <div className="flex items-start gap-3">
                        <span className="h-10 w-10 rounded-2xl inline-flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                            <IconCalculator size={18} />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold">Tasador online</h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
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
                                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                                    <p className="text-sm font-semibold">Tendencia del segmento</p>
                                    <div className="space-y-2 mt-3">
                                        {estimate.historicalSeries.map((point) => (
                                            <div key={point.ts} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                                                <span style={{ color: 'var(--fg-secondary)' }}>{formatSeriesLabel(point.ts)}</span>
                                                <div className="h-2 rounded-full" style={{ background: 'rgba(15,23,42,0.08)' }}>
                                                    <div className="h-full rounded-full" style={{ width: `${Math.max(12, Math.min(100, estimate.maxPrice > 0 ? (point.medianPrice / estimate.maxPrice) * 100 : 12))}%`, background: 'var(--fg)' }} />
                                                </div>
                                                <span className="font-medium">{formatAmount(point.medianPrice, estimate.currency as Currency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {estimate.notes.length > 0 ? (
                                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                                    <p className="text-sm font-semibold">Notas del tasador</p>
                                    <div className="space-y-2 mt-3">
                                        {estimate.notes.map((note) => (
                                            <div key={note} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
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
        </section>
    );
}

function StepReview(props: { data: WizardData; estimate: PropertyValuationEstimate | null; score: number; errors: Record<string, string>; setData: WizardSetter; lifecyclePolicy: PublicationLifecyclePolicy }) {
    const { data, estimate, score, errors, setData, lifecyclePolicy } = props;
    const priceNumber = parseNumber(data.commercial.price) ?? 0;
    const featureCount = data.specs.amenityCodes.length + data.specs.serviceCodes.length + data.specs.environmentCodes.length + data.specs.securityCodes.length;
    const isProject = data.setup.operationType === 'project';
    const projectModels = data.project.models.filter((model) => model.label.trim());

    return (
        <section className="space-y-5">
            <h2 className="type-section-title">Revisión final</h2>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                <PanelSummaryCard eyebrow="Resumen" title={isProject ? (data.project.projectName || data.basic.title || 'Sin nombre') : (data.basic.title || 'Sin título')} rows={isProject ? [
                    { label: 'Tipo', value: `${data.setup.propertyType || 'Pendiente'} · Proyecto` },
                    { label: 'Proyecto', value: `${projectModels.length} tipologías · ${data.project.availableUnits || '0'} unidades disponibles` },
                    { label: 'Precio', value: buildPriceLabel(data) },
                ] : [{ label: 'Tipo', value: `${data.setup.propertyType || 'Pendiente'} · ${getOperationLabel(data.setup.operationType)}` }, { label: 'Programa', value: `${data.basic.rooms || '0'}D · ${data.basic.bathrooms || '0'}B · ${data.basic.totalArea || '0'} m²` }, { label: 'Precio', value: formatAmount(priceNumber, data.commercial.currency) }]} />
                <PanelSummaryCard eyebrow="Ubicación" title={data.location.publicLabel || 'Pendiente'} rows={[{ label: 'Dirección interna', value: data.location.addressLine1 || 'Pendiente' }, { label: 'Visibilidad pública', value: data.location.visibilityMode === 'exact' ? 'Exacta' : data.location.visibilityMode === 'approximate' ? 'Aproximada' : data.location.visibilityMode === 'sector_only' ? 'Solo sector' : 'Solo comuna' }, { label: 'Fotos cargadas', value: data.media.photos.length }]} />
                <PanelSummaryCard eyebrow="Calidad del aviso" title={`${score}% completado`} rows={isProject ? [{ label: 'Amenities y servicios', value: featureCount }, { label: 'Entrega', value: data.project.deliveryStatus || 'Pendiente' }, { label: 'Tipologías', value: projectModels.length > 0 ? String(projectModels.length) : 'Pendiente' }] : [{ label: 'Amenities y servicios', value: featureCount }, { label: 'Tasador', value: estimate ? 'Calculado' : 'Pendiente' }, { label: 'Precio', value: data.commercial.price.trim() ? 'Listo' : 'Pendiente' }]} />
                <PanelSummaryCard eyebrow="Vigencia" title="Activo por defecto" rows={[{ label: 'Revisión', value: lifecyclePolicy.summaryLabel }, { label: 'Si no se renueva', value: 'Requiere renovación' }, { label: 'Estado inicial', value: 'Activo' }]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                <QualityItem label={isProject ? 'Ficha del proyecto completa' : 'Datos principales completos'} ok={!!data.basic.title.trim() && data.basic.description.trim().length >= 80 && (!isProject || (!!data.project.projectName.trim() && !!data.project.developerName.trim()))} />
                <QualityItem label="Ubicación lista para publicar" ok={!!data.location.regionId && !!data.location.communeId && !!data.location.addressLine1} />
                <QualityItem label="Fotos suficientes" ok={data.media.photos.length >= 5} />
                <QualityItem label="Precio configurado" ok={!!data.commercial.price.trim()} />
                <QualityItem label={isProject ? 'Tipologías y rangos' : 'Características secundarias'} ok={isProject ? projectModels.length > 0 : countPropertyAttributes(data) >= 4} />
                <QualityItem label={isProject ? 'Tasador no requerido' : 'Tasador ejecutado'} ok={isProject ? true : !!estimate} />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: errors['review.acceptTerms'] ? '#b42318' : 'var(--border)', background: 'var(--bg)' }}>
                <input type="checkbox" checked={data.review.acceptTerms} onChange={(event) => setData((current) => ({ ...current, review: { ...current.review, acceptTerms: event.target.checked } }))} className="mt-1" />
                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                    Confirmo que la información del inmueble, su ubicación y sus condiciones comerciales fueron revisadas y pueden publicarse en Simple y futuros portales integrados.
                </span>
            </label>
            {errors['review.acceptTerms'] ? <p className="text-xs" style={{ color: '#b42318' }}>{errors['review.acceptTerms']}</p> : null}
        </section>
    );
}

export default function PublishWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { requireAuth, refreshSession } = useAuth();
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    const [editingLoading, setEditingLoading] = useState(false);
    const [step, setStep] = useState<StepId>('setup');
    const [data, setData] = useState<WizardData>(() => createDefaultData());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [, setLastSavedAt] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [draftSavedNote, setDraftSavedNote] = useState<string | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
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
    const currentStep = STEPS[stepIndex] || STEPS[0];
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
                if (!merged) return;
                const persisted = result.draft as Partial<PersistedDraft>;
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
        setMessage(null);
        (async () => {
            const result = await fetchPanelListingDetail(editingId);
            if (!mounted) return;
            setEditingLoading(false);
            if (!result.ok || !result.item) {
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

        // Upload media to B2 if they are still base64
        const uploadedPhotos: PanelMediaAsset[] = [];
        for (const photo of data.media.photos) {
            if (photo.dataUrl.startsWith('data:')) {
                try {
                    const blob = await fetch(photo.dataUrl).then((r) => r.blob());
                    const file = new File([blob], photo.name, { type: photo.mimeType });
                    const result = await uploadMediaFile(file, { fileType: 'image' });
                    if (result.ok && result.result) {
                        uploadedPhotos.push({
                            ...photo,
                            dataUrl: result.result.url,
                            previewUrl: result.result.url,
                        });
                        continue;
                    }
                } catch (e) {
                    console.error('Failed to upload photo to B2:', e);
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
                    uploadedVideo.dataUrl = result.result.url;
                    uploadedVideo.previewUrl = result.result.url;
                }
            } catch (e) {
                console.error('Failed to upload video to B2:', e);
            }
        }

        const finalData = {
            ...data,
            media: {
                ...data.media,
                photos: uploadedPhotos,
                discoverVideo: uploadedVideo,
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
        setPublishing(false);

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
        setMessage(isEditing ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.');
        router.push('/panel/publicaciones');
    };

    return (
        <div className="container-app panel-page max-w-6xl py-8">
            <PanelSectionHeader
                title={isEditing ? 'Editar propiedad' : 'Publicar propiedad'}
                description={`Paso ${stepIndex + 1} de ${STEPS.length}`}
                actions={(
                    <div className="flex items-center gap-2">
                        {draftSavedNote ? (
                            <span className="rounded-lg border px-2.5 h-9 inline-flex items-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                                {draftSavedNote}
                            </span>
                        ) : null}
                        <PanelButton type="button" variant="secondary" size="sm" onClick={() => void saveDraft(true)}>
                            <IconDeviceFloppy size={14} />
                            Guardar borrador
                        </PanelButton>
                    </div>
                )}
            />

            {message ? <PanelNotice className="mb-4">{message}</PanelNotice> : null}
            {storageError ? <PanelNotice tone="error" className="mb-3">{storageError}</PanelNotice> : null}
            {editingLoading ? <PanelNotice tone="neutral" className="mb-4">Cargando publicación para editar...</PanelNotice> : null}

            <PanelCard className="mb-6" size="md">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>
                                Publicación guiada
                            </p>
                            <h2 className="text-xl font-semibold mt-1" style={{ color: 'var(--fg)' }}>
                                {currentStep.label}
                            </h2>
                            <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                {currentStep.helper}
                            </p>
                        </div>
                        <div className="w-full md:max-w-xs">
                            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                                <span>Progreso</span>
                                <span>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%`, background: 'var(--fg)' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--bg) 78%, transparent)' }}>
                        <PanelStepNav
                            items={STEPS.map((item, index) => ({
                                key: item.id,
                                label: item.label,
                                disabled: index > stepIndex,
                                done: index < stepIndex,
                            }))}
                            activeKey={step}
                            onChange={(key) => setStep(key as StepId)}
                            ariaLabel="Pasos de publicación"
                            labelBreakpoint="always"
                        />
                    </div>
                </div>
            </PanelCard>

            <PanelCard size="lg">
                <div className="animate-scale-in">
                    {step === 'setup' && <StepSetup data={data} setData={setData} errors={errors} />}
                    {step === 'basic' && (
                        <StepBasic
                            data={data}
                            setData={setData}
                            errors={errors}
                            addressBook={addressBook}
                            addressBookLoading={addressBookLoading}
                            communes={communes}
                            onGeocodeLocation={refreshLocationMap}
                            geocoding={geocoding}
                        />
                    )}
                    {step === 'specs' && <StepSpecs data={data} setData={setData} />}
                    {step === 'media' && <StepMedia data={data} setData={setData} errors={errors} />}
                    {step === 'commercial' && (
                        <StepCommercial
                            data={data}
                            setData={setData}
                            errors={errors}
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
                    {step === 'review' && <StepReview data={data} estimate={estimate} score={score} errors={errors} setData={setData} lifecyclePolicy={lifecyclePolicy} />}
                </div>
            </PanelCard>

            <PanelActions
                left={(
                    <PanelButton type="button" variant="secondary" onClick={goBack} disabled={stepIndex === 0}>
                        <IconArrowLeft size={14} />
                        Anterior
                    </PanelButton>
                )}
                right={step === 'review' ? (
                    <>
                        <PanelButton type="button" variant="secondary" onClick={() => void saveDraft(true)}>
                            <IconDeviceFloppy size={14} />
                            Guardar borrador
                        </PanelButton>
                        <PanelButton type="button" variant="primary" onClick={() => void publishNow()} disabled={publishing || editingLoading}>
                            <IconCheck size={14} />
                            {publishing ? (isEditing ? 'Guardando...' : 'Publicando...') : (isEditing ? 'Guardar cambios' : 'Publicar')}
                        </PanelButton>
                    </>
                ) : (
                    <PanelButton type="button" variant="primary" onClick={goNext}>
                        Siguiente
                        <IconArrowRight size={14} />
                    </PanelButton>
                )}
            />
        </div>
    );
}
