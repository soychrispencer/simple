'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
    IconBox,
    IconCalculator,
    IconCamera,
    IconCheck,
    IconCircleCheck,
    IconCopy,
    IconExternalLink,
    IconHome2,
    IconKey,
    IconMapPin,
    IconParking,
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
import { SimplePublishLayout, SimplePublishCtaCard, SimplePublishSuccessScreen, SimplePublishPageFrame, SimplePublishScreenHeader, SimplePublishPreviewCard, SimplePublishMediaScreen, SimplePublishVideoBlock, SimplePublishMediaUploadNotice, SimplePublishSection, SimplePublishOptionalSection, SimplePublishField, SimplePublishPriceBlock, resolveOfferPriceValue, type SimplePublishPreviewCardProps } from '@simple/ui/simple-publish';
import { ShareToSocialPanel } from '@/components/panel/share-to-social-panel';
import { generatePropertyListingDescription, generatePropertyListingTitle, isSupportedExternalVideoUrl, listingHasPublishVideo, validatePublishVideoFile, createListingDraftEnvelope, draftPersistableUrl, persistDraftMediaUrl, type DraftMediaUploadProgress } from '@simple/utils';
import type { PropiedadesOperatorPublishContext } from '@simple/utils';
import { ModernSelect } from '@simple/ui/forms';
import { useAuth } from '@simple/auth';
import { uploadMediaFile } from '@simple/utils';
import { getPublicationLifecyclePolicy, type PublicationLifecyclePolicy } from '@simple/config';
import {
    createPanelListing, deletePanelListingDraft, fetchPanelListingDetail, fetchPanelListingDraft, savePanelListingDraft, updatePanelListing, type PanelListing,
} from '@/lib/panel-listings';
import {
    applyAddressBookEntryToLocation,
    createEmptyListingLocation,
    patchListingLocation,
    type AddressBookEntry,
    type ListingLocation,
    type PropertyValuationEstimate,
    type PropertyValuationRequest,
    type PropertyValuationSourceStatus,
} from '@simple/types';
import {
    estimatePropertyValue, fetchPublishAddressBook, pickDefaultPublishAddress, fetchPropertyValuationSources, geocodeListingLocation, getCommunesForRegion, LOCATION_COMMUNES, LOCATION_REGIONS, refreshPropertyValuationSources, resolveLocationNames, createAddressBookEntry,
} from '@simple/utils';
import { PanelActions, PanelBlockHeader, PanelButton, PanelCard, PanelChoiceCard, PanelIconButton, PanelNotice, PanelSummaryCard, PanelScrollModal, MarketplacePublishMessageNotice, MarketplacePublishPlanLimitNotice, useMarketplacePublishPlanLimit, isMarketplacePublishBlockedByPlan, useMarketplaceOperatorPublishDefaults, optimizeListingPhotoFile, type PanelDocumentAsset, type PanelMediaAsset, type PanelVideoAsset } from '@simple/ui/panel';
import { ListingLocationEditor, pickListingLocationFieldErrors } from '@simple/ui/location';
import { useGoogleMapsBrowserKey } from '@simple/ui/address-book';
import { PROPERTY_PUBLISH_STEPS } from '@/components/panel/publish/publish-steps';
import dynamic from 'next/dynamic';

const PublishLocationMap = dynamic(() => import('@/components/map/publish-location-map'), {
    ssr: false,
    loading: () => <div className="mt-3 h-52 animate-pulse rounded-xl border bg-(--bg-subtle)" />,
});

type StepId = 'media' | 'basics' | 'attributes' | 'publish';
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
        offerPrice: string;
        discountPercent: string;
        offerPriceMode: '$' | '%';
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
        description: 'La primera foto es la portada.',
    },
    basics: {
        title: 'Datos del inmueble',
        description: 'Operación, tipo, atributos de tarjeta, ubicación y precio.',
    },
    attributes: {
        title: 'Detalles del inmueble',
        description: 'Completa la ficha con atributos, equipamiento y condiciones comerciales.',
    },
    publish: {
        title: 'Publicar',
        description: 'Revisa el título y la descripción generados antes de publicar.',
    },
};

function formatPropertySurfacePreviewLabel(data: WizardData): string | null {
    const pt = data.setup.propertyType;
    const isResidential = pt === 'Casa' || pt === 'Departamento';
    const usable = data.basic.usableArea.trim();
    const total = data.basic.totalArea.trim();

    if (isResidential) {
        if (usable && total) return `${usable} m² út. · ${total} m² tot.`;
        if (usable) return `${usable} m² útiles`;
        if (total) return `${total} m²`;
        return null;
    }

    if (total) return `${total} m²`;
    return null;
}

function buildPropertyPreviewCardProps(data: WizardData): SimplePublishPreviewCardProps {
    const title = data.setup.operationType === 'project'
        ? data.project.projectName || data.basic.title || 'Título del aviso'
        : data.basic.title || 'Título del aviso';
    const video = data.media.discoverVideo;
    const location = buildPreviewLocation(data);
    const badge = getOperationLabel(data.setup.operationType);
    const hasOffer = data.setup.operationType !== 'project' && Boolean(
        resolveOfferPriceValue({
            mainPrice: data.commercial.price,
            offerPrice: data.commercial.offerPrice,
            discountPercent: data.commercial.discountPercent,
            offerPriceMode: data.commercial.offerPriceMode,
            parseMainPrice: (value) => parseNumber(value),
        }),
    );
    const price = data.commercial.price.trim() ? buildPriceLabel(data) : '$Consultar';
    const priceOriginal = hasOffer ? buildPriceLabel(data, { useListPrice: true }) : undefined;
    const offerValue = hasOffer
        ? resolveOfferPriceValue({
            mainPrice: data.commercial.price,
            offerPrice: data.commercial.offerPrice,
            discountPercent: data.commercial.discountPercent,
            offerPriceMode: data.commercial.offerPriceMode,
            parseMainPrice: (value) => parseNumber(value),
        })
        : '';
    const listNum = parseNumber(data.commercial.price);
    const offerNum = offerValue ? parseNumber(offerValue) : null;
    const discountPercent = listNum != null && offerNum != null && offerNum < listNum
        ? Math.round((1 - offerNum / listNum) * 100)
        : undefined;

    const specs: SimplePublishPreviewCardProps['specs'] = [];
    if (data.setup.operationType !== 'project') {
        const propertyType = (data.setup.propertyType || '').toLowerCase();
        const residential = /casa|depto|departamento|townhouse|loft|penthouse|duplex|dúplex|studio|estudio/.test(propertyType)
            || Boolean(data.basic.rooms)
            || Boolean(data.basic.bathrooms);

        if (residential) {
            specs.push({ icon: <IconBed size={14} />, label: data.basic.rooms ? `${data.basic.rooms}D` : '—' });
            specs.push({ icon: <IconBath size={14} />, label: data.basic.bathrooms ? `${data.basic.bathrooms}B` : '—' });
            specs.push({
                icon: <IconParking size={14} />,
                label: data.basic.parkingSpaces !== '' ? `${data.basic.parkingSpaces}E` : '—',
            });
            specs.push({
                icon: <IconBox size={14} />,
                label: data.basic.storageUnits !== '' ? `${data.basic.storageUnits}Bo` : '—',
            });
        } else {
            if (data.setup.propertyType) {
                specs.push({ icon: <IconBuildingStore size={14} />, label: data.setup.propertyType });
            }
            const surfaceLabel = formatPropertySurfacePreviewLabel(data);
            if (surfaceLabel) specs.push({ icon: <IconRuler size={14} />, label: surfaceLabel });
            if (data.basic.parkingSpaces !== '') {
                specs.push({ icon: <IconParking size={14} />, label: `${data.basic.parkingSpaces}E` });
            }
        }
    }

    const extraChips: SimplePublishPreviewCardProps['extraChips'] = [];
    if (data.setup.operationType === 'project' && data.project.salesStage) {
        extraChips.push({ label: data.project.salesStage });
    }
    if (data.commercial.negotiable) extraChips.push({ label: 'Conversable' });

    return {
        badge,
        price,
        priceOriginal,
        discountPercent: discountPercent && discountPercent > 0 && discountPercent < 100 ? discountPercent : undefined,
        title,
        location,
        accent: 'propiedades',
        photoUrls: data.media.photos
            .map((photo) => photo.previewUrl || photo.dataUrl)
            .filter(Boolean),
        videoUrl: video?.previewUrl || video?.dataUrl || null,
        specs,
        extraChips,
        ctaLabel: data.setup.operationType === 'rent' ? 'Ver disponibilidad' : data.setup.operationType === 'project' ? 'Ver proyecto' : 'Ver detalle',
        sellerName: 'Tu negocio',
        brandLabel: 'SimplePropiedades',
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

const PROPERTY_TYPE_BY_VALUE = Object.fromEntries(
    PROPERTY_TYPE_CARDS.map((item) => [item.value, item]),
) as Record<string, (typeof PROPERTY_TYPE_CARDS)[number]>;

function PropertyTypePicker({
    value,
    onChange,
    invalid = false,
}: {
    value: string;
    onChange: (value: string) => void;
    invalid?: boolean;
}) {
    const isOtherMobile = value !== 'Departamento';
    const isOtherDesktop = value !== 'Departamento' && value !== 'Casa';
    const [showOthersMobile, setShowOthersMobile] = useState(isOtherMobile);
    const [showOthersDesktop, setShowOthersDesktop] = useState(isOtherDesktop);

    useEffect(() => {
        if (isOtherMobile) setShowOthersMobile(true);
        if (isOtherDesktop) setShowOthersDesktop(true);
    }, [isOtherMobile, isOtherDesktop]);

    const mobileOthers = PROPERTY_TYPE_CARDS.filter((item) => item.value !== 'Departamento');
    const desktopOthers = PROPERTY_TYPE_CARDS.filter((item) => item.value !== 'Departamento' && item.value !== 'Casa');

    const renderTypeCard = (
        item: (typeof PROPERTY_TYPE_CARDS)[number],
        options?: { collapseOthers?: 'mobile' | 'desktop' | 'both' },
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
            className="min-h-[52px] px-3"
        >
            <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                    {item.icon}
                </span>
                <p className="truncate text-sm font-medium prop-publish-fg">{item.label}</p>
            </div>
        </PanelChoiceCard>
    );

    return (
        <div className={`space-y-2 rounded-xl${invalid ? ' ring-2 ring-(--color-error)' : ''}`}>
            {/* Móvil: Departamento | Otro tipo */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
                {renderTypeCard(PROPERTY_TYPE_BY_VALUE.Departamento, { collapseOthers: 'mobile' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersMobile((current) => !current)}
                    selected={isOtherMobile}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium prop-publish-fg">Otro tipo</p>
                    </div>
                </PanelChoiceCard>
            </div>
            {showOthersMobile ? (
                <div className="grid grid-cols-2 gap-2 md:hidden">
                    {mobileOthers.map((item) => renderTypeCard(item))}
                </div>
            ) : null}

            {/* Desktop: Departamento | Casa | Otro tipo */}
            <div className="hidden grid-cols-3 gap-2 md:grid">
                {renderTypeCard(PROPERTY_TYPE_BY_VALUE.Departamento, { collapseOthers: 'desktop' })}
                {renderTypeCard(PROPERTY_TYPE_BY_VALUE.Casa, { collapseOthers: 'desktop' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersDesktop((current) => !current)}
                    selected={isOtherDesktop}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium prop-publish-fg">Otro tipo</p>
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
            offerPrice: '',
            discountPercent: '',
            offerPriceMode: '$',
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

async function preparePropiedadesDraftMedia(
    data: WizardData,
    options?: {
        onMediaProgress?: (progress: DraftMediaUploadProgress) => void;
    },
): Promise<{ ok: boolean; data?: WizardData; error?: string }> {
    const photos: WizardData['media']['photos'] = [];
    for (const photo of data.media.photos) {
        const sourceUrl = photo.previewUrl || photo.dataUrl;
        const result = await persistDraftMediaUrl({
            url: sourceUrl,
            fileType: 'image',
            name: photo.name || 'foto.webp',
            mimeType: photo.mimeType || 'image/webp',
            onProgress: options?.onMediaProgress,
        });
        if (!result.ok) return { ok: false, error: result.error };
        const persisted = result.url || sourceUrl;
        photos.push({
            ...photo,
            dataUrl: persisted,
            previewUrl: persisted,
        });
    }

    let discoverVideo = data.media.discoverVideo;
    if (discoverVideo) {
        const sourceUrl = discoverVideo.previewUrl || discoverVideo.dataUrl;
        const result = await persistDraftMediaUrl({
            url: sourceUrl,
            fileType: 'video',
            name: discoverVideo.name || 'video.mp4',
            mimeType: discoverVideo.mimeType || 'video/mp4',
            onProgress: options?.onMediaProgress,
        });
        if (!result.ok) return { ok: false, error: result.error };
        const persisted = result.url || sourceUrl;
        discoverVideo = {
            ...discoverVideo,
            dataUrl: persisted,
            previewUrl: persisted,
        };
    }

    return {
        ok: true,
        data: {
            ...data,
            media: {
                ...data.media,
                photos,
                discoverVideo,
            },
        },
    };
}

function serializeDraft(data: WizardData, valuationEstimate: PropertyValuationEstimate | null): PersistedDraft {
    return {
        ...createListingDraftEnvelope({
            ...data,
            media: {
                ...data.media,
                photos: data.media.photos.map((photo) => ({
                    id: photo.id,
                    name: photo.name,
                    dataUrl: draftPersistableUrl(photo.dataUrl),
                    previewUrl: draftPersistableUrl(photo.previewUrl || photo.dataUrl),
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
                        dataUrl: draftPersistableUrl(data.media.discoverVideo.dataUrl),
                        previewUrl: draftPersistableUrl(data.media.discoverVideo.previewUrl || data.media.discoverVideo.dataUrl),
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
        }),
        valuationEstimate,
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

    if (step === 'basics') {
        if (!data.setup.propertyType) errors['setup.propertyType'] = '';
        if (!data.setup.operationType) errors['setup.operationType'] = '';
        if (data.setup.operationType === 'project') {
            if (!data.project.projectName.trim()) errors['project.projectName'] = '';
            if (!data.project.developerName.trim()) errors['project.developerName'] = '';
        } else {
            const pt = data.setup.propertyType;
            const isResidential = pt === 'Casa' || pt === 'Departamento';
            if (parseNumber(data.basic.totalArea) == null) errors['basic.totalArea'] = '';
            if (!data.basic.condition.trim()) errors['basic.condition'] = '';
            if (isResidential) {
                if (parseNumber(data.basic.rooms) == null) errors['basic.rooms'] = '';
                if (parseNumber(data.basic.bathrooms) == null) errors['basic.bathrooms'] = '';
            }
            if (parseNumber(data.basic.parkingSpaces) == null) {
                errors['basic.parkingSpaces'] = '';
            }
            if (parseNumber(data.basic.storageUnits) == null) {
                errors['basic.storageUnits'] = '';
            }
        }
        if (parseNumber(data.commercial.price) == null) errors['commercial.price'] = '';
        if (!data.location.regionId) errors['location.regionId'] = '';
        if (!data.location.communeId) errors['location.communeId'] = '';
        if (!data.location.addressLine1?.trim()) errors['location.addressLine1'] = '';
        if (data.location.sourceMode === 'saved_address' && !data.location.sourceAddressId) {
            errors['location.sourceAddressId'] = '';
        }
    }

    if (step === 'attributes') {
        if (data.media.tour360Url.trim()) {
            try {
                new URL(data.media.tour360Url.trim());
            } catch {
                errors['media.tour360Url'] = '';
            }
        }
    }

    if (step === 'publish') {
        if (!data.basic.title.trim()) errors['basic.title'] = '';
        if (data.basic.description.trim().length < 40) {
            errors['basic.description'] = '';
        }
    }

    if (step === 'media') {
        if (data.media.photos.length < 1) errors['media.photos'] = '';
        if (data.media.videoUrl.trim() && !isSupportedExternalVideoUrl(data.media.videoUrl.trim())) {
            errors['media.video'] = '';
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

function commercialCurrencyPrefix(currency: Currency): string {
    if (currency === 'UF') return 'UF ';
    if (currency === 'USD') return 'USD ';
    return '$';
}

function buildPriceLabel(data: WizardData, options?: { useListPrice?: boolean }): string {
    const prefix = commercialCurrencyPrefix(data.commercial.currency);
    const offer = !options?.useListPrice && data.setup.operationType !== 'project'
        ? resolveOfferPriceValue({
            mainPrice: data.commercial.price,
            offerPrice: data.commercial.offerPrice,
            discountPercent: data.commercial.discountPercent,
            offerPriceMode: data.commercial.offerPriceMode,
            parseMainPrice: (value) => parseNumber(value),
        })
        : '';
    const displayPrice = offer || data.commercial.price.trim();

    if (data.setup.operationType === 'project') {
        if (data.commercial.price.trim() && data.commercial.priceTo.trim()) {
            return `${prefix}${data.commercial.price.trim()} - ${prefix}${data.commercial.priceTo.trim()}`;
        }
        if (data.commercial.price.trim()) {
            return `Desde ${prefix}${data.commercial.price.trim()}`;
        }
    }
    return `${prefix}${displayPrice || '0'}`;
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
        data.basic.propertyAge,
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

    const isResidential = data.setup.propertyType === 'Casa' || data.setup.propertyType === 'Departamento';
    const surfaceLabel = isResidential && data.basic.usableArea.trim()
        ? `${data.basic.usableArea.trim()} m² útiles`
        : data.basic.totalArea.trim()
            ? `${data.basic.totalArea.trim()} m²`
            : null;

    const parts = [
        data.basic.rooms.trim() ? `${data.basic.rooms.trim()}D` : null,
        data.basic.bathrooms.trim() ? `${data.basic.bathrooms.trim()}B` : null,
        surfaceLabel,
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

type WizardSetter = React.Dispatch<React.SetStateAction<WizardData>>;

function ErrorText(props: { text: string }) {
    return <p className="mt-2 text-xs prop-field-error">{props.text}</p>;
}

function Field(props: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <SimplePublishField
            label={props.label}
            required={props.required}
            error={props.error}
            hint={props.hint}
        >
            {props.children}
        </SimplePublishField>
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
            className={`rounded-lg border px-3 py-3 text-left panel-publish-toggle ${props.active ? 'panel-publish-toggle--active' : ''}`}
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
            className={`rounded-card border px-3 py-3 text-sm text-left transition-colors panel-publish-select-chip ${props.active ? 'panel-publish-select-chip--active' : ''}`}
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
        <section className="space-y-5">
            <MarketplaceOperatorPublishHint message={operatorHint ?? null} />
            <SimplePublishSection title="Operación">
                <div className={`grid grid-cols-3 gap-2 rounded-xl${Object.prototype.hasOwnProperty.call(errors, 'setup.operationType') ? ' ring-2 ring-(--color-error)' : ''}`}>
                    {OPERATION_CARDS.map((card) => (
                        <PanelChoiceCard
                            key={card.value}
                            onClick={() => setData((current) => ({
                                ...current,
                                setup: { ...current.setup, operationType: card.value },
                                commercial: { ...current.commercial, currency: getDefaultCurrencyForOperation(card.value) },
                            }))}
                            selected={data.setup.operationType === card.value}
                            className="h-16 px-2 text-center"
                        >
                            <div className="flex h-full flex-col items-center justify-center gap-1.5">
                                <span className="h-7 w-7 rounded-full inline-flex items-center justify-center shrink-0 panel-publish-icon">
                                    {card.icon}
                                </span>
                                <span className="text-xs font-medium leading-none">{card.label}</span>
                                {recommendedOperation === card.value ? (
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-(--accent)">Recomendado</span>
                                ) : null}
                            </div>
                        </PanelChoiceCard>
                    ))}
                </div>
            </SimplePublishSection>
            <SimplePublishSection title="Tipo de propiedad">
                <PropertyTypePicker
                    value={data.setup.propertyType}
                    onChange={(next) => setData((current) => ({
                        ...current,
                        setup: { ...current.setup, propertyType: next },
                    }))}
                    invalid={Object.prototype.hasOwnProperty.call(errors, 'setup.propertyType')}
                />
            </SimplePublishSection>
        </section>
    );
}

function PropertyInmuebleFields(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    scope?: 'card' | 'detail';
}) {
    const { data, setData, errors, scope = 'card' } = props;
    const pt = data.setup.propertyType;
    const isLand = pt === 'Terreno' || pt === 'Parcela';
    const isResidential = pt === 'Casa' || pt === 'Departamento';
    const isOficina = pt === 'Oficina';
    const isCommercialUnit = pt === 'Local comercial' || pt === 'Bodega';
    const showCard = scope === 'card';
    const showDetail = scope === 'detail';
    const showParking = isResidential || isOficina || isCommercialUnit;
    const showStorage = isResidential || isOficina || isCommercialUnit;
    const showUsableArea = isResidential || isOficina || isCommercialUnit;
    const isInvalid = (key: string) => Object.prototype.hasOwnProperty.call(errors, key);
    const invalidInputClass = (key: string) => (isInvalid(key) ? ' form-input-error' : '');
    const surfaceFieldsResidential = (
        <>
            <Field label="Superficie útil (m²)">
                <input className="form-input" type="number" min={0} value={data.basic.usableArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, usableArea: event.target.value } }))} placeholder="84" />
            </Field>
            <Field label="Superficie total (m²)" required>
                <input className={`form-input${invalidInputClass('basic.totalArea')}`} type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder="92" />
            </Field>
        </>
    );
    const surfaceFieldsCommercial = (
        <>
            <Field label="Superficie total (m²)" required>
                <input className={`form-input${invalidInputClass('basic.totalArea')}`} type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder={isOficina ? '120' : '95'} />
            </Field>
            <Field label="Superficie útil (m²)">
                <input className="form-input" type="number" min={0} value={data.basic.usableArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, usableArea: event.target.value } }))} placeholder="78" />
            </Field>
        </>
    );

    return (
        <div className="space-y-4">
            {showCard ? (
            <>
                <Field label="Condición" required>
                    <ModernSelect
                        value={data.basic.condition}
                        onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))}
                        placeholder="Seleccionar"
                        options={CONDITION_OPTIONS}
                        ariaLabel="Seleccionar condición"
                        triggerClassName={isInvalid('basic.condition') ? 'form-input-error' : undefined}
                    />
                </Field>

                <div className="space-y-3">
                    <p className="text-xs font-medium prop-publish-muted">
                        {isLand ? 'Superficie' : isResidential ? 'Programa y superficie' : 'Superficie y capacidad'}
                    </p>
                    {isResidential ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Field label="Dormitorios" required>
                                <div className="relative">
                                    <IconBed size={15} className="absolute left-3 top-1/2 -translate-y-1/2 prop-field-hint" />
                                    <input className={`form-input pl-10${invalidInputClass('basic.rooms')}`} type="number" min={0} value={data.basic.rooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, rooms: event.target.value } }))} placeholder="3" />
                                </div>
                            </Field>
                            <Field label="Baños" required>
                                <div className="relative">
                                    <IconBath size={15} className="absolute left-3 top-1/2 -translate-y-1/2 prop-field-hint" />
                                    <input className={`form-input pl-10${invalidInputClass('basic.bathrooms')}`} type="number" min={0} value={data.basic.bathrooms} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, bathrooms: event.target.value } }))} placeholder="2" />
                                </div>
                            </Field>
                            <Field label="Estacionamientos" required>
                                <input className={`form-input${invalidInputClass('basic.parkingSpaces')}`} type="number" min={0} value={data.basic.parkingSpaces} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, parkingSpaces: event.target.value } }))} placeholder="1" />
                            </Field>
                            <Field label="Bodegas" required>
                                <input className={`form-input${invalidInputClass('basic.storageUnits')}`} type="number" min={0} value={data.basic.storageUnits} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, storageUnits: event.target.value } }))} placeholder="0" />
                            </Field>
                        </div>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {isLand ? (
                            <Field label="Superficie del terreno (m²)" required>
                                <input className={`form-input${invalidInputClass('basic.totalArea')}`} type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder="500" />
                            </Field>
                        ) : isResidential ? (
                            surfaceFieldsResidential
                        ) : showUsableArea ? (
                            surfaceFieldsCommercial
                        ) : (
                            <Field label="Superficie total (m²)" required>
                                <input className={`form-input${invalidInputClass('basic.totalArea')}`} type="number" min={0} value={data.basic.totalArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalArea: event.target.value } }))} placeholder="92" />
                            </Field>
                        )}
                    </div>
                    {!isResidential && showParking ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Field label="Estacionamientos" required>
                                <input className={`form-input${invalidInputClass('basic.parkingSpaces')}`} type="number" min={0} value={data.basic.parkingSpaces} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, parkingSpaces: event.target.value } }))} placeholder={isOficina ? '2' : '1'} />
                            </Field>
                            {showStorage ? (
                                <Field label="Bodegas" required>
                                    <input className={`form-input${invalidInputClass('basic.storageUnits')}`} type="number" min={0} value={data.basic.storageUnits} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, storageUnits: event.target.value } }))} placeholder="0" />
                                </Field>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </>
            ) : null}

            {showDetail && isResidential ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Admite mascotas">
                        <ModernSelect value={data.basic.petsAllowed} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, petsAllowed: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si admite mascotas" />
                    </Field>
                    <Field label="Amoblado">
                        <ModernSelect value={data.basic.furnished} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, furnished: value } }))} placeholder="Seleccionar" options={YES_NO_OPTIONS} ariaLabel="Seleccionar si está amoblado" />
                    </Field>
                </div>
            ) : null}

            {showDetail && (isLand || !isResidential) ? (
                <Field label="Uso de suelo / tipo de local">
                    <ModernSelect value={data.basic.commercialUse} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, commercialUse: value } }))} placeholder="Seleccionar" options={COMMERCIAL_USE_OPTIONS} ariaLabel="Seleccionar uso de suelo" />
                </Field>
            ) : null}
        </div>
    );
}

function PropertyExtendedAttributeFields(props: {
    data: WizardData;
    setData: WizardSetter;
}) {
    const { data, setData } = props;
    const pt = data.setup.propertyType;
    const isDepartamento = pt === 'Departamento';
    const isCasa = pt === 'Casa';
    const isOficina = pt === 'Oficina';
    const isLocalOrBodega = pt === 'Local comercial' || pt === 'Bodega';
    const isLand = pt === 'Terreno' || pt === 'Parcela';

    const showEspacios = isDepartamento || isCasa;
    const showUnidadEdificio = isDepartamento || isOficina || isLocalOrBodega;

    return (
        <div className="space-y-6">
            {showEspacios ? (
                <div className="space-y-4">
                    <p className="text-xs font-medium prop-publish-muted">Espacios y capacidad</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Superficie de terraza (m²)">
                            <input className="form-input" type="number" min={0} value={data.basic.terraceArea} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, terraceArea: event.target.value } }))} placeholder="12" />
                        </Field>
                        <Field label="Máximo de habitantes">
                            <input className="form-input" type="number" min={0} value={data.basic.maxOccupants} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, maxOccupants: event.target.value } }))} placeholder="4" />
                        </Field>
                    </div>
                </div>
            ) : null}

            {showUnidadEdificio ? (
                <div className="space-y-4">
                    <p className="text-xs font-medium prop-publish-muted">Unidad y edificio</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isDepartamento || isOficina ? (
                            <Field label="Número de unidad">
                                <input className="form-input" value={data.basic.unitNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, unitNumber: event.target.value } }))} placeholder="608" />
                            </Field>
                        ) : null}
                        {isDepartamento || isOficina || isLocalOrBodega ? (
                            <Field label="Piso de la unidad">
                                <input className="form-input" type="number" min={0} value={data.basic.floorNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, floorNumber: event.target.value } }))} placeholder="6" />
                            </Field>
                        ) : null}
                        {isDepartamento || isOficina ? (
                            <Field label="Número de torre">
                                <input className="form-input" value={data.basic.towerNumber} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, towerNumber: event.target.value } }))} placeholder="Torre B" />
                            </Field>
                        ) : null}
                        {isDepartamento ? (
                            <Field label="Departamentos por piso">
                                <input className="form-input" type="number" min={0} value={data.basic.unitsPerFloor} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, unitsPerFloor: event.target.value } }))} placeholder="4" />
                            </Field>
                        ) : null}
                        {isDepartamento || isOficina ? (
                            <Field label="Cantidad de pisos">
                                <input className="form-input" type="number" min={0} value={data.basic.totalFloors} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, totalFloors: event.target.value } }))} placeholder="18" />
                            </Field>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="space-y-4">
                <p className="text-xs font-medium prop-publish-muted">Características adicionales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Antigüedad (años)">
                        <input className="form-input" type="number" min={0} value={data.basic.propertyAge} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, propertyAge: event.target.value } }))} placeholder="6" />
                    </Field>
                    {isDepartamento ? (
                        <Field label="Tipo de departamento">
                            <ModernSelect value={data.basic.departmentType} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, departmentType: value } }))} placeholder="Seleccionar" options={DEPARTMENT_TYPE_OPTIONS} ariaLabel="Seleccionar tipo de departamento" />
                        </Field>
                    ) : null}
                    {!isLocalOrBodega ? (
                        <Field label="Orientación">
                            <ModernSelect value={data.basic.orientation} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, orientation: value } }))} placeholder="Seleccionar" options={ORIENTATION_OPTIONS} ariaLabel="Seleccionar orientación" />
                        </Field>
                    ) : null}
                    {!isLand ? (
                        <Field label="Tipo de seguridad">
                            <ModernSelect value={data.basic.securityType} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, securityType: value } }))} placeholder="Seleccionar" options={SECURITY_TYPE_OPTIONS} ariaLabel="Seleccionar tipo de seguridad" />
                        </Field>
                    ) : null}
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <p className="text-xs font-medium prop-publish-muted">Notas comerciales</p>
                <Field label="Condiciones especiales" hint="Ej: disponible para empresas, arriendo temporal o entrega inmediata.">
                    <textarea className="form-input resize-y min-h-[88px]" rows={3} value={data.basic.specialConditions} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, specialConditions: event.target.value } }))} placeholder="Opcional" />
                </Field>
            </div>
        </div>
    );
}

function PropertyProjectDetailFields(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
}) {
    const { data, setData, errors } = props;

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
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="Constructora">
                    <input className="form-input" value={data.project.builderName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, builderName: event.target.value } }))} placeholder="Ej: Constructora Central" />
                </Field>
                <Field label="Entrega estimada">
                    <input className="form-input" type="date" value={data.project.deliveryDate} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, deliveryDate: event.target.value } }))} />
                </Field>
                <Field label="Unidades disponibles">
                    <input className="form-input" type="number" min={0} value={data.project.availableUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, availableUnits: event.target.value } }))} placeholder="24" />
                </Field>
                <Field label="Unidades totales">
                    <input className="form-input" type="number" min={0} value={data.project.totalUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, totalUnits: event.target.value } }))} placeholder="80" />
                </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <Field label="Superficie útil desde (m²)"><input className="form-input" type="number" min={0} value={data.project.usableAreaFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, usableAreaFrom: event.target.value } }))} placeholder="39" /></Field>
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
                                    <Field label="Tipología" error={errors[`project.models.${index}.label`]}>
                                        <input className="form-input" value={model.label} onChange={(event) => updateProjectModel(model.id, { label: event.target.value })} placeholder="Ej: Tipo A / 2D+2B" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3 xl:contents">
                                    <Field label="Dorm." error={errors[`project.models.${index}.bedrooms`]}><input className="form-input" type="number" min={0} value={model.bedrooms} onChange={(event) => updateProjectModel(model.id, { bedrooms: event.target.value })} placeholder="2" /></Field>
                                    <Field label="Baños" error={errors[`project.models.${index}.bathrooms`]}><input className="form-input" type="number" min={0} value={model.bathrooms} onChange={(event) => updateProjectModel(model.id, { bathrooms: event.target.value })} placeholder="2" /></Field>
                                    <Field label="m² útiles" error={errors[`project.models.${index}.usableAreaFrom`]}>
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
                                    <Field label="Precio desde" error={errors[`project.models.${index}.priceFrom`]}><input className="form-input" type="number" min={0} value={model.priceFrom} onChange={(event) => updateProjectModel(model.id, { priceFrom: event.target.value })} placeholder="4200" /></Field>
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
    );
}

function StepBasic(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    onAddressBookChange?: (next: AddressBookEntry[]) => void;
    communes: Array<{ id: string; name: string }>;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
    variant?: 'full' | 'basics' | 'extended' | 'location';
    showRentAdminFields?: boolean;
    omitTitle?: boolean;
    flat?: boolean;
    googleMapsApiKey?: string;
}) {
    const { data, setData, errors, addressBook, addressBookLoading, onAddressBookChange, communes, onGeocodeLocation, geocoding, variant = 'full', showRentAdminFields = false, omitTitle = false, flat = false, googleMapsApiKey } = props;
    const [savingAddress, setSavingAddress] = useState(false);
    const [saveAddressNote, setSaveAddressNote] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState<Record<'main' | 'secondary' | 'location', boolean>>({
        main: true,
        secondary: variant === 'extended',
        location: true,
    });
    const isProject = data.setup.operationType === 'project';

    const handleSaveToAddressBook = async () => {
        if (savingAddress) return;
        const location = data.location;
        if (!location.addressLine1?.trim() || !location.regionId || !location.communeId) {
            setSaveAddressNote('Completa dirección, región y comuna antes de guardar.');
            return;
        }
        if (!onAddressBookChange) {
            setSaveAddressNote('No se pudo guardar la dirección.');
            return;
        }
        setSavingAddress(true);
        setSaveAddressNote(null);
        const result = await createAddressBookEntry({
            kind: 'branch',
            scope: 'business',
            vertical: 'propiedades',
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
        const refreshed = await fetchPublishAddressBook('propiedades');
        if (refreshed.ok) onAddressBookChange(refreshed.items);
        setSaveAddressNote('Dirección guardada en la libreta.');
    };

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
    const showMain = variant === 'full' || variant === 'basics';
    const showSecondary = variant === 'full' || variant === 'extended';

    const locationTitle = 'Ubicación';
    const mainTitle = isProject ? 'Proyecto' : 'Datos del inmueble';
    const secondaryTitle = isProject ? 'Tipologías y rangos' : 'Más atributos';

    const locationBody = (
        <>
            <ListingLocationEditor
                showHeader={false}
                framed={false}
                simpleMode
                googleMapsApiKey={googleMapsApiKey}
                location={data.location}
                onChange={(next) => setData((current) => ({ ...current, location: next }))}
                regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                communes={communes.map((item) => ({ value: item.id, label: item.name }))}
                allCommunes={LOCATION_COMMUNES.map((item) => ({ value: item.id, label: item.name }))}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                errors={pickListingLocationFieldErrors(errors)}
                allowAreaOnly={false}
                addressRequired
                addressFirst
                showSourceSelector={false}
                showVisibilityField={false}
                showSimpleVisibilityToggle={false}
                showAddressLine2={false}
                showGoogleMapsLink
                showPublicPreviewCard={false}
                showActionBar={false}
                publishVertical="propiedades"
                geocoding={geocoding}
                onGeocode={onGeocodeLocation}
                onSaveToAddressBook={onAddressBookChange ? () => void handleSaveToAddressBook() : undefined}
            />
            {saveAddressNote ? (
                <p className="mt-2 text-sm text-(--fg-muted)">{saveAddressNote}</p>
            ) : null}
            {data.location.geoPoint.latitude != null
                && data.location.geoPoint.longitude != null
                && data.location.geoPoint.provider !== 'catalog_seed' ? (
                <div className="mt-3">
                    <PublishLocationMap
                        latitude={data.location.geoPoint.latitude}
                        longitude={data.location.geoPoint.longitude}
                    />
                </div>
            ) : null}
        </>
    );

    return (
        <section className={flat ? 'space-y-5' : 'space-y-4'}>
            {!flat && (showMain || showSecondary) ? (
                variant === 'extended' ? (
                <h2 className="type-section-title">{isProject ? 'Detalles del proyecto' : 'Atributos adicionales'}</h2>
                ) : (
                <h2 className="type-section-title">{isProject ? 'Datos del proyecto' : 'Datos del inmueble'}</h2>
                )
            ) : !flat && !showMain && !showSecondary ? (
                <h2 className="type-section-title">Ubicación</h2>
            ) : null}
            {showRentAdminFields && data.setup.operationType === 'rent' && showMain ? (
                <MarketplacePropiedadesRentAdminHint />
            ) : null}

            {showLocation ? (
                flat ? (
                    <SimplePublishSection title={locationTitle}>{locationBody}</SimplePublishSection>
                ) : (
            <AccordionGroup
                title="Ubicación del aviso"
                description="Elige una dirección guardada o escribe una nueva. Completa dirección, región y comuna y decide si quieres ocultar la dirección exacta."
                open={openSections.location}
                onToggle={() => setOpenSections((current) => ({ ...current, location: !current.location }))}
            >
                {locationBody}
            </AccordionGroup>
                )
            ) : null}

            {showMain ? (
            flat ? (
            <SimplePublishSection title={mainTitle}>
                {isProject ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="md:col-span-2">
                                <Field label="Condición">
                                    <ModernSelect value={data.basic.condition} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))} placeholder="Seleccionar" options={CONDITION_OPTIONS} ariaLabel="Seleccionar condición" />
                                </Field>
                            </div>
                            {!omitTitle ? (
                            <Field label="Título publicitario" required error={errors['basic.title']} hint="Titular comercial que aparecerá en la publicación.">
                                <input className="form-input" value={data.basic.title} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))} placeholder="Ej: Proyecto con entrega inmediata en Ñuñoa" />
                            </Field>
                            ) : null}
                            <Field label="Nombre del proyecto" required error={errors['project.projectName']} hint="Nombre comercial o nombre del condominio.">
                                <input className="form-input" value={data.project.projectName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, projectName: event.target.value } }))} placeholder="Ej: Vista Parque Ñuñoa" />
                            </Field>
                            <Field label="Inmobiliaria / desarrollador" required error={errors['project.developerName']}>
                                <input className="form-input" value={data.project.developerName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, developerName: event.target.value } }))} placeholder="Ej: Inmobiliaria Andes" />
                            </Field>
                            <Field label="Etapa comercial">
                                <ModernSelect value={data.project.salesStage} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, salesStage: value } }))} placeholder="Seleccionar" options={PROJECT_SALES_STAGE_OPTIONS} ariaLabel="Seleccionar etapa comercial" />
                            </Field>
                            <Field label="Estado de entrega">
                                <ModernSelect value={data.project.deliveryStatus} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, deliveryStatus: value } }))} placeholder="Seleccionar" options={PROJECT_DELIVERY_STATUS_OPTIONS} ariaLabel="Seleccionar estado de entrega" />
                            </Field>
                        </div>
                    </>
                ) : (
                    <PropertyInmuebleFields data={data} setData={setData} errors={errors} />
                )}
            </SimplePublishSection>
            ) : (
            <>
            <AccordionGroup
                title={isProject ? 'Identidad del proyecto' : 'Datos esenciales'}
                description={isProject ? 'Nombre, desarrollador y etapa comercial del proyecto.' : 'Condición, programa y superficie. Lo que aparece en la tarjeta.'}
                open={openSections.main}
                onToggle={() => setOpenSections((current) => ({ ...current, main: !current.main }))}
            >
                {isProject ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="md:col-span-2">
                                <Field label="Condición">
                                    <ModernSelect value={data.basic.condition} onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))} placeholder="Seleccionar" options={CONDITION_OPTIONS} ariaLabel="Seleccionar condición" />
                                </Field>
                            </div>
                            {!omitTitle ? (
                            <Field label="Título publicitario" required error={errors['basic.title']} hint="Titular comercial que aparecerá en la publicación.">
                                <input className="form-input" value={data.basic.title} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))} placeholder="Ej: Proyecto con entrega inmediata en Ñuñoa" />
                            </Field>
                            ) : null}
                            <Field label="Nombre del proyecto" required error={errors['project.projectName']} hint="Nombre comercial o nombre del condominio.">
                                <input className="form-input" value={data.project.projectName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, projectName: event.target.value } }))} placeholder="Ej: Vista Parque Ñuñoa" />
                            </Field>
                            <Field label="Inmobiliaria / desarrollador" required error={errors['project.developerName']}>
                                <input className="form-input" value={data.project.developerName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, developerName: event.target.value } }))} placeholder="Ej: Inmobiliaria Andes" />
                            </Field>
                            <Field label="Etapa comercial">
                                <ModernSelect value={data.project.salesStage} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, salesStage: value } }))} placeholder="Seleccionar" options={PROJECT_SALES_STAGE_OPTIONS} ariaLabel="Seleccionar etapa comercial" />
                            </Field>
                            <Field label="Estado de entrega">
                                <ModernSelect value={data.project.deliveryStatus} onChange={(value) => setData((current) => ({ ...current, project: { ...current.project, deliveryStatus: value } }))} placeholder="Seleccionar" options={PROJECT_DELIVERY_STATUS_OPTIONS} ariaLabel="Seleccionar estado de entrega" />
                            </Field>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        {!omitTitle ? (
                            <Field label="Título publicitario" required error={errors['basic.title']} hint="Titular comercial que aparecerá en la tarjeta.">
                                <input className="form-input" value={data.basic.title} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))} placeholder="Ej: Departamento 3D 2B en Providencia" />
                            </Field>
                        ) : null}
                        <PropertyInmuebleFields data={data} setData={setData} errors={errors} />
                    </div>
                )}
            </AccordionGroup>

            {showSecondary ? (
            <AccordionGroup
                title={secondaryTitle}
                description={isProject ? 'Rangos generales, tipologías y datos adicionales del proyecto.' : 'Campos adicionales para enriquecer la ficha. Todo es opcional.'}
                open={openSections.secondary}
                onToggle={() => setOpenSections((current) => ({ ...current, secondary: !current.secondary }))}
            >
                {isProject ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <Field label="Constructora">
                                <input className="form-input" value={data.project.builderName} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, builderName: event.target.value } }))} placeholder="Ej: Constructora Central" />
                            </Field>
                            <Field label="Entrega estimada">
                                <input className="form-input" type="date" value={data.project.deliveryDate} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, deliveryDate: event.target.value } }))} />
                            </Field>
                            <Field label="Unidades disponibles">
                                <input className="form-input" type="number" min={0} value={data.project.availableUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, availableUnits: event.target.value } }))} placeholder="24" />
                            </Field>
                            <Field label="Unidades totales">
                                <input className="form-input" type="number" min={0} value={data.project.totalUnits} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, totalUnits: event.target.value } }))} placeholder="80" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <Field label="Superficie útil desde (m²)"><input className="form-input" type="number" min={0} value={data.project.usableAreaFrom} onChange={(event) => setData((current) => ({ ...current, project: { ...current.project, usableAreaFrom: event.target.value } }))} placeholder="39" /></Field>
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
                                                <Field label="Tipología" error={errors[`project.models.${index}.label`]}>
                                                    <input className="form-input" value={model.label} onChange={(event) => updateProjectModel(model.id, { label: event.target.value })} placeholder="Ej: Tipo A / 2D+2B" />
                                                </Field>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 xl:contents">
                                                <Field label="Dorm." error={errors[`project.models.${index}.bedrooms`]}><input className="form-input" type="number" min={0} value={model.bedrooms} onChange={(event) => updateProjectModel(model.id, { bedrooms: event.target.value })} placeholder="2" /></Field>
                                                <Field label="Baños" error={errors[`project.models.${index}.bathrooms`]}><input className="form-input" type="number" min={0} value={model.bathrooms} onChange={(event) => updateProjectModel(model.id, { bathrooms: event.target.value })} placeholder="2" /></Field>
                                                <Field label="m² útiles" error={errors[`project.models.${index}.usableAreaFrom`]}>
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
                                                <Field label="Precio desde" error={errors[`project.models.${index}.priceFrom`]}><input className="form-input" type="number" min={0} value={model.priceFrom} onChange={(event) => updateProjectModel(model.id, { priceFrom: event.target.value })} placeholder="4200" /></Field>
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
                    <PropertyExtendedAttributeFields data={data} setData={setData} />
                )}
            </AccordionGroup>
            ) : null}
            </>
            )
            ) : null}

        </section>
    );
}

function StepSpecs(props: { data: WizardData; setData: WizardSetter; minimal?: boolean }) {
    const { data, setData, minimal = false } = props;
    const [openSections, setOpenSections] = useState<Record<'amenities' | 'services' | 'environment' | 'security', boolean>>({
        amenities: false,
        services: false,
        environment: false,
        security: false,
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
        <section className="space-y-2">
            {!minimal ? (
            <h2 className="type-section-title">{data.setup.operationType === 'project' ? 'Características del proyecto' : 'Características y equipamiento'}</h2>
            ) : null}

            <AccordionGroup title="Comodidades y equipamiento" description={data.setup.operationType === 'project' ? 'Amenidades del proyecto y espacios comunes.' : 'Amenidades y equipamiento del edificio.'} open={openSections.amenities} onToggle={() => setOpenSections((current) => ({ ...current, amenities: !current.amenities }))}>
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
    const videoGalleryInputRef = useRef<HTMLInputElement>(null);
    const videoCameraInputRef = useRef<HTMLInputElement>(null);
    const [processingPhotos, setProcessingPhotos] = useState(false);
    const [photoProcessError, setPhotoProcessError] = useState<string | null>(null);
    const [videoProcessError, setVideoProcessError] = useState<string | null>(null);

    const handleFiles = async (files: FileList) => {
        if (processingPhotos) return;
        const toAdd = Array.from(files).slice(0, MAX_PHOTOS - data.media.photos.length);
        if (toAdd.length === 0) return;

        setProcessingPhotos(true);
        setPhotoProcessError(null);

        try {
            const newPhotos: PanelMediaAsset[] = [];
            for (const file of toAdd) {
                const optimized = await optimizeListingPhotoFile(file);
                newPhotos.push({
                    id: Math.random().toString(36).slice(2),
                    name: optimized.name,
                    dataUrl: optimized.dataUrl,
                    previewUrl: optimized.previewUrl,
                    isCover: false,
                    width: optimized.width,
                    height: optimized.height,
                    sizeBytes: optimized.sizeBytes,
                    mimeType: optimized.mimeType,
                });
            }

            setData((current) => {
                const wasEmpty = current.media.photos.length === 0;
                const added = newPhotos.map((photo, index) => ({
                    ...photo,
                    isCover: wasEmpty && index === 0,
                }));
                return {
                    ...current,
                    media: { ...current.media, photos: [...current.media.photos, ...added] },
                };
            });
        } catch (error) {
            setPhotoProcessError(error instanceof Error ? error.message : 'No se pudieron procesar las fotos.');
        } finally {
            setProcessingPhotos(false);
        }
    };

    const removePhoto = (id: string) => {
        const newPhotos = data.media.photos.filter((photo) => photo.id !== id);
        if (newPhotos.length > 0 && !newPhotos.some((photo) => photo.isCover)) newPhotos[0].isCover = true;
        setData((current) => ({ ...current, media: { ...current.media, photos: newPhotos } }));
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
        setVideoProcessError(null);
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
                photoError={photoProcessError || undefined}
                photoInvalid={Object.prototype.hasOwnProperty.call(errors, 'media.photos')}
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
                            error={videoProcessError || undefined}
                            invalid={Object.prototype.hasOwnProperty.call(errors, 'media.video')}
                            onPickGallery={() => videoGalleryInputRef.current?.click()}
                            onPickCamera={() => videoCameraInputRef.current?.click()}
                            onClearUpload={clearUploadVideo}
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
    );
}

function PropertyValuationModal(props: {
    open: boolean;
    onClose: () => void;
    data: WizardData;
    estimate: PropertyValuationEstimate | null;
    estimating: boolean;
    valuationRequest: PropertyValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onApplyPrice: (price: number, currency: Currency) => void;
}) {
    const { open, onClose, data, estimate, estimating, valuationRequest, onRunValuation, onApplyPrice } = props;
    const isProject = data.setup.operationType === 'project';

    return (
        <PanelScrollModal
            open={open}
            onClose={onClose}
            size="2xl"
            height="tall"
            titleId="property-valuation-modal-title"
            bodyClassName="px-4 py-4 sm:px-5"
            headerContent={(
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-(--bg-muted) text-(--fg)">
                            <IconCalculator size={17} />
                        </span>
                        <h3 id="property-valuation-modal-title" className="text-base font-semibold text-(--fg)">Tasador online</h3>
                    </div>
                    <p className="mt-2 text-sm text-(--fg-secondary)">
                        {isProject
                            ? 'Disponible para venta y arriendo. En proyectos publicas sin tasación automática.'
                            : 'Referencia de mercado con rango, confianza y tendencia para ayudarte a fijar el precio.'}
                    </p>
                </div>
            )}
            footer={estimate && !isProject ? (
                <div className="flex flex-wrap gap-2">
                    <PanelButton
                        type="button"
                        variant="primary"
                        onClick={() => {
                            onApplyPrice(Math.round(estimate.estimatedPrice), estimate.currency as Currency);
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
                            disabled={estimating || !valuationRequest || isProject}
                        >
                            {estimating ? 'Calculando estimación...' : estimate ? 'Recalcular estimación' : 'Calcular estimación'}
                        </PanelButton>

                        {isProject ? (
                            <PanelNotice tone="neutral">El tasador aplica solo a venta y arriendo de propiedades usadas.</PanelNotice>
                        ) : !valuationRequest ? (
                            <PanelNotice tone="neutral">Completa tipo, superficie total y ubicación en este paso para habilitar el tasador.</PanelNotice>
                        ) : !estimate ? (
                            <PanelNotice tone="neutral">Obtén una referencia antes de definir el precio de publicación.</PanelNotice>
                        ) : null}

                        {estimate ? (
                            <div className="space-y-3">
                                <PanelSummaryCard
                                    eyebrow="Precio estimado de mercado"
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
            </div>
        </PanelScrollModal>
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
    hidePrice?: boolean;
}) {
    const { data, setData, errors, estimate, estimating, valuationRequest, onRunValuation, lifecyclePolicy, compact = false, hidePrice = false } = props;
    const [valuationOpen, setValuationOpen] = useState(false);
    const isProject = data.setup.operationType === 'project';
    const currencySlot = (
        <ModernSelect
            value={data.commercial.currency}
            onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as Currency } }))}
            options={CURRENCY_OPTIONS}
            placeholder="Moneda"
            ariaLabel="Seleccionar moneda"
        />
    );
    const amountSuffix = data.commercial.currency === 'UF' ? 'UF' : data.commercial.currency === 'USD' ? 'USD' : '$';
    const listingOffer = {
        offerPrice: data.commercial.offerPrice,
        discountPercent: data.commercial.discountPercent,
        offerPriceMode: data.commercial.offerPriceMode,
        amountSuffix,
        parseMainPrice: (value: string) => parseNumber(value),
        onOfferPriceChange: (value: string) => setData((current) => ({
            ...current,
            commercial: { ...current.commercial, offerPrice: value },
        })),
        onDiscountPercentChange: (value: string) => setData((current) => ({
            ...current,
            commercial: { ...current.commercial, discountPercent: value },
        })),
        onOfferPriceModeChange: (value: '$' | '%') => setData((current) => ({
            ...current,
            commercial: {
                ...current.commercial,
                offerPriceMode: value,
                offerPrice: '',
                discountPercent: '',
            },
        })),
    };

    if (compact) {
        return (
            <>
                <SimplePublishSection title="Precio" className="space-y-4">
                    {isProject ? (
                        <SimplePublishPriceBlock
                            variant="range"
                            mainPrice={data.commercial.price}
                            onMainPriceChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: value } }))}
                            mainPriceRequired
                            mainPriceInvalid={Object.prototype.hasOwnProperty.call(errors, 'commercial.price')}
                            mainPricePlaceholder="4200"
                            mainPriceInputMode="number"
                            currencySlot={currencySlot}
                            priceTo={data.commercial.priceTo}
                            onPriceToChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, priceTo: value } }))}
                            priceToPlaceholder="5600"
                            showOffer={false}
                        />
                    ) : (
                        <SimplePublishPriceBlock
                            mainPrice={data.commercial.price}
                            onMainPriceChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: value } }))}
                            mainPriceLabel="Precio normal"
                            mainPriceRequired
                            mainPriceInvalid={Object.prototype.hasOwnProperty.call(errors, 'commercial.price')}
                            mainPricePlaceholder={data.setup.operationType === 'rent' ? '650000' : '5200'}
                            mainPriceInputMode="number"
                            currencySlot={currencySlot}
                            offer={listingOffer}
                        />
                    )}
                    {!isProject ? (
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
                                    Referencia: {formatAmount(estimate.estimatedPrice, estimate.currency as Currency)}
                                    {' · '}
                                    {formatAmount(estimate.minPrice, estimate.currency as Currency)} – {formatAmount(estimate.maxPrice, estimate.currency as Currency)}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </SimplePublishSection>
                <PropertyValuationModal
                    open={valuationOpen}
                    onClose={() => setValuationOpen(false)}
                    data={data}
                    estimate={estimate}
                    estimating={estimating}
                    valuationRequest={valuationRequest}
                    onRunValuation={onRunValuation}
                    onApplyPrice={(price, currency) => setData((current) => ({
                        ...current,
                        commercial: { ...current.commercial, price: String(price), currency },
                    }))}
                />
            </>
        );
    }

    return (
        <section className={compact ? 'space-y-4' : 'space-y-4'}>
            <div className="space-y-4">
                {!hidePrice ? (
                <AccordionGroup title={isProject ? 'Precio y disponibilidad del proyecto' : 'Precio y disponibilidad'} description={isProject ? 'Rango comercial del proyecto y moneda.' : 'Valor de publicación, gastos comunes y disponibilidad.'} open={true} onToggle={() => {}}>
                    {isProject ? (
                        <>
                            <div className="mb-3">
                                <SimplePublishPriceBlock
                                    variant="range"
                                    mainPrice={data.commercial.price}
                                    onMainPriceChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: value } }))}
                                    mainPriceRequired
                                    mainPriceInvalid={Object.prototype.hasOwnProperty.call(errors, 'commercial.price')}
                                    mainPricePlaceholder="4200"
                                    mainPriceInputMode="number"
                                    currencySlot={currencySlot}
                                    priceTo={data.commercial.priceTo}
                                    onPriceToChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, priceTo: value } }))}
                                    priceToPlaceholder="5600"
                                    showOffer={false}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <Field label="Disponible desde">
                                    <input className="form-input" type="date" value={data.commercial.availableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, availableFrom: event.target.value } }))} />
                                </Field>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-3">
                                <SimplePublishPriceBlock
                                    mainPrice={data.commercial.price}
                                    onMainPriceChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: value } }))}
                                    mainPriceLabel="Precio normal"
                                    mainPriceRequired
                                    mainPriceInvalid={Object.prototype.hasOwnProperty.call(errors, 'commercial.price')}
                                    mainPricePlaceholder={data.setup.operationType === 'rent' ? '650000' : '5200'}
                                    mainPriceInputMode="number"
                                    currencySlot={currencySlot}
                                    offer={listingOffer}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                ) : (
                    !isProject ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        </div>
                    ) : null
                )}

                {!hidePrice && !isProject ? (
                    <AccordionGroup title="Condiciones comerciales" description="Opciones útiles para cerrar mejor el aviso." open={true} onToggle={() => {}}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <ToggleCard title="Precio negociable" description="Deja claro si hay espacio para conversar el valor." active={data.commercial.negotiable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))} />
                        </div>
                    </AccordionGroup>
                ) : null}
            </div>
        </section>
    );
}

function StepBasics(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    operatorHint?: string | null;
    operatorContext?: PropiedadesOperatorPublishContext | null;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    onAddressBookChange: (next: AddressBookEntry[]) => void;
    communes: Array<{ id: string; name: string }>;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
    lifecyclePolicy: PublicationLifecyclePolicy;
    estimate: PropertyValuationEstimate | null;
    estimating: boolean;
    valuationSources: PropertyValuationSourceStatus[];
    refreshingSources: boolean;
    valuationRequest: PropertyValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onRefreshValuationSources: () => void | Promise<void>;
    googleMapsApiKey?: string;
}) {
    const {
        data,
        setData,
        errors,
        operatorHint,
        operatorContext,
        addressBook,
        addressBookLoading,
        onAddressBookChange,
        communes,
        onGeocodeLocation,
        geocoding,
        lifecyclePolicy,
        googleMapsApiKey,
        ...commercialProps
    } = props;

    return (
        <div className="space-y-5">
            <StepSetup data={data} setData={setData} errors={errors} operatorHint={operatorHint} operatorContext={operatorContext} />
            <StepBasic
                data={data}
                setData={setData}
                errors={errors}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                onAddressBookChange={onAddressBookChange}
                communes={communes}
                onGeocodeLocation={onGeocodeLocation}
                geocoding={geocoding}
                variant="basics"
                flat
                omitTitle
                googleMapsApiKey={googleMapsApiKey}
                showRentAdminFields={operatorContext?.showRentAdminFields ?? false}
            />
            <StepBasic
                data={data}
                setData={setData}
                errors={errors}
                addressBook={addressBook}
                addressBookLoading={addressBookLoading}
                onAddressBookChange={onAddressBookChange}
                communes={communes}
                onGeocodeLocation={onGeocodeLocation}
                geocoding={geocoding}
                variant="location"
                flat
                googleMapsApiKey={googleMapsApiKey}
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

function StepTour360Field(props: { data: WizardData; setData: WizardSetter; errors: Record<string, string> }) {
    const { data, setData, errors } = props;

    return (
        <Field label="Enlace del tour 360" hint="Opcional. Pega la URL de Matterport, Kuula u otro visor 360.">
            <input
                className={`form-input${Object.prototype.hasOwnProperty.call(errors, 'media.tour360Url') ? ' form-input-error' : ''}`}
                value={data.media.tour360Url}
                onChange={(event) => setData((current) => ({ ...current, media: { ...current.media, tour360Url: event.target.value } }))}
                placeholder="https://..."
            />
        </Field>
    );
}

function buildPropertyCopyInput(data: WizardData, communes: Array<{ id: string; name: string }>) {
    return {
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
}

function StepAttributes(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
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
    googleMapsApiKey?: string;
}) {
    const { data, setData, errors, lifecyclePolicy, ...commercialProps } = props;
    const isProject = data.setup.operationType === 'project';
    const [openSections, setOpenSections] = useState<Record<'saleOptions' | 'characteristics' | 'extended' | 'project' | 'equipment' | 'commercial' | 'tour360', boolean>>({
        saleOptions: false,
        characteristics: false,
        extended: false,
        project: false,
        equipment: false,
        commercial: false,
        tour360: false,
    });

    const toggle = (key: keyof typeof openSections) => {
        setOpenSections((current) => ({ ...current, [key]: !current[key] }));
    };

    return (
        <div className="space-y-5">
            {!isProject ? (
                <SimplePublishOptionalSection
                    title="Opciones de venta"
                    description="Precio negociable y condiciones que aparecen en la tarjeta."
                    open={openSections.saleOptions}
                    onToggle={() => toggle('saleOptions')}
                >
                    <ToggleCard
                        title="Precio negociable"
                        description="Aparece como chip en la tarjeta del aviso."
                        active={data.commercial.negotiable}
                        onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))}
                    />
                </SimplePublishOptionalSection>
            ) : null}

            {!isProject ? (
                <>
                    <SimplePublishOptionalSection
                        title="Características del inmueble"
                        description="Mascotas, amoblado y atributos adicionales de la ficha."
                        open={openSections.characteristics}
                        onToggle={() => toggle('characteristics')}
                    >
                        <PropertyInmuebleFields data={data} setData={setData} errors={errors} scope="detail" />
                    </SimplePublishOptionalSection>

                    <SimplePublishOptionalSection
                        title="Atributos extendidos"
                        description="Orientación, antigüedad, torre y condiciones especiales."
                        open={openSections.extended}
                        onToggle={() => toggle('extended')}
                    >
                        <PropertyExtendedAttributeFields data={data} setData={setData} />
                    </SimplePublishOptionalSection>
                </>
            ) : (
                <SimplePublishOptionalSection
                    title="Detalle del proyecto"
                    description="Tipologías, rangos de superficie y unidades modelo."
                    open={openSections.project}
                    onToggle={() => toggle('project')}
                >
                    <PropertyProjectDetailFields data={data} setData={setData} errors={errors} />
                </SimplePublishOptionalSection>
            )}

            <SimplePublishOptionalSection
                title="Equipamiento"
                description="Comodidades, servicios y ambientes."
                open={openSections.equipment}
                onToggle={() => toggle('equipment')}
            >
                <StepSpecs data={data} setData={setData} minimal />
            </SimplePublishOptionalSection>

            <SimplePublishOptionalSection
                title="Condiciones comerciales"
                description="Gastos comunes y disponibilidad."
                open={openSections.commercial}
                onToggle={() => toggle('commercial')}
            >
                <StepCommercial
                    data={data}
                    setData={setData}
                    errors={errors}
                    lifecyclePolicy={lifecyclePolicy}
                    hidePrice
                    {...commercialProps}
                />
            </SimplePublishOptionalSection>

            <SimplePublishOptionalSection
                title="Tour 360"
                description="Enlace opcional al recorrido virtual del inmueble."
                open={openSections.tour360}
                onToggle={() => toggle('tour360')}
            >
                <StepTour360Field data={data} setData={setData} errors={errors} />
            </SimplePublishOptionalSection>
        </div>
    );
}

function StepPublish(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
    communes: Array<{ id: string; name: string }>;
    lifecyclePolicy: PublicationLifecyclePolicy;
}) {
    const { data, setData, errors, communes, lifecyclePolicy } = props;
    const propertyCopyInput = buildPropertyCopyInput(data, communes);

    return (
        <div className="space-y-5">
            <SimplePublishSection title="Título y descripción">
                <p className="text-xs text-[var(--fg-muted)] -mt-1 mb-3">
                    Se generan según los datos que ingresaste. Puedes editarlos antes de publicar.
                </p>
                <MarketplaceListingCopyFields
                    title={data.basic.title}
                    description={data.basic.description}
                    titleInvalid={Object.prototype.hasOwnProperty.call(errors, 'basic.title')}
                    descriptionInvalid={Object.prototype.hasOwnProperty.call(errors, 'basic.description')}
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
                    titlePlaceholder={data.setup.operationType === 'project' ? 'Ej: Proyecto con entrega inmediata en Ñuñoa' : 'Ej: Departamento 3D 2B en Providencia'}
                    descriptionPlaceholder="Describe distribución, entorno y ventajas del inmueble."
                />
            </SimplePublishSection>

            <PanelNotice tone="neutral">{lifecyclePolicy.notice}</PanelNotice>
        </div>
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
    const googleMapsApiKey = useGoogleMapsBrowserKey();
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
    const [savingDraft, setSavingDraft] = useState(false);
    const [mediaUploadProgress, setMediaUploadProgress] = useState<DraftMediaUploadProgress | null>(null);
    const [resettingWizard, setResettingWizard] = useState(false);
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
            const result = await fetchPublishAddressBook('propiedades');
            if (!mounted) return;
            setAddressBook(result.items);
            setAddressBookLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (addressBookLoading || isEditing || draftLoaded || addressBook.length === 0) return;
        setData((current) => {
            if (current.location.regionId && current.location.addressLine1?.trim()) return current;
            const defaultAddr = pickDefaultPublishAddress(addressBook, 'propiedades');
            if (!defaultAddr) return current;
            return {
                ...current,
                location: applyAddressBookEntryToLocation(defaultAddr, current.location),
            };
        });
    }, [addressBook, addressBookLoading, isEditing, draftLoaded]);

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

    const saveDraft = async (manual: boolean): Promise<boolean> => {
        setSavingDraft(true);
        setMediaUploadProgress(null);
        try {
        const prepared = await preparePropiedadesDraftMedia(dataRef.current, {
            onMediaProgress: setMediaUploadProgress,
        });
        if (!prepared.ok || !prepared.data) {
            setStorageError(prepared.error || 'No se pudieron subir los archivos del borrador.');
            return false;
        }
        dataRef.current = prepared.data;
        setData(prepared.data);
        const serialized = serializeDraft(prepared.data, estimateRef.current);
        const result = await savePanelListingDraft('propiedades', serialized);
        if (!result.ok) {
            if (result.unauthorized) {
                requireAuth();
            }
            setStorageError(result.error || 'No se pudo guardar el borrador.');
            return false;
        }
        setLastSavedAt(serialized.savedAt);
        setStorageError(null);
        if (manual) setDraftSavedNote('Borrador guardado');
        return true;
        } finally {
            setSavingDraft(false);
            setMediaUploadProgress(null);
        }
    };

    const saveEditingChanges = async (): Promise<boolean> => {
        if (!editingId) return false;
        setSavingDraft(true);
        setMessage(null);
        setMediaUploadProgress(null);
        try {
            const prepared = await preparePropiedadesDraftMedia(dataRef.current, {
                onMediaProgress: setMediaUploadProgress,
            });
            if (!prepared.ok || !prepared.data) {
                setStorageError(prepared.error || 'No se pudieron subir los archivos.');
                return false;
            }
            dataRef.current = prepared.data;
            setData(prepared.data);

            const { regionName, communeName } = resolveLocationNames(
                prepared.data.location.regionId,
                prepared.data.location.communeId,
            );
            const normalizedLocation = patchListingLocation(prepared.data.location, {
                regionName: regionName || prepared.data.location.regionName,
                communeName: communeName || prepared.data.location.communeName,
            });
            const locationLabel = normalizedLocation.publicLabel
                || normalizedLocation.addressLine1?.trim()
                || [normalizedLocation.neighborhood, communeName || prepared.data.location.communeId, regionName || prepared.data.location.regionId].filter(Boolean).join(', ');

            const offerPriceValue = prepared.data.setup.operationType !== 'project'
                ? resolveOfferPriceValue({
                    mainPrice: prepared.data.commercial.price,
                    offerPrice: prepared.data.commercial.offerPrice,
                    discountPercent: prepared.data.commercial.discountPercent,
                    offerPriceMode: prepared.data.commercial.offerPriceMode,
                    parseMainPrice: (value) => parseNumber(value),
                })
                : '';

            const finalData = {
                ...prepared.data,
                commercial: {
                    ...prepared.data.commercial,
                    offerPrice: offerPriceValue,
                },
                location: normalizedLocation,
            };

            const payload = {
                listingType: finalData.setup.operationType,
                title: finalData.basic.title.trim() || 'Sin título',
                description: finalData.basic.description.trim(),
                priceLabel: buildPriceLabel(finalData),
                location: locationLabel || undefined,
                locationData: normalizedLocation,
                href: finalData.commercial.slug.trim() ? `/propiedad/${finalData.commercial.slug.trim()}` : undefined,
                rawData: {
                    ...finalData,
                    basic: createPropertyBasicForPayload(finalData),
                    media: {
                        ...finalData.media,
                        photos: finalData.media.photos,
                    },
                    location: normalizedLocation,
                    valuation: estimateRef.current,
                    publicationLifecycle: lifecyclePolicy,
                },
            };

            const result = await updatePanelListing(editingId, payload);
            if (!result.ok) {
                if (result.unauthorized) {
                    requireAuth();
                }
                setMessage(result.error || 'No se pudieron guardar los cambios.');
                return false;
            }
            setStorageError(null);
            setDraftSavedNote('Cambios guardados');
            return true;
        } finally {
            setSavingDraft(false);
            setMediaUploadProgress(null);
        }
    };

    const goNext = async () => {
        const nextErrors = validateStep(step, data);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setMessage(null);
            return;
        }
        setMessage(null);
        if (stepIndex < STEPS.length - 1) {
            const saved = await saveDraft(false);
            if (!saved) return;
            setErrors({});
            setStep(STEPS[stepIndex + 1].id);
        }
    };

    const goBack = () => {
        if (stepIndex > 0) {
            setErrors({});
            setStep(STEPS[stepIndex - 1].id);
        }
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
                setMessage(null);
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
        setData((current) => ({ ...current, review: { ...current.review, acceptTerms: true } }));

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

        const offerPriceValue = data.setup.operationType !== 'project'
            ? resolveOfferPriceValue({
                mainPrice: data.commercial.price,
                offerPrice: data.commercial.offerPrice,
                discountPercent: data.commercial.discountPercent,
                offerPriceMode: data.commercial.offerPriceMode,
                parseMainPrice: (value) => parseNumber(value),
            })
            : '';

        const finalData = {
            ...data,
            commercial: {
                ...data.commercial,
                offerPrice: offerPriceValue,
            },
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

    const resetWizard = async (options?: { confirm?: boolean }) => {
        if (options?.confirm !== false && !window.confirm('¿Reiniciar el borrador? Se borrarán todos los datos y volverás al paso 1.')) {
            return;
        }
        setResettingWizard(true);
        try {
            await deletePanelListingDraft('propiedades').catch(() => null);
            setPublished(null);
            setData(createDefaultData());
            setEstimate(null);
            setErrors({});
            setMessage(null);
            setStorageError(null);
            setLastSavedAt(null);
            setStep('media');
            setDraftLoaded(true);
            setDraftSavedNote(options?.confirm === false ? null : 'Borrador reiniciado');
        } finally {
            setResettingWizard(false);
        }
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
                onReset={() => { void resetWizard({ confirm: false }); }}
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
            subtitle={isEditing ? 'Actualiza los datos de tu aviso.' : 'Multimedia, datos esenciales y publicación.'}
            steps={STEPS.map((item) => ({ key: item.id, label: item.label, helper: item.helper }))}
            stepIndex={stepIndex}
            isEditing={isEditing}
            onBack={goBack}
            onClose={() => router.push('/panel')}
            onStepChange={(key) => {
                const targetIndex = STEPS.findIndex((item) => item.id === key);
                if (targetIndex <= stepIndex) {
                    setErrors({});
                    setStep(key as StepId);
                }
            }}
            headerReset={!isEditing ? {
                onClick: () => { void resetWizard({ confirm: true }); },
                loading: resettingWizard,
                disabled: publishing || editingLoading || resettingWizard,
                ariaLabel: 'Reiniciar borrador',
            } : undefined}
            headerSave={{
                onClick: () => { void (isEditing ? saveEditingChanges() : saveDraft(true)); },
                ariaLabel: isEditing ? 'Guardar cambios' : 'Guardar borrador',
                loading: savingDraft,
                disabled: publishing || editingLoading,
            }}
            headerContinue={{
                label: continueLabel,
                icon: step === 'publish' ? 'check' : 'arrow',
                onClick: () => {
                    if (step === 'publish') void publishNow();
                    else void goNext();
                },
                disabled: publishing || savingDraft || editingLoading || editLoadFailed || (step === 'publish' && publishBlocked),
                loading: publishing || savingDraft,
            }}
            notices={(
                <>
                    <MarketplacePublishPlanLimitNotice vertical="propiedades" isEditing={isEditing} planLimit={planLimit} />
                    {!isEditing ? (
                        <PanelNotice tone="neutral">
                            ¿Prefieres que gestionemos la venta o el arriendo por ti?{' '}
                            <Link href="/servicios/venta-asistida" className="font-medium underline underline-offset-2">
                                Ver gestión inmobiliaria
                            </Link>
                        </PanelNotice>
                    ) : null}
                    {message ? <MarketplacePublishMessageNotice message={message} /> : null}
                    {storageError ? <PanelNotice tone="error">{storageError}</PanelNotice> : null}
                    <SimplePublishMediaUploadNotice progress={mediaUploadProgress} />
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
                {step === 'basics' && (
                    <StepBasics
                        data={data}
                        setData={setData}
                        errors={errors}
                        operatorHint={operatorHint}
                        operatorContext={operatorContext as PropiedadesOperatorPublishContext}
                        addressBook={addressBook}
                        addressBookLoading={addressBookLoading}
                        onAddressBookChange={setAddressBook}
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
                        googleMapsApiKey={googleMapsApiKey}
                    />
                )}
                {step === 'attributes' && (
                    <StepAttributes
                        data={data}
                        setData={setData}
                        errors={errors}
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
                        googleMapsApiKey={googleMapsApiKey}
                    />
                )}
                {step === 'publish' && (
                    <StepPublish
                        data={data}
                        setData={setData}
                        errors={errors}
                        communes={communes}
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
                        else void goNext();
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
