'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconArrowRight,
    IconBus,
    IconBulldozer,
    IconCalculator,
    IconCheck,
    IconCircleCheck,
    IconDeviceFloppy,
    IconGavel,
    IconMotorbike,
    IconPlaneTilt,
    IconChevronDown,
    IconChevronUp,
    IconCar,
    IconKey,
    IconSailboat,
    IconSparkles,
    IconTruck,
} from '@tabler/icons-react';
import { ColorPicker, VEHICLE_COLORS } from '@/components/ui/color-picker';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import QuickPublishFlow from '@/components/quick-publish/QuickPublishFlow';
import { generateListingText } from '@/actions/generate-listing-text';
import type { QuickBasicData } from '@/components/quick-publish/types';
import ModernSelect, { type ModernSelectOption } from '@/components/ui/modern-select';
import Step1Photos from '@/components/quick-publish/Step1Photos';
import Step2BasicData from '@/components/quick-publish/Step2BasicData';
import { processQuickFile } from '@/lib/quick-image-utils';
import { useAuth } from '@/context/auth-context';
import { getPublicationLifecyclePolicy, type PublicationLifecyclePolicy } from '@simple/config';
import {
    type PublishWizardCatalog,
    type VehicleCatalogType,
    getBrandsForVehicleType,
    getModelsForBrand,
    getVersionsForModel,
    loadPublishWizardCatalog,
} from '@/lib/publish-wizard-catalog';
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
    type VehicleValuationEstimate,
    type VehicleValuationRequest,
    type VehicleValuationSourceStatus,
    patchListingLocation,
} from '@simple/types';
import {
    estimateVehicleValue,
    fetchVehicleValuationSources,
    fetchAddressBook,
    getCommuneById,
    getRegionById,
    geocodeListingLocation,
    getCommunesForRegion as getLocationCommunesForRegion,
    LOCATION_COMMUNES,
    LOCATION_REGIONS,
    refreshVehicleValuationSources,
} from '@simple/utils';
import { ListingLocationEditor, PanelActions, PanelBlockHeader, PanelButton, PanelCard, PanelChoiceCard, PanelDocumentUploader, PanelMediaUploader, PanelNotice, PanelStepNav, PanelSummaryCard, PanelVideoUploader, type PanelDocumentAsset, type PanelMediaAsset, type PanelVideoAsset } from '@simple/ui';

type StepId = 'setup' | 'basic' | 'specs' | 'media' | 'commercial' | 'review';
type ListingType = 'sale' | 'rent' | 'auction';

type WizardPhoto = PanelMediaAsset;

interface WizardData {
    setup: { listingType: ListingType; vehicleType: VehicleCatalogType };
    basic: {
        brandId: string;
        customBrand: string;
        modelId: string;
        customModel: string;
        title: string;
        description: string;
        year: string;
        version: string;
        versionMode: 'catalog' | 'manual';
        color: string;
        mileage: string;
        condition: string;
        bodyType: string;
        fuelType: string;
        transmission: string;
        traction: string;
        engineSize: string;
        powerHp: string;
        doors: string;
        seats: string;
        exteriorColor: string;
        interiorColor: string;
        vin: string;
        plate: string;
        tags: string;
        specific: Record<string, string>;
        complementary: Record<string, string>;
    };
    specs: { historyFlags: string[]; featureCodes: string[]; notes: string };
    media: { photos: WizardPhoto[]; videoUrl: string; discoverVideo: PanelVideoAsset | null; documents: PanelDocumentAsset[] };
    location: ListingLocation;
    commercial: {
        currency: 'CLP' | 'USD';
        price: string;
        offerPrice: string;
        rentDaily: string;
        rentWeekly: string;
        rentMonthly: string;
        rentMinDays: string;
        rentKmPerDayIncluded: string;
        rentInsuranceIncluded: boolean;
        rentAvailableFrom: string;
        rentAvailableTo: string;
        rentDeposit: string;
        rentRequirements: string;
        auctionStartPrice: string;
        auctionReservePrice: string;
        auctionMinIncrement: string;
        auctionStartAt: string;
        auctionEndAt: string;
        durationDays: '30' | '60' | '90';
        autoRenew: boolean;
        featured: boolean;
        urgent: boolean;
        negotiable: boolean;
        financingAvailable: boolean;
        exchangeAvailable: boolean;
        slug: string;
        metaTitle: string;
        metaDescription: string;
    };
    review: { acceptTerms: boolean };
}

interface PersistedDraft {
    version: number;
    savedAt: string;
    valuationEstimate: VehicleValuationEstimate | null;
    data: Omit<WizardData, 'media'> & {
        media: Omit<WizardData['media'], 'photos' | 'discoverVideo'> & {
            photos: Array<Pick<WizardPhoto, 'id' | 'name' | 'isCover' | 'width' | 'height' | 'sizeBytes' | 'mimeType'>>;
            discoverVideo: Pick<PanelVideoAsset, 'id' | 'name' | 'width' | 'height' | 'sizeBytes' | 'mimeType' | 'durationSeconds'> | null;
            documents: PanelDocumentAsset[];
        };
    };
}

const MAX_PHOTOS = 20;
const AUTO_MEDIA_GUIDE_SLOTS = [
    { key: 'cover', label: 'Portada' },
    { key: 'front', label: 'Frente' },
    { key: 'rear', label: 'Trasera' },
    { key: 'left', label: 'Izquierdo' },
    { key: 'right', label: 'Derecho' },
    { key: 'interior', label: 'Interior' },
    { key: 'seats', label: 'Asientos' },
    { key: 'engine', label: 'Motor' },
    { key: 'detail', label: 'Detalles' },
    { key: 'km', label: 'Kilometraje' },
] as const;

const STEPS: Array<{ id: StepId; label: string; helper: string }> = [
    { id: 'setup', label: 'Tipo', helper: 'Categoría y formato' },
    { id: 'basic', label: 'Datos', helper: 'Ficha principal' },
    { id: 'specs', label: 'Ant. y equip.', helper: 'Antecedentes y extras' },
    { id: 'media', label: 'Multimedia', helper: 'Fotos y video' },
    { id: 'commercial', label: 'Comercial', helper: 'Precio y publicación' },
    { id: 'review', label: 'Revisión', helper: 'Validación final' },
];

const LISTING_CARDS: Array<{ value: ListingType; label: string; icon: React.ReactNode }> = [
    { value: 'sale', label: 'Venta', icon: <IconCar size={15} /> },
    { value: 'rent', label: 'Arriendo', icon: <IconKey size={15} /> },
    { value: 'auction', label: 'Subasta', icon: <IconGavel size={15} /> },
];

const VEHICLE_TYPE_OPTIONS: Array<{ value: VehicleCatalogType; label: string; icon: React.ReactNode }> = [
    { value: 'car', label: 'Autos y SUV', icon: <IconCar size={15} /> },
    { value: 'motorcycle', label: 'Motos', icon: <IconMotorbike size={15} /> },
    { value: 'truck', label: 'Camiones', icon: <IconTruck size={15} /> },
    { value: 'bus', label: 'Buses', icon: <IconBus size={15} /> },
    { value: 'machinery', label: 'Maquinaria', icon: <IconBulldozer size={15} /> },
    { value: 'nautical', label: 'Náutico', icon: <IconSailboat size={15} /> },
    { value: 'aerial', label: 'Aéreo', icon: <IconPlaneTilt size={15} /> },
];

const VEHICLE_FEATURE_SECTIONS: Partial<Record<VehicleCatalogType, Array<{ title: string; codes: string[] }>>> = {
    car: [
        { title: 'Seguridad', codes: ['abs', 'esp', 'airbags', 'camera', 'camera_360', 'parking', 'lane_assist', 'blind_spot'] },
        { title: 'Confort', codes: ['climate', 'leather', 'heated_seats', 'keyless', 'cruise_control', 'adaptive_cruise', 'electric_tailgate'] },
        { title: 'Conectividad', codes: ['bluetooth', 'android_auto', 'apple_carplay', 'wireless_charging'] },
        { title: 'Exterior y performance', codes: ['alloy', 'led', 'sunroof', 'turbo'] },
    ],
    motorcycle: [
        { title: 'Seguridad y manejo', codes: ['abs', 'traction_control', 'quick_shifter', 'slipper_clutch'] },
        { title: 'Viaje y accesorios', codes: ['top_case', 'side_bags', 'heated_grips', 'handguards', 'central_stand', 'usb_port', 'led_lights', 'phone_mount'] },
    ],
    truck: [
        { title: 'Operación', codes: ['air_brakes', 'retarder', 'stability_control', 'differential_lock', 'tachograph'] },
        { title: 'Cabina y carga', codes: ['gps_fleet', 'refrigerated_box', 'liftgate', 'sleep_cabin', 'air_suspension', 'reverse_camera'] },
    ],
    bus: [
        { title: 'Pasajeros', codes: ['ac', 'wifi', 'toilet', 'reclining_seats', 'wheelchair_lift', 'usb_ports', 'seat_belts'] },
        { title: 'Operación', codes: ['curtains', 'luggage_racks', 'entertainment_system', 'air_suspension'] },
    ],
    machinery: [
        { title: 'Trabajo', codes: ['hydraulic_line', 'quick_coupler', 'hammer_line', 'grade_control', 'auto_lube'] },
        { title: 'Cabina y seguridad', codes: ['air_conditioning', 'enclosed_cab', 'telematics', 'rear_camera', 'anti_theft', 'beacon_light'] },
    ],
    nautical: [
        { title: 'Navegación', codes: ['gps', 'sonar', 'autopilot', 'vhf_radio', 'fishfinder', 'depth_sounder'] },
        { title: 'Cobertura y energía', codes: ['cabin', 'trailer', 'bimini_top', 'anchor_winch', 'inverter'] },
    ],
    aerial: [
        { title: 'Vuelo y navegación', codes: ['autopilot', 'ifr', 'transponder', 'adsb', 'terrain_awareness', 'traffic_alert'] },
        { title: 'Cabina y clima', codes: ['weather_radar', 'deicing', 'glass_cockpit', 'oxygen_system', 'stormscope'] },
    ],
};

const CONDITION_OPTIONS = [
    { value: 'Nuevo', label: 'Nuevo' },
    { value: 'Seminuevo', label: 'Seminuevo' },
    { value: 'Usado', label: 'Usado' },
    { value: 'Para reparar', label: 'Para reparar' },
];
const CAR_BODY_TYPES = ['Sedán', 'SUV', 'Hatchback', 'Pickup', 'Station Wagon', 'Coupé', 'Convertible', 'Liftback', 'Crossover', 'Van', 'Minivan', 'Motorhome'];
const BODY_TYPE_OPTIONS_BY_VEHICLE: Record<VehicleCatalogType, string[]> = {
    car: CAR_BODY_TYPES,
    motorcycle: ['Scooter', 'Naked', 'Enduro', 'Trail', 'Deportiva', 'Touring', 'Custom', 'ATV / Cuatrimoto'],
    truck: ['Tracto', 'Rígido', 'Tolva', 'Frigorífico', 'Aljibe', 'Pluma'],
    bus: ['Urbano', 'Interurbano', 'Escolar', 'Turismo'],
    machinery: ['Excavadora', 'Retroexcavadora', 'Cargador frontal', 'Grúa', 'Bulldozer', 'Rodillo'],
    nautical: ['Lancha', 'Yate', 'Velero', 'Moto de agua', 'Catamarán'],
    aerial: ['Avión', 'Helicóptero', 'Ultraliviano'],
};
const BODY_TYPE_SPECIFIC_MIRRORS: Partial<Record<VehicleCatalogType, string>> = {
    motorcycle: 'moto_type',
    truck: 'truck_type',
    bus: 'bus_type',
    machinery: 'machine_type',
    nautical: 'vessel_type',
    aerial: 'aircraft_type',
};
const BODY_TYPE_LABELS: Record<VehicleCatalogType, string> = {
    car: 'Carrocería',
    motorcycle: 'Tipo de moto',
    truck: 'Tipo de camión',
    bus: 'Tipo de bus',
    machinery: 'Tipo de maquinaria',
    nautical: 'Tipo de embarcación',
    aerial: 'Tipo de aeronave',
};
const FUEL_OPTIONS = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas', 'Otro'];
const TRANSMISSION_OPTIONS = ['Manual', 'Automática', 'CVT'];
const TRACTION_OPTIONS = ['FWD', 'RWD', 'AWD', '4WD'];
const YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1989 + 1 }, (_, index) => String(new Date().getFullYear() + 1 - index));
const VEHICLE_COLOR_OPTIONS: ModernSelectOption[] = VEHICLE_COLORS.map(c => ({ value: c.label, label: c.label, swatchColor: c.hex }));

type SpecificFieldInput = 'text' | 'number' | 'select' | 'date';
type DynamicFieldScope = 'basic' | 'specific' | 'complementary';
type ComplementaryFieldGroup = 'legal' | 'history';

interface VehicleFieldDef {
    id: string;
    label: string;
    input: SpecificFieldInput;
    scope: DynamicFieldScope;
    required?: boolean;
    options?: string[];
    selectOptions?: ModernSelectOption[];
    placeholder?: string;
    upperCase?: boolean;
    group?: ComplementaryFieldGroup;
    mirrorToSpecificId?: string;
}

const YES_NO_OPTIONS = ['Sí', 'No'];
const YES_NO_UNKNOWN_OPTIONS = ['Sí', 'No', 'No informa'];

const VEHICLE_SPECIFIC_FIELDS: Record<VehicleCatalogType, VehicleFieldDef[]> = {
    car: [
        { id: 'doors', label: 'Puertas', input: 'number', scope: 'basic' },
        { id: 'seats', label: 'Asientos', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'traction', label: 'Tracción', input: 'select', scope: 'basic', options: TRACTION_OPTIONS },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'engine_displacement', label: 'Cilindrada', input: 'number', scope: 'specific' },
        { id: 'consumption', label: 'Consumo', input: 'text', scope: 'specific', placeholder: 'Ej: 14 km/l' },
        { id: 'vin', label: 'VIN', input: 'text', scope: 'basic', upperCase: true },
        { id: 'plate', label: 'Patente', input: 'text', scope: 'basic', upperCase: true },
    ],
    motorcycle: [
        { id: 'seats', label: 'Asientos', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'engine_cc', label: 'Cilindrada', input: 'number', scope: 'specific', required: true },
        { id: 'consumption', label: 'Consumo', input: 'text', scope: 'specific', placeholder: 'Ej: 28 km/l' },
        { id: 'vin', label: 'VIN', input: 'text', scope: 'basic', upperCase: true },
        { id: 'plate', label: 'Patente', input: 'text', scope: 'basic', upperCase: true },
        { id: 'starter_type', label: 'Arranque', input: 'select', scope: 'specific', options: ['Eléctrico', 'Pedal', 'Mixto'] },
        { id: 'cooling_type', label: 'Refrigeración', input: 'select', scope: 'specific', options: ['Aire', 'Líquida', 'Mixta'] },
    ],
    truck: [
        { id: 'doors', label: 'Puertas', input: 'number', scope: 'basic' },
        { id: 'seats', label: 'Asientos', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'traction', label: 'Tracción', input: 'select', scope: 'basic', options: TRACTION_OPTIONS },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'engine_displacement', label: 'Cilindrada', input: 'number', scope: 'specific' },
        { id: 'consumption', label: 'Consumo', input: 'text', scope: 'specific', placeholder: 'Ej: 4 km/l' },
        { id: 'vin', label: 'VIN', input: 'text', scope: 'basic', upperCase: true },
        { id: 'plate', label: 'Patente', input: 'text', scope: 'basic', upperCase: true },
        { id: 'axle_config', label: 'Configuración de ejes', input: 'select', scope: 'specific', required: true, options: ['4x2', '6x2', '6x4', '8x4'] },
        { id: 'load_capacity_kg', label: 'Capacidad de carga (kg)', input: 'number', scope: 'specific', required: true },
        { id: 'gross_weight_kg', label: 'Peso bruto (kg)', input: 'number', scope: 'specific' },
        { id: 'cabin_type', label: 'Cabina', input: 'select', scope: 'specific', options: ['Simple', 'Doble', 'Dormitorio'] },
    ],
    bus: [
        { id: 'doors', label: 'Puertas', input: 'number', scope: 'basic' },
        { id: 'seats', label: 'Capacidad de asientos', input: 'number', scope: 'basic', required: true, mirrorToSpecificId: 'seat_capacity' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'traction', label: 'Tracción', input: 'select', scope: 'basic', options: TRACTION_OPTIONS },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'engine_displacement', label: 'Cilindrada', input: 'number', scope: 'specific' },
        { id: 'consumption', label: 'Consumo', input: 'text', scope: 'specific', placeholder: 'Ej: 3 km/l' },
        { id: 'vin', label: 'VIN', input: 'text', scope: 'basic', upperCase: true },
        { id: 'plate', label: 'Patente', input: 'text', scope: 'basic', upperCase: true },
        { id: 'standing_capacity', label: 'Capacidad de pie', input: 'number', scope: 'specific' },
        { id: 'wheelchair_access', label: 'Acceso universal', input: 'select', scope: 'specific', options: YES_NO_OPTIONS },
    ],
    machinery: [
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'traction', label: 'Tracción', input: 'select', scope: 'basic', options: TRACTION_OPTIONS },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'plate', label: 'Patente', input: 'text', scope: 'basic', upperCase: true },
        { id: 'operating_hours', label: 'Horas de operación', input: 'number', scope: 'specific', required: true },
        { id: 'operating_weight_ton', label: 'Peso operativo (ton)', input: 'number', scope: 'specific' },
        { id: 'bucket_capacity_m3', label: 'Capacidad balde (m³)', input: 'number', scope: 'specific' },
    ],
    nautical: [
        { id: 'seats', label: 'Asientos', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'length_ft', label: 'Eslora (ft)', input: 'number', scope: 'specific', required: true },
        { id: 'beam_ft', label: 'Manga (ft)', input: 'number', scope: 'specific' },
        { id: 'engine_hours', label: 'Horas motor', input: 'number', scope: 'specific' },
        { id: 'hull_material', label: 'Material de casco', input: 'select', scope: 'specific', options: ['Fibra', 'Aluminio', 'Acero', 'Madera'] },
    ],
    aerial: [
        { id: 'seats', label: 'Asientos', input: 'number', scope: 'basic' },
        { id: 'interiorColor', label: 'Color interior', input: 'select', scope: 'basic', selectOptions: VEHICLE_COLOR_OPTIONS },
        { id: 'engineSize', label: 'Motor', input: 'text', scope: 'basic' },
        { id: 'powerHp', label: 'HP (Potencia)', input: 'number', scope: 'basic' },
        { id: 'flight_hours', label: 'Horas de vuelo', input: 'number', scope: 'specific', required: true },
        { id: 'registration_code', label: 'Matrícula aeronave', input: 'text', scope: 'specific', required: true, upperCase: true },
        { id: 'airworthiness_until', label: 'Certificación vigente hasta', input: 'date', scope: 'specific' },
        { id: 'range_km', label: 'Alcance (km)', input: 'number', scope: 'specific' },
    ],
};

const COMPLEMENTARY_FIELDS_BY_VEHICLE: Record<VehicleCatalogType, VehicleFieldDef[]> = {
    car: [
        { id: 'emission_standard', label: 'Normas de emisión', input: 'select', scope: 'complementary', group: 'legal', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Otro'] },
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'technical_review_status', label: 'Revisión técnica al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_certified', label: 'Vidrios polarizados certificados FTRL', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_details', label: 'Detalle certificación FTRL', input: 'text', scope: 'complementary', group: 'legal', placeholder: 'Ej: sello FTRL / instalador autorizado' },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    motorcycle: [
        { id: 'emission_standard', label: 'Normas de emisión', input: 'select', scope: 'complementary', group: 'legal', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Otro'] },
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'technical_review_status', label: 'Revisión técnica al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    truck: [
        { id: 'emission_standard', label: 'Normas de emisión', input: 'select', scope: 'complementary', group: 'legal', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Otro'] },
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'technical_review_status', label: 'Revisión técnica al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_certified', label: 'Vidrios polarizados certificados FTRL', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_details', label: 'Detalle certificación FTRL', input: 'text', scope: 'complementary', group: 'legal', placeholder: 'Ej: sello FTRL / instalador autorizado' },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    bus: [
        { id: 'emission_standard', label: 'Normas de emisión', input: 'select', scope: 'complementary', group: 'legal', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Otro'] },
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'technical_review_status', label: 'Revisión técnica al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_certified', label: 'Vidrios polarizados certificados FTRL', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'tinted_windows_ftrl_details', label: 'Detalle certificación FTRL', input: 'text', scope: 'complementary', group: 'legal', placeholder: 'Ej: sello FTRL / instalador autorizado' },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    machinery: [
        { id: 'emission_standard', label: 'Normas de emisión', input: 'select', scope: 'complementary', group: 'legal', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'EPA Tier 3', 'Otro'] },
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    nautical: [
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
    aerial: [
        { id: 'owners_count', label: 'Cantidad de dueños', input: 'number', scope: 'complementary', group: 'history' },
        { id: 'maintenance_status', label: 'Mantenciones al día', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'papers_status', label: 'Papeles al día', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'warranty_status', label: 'Garantía vigente', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'invoice_status', label: 'Factura', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'manual_status', label: 'Manual original', input: 'select', scope: 'complementary', group: 'legal', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'accidents_status', label: 'Siniestros declarados', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'original_paint_status', label: 'Pintura original declarada', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
        { id: 'imported_status', label: 'Importado', input: 'select', scope: 'complementary', group: 'history', options: YES_NO_UNKNOWN_OPTIONS },
    ],
};

const VEHICLE_FEATURE_OPTIONS: Record<VehicleCatalogType, Array<{ code: string; label: string }>> = {
    car: [
        { code: 'abs', label: 'ABS' },
        { code: 'esp', label: 'ESP' },
        { code: 'airbags', label: 'Airbags' },
        { code: 'camera', label: 'Cámara retroceso' },
        { code: 'camera_360', label: 'Cámara 360°' },
        { code: 'parking', label: 'Sensores estacionamiento' },
        { code: 'climate', label: 'Climatizador' },
        { code: 'leather', label: 'Asientos cuero' },
        { code: 'heated_seats', label: 'Asientos calefaccionados' },
        { code: 'keyless', label: 'Keyless' },
        { code: 'cruise_control', label: 'Control crucero' },
        { code: 'adaptive_cruise', label: 'Crucero adaptativo' },
        { code: 'lane_assist', label: 'Asistente de carril' },
        { code: 'blind_spot', label: 'Monitor punto ciego' },
        { code: 'bluetooth', label: 'Bluetooth' },
        { code: 'android_auto', label: 'Android Auto' },
        { code: 'apple_carplay', label: 'Apple CarPlay' },
        { code: 'wireless_charging', label: 'Carga inalámbrica' },
        { code: 'alloy', label: 'Llantas aleación' },
        { code: 'led', label: 'Luces LED' },
        { code: 'sunroof', label: 'Techo panorámico' },
        { code: 'electric_tailgate', label: 'Portalón eléctrico' },
        { code: 'turbo', label: 'Turbo' },
    ],
    motorcycle: [
        { code: 'abs', label: 'ABS' },
        { code: 'traction_control', label: 'Control de tracción' },
        { code: 'quick_shifter', label: 'Quick shifter' },
        { code: 'slipper_clutch', label: 'Embrague antirrebote' },
        { code: 'top_case', label: 'Top case' },
        { code: 'side_bags', label: 'Alforjas laterales' },
        { code: 'heated_grips', label: 'Puños calefaccionados' },
        { code: 'handguards', label: 'Cubrepuños' },
        { code: 'central_stand', label: 'Pata central' },
        { code: 'usb_port', label: 'Puerto USB' },
        { code: 'led_lights', label: 'Iluminación LED' },
        { code: 'phone_mount', label: 'Soporte smartphone' },
    ],
    truck: [
        { code: 'air_brakes', label: 'Frenos de aire' },
        { code: 'retarder', label: 'Retarder' },
        { code: 'stability_control', label: 'Control de estabilidad' },
        { code: 'differential_lock', label: 'Bloqueo diferencial' },
        { code: 'gps_fleet', label: 'GPS flota' },
        { code: 'refrigerated_box', label: 'Caja refrigerada' },
        { code: 'liftgate', label: 'Plataforma elevadora' },
        { code: 'sleep_cabin', label: 'Cabina dormitorio' },
        { code: 'air_suspension', label: 'Suspensión neumática' },
        { code: 'reverse_camera', label: 'Cámara retroceso' },
        { code: 'tachograph', label: 'Tacógrafo' },
    ],
    bus: [
        { code: 'ac', label: 'Aire acondicionado' },
        { code: 'wifi', label: 'WiFi a bordo' },
        { code: 'toilet', label: 'Baño' },
        { code: 'reclining_seats', label: 'Asientos reclinables' },
        { code: 'wheelchair_lift', label: 'Elevador silla de ruedas' },
        { code: 'usb_ports', label: 'Puertos USB' },
        { code: 'seat_belts', label: 'Cinturones en asientos' },
        { code: 'curtains', label: 'Cortinas' },
        { code: 'luggage_racks', label: 'Portaequipaje interior' },
        { code: 'entertainment_system', label: 'Sistema entretenimiento' },
        { code: 'air_suspension', label: 'Suspensión neumática' },
    ],
    machinery: [
        { code: 'hydraulic_line', label: 'Línea hidráulica auxiliar' },
        { code: 'quick_coupler', label: 'Acople rápido' },
        { code: 'air_conditioning', label: 'Cabina con A/C' },
        { code: 'enclosed_cab', label: 'Cabina cerrada' },
        { code: 'telematics', label: 'Telemetría' },
        { code: 'rear_camera', label: 'Cámara trasera' },
        { code: 'anti_theft', label: 'Sistema antirrobo' },
        { code: 'beacon_light', label: 'Baliza' },
        { code: 'hammer_line', label: 'Línea para martillo' },
        { code: 'grade_control', label: 'Control de nivelación' },
        { code: 'auto_lube', label: 'Lubricación automática' },
    ],
    nautical: [
        { code: 'gps', label: 'GPS' },
        { code: 'sonar', label: 'Sonda / Sonar' },
        { code: 'autopilot', label: 'Piloto automático' },
        { code: 'cabin', label: 'Cabina' },
        { code: 'trailer', label: 'Incluye tráiler' },
        { code: 'vhf_radio', label: 'Radio VHF' },
        { code: 'fishfinder', label: 'Fishfinder' },
        { code: 'bimini_top', label: 'Bimini top' },
        { code: 'anchor_winch', label: 'Molinete ancla' },
        { code: 'depth_sounder', label: 'Profundímetro' },
        { code: 'inverter', label: 'Inversor de corriente' },
    ],
    aerial: [
        { code: 'autopilot', label: 'Piloto automático' },
        { code: 'ifr', label: 'IFR' },
        { code: 'transponder', label: 'Transponder' },
        { code: 'adsb', label: 'ADS-B' },
        { code: 'weather_radar', label: 'Radar meteorológico' },
        { code: 'deicing', label: 'Sistema anti-hielo' },
        { code: 'glass_cockpit', label: 'Glass cockpit' },
        { code: 'terrain_awareness', label: 'Alerta de terreno' },
        { code: 'oxygen_system', label: 'Sistema de oxígeno' },
        { code: 'stormscope', label: 'Stormscope' },
        { code: 'traffic_alert', label: 'Alerta de tráfico' },
    ],
};

function createDefaultData(): WizardData {
    return {
        setup: { listingType: 'sale', vehicleType: 'car' },
        basic: {
            brandId: '',
            customBrand: '',
            modelId: '',
            customModel: '',
            title: '',
            description: '',
            year: '',
            version: '',
            versionMode: 'catalog',
            mileage: '',
            color: '',
            condition: '',
            bodyType: '',
            fuelType: '',
            transmission: '',
            traction: '',
            engineSize: '',
            powerHp: '',
            doors: '',
            seats: '',
            exteriorColor: '',
            interiorColor: '',
            vin: '',
            plate: '',
            tags: '',
            specific: {},
            complementary: {},
        },
        specs: { historyFlags: [], featureCodes: [], notes: '' },
        media: { photos: [], videoUrl: '', discoverVideo: null, documents: [] },
        location: createEmptyListingLocation({
            sourceMode: 'custom',
            countryCode: 'CL',
            visibilityMode: 'exact',
            publicMapEnabled: true,
        }),
        commercial: {
            currency: 'CLP',
            price: '',
            offerPrice: '',
            rentDaily: '',
            rentWeekly: '',
            rentMonthly: '',
            rentMinDays: '',
            rentKmPerDayIncluded: '',
            rentInsuranceIncluded: false,
            rentAvailableFrom: '',
            rentAvailableTo: '',
            rentDeposit: '',
            rentRequirements: '',
            auctionStartPrice: '',
            auctionReservePrice: '',
            auctionMinIncrement: '',
            auctionStartAt: '',
            auctionEndAt: '',
            durationDays: '30',
            autoRenew: false,
            featured: false,
            urgent: false,
            negotiable: false,
            financingAvailable: false,
            exchangeAvailable: false,
            slug: '',
            metaTitle: '',
            metaDescription: '',
        },
        review: { acceptTerms: false },
    };
}

function toNumber(raw: string): number | null {
    const value = raw.trim().replace(/\./g, '').replace(',', '.');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
}

function getSpecificFields(vehicleType: VehicleCatalogType): VehicleFieldDef[] {
    return VEHICLE_SPECIFIC_FIELDS[vehicleType] || [];
}

function getFeatureOptions(vehicleType: VehicleCatalogType): Array<{ code: string; label: string }> {
    return VEHICLE_FEATURE_OPTIONS[vehicleType] || VEHICLE_FEATURE_OPTIONS.car;
}

function getFeatureSections(vehicleType: VehicleCatalogType): Array<{ title: string; items: Array<{ code: string; label: string }> }> {
    const options = getFeatureOptions(vehicleType);
    const configuredSections = VEHICLE_FEATURE_SECTIONS[vehicleType];
    if (!configuredSections || configuredSections.length === 0) {
        return [{ title: 'Equipamiento disponible', items: options }];
    }

    const byCode = new Map(options.map((item) => [item.code, item]));
    const usedCodes = new Set<string>();
    const sections = configuredSections
        .map((section) => ({
            title: section.title,
            items: section.codes.map((code) => byCode.get(code)).filter((item): item is { code: string; label: string } => Boolean(item)),
        }))
        .filter((section) => section.items.length > 0);

    for (const section of sections) {
        for (const item of section.items) usedCodes.add(item.code);
    }

    const remaining = options.filter((item) => !usedCodes.has(item.code));
    if (remaining.length > 0) {
        sections.push({ title: 'Otros', items: remaining });
    }

    return sections;
}

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

function getComplementaryFields(vehicleType: VehicleCatalogType, group?: ComplementaryFieldGroup): VehicleFieldDef[] {
    const fields = COMPLEMENTARY_FIELDS_BY_VEHICLE[vehicleType] || [];
    return group ? fields.filter((item) => item.group === group) : fields;
}

function getDynamicSelectOptions(field: VehicleFieldDef): ModernSelectOption[] {
    if (field.selectOptions) return field.selectOptions;
    return (field.options || []).map((option) => ({ value: option, label: option }));
}

function getBodyTypeOptions(vehicleType: VehicleCatalogType): string[] {
    return BODY_TYPE_OPTIONS_BY_VEHICLE[vehicleType] || BODY_TYPE_OPTIONS_BY_VEHICLE.car;
}

function getBodyTypeLabel(vehicleType: VehicleCatalogType): string {
    return BODY_TYPE_LABELS[vehicleType] || BODY_TYPE_LABELS.car;
}

function getFieldValue(data: WizardData, field: VehicleFieldDef): string {
    if (field.scope === 'specific') return data.basic.specific[field.id] || '';
    if (field.scope === 'complementary') return data.basic.complementary[field.id] || '';
    const basicValue = (data.basic as Record<string, unknown>)[field.id];
    return typeof basicValue === 'string' ? basicValue : '';
}

function updateDynamicFieldValue(setData: WizardSetter, field: VehicleFieldDef, rawValue: string): void {
    const value = field.upperCase ? rawValue.toUpperCase() : rawValue;
    setData((current) => {
        if (field.scope === 'specific') {
            return {
                ...current,
                basic: {
                    ...current.basic,
                    specific: { ...current.basic.specific, [field.id]: value },
                },
            };
        }
        if (field.scope === 'complementary') {
            const nextComplementary = { ...current.basic.complementary, [field.id]: value };
            if (field.id === 'tinted_windows_ftrl_certified' && value !== 'Sí') {
                nextComplementary.tinted_windows_ftrl_details = '';
            }
            return {
                ...current,
                basic: {
                    ...current.basic,
                    complementary: nextComplementary,
                },
            };
        }
        return {
            ...current,
            basic: {
                ...current.basic,
                [field.id]: value,
                specific: field.mirrorToSpecificId
                    ? { ...current.basic.specific, [field.mirrorToSpecificId]: value }
                    : current.basic.specific,
            },
        };
    });
}

function countFilledFields(data: WizardData, fields: VehicleFieldDef[]): number {
    return fields.filter((field) => getFieldValue(data, field).trim().length > 0).length;
}

function countComplementaryEntries(data: WizardData): number {
    return countFilledFields(data, getComplementaryFields(data.setup.vehicleType));
}

function resolveCatalogNames(catalog: PublishWizardCatalog | null, data: WizardData): { brand: string; model: string; region: string; commune: string } {
    const brand = data.basic.brandId === '__custom__'
        ? data.basic.customBrand.trim()
        : (catalog?.brands.find((item) => item.id === data.basic.brandId)?.name || '');
    const model = data.basic.modelId === '__custom__'
        ? data.basic.customModel.trim()
        : (catalog?.models.find((item) => item.id === data.basic.modelId)?.name || '');
    const region = data.location.regionName || getRegionById(data.location.regionId || '')?.name || '';
    const commune = data.location.communeName || getCommuneById(data.location.communeId || '')?.name || '';
    return { brand, model, region, commune };
}

function mergeDraft(raw: unknown): { data: WizardData; valuationEstimate: VehicleValuationEstimate | null } | null {
    if (!raw || typeof raw !== 'object') return null;
    const parsed = raw as PersistedDraft;
    if (!parsed.data) return null;
    const defaults = createDefaultData();
    const parsedBasic = parsed.data.basic || {};
    const parsedSpecs = parsed.data.specs || {};
    const normalizedHistoryFlags = Array.isArray(parsedSpecs.historyFlags)
        ? Array.from(
            new Set(
                parsedSpecs.historyFlags.map((flag) => {
                    if (flag === 'maintenance_history') return 'maintenance_up_to_date';
                    if (flag === 'technical_review_valid') return 'technical_review_up_to_date';
                    if (flag === 'permit_valid' || flag === 'insurance_valid') return 'papers_up_to_date';
                    return flag;
                })
            )
        )
        : defaults.specs.historyFlags;
    const complementarySource = typeof parsedBasic.complementary === 'object' && parsedBasic.complementary
        ? parsedBasic.complementary as Record<string, string>
        : defaults.basic.complementary;
    const normalizedComplementary = { ...complementarySource };
    const parsedBasicRecord = parsedBasic as Record<string, unknown>;
    const legacyTintedCertification = typeof normalizedComplementary.tinted_windows_certification === 'string'
        ? normalizedComplementary.tinted_windows_certification
        : (typeof parsedBasicRecord.tinted_windows_certification === 'string' ? parsedBasicRecord.tinted_windows_certification : '');
    if (legacyTintedCertification) {
        if (!normalizedComplementary.tinted_windows_ftrl_details) normalizedComplementary.tinted_windows_ftrl_details = legacyTintedCertification;
        if (!normalizedComplementary.tinted_windows_ftrl_certified && legacyTintedCertification.trim()) normalizedComplementary.tinted_windows_ftrl_certified = 'Sí';
    }
    const historyFlagToComplementary: Record<string, string> = {
        maintenance_up_to_date: 'maintenance_status',
        papers_up_to_date: 'papers_status',
        technical_review_up_to_date: 'technical_review_status',
        warranty_active: 'warranty_status',
        invoice_available: 'invoice_status',
        original_manual: 'manual_status',
        accidents_declared: 'accidents_status',
        original_paint_declared: 'original_paint_status',
        imported: 'imported_status',
    };
    for (const flag of normalizedHistoryFlags) {
        const target = historyFlagToComplementary[flag];
        if (target && !normalizedComplementary[target]) normalizedComplementary[target] = 'Sí';
    }
    const mergedBasic = {
        ...defaults.basic,
        ...parsedBasic,
        versionMode: (parsedBasic.versionMode === 'manual' ? 'manual' : 'catalog') as 'catalog' | 'manual',
        color: typeof parsedBasic.color === 'string'
            ? parsedBasic.color
            : (typeof parsedBasic.exteriorColor === 'string' ? parsedBasic.exteriorColor : defaults.basic.color),
        interiorColor: typeof parsedBasic.interiorColor === 'string'
            ? parsedBasic.interiorColor
            : (typeof parsedBasic.exteriorColor === 'string' ? parsedBasic.exteriorColor : defaults.basic.interiorColor),
        complementary: normalizedComplementary,
    };
    const mirrorField = BODY_TYPE_SPECIFIC_MIRRORS[(parsed.data.setup?.vehicleType || defaults.setup.vehicleType) as VehicleCatalogType];
    const mergedSpecific = { ...mergedBasic.specific };
    if (mirrorField && mergedBasic.bodyType && !mergedSpecific[mirrorField]) {
        mergedSpecific[mirrorField] = mergedBasic.bodyType;
    }
    if ((parsed.data.setup?.vehicleType || defaults.setup.vehicleType) === 'bus' && mergedBasic.seats && !mergedSpecific.seat_capacity) {
        mergedSpecific.seat_capacity = mergedBasic.seats;
    }
    if ((parsed.data.setup?.vehicleType || defaults.setup.vehicleType) === 'bus' && mergedSpecific.seat_capacity && !mergedBasic.seats) {
        mergedBasic.seats = mergedSpecific.seat_capacity;
    }

    const parsedLocation = parsed.data.location && typeof parsed.data.location === 'object'
        ? parsed.data.location as Record<string, unknown>
        : {};
    const mergedLocation = patchListingLocation(
        defaults.location,
        {
            ...(parsedLocation as Partial<ListingLocation>),
            regionId: typeof parsedLocation.regionId === 'string' ? parsedLocation.regionId : defaults.location.regionId,
            communeId: typeof parsedLocation.communeId === 'string' ? parsedLocation.communeId : defaults.location.communeId,
            addressLine1: typeof parsedLocation.addressLine1 === 'string'
                ? parsedLocation.addressLine1
                : (typeof parsedLocation.address === 'string' ? parsedLocation.address : defaults.location.addressLine1),
            visibilityMode: typeof parsedLocation.visibilityMode === 'string'
                ? parsedLocation.visibilityMode as ListingLocation['visibilityMode']
                : (parsedLocation.hideExactAddress === true ? 'commune_only' : defaults.location.visibilityMode),
            sourceMode: typeof parsedLocation.sourceMode === 'string'
                ? ((parsedLocation.sourceMode === 'area_only' ? 'custom' : parsedLocation.sourceMode) as ListingLocation['sourceMode'])
                : (typeof parsedLocation.address === 'string' && parsedLocation.address.trim() ? 'custom' : defaults.location.sourceMode),
        }
    );

    return {
        data: {
            setup: { ...defaults.setup, ...(parsed.data.setup || {}) },
            basic: { ...mergedBasic, specific: mergedSpecific },
            specs: { ...defaults.specs, ...parsedSpecs, historyFlags: normalizedHistoryFlags },
            media: {
                ...defaults.media,
                ...(parsed.data.media || {}),
                photos: Array.isArray(parsed.data.media?.photos)
                    ? parsed.data.media.photos.map((photo) => {
                        const p = photo as any;
                        const resolvedPreview = typeof p.previewUrl === 'string' && p.previewUrl.startsWith('http')
                            ? p.previewUrl
                            : typeof p.url === 'string' && p.url.startsWith('http')
                                ? p.url
                                : '';
                        return {
                            id: photo.id,
                            name: photo.name,
                            dataUrl: resolvedPreview,
                            previewUrl: resolvedPreview,
                            isCover: !!photo.isCover,
                            width: typeof photo.width === 'number' ? photo.width : 0,
                            height: typeof photo.height === 'number' ? photo.height : 0,
                            sizeBytes: typeof photo.sizeBytes === 'number' ? photo.sizeBytes : 0,
                            mimeType: typeof photo.mimeType === 'string' ? photo.mimeType : 'image/webp',
                        };
                    })
                    : [],
                discoverVideo: parsed.data.media?.discoverVideo
                    ? (() => {
                        const dv = parsed.data.media.discoverVideo as any;
                        const resolvedPreview = typeof dv.previewUrl === 'string' && dv.previewUrl.startsWith('http')
                            ? dv.previewUrl
                            : typeof dv.url === 'string' && dv.url.startsWith('http')
                                ? dv.url
                                : '';
                        return {
                            id: dv.id,
                            name: dv.name,
                            dataUrl: resolvedPreview,
                            previewUrl: resolvedPreview,
                            width: typeof dv.width === 'number' ? dv.width : 0,
                            height: typeof dv.height === 'number' ? dv.height : 0,
                            sizeBytes: typeof dv.sizeBytes === 'number' ? dv.sizeBytes : 0,
                            mimeType: typeof dv.mimeType === 'string' ? dv.mimeType : 'video/mp4',
                            durationSeconds: typeof dv.durationSeconds === 'number' ? dv.durationSeconds : 0,
                        };
                    })()
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
            location: mergedLocation,
            commercial: { ...defaults.commercial, ...(parsed.data.commercial || {}) },
            review: { ...defaults.review, ...(parsed.data.review || {}) },
        },
        valuationEstimate: parsed.valuationEstimate ?? null,
    };
}

function serializeDraft(data: WizardData, valuationEstimate: VehicleValuationEstimate | null): PersistedDraft {
    return {
        version: 4,
        savedAt: new Date().toISOString(),
        valuationEstimate,
        data: {
            ...data,
            media: {
                ...data.media,
                photos: data.media.photos.map((photo) => ({
                    id: photo.id,
                    name: photo.name,
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

function buildEditPayload(listing: PanelListing): { data: WizardData; valuationEstimate: VehicleValuationEstimate | null } {
    if (listing.rawData && typeof listing.rawData === 'object') {
        const rawRecord = listing.rawData as Record<string, unknown>;
        const merged = mergeDraft({
            data: rawRecord,
            valuationEstimate: (rawRecord.valuation as VehicleValuationEstimate | null | undefined) ?? null,
        });
        if (merged) return merged;
    }

    const defaults = createDefaultData();
    const next: WizardData = {
        ...defaults,
        setup: {
            ...defaults.setup,
            listingType: listing.section === 'project' ? 'sale' : listing.section,
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
    if (listing.section === 'rent') {
        next.commercial.rentDaily = numericPrice;
    } else if (listing.section === 'auction') {
        next.commercial.auctionStartPrice = numericPrice;
    } else {
        next.commercial.price = numericPrice;
    }

    return { data: next, valuationEstimate: null };
}

function buildVehicleValuationRequest(data: WizardData, catalog: PublishWizardCatalog | null): VehicleValuationRequest | null {
    if (data.setup.listingType === 'auction') return null;
    if (!data.location.regionId || !data.location.communeId || !data.location.addressLine1?.trim()) return null;

    const names = resolveCatalogNames(catalog, data);
    const year = toNumber(data.basic.year);
    if (!year || !names.brand || !names.model) return null;

    return {
        operationType: data.setup.listingType,
        vehicleType: data.setup.vehicleType,
        brand: names.brand,
        model: names.model,
        version: data.basic.version.trim() || null,
        year,
        mileageKm: toNumber(data.basic.mileage),
        condition: data.basic.condition.trim() || null,
        fuelType: data.basic.fuelType.trim() || null,
        transmission: data.basic.transmission.trim() || null,
        traction: data.basic.traction.trim() || null,
        bodyType: data.basic.bodyType.trim() || null,
        regionId: data.location.regionId,
        communeId: data.location.communeId,
        addressLine1: data.location.addressLine1.trim(),
    };
}

function formatAmount(value: number, currency: 'CLP' | 'USD'): string {
    const locale = 'es-CL';
    const formatter = new Intl.NumberFormat(locale, currency === 'USD'
        ? { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }
        : { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
    return formatter.format(value);
}

function formatSignedPercent(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return 'Sin dato';
    const rounded = Math.round(value * 100) / 100;
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`;
}

function formatSeriesLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

function validateStep(step: StepId, data: WizardData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (step === 'basic') {
        const mileageRequired = ['car', 'motorcycle', 'truck', 'bus'].includes(data.setup.vehicleType);
        const transmissionRequired = ['car', 'motorcycle', 'truck', 'bus'].includes(data.setup.vehicleType);
        const fuelRequired = data.setup.vehicleType !== 'aerial';
        if (!data.basic.brandId) errors['basic.brandId'] = 'Marca requerida.';
        if (data.basic.brandId === '__custom__' && data.basic.customBrand.trim().length < 2) errors['basic.customBrand'] = 'Marca manual inválida.';
        if (!data.basic.modelId) errors['basic.modelId'] = 'Modelo requerido.';
        if (data.basic.modelId === '__custom__' && data.basic.customModel.trim().length < 2) errors['basic.customModel'] = 'Modelo manual inválido.';
        const year = toNumber(data.basic.year);
        const currentYear = new Date().getFullYear();
        if (!year || year < 1900 || year > currentYear + 1) errors['basic.year'] = 'Año fuera de rango.';
        if (!data.basic.bodyType) errors['basic.bodyType'] = `${getBodyTypeLabel(data.setup.vehicleType)} requerido.`;
        if (!data.basic.color.trim()) errors['basic.color'] = 'Color requerido.';
        if (!data.basic.condition) errors['basic.condition'] = 'Condición requerida.';
        if (mileageRequired && toNumber(data.basic.mileage) == null) errors['basic.mileage'] = 'Kilometraje requerido.';
        if (fuelRequired && !data.basic.fuelType) errors['basic.fuelType'] = 'Combustible requerido.';
        if (transmissionRequired && !data.basic.transmission) errors['basic.transmission'] = 'Transmisión requerida.';
        if (!data.location.addressLine1?.trim()) errors['location.addressLine1'] = 'Dirección requerida.';
        if (!data.location.regionId) errors['location.regionId'] = 'Región requerida.';
        if (!data.location.communeId) errors['location.communeId'] = 'Comuna requerida.';
        if (data.location.sourceMode === 'saved_address' && !data.location.sourceAddressId) {
            errors['location.sourceAddressId'] = 'Selecciona una dirección guardada.';
        }
        for (const field of getSpecificFields(data.setup.vehicleType).filter((item) => item.required)) {
            if (!getFieldValue(data, field).trim()) {
                errors[`basic.specific.${field.id}`] = `${field.label} requerido.`;
            }
        }
    }
    if (step === 'media') {
        if (data.media.photos.length < 1) errors['media.photos'] = 'Debes subir al menos 1 foto.';
        if (data.media.videoUrl.trim() && !isSupportedExternalVideoUrl(data.media.videoUrl.trim())) errors['media.videoUrl'] = 'Usa un enlace externo de YouTube o Vimeo.';
    }
    if (step === 'commercial') {
        if (data.setup.listingType === 'sale') {
            const base = toNumber(data.commercial.price);
            const offer = toNumber(data.commercial.offerPrice);
            if (!base) errors['commercial.price'] = 'Precio requerido.';
            if (base && offer && offer >= base) errors['commercial.offerPrice'] = 'Oferta debe ser menor.';
        }
        if (data.setup.listingType === 'rent') {
            const hasRentPrice = !!toNumber(data.commercial.rentDaily) || !!toNumber(data.commercial.rentWeekly) || !!toNumber(data.commercial.rentMonthly);
            if (!hasRentPrice) errors['commercial.rent'] = 'Ingresa al menos un precio de arriendo.';
            const rentMinDays = toNumber(data.commercial.rentMinDays);
            if (rentMinDays != null && rentMinDays < 1) errors['commercial.rentMinDays'] = 'Mínimo 1 día.';
            if (data.commercial.rentAvailableFrom && data.commercial.rentAvailableTo) {
                const from = new Date(data.commercial.rentAvailableFrom);
                const to = new Date(data.commercial.rentAvailableTo);
                if (to.getTime() < from.getTime()) errors['commercial.rentAvailableTo'] = 'La fecha final debe ser posterior.';
            }
        }
        if (data.setup.listingType === 'auction') {
            if (!toNumber(data.commercial.auctionStartPrice)) errors['commercial.auctionStartPrice'] = 'Precio base requerido.';
            if (!toNumber(data.commercial.auctionMinIncrement)) errors['commercial.auctionMinIncrement'] = 'Incremento mínimo requerido.';
            if (!data.commercial.auctionStartAt) errors['commercial.auctionStartAt'] = 'Inicio requerido.';
            if (!data.commercial.auctionEndAt) errors['commercial.auctionEndAt'] = 'Fin requerido.';
            if (data.commercial.auctionStartAt && data.commercial.auctionEndAt) {
                const start = new Date(data.commercial.auctionStartAt);
                const end = new Date(data.commercial.auctionEndAt);
                if (end.getTime() <= start.getTime()) errors['commercial.auctionEndAt'] = 'Fin debe ser posterior.';
            }
        }
    }
    if (step === 'review' && !data.review.acceptTerms) errors['review.acceptTerms'] = 'Debes aceptar términos.';
    return errors;
}

function qualityScore(data: WizardData, estimate: VehicleValuationEstimate | null): number {
    let score = 0;
    const specificFields = getSpecificFields(data.setup.vehicleType);
    if (data.media.photos.length >= 5) score += 20;
    if (data.specs.featureCodes.length >= 5) score += 20;
    if (data.location.addressLine1 && data.location.regionId && data.location.communeId) score += 20;
    if (specificFields.length > 0 && countFilledFields(data, specificFields) >= Math.min(4, specificFields.length)) score += 20;
    if (countComplementaryEntries(data) >= 3) score += 10;
    if (data.setup.listingType === 'auction') {
        score += 10;
    } else if (estimate) {
        score += 10;
    }
    return Math.min(score, 100);
}

export default function PublishWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, requireAuth, refreshSession } = useAuth();
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(true);
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
    const [estimate, setEstimate] = useState<VehicleValuationEstimate | null>(null);
    const [valuationSources, setValuationSources] = useState<VehicleValuationSourceStatus[]>([]);
    const [refreshingSources, setRefreshingSources] = useState(false);
    const [versionOptions, setVersionOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [versionOptionsLoading, setVersionOptionsLoading] = useState(false);
    const [generatingText, setGeneratingText] = useState(false);
    const [fichaOpen, setFichaOpen] = useState<Record<string, boolean>>({
        photos: true, mediaDocs: false, setup: true, identification: true,
        specs: false, history: false, equipment: false, ad: true,
        price: true, location: true, valuation: false, publication: false,
    });
    const dataRef = useRef<WizardData>(data);
    const estimateRef = useRef<VehicleValuationEstimate | null>(estimate);
    const stepIndex = STEPS.findIndex((item) => item.id === step);
    const currentStep = STEPS[stepIndex] || STEPS[0];
    const score = qualityScore(data, estimate);
    const lifecyclePolicy = useMemo(
        () => getPublicationLifecyclePolicy('simpleautos', data.setup.listingType),
        [data.setup.listingType]
    );

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        estimateRef.current = estimate;
    }, [estimate]);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        (async () => {
            const result = await loadPublishWizardCatalog(controller.signal);
            if (!mounted) return;
            setCatalog(result);
            setCatalogLoading(false);
        })();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

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
            const result = await fetchVehicleValuationSources();
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
            const result = await fetchPanelListingDraft('autos');
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
                        ? 'Borrador restaurado. Si una foto no muestra preview, súbela nuevamente.'
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

    const saveDraft = async (manual: boolean) => {
        const serialized = serializeDraft(dataRef.current, estimateRef.current);
        const result = await savePanelListingDraft('autos', serialized);
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

    useEffect(() => {
        if (!draftSavedNote) return;
        const timer = window.setTimeout(() => setDraftSavedNote(null), 2400);
        return () => window.clearTimeout(timer);
    }, [draftSavedNote]);

    useEffect(() => {
        const brand = data.basic.brandId === '__custom__'
            ? data.basic.customBrand.trim()
            : catalog?.brands.find((item) => item.id === data.basic.brandId)?.name || '';
        const model = data.basic.modelId === '__custom__'
            ? data.basic.customModel.trim()
            : catalog?.models.find((item) => item.id === data.basic.modelId)?.name || '';
        const title = [brand, model, data.basic.year.trim(), data.basic.bodyType.trim(), data.basic.color.trim()].filter(Boolean).join(' ');
        if (dataRef.current.basic.title === title) return;
        setData((current) => ({ ...current, basic: { ...current.basic, title } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catalog, data.basic.brandId, data.basic.customBrand, data.basic.modelId, data.basic.customModel, data.basic.year, data.basic.bodyType, data.basic.color]);

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

    const selectedBrandName = useMemo(() => {
        if (data.basic.brandId === '__custom__') return data.basic.customBrand.trim();
        return catalog?.brands.find((item) => item.id === data.basic.brandId)?.name || '';
    }, [catalog, data.basic.brandId, data.basic.customBrand]);
    const models = useMemo(() => (catalog ? getModelsForBrand(catalog, data.basic.brandId, data.setup.vehicleType) : []), [catalog, data.basic.brandId, data.setup.vehicleType]);
    const selectedModelName = useMemo(() => {
        if (data.basic.modelId === '__custom__') return data.basic.customModel.trim();
        return models.find((item) => item.id === data.basic.modelId)?.name || '';
    }, [models, data.basic.modelId, data.basic.customModel]);
    const fallbackVersions = useMemo(
        () => (catalog ? getVersionsForModel(catalog, data.basic.modelId, data.setup.vehicleType, data.basic.year) : []),
        [catalog, data.basic.modelId, data.setup.vehicleType, data.basic.year]
    );
    const versions = versionOptions.length > 0 ? versionOptions : fallbackVersions;
    const communes = useMemo(() => getLocationCommunesForRegion(data.location.regionId || ''), [data.location.regionId]);
    const valuationRequest = useMemo(() => buildVehicleValuationRequest(data, catalog), [catalog, data]);

    useEffect(() => {
        if (
            data.setup.vehicleType !== 'car' ||
            !selectedBrandName ||
            !selectedModelName ||
            !data.basic.year ||
            data.basic.brandId === '__custom__' ||
            data.basic.modelId === '__custom__'
        ) {
            setVersionOptions([]);
            setVersionOptionsLoading(false);
            return;
        }

        const controller = new AbortController();
        setVersionOptionsLoading(true);
        (async () => {
            try {
                const response = await fetch(
                    `/api/vehicle-catalog/versions?brand=${encodeURIComponent(selectedBrandName)}&model=${encodeURIComponent(selectedModelName)}&year=${encodeURIComponent(data.basic.year)}&vehicleType=${encodeURIComponent(data.setup.vehicleType)}`,
                    {
                        method: 'GET',
                        cache: 'no-store',
                        signal: controller.signal,
                    }
                );
                if (!response.ok) {
                    setVersionOptions([]);
                    return;
                }
                const payload = await response.json() as { versions?: Array<{ id: string; name: string }> };
                setVersionOptions(Array.isArray(payload.versions) ? payload.versions : []);
            } catch {
                if (!controller.signal.aborted) {
                    setVersionOptions([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setVersionOptionsLoading(false);
                }
            }
        })();

        return () => controller.abort();
    }, [data.setup.vehicleType, data.basic.brandId, data.basic.modelId, data.basic.year, selectedBrandName, selectedModelName]);

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
            setMessage(result.error || 'No pudimos actualizar el mapa.');
            return;
        }
        setData((current) => ({ ...current, location: result.location! }));
        setMessage(result.provider === 'external'
            ? 'Ubicación verificada en el mapa.'
            : (result.error || 'No pudimos confirmar automáticamente el punto exacto. Revisa la dirección en Google Maps.'));
    };

    const runValuation = async () => {
        if (!valuationRequest) {
            setMessage('Completa marca, modelo, año, kilometraje y ubicación para usar el tasador.');
            return;
        }
        setEstimating(true);
        setMessage(null);
        const result = await estimateVehicleValue(valuationRequest);
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
        const result = await refreshVehicleValuationSources();
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

    const handleGenerateText = async () => {
        const names = resolveCatalogNames(catalog, data);
        const qbd: QuickBasicData = {
            listingType: data.setup.listingType,
            vehicleType: data.setup.vehicleType,
            brandId: data.basic.brandId,
            customBrand: data.basic.customBrand,
            brandName: names.brand,
            modelId: data.basic.modelId,
            customModel: data.basic.customModel,
            modelName: names.model,
            year: data.basic.year,
            version: data.basic.version,
            mileage: data.basic.mileage,
            price: data.commercial.price,
            offerPrice: data.commercial.offerPrice,
            offerPriceMode: '$',
            transmission: data.basic.transmission,
            color: data.basic.color,
            bodyType: data.basic.bodyType,
            fuelType: data.basic.fuelType,
            condition: data.basic.condition,
            negotiable: data.commercial.negotiable,
            financingAvailable: data.commercial.financingAvailable,
            traction: data.basic.traction,
            ownerCount: data.basic.complementary.owners_count || '',
        };
        setGeneratingText(true);
        try {
            const result = await generateListingText(qbd);
            setData((current) => ({
                ...current,
                basic: {
                    ...current.basic,
                    ...(result.titulo ? { title: result.titulo } : {}),
                    ...(result.descripcion ? { description: result.descripcion } : {}),
                    ...(result.colorDetectado ? { color: result.colorDetectado } : {}),
                },
            }));
        } catch {
            // ignore
        } finally {
            setGeneratingText(false);
        }
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

        const names = resolveCatalogNames(catalog, data);
        const normalizedLocation = patchListingLocation(data.location, {
            regionName: names.region || data.location.regionName,
            communeName: names.commune || data.location.communeName,
        });
        const locationLabel = normalizedLocation.publicLabel
            || [names.commune || data.location.communeId, names.region || data.location.regionId].filter(Boolean).join(', ');
        const priceLabel = (() => {
            if (data.setup.listingType === 'rent') {
                if (data.commercial.rentDaily.trim()) return `$${data.commercial.rentDaily.trim()} / día`;
                if (data.commercial.rentWeekly.trim()) return `$${data.commercial.rentWeekly.trim()} / semana`;
                if (data.commercial.rentMonthly.trim()) return `$${data.commercial.rentMonthly.trim()} / mes`;
                return '';
            }
            if (data.setup.listingType === 'auction') {
                return `$${data.commercial.auctionStartPrice.trim()}`;
            }
            const symbol = data.commercial.currency === 'USD' ? 'USD ' : '$';
            return `${symbol}${data.commercial.price.trim()}`;
        })();

        setPublishing(true);
        setMessage(null);
        const payload = {
            listingType: data.setup.listingType,
            title: data.basic.title.trim(),
            description: data.basic.description.trim(),
            priceLabel: priceLabel || '$0',
            location: locationLabel || undefined,
            locationData: normalizedLocation,
            href: data.commercial.slug.trim() ? `/vehiculo/${data.commercial.slug.trim()}` : undefined,
            rawData: { ...data, valuation: estimate, publicationLifecycle: lifecyclePolicy },
        };
        const result = isEditing && editingId
            ? await updatePanelListing(editingId, payload)
            : await createPanelListing({
                vertical: 'autos',
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

        void deletePanelListingDraft('autos');
        setMessage(isEditing ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.');
        setLastSavedAt(null);
        router.push('/panel/publicaciones');
    };

    return isEditing ? (
        <div className="container-app panel-page max-w-3xl py-8">
            <PanelSectionHeader
                title="Editar vehículo"
                description="Revisa y actualiza todos los datos de tu publicación."
                actions={
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
                }
            />

            <>
                {message ? <PanelNotice className="mb-4">{message}</PanelNotice> : null}
                {storageError ? <PanelNotice tone="error" className="mb-3">{storageError}</PanelNotice> : null}
                {catalogLoading ? <p className="mb-4 text-xs" style={{ color: 'var(--fg-muted)' }}>Cargando catálogo...</p> : null}
                {editingLoading ? <PanelNotice tone="neutral" className="mb-4">Cargando publicación...</PanelNotice> : null}
            </>

            <div className="flex flex-col gap-3">
                {/* FOTOS - UNIFICADAS CON QUICKPUBLISH */}
                <FichaGroup label="Fotos y multimedia" />
                <FichaSection
                    title="Fotos del vehículo"
                    description="Mínimo 1, máximo 20 fotos."
                    open={fichaOpen.photos}
                    onToggle={() => setFichaOpen((s) => ({ ...s, photos: !s.photos }))}
                >
                    <Step1Photos
                        isExtended
                        photos={data.media.photos}
                        onAddPhotos={async (files) => {
                            const arr = Array.from(files);
                            const processed = await Promise.all(arr.map((file) => processQuickFile(file, false)));
                            setData((cur) => ({ ...cur, media: { ...cur.media, photos: [...cur.media.photos, ...processed] } }));
                            return false;
                        }}
                        onRemovePhoto={(id) => {
                            setData((cur) => ({ ...cur, media: { ...cur.media, photos: cur.media.photos.filter((p) => p.id !== id) } }));
                        }}
                        onReorderPhotos={(activeId, overId) => {
                            setData((cur) => {
                                const newPhotos = [...cur.media.photos];
                                const idxA = newPhotos.findIndex((p) => p.id === activeId);
                                const idxB = newPhotos.findIndex((p) => p.id === overId);
                                if (idxA !== -1 && idxB !== -1) {
                                    const [item] = newPhotos.splice(idxA, 1);
                                    newPhotos.splice(idxB, 0, item);
                                }
                                return { ...cur, media: { ...cur.media, photos: newPhotos } };
                            });
                        }}
                    />
                </FichaSection>

                <FichaSection
                    title="Video y documentos"
                    description="Video externo, clip para Descubre y documentación adjunta."
                    open={fichaOpen.mediaDocs}
                    onToggle={() => setFichaOpen((s) => ({ ...s, mediaDocs: !s.mediaDocs }))}
                >
                    <div className="space-y-4">
                        <Field label="Video del aviso" error={errors['media.videoUrl']}>
                            <input
                                className="form-input"
                                placeholder="https://www.youtube.com/... o https://vimeo.com/..."
                                value={data.media.videoUrl}
                                onChange={(event) => setData((current) => ({ ...current, media: { ...current.media, videoUrl: event.target.value } }))}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Solo YouTube o Vimeo.</p>
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
                            description="Papeles, informes, catálogos o documentación."
                        />
                    </div>
                </FichaSection>

                {/* DATOS - UNIFICADOS CON QUICKPUBLISH */}
                <FichaGroup label="Datos principales" />
                <FichaSection
                    title="Información básica"
                    description="Operación, categoría e identificación del vehículo."
                    open={fichaOpen.setup}
                    onToggle={() => setFichaOpen((s) => ({ ...s, setup: !s.setup }))}
                >
                    <Step2BasicData
                        isExtended
                        initialData={{
                            listingType: data.setup.listingType,
                            vehicleType: data.setup.vehicleType,
                            brandId: data.basic.brandId,
                            customBrand: data.basic.customBrand || '',
                            brandName: '', // Wizard looks up inside using catalog
                            modelId: data.basic.modelId,
                            customModel: data.basic.customModel || '',
                            modelName: '',
                            year: data.basic.year,
                            version: data.basic.version,
                            mileage: data.basic.mileage,
                            price: data.commercial.price,
                            offerPrice: data.commercial.offerPrice,
                            offerPriceMode: '$',
                            transmission: data.basic.transmission,
                            color: data.basic.color,
                            bodyType: data.basic.bodyType,
                            fuelType: data.basic.fuelType,
                            condition: data.basic.condition,
                            negotiable: data.commercial.negotiable,
                            financingAvailable: data.commercial.financingAvailable,
                            traction: data.basic.traction || '',
                            ownerCount: data.basic.complementary.owners_count || '',
                        }}
                        onChange={(updated) => {
                            setData((cur) => {
                                // Sincronizar espejos de categoría (e.g. bodyType se asigna a type en base a category)
                                const mirrorField = BODY_TYPE_SPECIFIC_MIRRORS[updated.vehicleType];
                                return {
                                    ...cur,
                                    setup: {
                                        ...cur.setup,
                                        listingType: updated.listingType,
                                        vehicleType: updated.vehicleType,
                                    },
                                    basic: {
                                        ...cur.basic,
                                        brandId: updated.brandId,
                                        customBrand: updated.customBrand || '',
                                        modelId: updated.modelId,
                                        customModel: updated.customModel || '',
                                        year: updated.year,
                                        version: updated.version,
                                        versionMode: updated.version ? 'catalog' : 'manual',
                                        mileage: updated.mileage,
                                        transmission: updated.transmission,
                                        color: updated.color,
                                        bodyType: updated.bodyType,
                                        fuelType: updated.fuelType,
                                        condition: updated.condition,
                                        traction: updated.traction || '',
                                        specific: mirrorField ? { ...cur.basic.specific, [mirrorField]: updated.bodyType } : cur.basic.specific,
                                        complementary: {
                                            ...cur.basic.complementary,
                                            owners_count: updated.ownerCount || '',
                                        }
                                    }
                                };
                            });
                        }}
                    />
                </FichaSection>

                {getSpecificFields(data.setup.vehicleType).length > 0 ? (
                    <FichaSection
                        title="Especificaciones técnicas"
                        description="Datos específicos según el tipo de vehículo."
                        open={fichaOpen.specs}
                        onToggle={() => setFichaOpen((s) => ({ ...s, specs: !s.specs }))}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {getSpecificFields(data.setup.vehicleType).map((field) => (
                                <Field key={field.id} label={field.label} required={!!field.required} error={errors[`basic.specific.${field.id}`]}>
                                    {field.input === 'select' ? (
                                        <ModernSelect
                                            value={getFieldValue(data, field)}
                                            onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                            placeholder="Seleccionar"
                                            options={getDynamicSelectOptions(field)}
                                            ariaLabel={`Seleccionar ${field.label}`}
                                        />
                                    ) : (
                                        <input
                                            className="form-input"
                                            type={field.input}
                                            placeholder={field.placeholder}
                                            value={getFieldValue(data, field)}
                                            onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                        />
                                    )}
                                </Field>
                            ))}
                        </div>
                    </FichaSection>
                ) : null}

                <FichaSection
                    title="Antecedentes"
                    description="Historial declarado y estado documental del vehículo."
                    open={fichaOpen.history}
                    onToggle={() => setFichaOpen((s) => ({ ...s, history: !s.history }))}
                >
                    <div className="space-y-4">
                        {getComplementaryFields(data.setup.vehicleType, 'legal').length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--fg-muted)' }}>Documentación y legal</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {getComplementaryFields(data.setup.vehicleType, 'legal').map((field) => (
                                        <Field key={field.id} label={field.label}>
                                            {field.input === 'select' ? (
                                                <ModernSelect
                                                    value={getFieldValue(data, field)}
                                                    onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                                    placeholder="Seleccionar"
                                                    options={getDynamicSelectOptions(field)}
                                                    ariaLabel={`Seleccionar ${field.label}`}
                                                />
                                            ) : (
                                                <input
                                                    className="form-input"
                                                    type={field.input}
                                                    placeholder={field.placeholder}
                                                    value={getFieldValue(data, field)}
                                                    disabled={field.id === 'tinted_windows_ftrl_details' && data.basic.complementary.tinted_windows_ftrl_certified !== 'Sí'}
                                                    onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                                />
                                            )}
                                        </Field>
                                    ))}
                                </div>
                            </div>
                        )}
                        {getComplementaryFields(data.setup.vehicleType, 'history').length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--fg-muted)' }}>Historial declarado</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {getComplementaryFields(data.setup.vehicleType, 'history').map((field) => (
                                        <Field key={field.id} label={field.label}>
                                            {field.input === 'select' ? (
                                                <ModernSelect
                                                    value={getFieldValue(data, field)}
                                                    onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                                    placeholder="Seleccionar"
                                                    options={getDynamicSelectOptions(field)}
                                                    ariaLabel={`Seleccionar ${field.label}`}
                                                />
                                            ) : (
                                                <input
                                                    className="form-input"
                                                    type={field.input}
                                                    placeholder={field.placeholder}
                                                    value={getFieldValue(data, field)}
                                                    onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                                />
                                            )}
                                        </Field>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </FichaSection>

                <FichaSection
                    title="Equipamiento"
                    description="Extras y asistencias disponibles según la categoría."
                    open={fichaOpen.equipment}
                    onToggle={() => setFichaOpen((s) => ({ ...s, equipment: !s.equipment }))}
                >
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <span className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>Seleccionados</span>
                            <span className="text-sm font-medium">{data.specs.featureCodes.length}</span>
                            {data.specs.featureCodes.length > 0 ? (
                                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                    {getFeatureSections(data.setup.vehicleType).flatMap((section) => section.items).filter((item) => data.specs.featureCodes.includes(item.code)).slice(0, 4).map((item) => item.label).join(', ')}
                                    {data.specs.featureCodes.length > 4 ? '…' : ''}
                                </span>
                            ) : (
                                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Selecciona los extras que realmente tiene este vehículo.</span>
                            )}
                        </div>
                        <div className="space-y-4">
                            {getFeatureSections(data.setup.vehicleType).map((section) => (
                                <div key={section.title} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold">{section.title}</p>
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {section.items.filter((item) => data.specs.featureCodes.includes(item.code)).length} / {section.items.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                        {section.items.map((item) => (
                                            <SelectableChip
                                                key={item.code}
                                                label={item.label}
                                                active={data.specs.featureCodes.includes(item.code)}
                                                onToggle={() =>
                                                    setData((current) => ({
                                                        ...current,
                                                        specs: {
                                                            ...current.specs,
                                                            featureCodes: current.specs.featureCodes.includes(item.code)
                                                                ? current.specs.featureCodes.filter((code) => code !== item.code)
                                                                : [...current.specs.featureCodes, item.code],
                                                        },
                                                    }))
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Field label="Notas técnicas">
                            <textarea
                                className="form-textarea"
                                rows={4}
                                value={data.specs.notes}
                                onChange={(event) => setData((current) => ({ ...current, specs: { ...current.specs, notes: event.target.value } }))}
                                placeholder="Ej: Mantiene control crucero adaptativo, neumáticos recién cambiados."
                            />
                        </Field>
                    </div>
                </FichaSection>

                <FichaSection
                    title="Anuncio"
                    description="Título y descripción que verán los compradores."
                    open={fichaOpen.ad}
                    onToggle={() => setFichaOpen((s) => ({ ...s, ad: !s.ad }))}
                >
                    <div className="space-y-3">
                        <Field label="Título" error={errors['basic.title']}>
                            <input
                                className="form-input"
                                value={data.basic.title}
                                onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, title: event.target.value } }))}
                                placeholder="Ej: Toyota Corolla 2020 Sedán Blanco"
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Se genera automáticamente con Marca + Modelo + Año + Carrocería + Color.</p>
                        </Field>
                        <Field label="Descripción" error={errors['basic.description']}>
                            <textarea
                                className="form-textarea"
                                rows={6}
                                value={data.basic.description}
                                onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{data.basic.description.length} / 2000</p>
                        </Field>
                        <PanelButton
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => void handleGenerateText()}
                            disabled={generatingText || !data.basic.brandId || !data.basic.year}
                        >
                            <IconSparkles size={14} />
                            {generatingText ? 'Generando con IA...' : 'Generar descripción con IA'}
                        </PanelButton>
                    </div>
                </FichaSection>

                {/* PRECIO */}
                <FichaGroup label="Precio" />

                <FichaSection
                    title="Precio"
                    description="Precio del aviso y condiciones comerciales."
                    open={fichaOpen.price}
                    onToggle={() => setFichaOpen((s) => ({ ...s, price: !s.price }))}
                >
                    <div className="space-y-4">
                        <PanelNotice tone="neutral">{lifecyclePolicy.notice}</PanelNotice>
                        {data.setup.listingType === 'sale' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Precio de publicación" required error={errors['commercial.price']}><input className="form-input" value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder="Ej: 18990000" /></Field>
                                <Field label="Moneda">
                                    <ModernSelect
                                        value={data.commercial.currency}
                                        onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as 'CLP' | 'USD' } }))}
                                        options={[{ value: 'CLP', label: 'CLP' }, { value: 'USD', label: 'USD' }]}
                                        ariaLabel="Seleccionar moneda"
                                    />
                                </Field>
                                <Field label="Precio oferta (opcional)" error={errors['commercial.offerPrice']}><input className="form-input" value={data.commercial.offerPrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, offerPrice: event.target.value } }))} placeholder="Opcional" /></Field>
                            </div>
                        ) : null}
                        {data.setup.listingType === 'rent' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Precio por día"><input className="form-input" value={data.commercial.rentDaily} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentDaily: event.target.value } }))} placeholder="Opcional" /></Field>
                                <Field label="Precio por semana"><input className="form-input" value={data.commercial.rentWeekly} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentWeekly: event.target.value } }))} placeholder="Opcional" /></Field>
                                <Field label="Precio por mes"><input className="form-input" value={data.commercial.rentMonthly} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentMonthly: event.target.value } }))} placeholder="Opcional" /></Field>
                                <Field label="Días mínimos" error={errors['commercial.rentMinDays']}><input className="form-input" type="number" min={1} value={data.commercial.rentMinDays} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentMinDays: event.target.value } }))} /></Field>
                                <Field label="Depósito"><input className="form-input" value={data.commercial.rentDeposit} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentDeposit: event.target.value } }))} placeholder="Opcional" /></Field>
                                <Field label="Disponible desde"><input className="form-input" type="date" value={data.commercial.rentAvailableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentAvailableFrom: event.target.value } }))} /></Field>
                                <Field label="Disponible hasta" error={errors['commercial.rentAvailableTo']}><input className="form-input" type="date" value={data.commercial.rentAvailableTo} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentAvailableTo: event.target.value } }))} /></Field>
                            </div>
                        ) : null}
                        {data.setup.listingType === 'auction' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Precio base" required error={errors['commercial.auctionStartPrice']}><input className="form-input" value={data.commercial.auctionStartPrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionStartPrice: event.target.value } }))} /></Field>
                                <Field label="Precio reserva"><input className="form-input" value={data.commercial.auctionReservePrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionReservePrice: event.target.value } }))} placeholder="Opcional" /></Field>
                                <Field label="Incremento mínimo" required error={errors['commercial.auctionMinIncrement']}><input className="form-input" value={data.commercial.auctionMinIncrement} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionMinIncrement: event.target.value } }))} /></Field>
                                <Field label="Inicio" required error={errors['commercial.auctionStartAt']}><input className="form-input" type="datetime-local" value={data.commercial.auctionStartAt} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionStartAt: event.target.value } }))} /></Field>
                                <Field label="Fin" required error={errors['commercial.auctionEndAt']}><input className="form-input" type="datetime-local" value={data.commercial.auctionEndAt} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionEndAt: event.target.value } }))} /></Field>
                            </div>
                        ) : null}
                        {(errors['commercial.rent'] || errors['commercial.auctionStartPrice'] || errors['commercial.auctionMinIncrement']) ? (
                            <ErrorText text={errors['commercial.rent'] || errors['commercial.auctionStartPrice'] || errors['commercial.auctionMinIncrement']} />
                        ) : null}
                        {data.setup.listingType !== 'auction' ? (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--fg-muted)' }}>Condiciones comerciales</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    <ToggleCard title="Precio negociable" description="Permite conversar el valor final." active={data.commercial.negotiable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))} />
                                    {data.setup.listingType === 'sale' ? (
                                        <>
                                            <ToggleCard title="Financiamiento disponible" description="Indica si se puede gestionar financiamiento." active={data.commercial.financingAvailable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, financingAvailable: !current.commercial.financingAvailable } }))} />
                                            <ToggleCard title="Acepta permuta" description="Útil para leads que ofrecen parte de pago." active={data.commercial.exchangeAvailable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, exchangeAvailable: !current.commercial.exchangeAvailable } }))} />
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </FichaSection>

                <FichaSection
                    title="Ubicación"
                    description="Dirección, región y comuna del vehículo."
                    open={fichaOpen.location}
                    onToggle={() => setFichaOpen((s) => ({ ...s, location: !s.location }))}
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
                        onGeocode={refreshLocationMap}
                    />
                </FichaSection>

                <FichaSection
                    title="Tasador de precios"
                    description="Estimación de valor de mercado basada en comparables."
                    open={fichaOpen.valuation}
                    onToggle={() => setFichaOpen((s) => ({ ...s, valuation: !s.valuation }))}
                >
                    <div className="space-y-3">
                        <PanelButton
                            type="button"
                            variant="primary"
                            className="w-full"
                            onClick={() => void runValuation()}
                            disabled={estimating || !valuationRequest || data.setup.listingType === 'auction'}
                        >
                            {estimating ? 'Calculando estimación...' : 'Calcular estimación'}
                        </PanelButton>
                        {data.setup.listingType === 'auction' ? (
                            <PanelNotice tone="neutral">La subasta ya se puede publicar. El tasador aplica para venta y arriendo.</PanelNotice>
                        ) : !valuationRequest ? (
                            <PanelNotice tone="neutral">Completa marca, modelo, año, kilometraje y ubicación para habilitar el tasador.</PanelNotice>
                        ) : !estimate ? (
                            <PanelNotice tone="neutral">Obtén una referencia de precio antes de publicar el aviso.</PanelNotice>
                        ) : null}
                        {estimate ? (
                            <div className="space-y-3">
                                <PanelSummaryCard
                                    eyebrow="Resultado"
                                    title={formatAmount(estimate.estimatedPrice, estimate.currency as 'CLP' | 'USD')}
                                    rows={[
                                        { label: 'Rango bajo', value: formatAmount(estimate.minPrice, estimate.currency as 'CLP' | 'USD') },
                                        { label: 'Rango alto', value: formatAmount(estimate.maxPrice, estimate.currency as 'CLP' | 'USD') },
                                        { label: 'Confianza', value: `${estimate.confidenceScore}%` },
                                        { label: 'Comparables', value: String(estimate.comparablesUsed) },
                                        { label: 'Liquidez', value: estimate.estimatedLiquidityDays != null ? `${estimate.estimatedLiquidityDays} días` : 'Sin dato' },
                                        { label: 'Tendencia 30d', value: formatSignedPercent(estimate.marketTrendPct30d) },
                                    ]}
                                />
                                {estimate.comparables.length > 0 ? (
                                    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                                        <p className="text-sm font-semibold">Comparables usados</p>
                                        <div className="mt-3 space-y-2">
                                            {estimate.comparables.slice(0, 3).map((comparable, index) => (
                                                <div key={`${comparable.source}-${comparable.externalId || comparable.title}-${index}`} className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="min-w-0 truncate text-sm font-medium">{comparable.title}</p>
                                                        <span className="text-sm font-semibold">{formatAmount(comparable.price, comparable.currency as 'CLP' | 'USD')}</span>
                                                    </div>
                                                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                                        {[comparable.source, comparable.year ? String(comparable.year) : null, comparable.mileageKm != null ? `${Math.round(comparable.mileageKm).toLocaleString('es-CL')} km` : null, comparable.addressLabel].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
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
                                                    <span className="font-medium">{formatAmount(point.medianPrice, estimate.currency as 'CLP' | 'USD')}</span>
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
                    </div>
                </FichaSection>

                <FichaSection
                    title="Publicación"
                    description="Configuración, calidad del anuncio y términos."
                    open={fichaOpen.publication}
                    onToggle={() => setFichaOpen((s) => ({ ...s, publication: !s.publication }))}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Slug (URL)">
                                <input
                                    className="form-input"
                                    value={data.commercial.slug}
                                    onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, slug: event.target.value } }))}
                                    placeholder="mi-auto-toyota-2020"
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>URL: /vehiculo/{data.commercial.slug || '...'}</p>
                            </Field>
                            <Field label="Vigencia">
                                <ModernSelect
                                    value={data.commercial.durationDays}
                                    onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, durationDays: value as '30' | '60' | '90' } }))}
                                    options={[
                                        { value: '30', label: '30 días' },
                                        { value: '60', label: '60 días' },
                                        { value: '90', label: '90 días' },
                                    ]}
                                    ariaLabel="Seleccionar vigencia"
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            <ToggleCard title="Auto-renovar" description="Renueva automáticamente al vencer." active={data.commercial.autoRenew} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, autoRenew: !current.commercial.autoRenew } }))} />
                            <ToggleCard title="Destacado" description="Aparece primero en resultados." active={data.commercial.featured} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, featured: !current.commercial.featured } }))} />
                            <ToggleCard title="Urgente" description="Etiqueta de urgencia visible." active={data.commercial.urgent} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, urgent: !current.commercial.urgent } }))} />
                        </div>
                        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Score de calidad</span>
                                <strong>{score}/100</strong>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                                <div className="h-full rounded-full" style={{ width: `${score}%`, background: 'var(--fg)' }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                <QualityItem label="5 fotos o más" ok={data.media.photos.length >= 5} />
                                <QualityItem label="5 equipamientos" ok={data.specs.featureCodes.length >= 5} />
                                <QualityItem label="Ubicación completa" ok={!!data.location.addressLine1 && !!data.location.regionId && !!data.location.communeId} />
                                <QualityItem label="Datos específicos" ok={countFilledFields(data, getSpecificFields(data.setup.vehicleType)) >= Math.min(4, getSpecificFields(data.setup.vehicleType).length)} />
                                <QualityItem label="Antecedentes cargados" ok={countComplementaryEntries(data) >= 3} />
                                <QualityItem label={data.setup.listingType === 'auction' ? 'Tasador no requerido' : 'Tasador ejecutado'} ok={data.setup.listingType === 'auction' ? true : !!estimate} />
                            </div>
                        </div>
                        {errors['review.acceptTerms'] ? <ErrorText text={errors['review.acceptTerms']} /> : null}
                    </div>
                </FichaSection>

                {/* Terms & Conditions - Unified for both modes */}
                <div className="space-y-2">
                    <label className="rounded-lg border px-3 py-2.5 flex items-start gap-2" style={{ borderColor: 'var(--border)' }}>
                        <input type="checkbox" checked={data.review.acceptTerms} onChange={(event) => setData((current) => ({ ...current, review: { ...current.review, acceptTerms: event.target.checked } }))} />
                        <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Acepto términos y condiciones.</span>
                    </label>
                    {errors['review.acceptTerms'] ? <ErrorText text={errors['review.acceptTerms']} /> : null}
                </div>

                {/* Bottom action bar */}
                <div className="rounded-2xl border p-3 flex items-center justify-between gap-2 mt-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        Calidad: <strong style={{ color: 'var(--fg)' }}>{score}/100</strong>
                    </span>
                    <div className="flex items-center gap-2">
                        <PanelButton type="button" variant="secondary" onClick={() => void saveDraft(true)}>
                            <IconDeviceFloppy size={14} />
                            Borrador
                        </PanelButton>
                        <PanelButton type="button" variant="primary" onClick={() => void publishNow()} disabled={publishing || editingLoading || !data.review.acceptTerms}>
                            <IconCheck size={14} />
                            {publishing ? 'Guardando...' : 'Guardar cambios'}
                        </PanelButton>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <QuickPublishFlow />
    );
}

type WizardSetter = React.Dispatch<React.SetStateAction<WizardData>>;

function ErrorText(props: { text: string }) {
    return <p className="mt-2 text-xs" style={{ color: '#b42318' }}>{props.text}</p>;
}

function StepSetup(props: { data: WizardData; setData: WizardSetter }) {
    const { data, setData } = props;

    return (
        <section className="space-y-6">
            <h2 className="type-section-title">Tipo y categoría</h2>
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>
                    Operación del aviso
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {LISTING_CARDS.map((card) => (
                        <PanelChoiceCard
                            key={card.value}
                            onClick={() => setData((current) => ({ ...current, setup: { ...current.setup, listingType: card.value } }))}
                            selected={data.setup.listingType === card.value}
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
            </div>
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>
                    Categoría del vehículo
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {VEHICLE_TYPE_OPTIONS.map((option) => (
                        <PanelChoiceCard
                            key={option.value}
                            onClick={() => setData((current) => ({
                                ...current,
                                setup: { ...current.setup, vehicleType: option.value },
                                basic: { ...current.basic, brandId: '', modelId: '', customBrand: '', customModel: '', version: '', versionMode: 'catalog', bodyType: '', specific: {} },
                                specs: { ...current.specs, featureCodes: [] },
                            }))}
                            selected={data.setup.vehicleType === option.value}
                            className="min-h-19.5 px-3"
                        >
                            <div className="flex items-center gap-3">
                                <span className="h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                    {option.icon}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{option.label}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Define los campos específicos del vehículo.</p>
                                </div>
                            </div>
                        </PanelChoiceCard>
                    ))}
                </div>
            </div>
        </section>
    );
}

function StepBasic(props: {
    data: WizardData;
    setData: WizardSetter;
    catalog: PublishWizardCatalog | null;
    models: Array<{ id: string; name: string }>;
    versions: Array<{ id: string; name: string }>;
    versionsLoading: boolean;
    communes: Array<{ id: string; name: string }>;
    addressBook: AddressBookEntry[];
    addressBookLoading: boolean;
    onGeocodeLocation: () => void | Promise<void>;
    geocoding: boolean;
    errors: Record<string, string>;
}) {
    const { data, setData, catalog, models, versions, versionsLoading, communes, addressBook, addressBookLoading, onGeocodeLocation, geocoding, errors } = props;
    const [openSections, setOpenSections] = useState<Record<'main' | 'location' | 'specific', boolean>>({
        main: true,
        location: true,
        specific: false,
    });
    const specificFields = getSpecificFields(data.setup.vehicleType);
    const brandOptions = catalog ? getBrandsForVehicleType(catalog, data.setup.vehicleType) : [];
    const hasCatalogVersionSelected = versions.some((item) => item.name === data.basic.version);
    const versionSelectValue = data.basic.versionMode === 'manual'
        ? '__manual__'
        : hasCatalogVersionSelected
            ? data.basic.version
            : '';

    return (
        <section className="space-y-4">
            <h2 className="type-section-title">Datos del vehículo</h2>

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
                title="Datos Principales"
                description="Bloque base del aviso, con título autogenerado y los campos obligatorios."
                open={openSections.main}
                onToggle={() => setOpenSections((current) => ({ ...current, main: !current.main }))}
            >
                <div className="grid grid-cols-1 gap-3 mb-3">
                    <Field label="Título" error={errors['basic.title']}>
                        <input
                            className="form-input"
                            value={data.basic.title}
                            readOnly
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Se genera con Marca + Modelo + Año + Tipo/Carrocería + Color.</p>
                    </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Marca" required error={errors['basic.brandId']}>
                        <ModernSelect
                            value={data.basic.brandId}
                            onChange={(value) => setData((current) => ({
                                ...current,
                                basic: {
                                    ...current.basic,
                                    brandId: value,
                                    modelId: '',
                                    version: '',
                                    versionMode: 'catalog',
                                },
                            }))}
                            placeholder="Seleccionar marca"
                            options={[
                                ...brandOptions.map((item) => ({ value: item.id, label: item.name })),
                                { value: '__custom__', label: 'Otra marca (manual)' },
                            ]}
                            ariaLabel="Seleccionar marca"
                        />
                    </Field>
                    <Field label="Modelo" required error={errors['basic.modelId']}>
                        <ModernSelect
                            value={data.basic.modelId}
                            onChange={(value) => setData((current) => ({
                                ...current,
                                basic: {
                                    ...current.basic,
                                    modelId: value,
                                    version: '',
                                    versionMode: 'catalog',
                                },
                            }))}
                            placeholder={data.basic.brandId ? 'Seleccionar modelo' : 'Primero marca'}
                            options={[
                                ...models.map((item) => ({ value: item.id, label: item.name })),
                                ...(data.basic.brandId ? [{ value: '__custom__', label: 'Otro modelo (manual)' }] : []),
                            ]}
                            disabled={!data.basic.brandId}
                            ariaLabel="Seleccionar modelo"
                        />
                    </Field>
                    {data.basic.brandId === '__custom__' ? (
                        <Field label="Marca manual" required error={errors['basic.customBrand']}>
                            <input className="form-input" value={data.basic.customBrand} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, customBrand: event.target.value } }))} />
                        </Field>
                    ) : null}
                    {data.basic.modelId === '__custom__' ? (
                        <Field label="Modelo manual" required error={errors['basic.customModel']}>
                            <input className="form-input" value={data.basic.customModel} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, customModel: event.target.value } }))} />
                        </Field>
                    ) : null}
                    <Field label="Año" required error={errors['basic.year']}>
                        <ModernSelect
                            value={data.basic.year}
                            onChange={(value) => setData((current) => ({
                                ...current,
                                basic: {
                                    ...current.basic,
                                    year: value,
                                    version: '',
                                    versionMode: 'catalog',
                                },
                            }))}
                            placeholder="Seleccionar"
                            options={YEAR_OPTIONS.map((item) => ({ value: item, label: item }))}
                            ariaLabel="Seleccionar año"
                        />
                    </Field>
                    <Field label="Versión">
                        <ModernSelect
                            value={versionSelectValue}
                            onChange={(value) => setData((current) => ({
                                ...current,
                                basic: {
                                    ...current.basic,
                                    versionMode: value === '__manual__' ? 'manual' : 'catalog',
                                    version: value === '__manual__' ? (current.basic.versionMode === 'manual' ? current.basic.version : '') : value,
                                },
                            }))}
                            placeholder={
                                !data.basic.modelId
                                    ? 'Primero modelo'
                                    : !data.basic.year
                                        ? 'Primero año'
                                        : versionsLoading
                                            ? 'Buscando versiones...'
                                            : 'Seleccionar versión'
                            }
                            options={[
                                ...versions.map((item) => ({ value: item.name, label: item.name })),
                                ...(data.basic.modelId && data.basic.year ? [{ value: '__manual__', label: 'Ingresar versión manual' }] : []),
                            ]}
                            disabled={!data.basic.modelId || !data.basic.year || versionsLoading}
                            ariaLabel="Seleccionar versión"
                        />
                    </Field>
                    {data.basic.versionMode === 'manual' && data.basic.modelId ? (
                        <Field label="Versión manual">
                            <input
                                className="form-input"
                                value={data.basic.version}
                                onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, version: event.target.value, versionMode: 'manual' } }))}
                                placeholder="Ej: II LS 2.4L 6MT"
                            />
                        </Field>
                    ) : null}
                    <Field label={getBodyTypeLabel(data.setup.vehicleType)} required error={errors['basic.bodyType']}>
                        <ModernSelect
                            value={data.basic.bodyType}
                            onChange={(value) => {
                                const mirrorField = BODY_TYPE_SPECIFIC_MIRRORS[data.setup.vehicleType];
                                setData((current) => ({
                                    ...current,
                                    basic: {
                                        ...current.basic,
                                        bodyType: value,
                                        specific: mirrorField
                                            ? { ...current.basic.specific, [mirrorField]: value }
                                            : current.basic.specific,
                                    },
                                }));
                            }}
                            placeholder="Seleccionar"
                            options={getBodyTypeOptions(data.setup.vehicleType).map((item) => ({ value: item, label: item }))}
                            ariaLabel={`Seleccionar ${getBodyTypeLabel(data.setup.vehicleType).toLowerCase()}`}
                        />
                    </Field>
                    <Field label="Color" required error={errors['basic.color']}>
                        <ModernSelect
                            value={data.basic.color}
                            onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, color: value } }))}
                            placeholder="Seleccionar"
                            options={VEHICLE_COLOR_OPTIONS}
                            ariaLabel="Seleccionar color"
                        />
                    </Field>
                    <Field label="Condición" required error={errors['basic.condition']}>
                        <ModernSelect
                            value={data.basic.condition}
                            onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, condition: value } }))}
                            placeholder="Seleccionar"
                            options={CONDITION_OPTIONS}
                            ariaLabel="Seleccionar condición"
                        />
                    </Field>
                    <Field label="Kilometraje" required={['car', 'motorcycle', 'truck', 'bus'].includes(data.setup.vehicleType)} error={errors['basic.mileage']}><input className="form-input" type="number" min={0} value={data.basic.mileage} onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, mileage: event.target.value } }))} /></Field>
                    <Field label="Combustible" required={data.setup.vehicleType !== 'aerial'} error={errors['basic.fuelType']}>
                        <ModernSelect
                            value={data.basic.fuelType}
                            onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, fuelType: value } }))}
                            placeholder="Seleccionar"
                            options={FUEL_OPTIONS.map((item) => ({ value: item, label: item }))}
                            ariaLabel="Seleccionar combustible"
                        />
                    </Field>
                    <Field label="Transmisión" required={['car', 'motorcycle', 'truck', 'bus'].includes(data.setup.vehicleType)} error={errors['basic.transmission']}>
                        <ModernSelect
                            value={data.basic.transmission}
                            onChange={(value) => setData((current) => ({ ...current, basic: { ...current.basic, transmission: value } }))}
                            placeholder="Seleccionar"
                            options={TRANSMISSION_OPTIONS.map((item) => ({ value: item, label: item }))}
                            ariaLabel="Seleccionar transmisión"
                        />
                    </Field>
                </div>
                <div className="mt-3">
                    <Field label="Descripción" error={errors['basic.description']}>
                        <textarea
                            className="form-textarea"
                            rows={5}
                            value={data.basic.description}
                            onChange={(event) => setData((current) => ({ ...current, basic: { ...current.basic, description: event.target.value } }))}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{data.basic.description.length} / 2000</p>
                    </Field>
                </div>
            </AccordionGroup>

            <AccordionGroup
                title="Datos extras"
                description="Especificaciones objetivas del vehículo según su categoría."
                open={openSections.specific}
                onToggle={() => setOpenSections((current) => ({ ...current, specific: !current.specific }))}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {specificFields.map((field) => (
                        <Field
                            key={field.id}
                            label={field.label}
                            required={!!field.required}
                            error={errors[`basic.specific.${field.id}`]}
                        >
                            {field.input === 'select' ? (
                                <ModernSelect
                                    value={getFieldValue(data, field)}
                                    onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                    placeholder="Seleccionar"
                                    options={getDynamicSelectOptions(field)}
                                    ariaLabel={`Seleccionar ${field.label}`}
                                />
                            ) : (
                                <input
                                    className="form-input"
                                    type={field.input}
                                    placeholder={field.placeholder}
                                    value={getFieldValue(data, field)}
                                    onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                />
                            )}
                        </Field>
                    ))}
                </div>
            </AccordionGroup>
        </section>
    );
}

function StepSpecs(props: { data: WizardData; setData: WizardSetter; errors: Record<string, string> }) {
    const { data, setData, errors } = props;
    const featureSections = getFeatureSections(data.setup.vehicleType);
    const legalFields = getComplementaryFields(data.setup.vehicleType, 'legal');
    const historyFields = getComplementaryFields(data.setup.vehicleType, 'history');
    const [openSections, setOpenSections] = useState<Record<'legal' | 'history' | 'equipment', boolean>>({
        legal: true,
        history: true,
        equipment: true,
    });
    return (
        <section className="space-y-4">
            <h2 className="type-section-title">Equipamiento y antecedentes</h2>

            <AccordionGroup
                title="Documentación y legal"
                description="Estado documental, certificaciones y cumplimiento normativo."
                open={openSections.legal}
                onToggle={() => setOpenSections((current) => ({ ...current, legal: !current.legal }))}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {legalFields.map((field) => (
                        <Field key={field.id} label={field.label}>
                            {field.input === 'select' ? (
                                <ModernSelect
                                    value={getFieldValue(data, field)}
                                    onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                    placeholder="Seleccionar"
                                    options={getDynamicSelectOptions(field)}
                                    ariaLabel={`Seleccionar ${field.label}`}
                                />
                            ) : (
                                <input
                                    className="form-input"
                                    type={field.input}
                                    placeholder={field.placeholder}
                                    value={getFieldValue(data, field)}
                                    disabled={field.id === 'tinted_windows_ftrl_details' && data.basic.complementary.tinted_windows_ftrl_certified !== 'Sí'}
                                    onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                />
                            )}
                        </Field>
                    ))}
                </div>
            </AccordionGroup>

            <AccordionGroup
                title="Historial declarado"
                description="Respuestas declarativas sobre origen, uso e historial del vehículo."
                open={openSections.history}
                onToggle={() => setOpenSections((current) => ({ ...current, history: !current.history }))}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {historyFields.map((field) => (
                        <Field key={field.id} label={field.label}>
                            {field.input === 'select' ? (
                                <ModernSelect
                                    value={getFieldValue(data, field)}
                                    onChange={(value) => updateDynamicFieldValue(setData, field, value)}
                                    placeholder="Seleccionar"
                                    options={getDynamicSelectOptions(field)}
                                    ariaLabel={`Seleccionar ${field.label}`}
                                />
                            ) : (
                                <input
                                    className="form-input"
                                    type={field.input}
                                    placeholder={field.placeholder}
                                    value={getFieldValue(data, field)}
                                    onChange={(event) => updateDynamicFieldValue(setData, field, event.target.value)}
                                />
                            )}
                        </Field>
                    ))}
                </div>
            </AccordionGroup>

            <AccordionGroup
                title="Equipamiento"
                description="Extras y asistencias disponibles según el tipo de vehículo."
                open={openSections.equipment}
                onToggle={() => setOpenSections((current) => ({ ...current, equipment: !current.equipment }))}
            >
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-3 mb-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <span className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--fg-muted)' }}>Seleccionados</span>
                    <span className="text-sm font-medium">{data.specs.featureCodes.length}</span>
                    {data.specs.featureCodes.length > 0 ? (
                        <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                            {featureSections.flatMap((section) => section.items).filter((item) => data.specs.featureCodes.includes(item.code)).slice(0, 4).map((item) => item.label).join(', ')}
                            {data.specs.featureCodes.length > 4 ? '…' : ''}
                        </span>
                    ) : (
                        <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Selecciona los extras que realmente tiene este vehículo.</span>
                    )}
                </div>
                <div className="space-y-4">
                    {featureSections.map((section) => (
                        <div key={section.title} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">{section.title}</p>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {section.items.filter((item) => data.specs.featureCodes.includes(item.code)).length} / {section.items.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {section.items.map((item) => (
                                    <SelectableChip
                                        key={item.code}
                                        label={item.label}
                                        active={data.specs.featureCodes.includes(item.code)}
                                        onToggle={() =>
                                            setData((current) => ({
                                                ...current,
                                                specs: {
                                                    ...current.specs,
                                                    featureCodes: current.specs.featureCodes.includes(item.code)
                                                        ? current.specs.featureCodes.filter((code) => code !== item.code)
                                                        : [...current.specs.featureCodes, item.code],
                                                },
                                            }))
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {errors['specs.featureCodes'] ? <ErrorText text={errors['specs.featureCodes']} /> : null}
                <Field label="Notas técnicas"><textarea className="form-textarea" rows={4} value={data.specs.notes} onChange={(event) => setData((current) => ({ ...current, specs: { ...current.specs, notes: event.target.value } }))} placeholder="Ej: Mantiene control crucero adaptativo, cámara 360 y neumáticos recién cambiados." /></Field>
            </AccordionGroup>
        </section>
    );
}

function StepMedia(props: {
    data: WizardData;
    setData: WizardSetter;
    errors: Record<string, string>;
}) {
    const { data, setData, errors } = props;
    return (
        <section className="space-y-4">
            <h2 className="type-section-title">Multimedia</h2>
            <PanelCard tone="surface" size="lg">
                <div className="space-y-4">
                    <PanelMediaUploader
                        items={data.media.photos}
                        onChange={(photos) => setData((current) => ({ ...current, media: { ...current.media, photos } }))}
                        minItems={1}
                        recommendedItems={10}
                        maxItems={MAX_PHOTOS}
                        minWidth={500}
                        minHeight={500}
                        maxWidth={1800}
                        maxHeight={1400}
                        targetBytes={420_000}
                        dropzoneTitle="Fotos"
                        helperText="Mínimo 1 · Máximo 20 · Se convierten a WEBP."
                        guidedSlots={AUTO_MEDIA_GUIDE_SLOTS}
                        emptyHint="Arrastra o selecciona"
                    />
                    {errors['media.photos'] ? <ErrorText text={errors['media.photos']} /> : null}
                </div>
            </PanelCard>

            <PanelCard tone="surface" size="lg">
                <div className="space-y-5">
                    <PanelBlockHeader
                        title="Video"
                        description="Video externo para el aviso y material promocional para Descubre."
                    />
                    <div className="space-y-4">
                        <Field label="Video del aviso" error={errors['media.videoUrl']}>
                            <input className="form-input" placeholder="https://www.youtube.com/... o https://vimeo.com/..." value={data.media.videoUrl} onChange={(event) => setData((current) => ({ ...current, media: { ...current.media, videoUrl: event.target.value } }))} />
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Solo YouTube o Vimeo.</p>
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
                            description="Papeles, informes, catálogos o documentación para complementar el aviso."
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
    estimate: VehicleValuationEstimate | null;
    estimating: boolean;
    valuationSources: VehicleValuationSourceStatus[];
    refreshingSources: boolean;
    valuationRequest: VehicleValuationRequest | null;
    onRunValuation: () => void | Promise<void>;
    onRefreshValuationSources: () => void | Promise<void>;
    lifecyclePolicy: PublicationLifecyclePolicy;
}) {
    const { data, setData, errors, estimate, estimating, valuationRequest, onRunValuation, lifecyclePolicy } = props;
    const isAuction = data.setup.listingType === 'auction';

    return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-4">
                <h2 className="type-section-title">Precio y publicación</h2>
                <PanelNotice tone="neutral">
                    {lifecyclePolicy.notice}
                </PanelNotice>
                <AccordionGroup
                    title="Precio y disponibilidad"
                    description={data.setup.listingType === 'sale' ? 'Precio del aviso, moneda y oferta opcional.' : data.setup.listingType === 'rent' ? 'Tarifas y disponibilidad del arriendo.' : 'Calendario y reglas base para la subasta.'}
                    open={true}
                    onToggle={() => {}}
                >
                    {data.setup.listingType === 'sale' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="Precio de publicación" required error={errors['commercial.price']}><input className="form-input" value={data.commercial.price} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, price: event.target.value } }))} placeholder="Ej: 18990000" /></Field>
                            <Field label="Moneda">
                                <ModernSelect
                                    value={data.commercial.currency}
                                    onChange={(value) => setData((current) => ({ ...current, commercial: { ...current.commercial, currency: value as 'CLP' | 'USD' } }))}
                                    options={[{ value: 'CLP', label: 'CLP' }, { value: 'USD', label: 'USD' }]}
                                    ariaLabel="Seleccionar moneda"
                                />
                            </Field>
                            <Field label="Precio oferta (opcional)" error={errors['commercial.offerPrice']}><input className="form-input" value={data.commercial.offerPrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, offerPrice: event.target.value } }))} placeholder="Opcional" /></Field>
                        </div>
                    ) : null}
                    {data.setup.listingType === 'rent' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="Precio por día"><input className="form-input" value={data.commercial.rentDaily} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentDaily: event.target.value } }))} placeholder="Opcional" /></Field>
                            <Field label="Precio por semana"><input className="form-input" value={data.commercial.rentWeekly} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentWeekly: event.target.value } }))} placeholder="Opcional" /></Field>
                            <Field label="Precio por mes"><input className="form-input" value={data.commercial.rentMonthly} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentMonthly: event.target.value } }))} placeholder="Opcional" /></Field>
                            <Field label="Días mínimos" error={errors['commercial.rentMinDays']}><input className="form-input" type="number" min={1} value={data.commercial.rentMinDays} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentMinDays: event.target.value } }))} /></Field>
                            <Field label="Depósito"><input className="form-input" value={data.commercial.rentDeposit} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentDeposit: event.target.value } }))} placeholder="Opcional" /></Field>
                            <Field label="Disponible desde"><input className="form-input" type="date" value={data.commercial.rentAvailableFrom} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentAvailableFrom: event.target.value } }))} /></Field>
                            <Field label="Disponible hasta" error={errors['commercial.rentAvailableTo']}><input className="form-input" type="date" value={data.commercial.rentAvailableTo} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, rentAvailableTo: event.target.value } }))} /></Field>
                        </div>
                    ) : null}
                    {isAuction ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="Precio base" required error={errors['commercial.auctionStartPrice']}><input className="form-input" value={data.commercial.auctionStartPrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionStartPrice: event.target.value } }))} /></Field>
                            <Field label="Precio reserva"><input className="form-input" value={data.commercial.auctionReservePrice} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionReservePrice: event.target.value } }))} placeholder="Opcional" /></Field>
                            <Field label="Incremento mínimo" required error={errors['commercial.auctionMinIncrement']}><input className="form-input" value={data.commercial.auctionMinIncrement} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionMinIncrement: event.target.value } }))} /></Field>
                            <Field label="Inicio" required error={errors['commercial.auctionStartAt']}><input className="form-input" type="datetime-local" value={data.commercial.auctionStartAt} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionStartAt: event.target.value } }))} /></Field>
                            <Field label="Fin" required error={errors['commercial.auctionEndAt']}><input className="form-input" type="datetime-local" value={data.commercial.auctionEndAt} onChange={(event) => setData((current) => ({ ...current, commercial: { ...current.commercial, auctionEndAt: event.target.value } }))} /></Field>
                        </div>
                    ) : null}
                    {(errors['commercial.rent'] || errors['commercial.auctionStartPrice'] || errors['commercial.auctionMinIncrement']) ? <ErrorText text={errors['commercial.rent'] || errors['commercial.auctionStartPrice'] || errors['commercial.auctionMinIncrement']} /> : null}
                </AccordionGroup>

                {!isAuction ? (
                    <AccordionGroup
                        title="Condiciones comerciales"
                        description="Opciones útiles para negociar o cerrar mejor el aviso, sin mezclar promoción."
                        open={true}
                        onToggle={() => {}}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            <ToggleCard title="Precio negociable" description="Permite conversar el valor final." active={data.commercial.negotiable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, negotiable: !current.commercial.negotiable } }))} />
                            {data.setup.listingType === 'sale' ? (
                                <>
                                    <ToggleCard title="Financiamiento disponible" description="Indica si se puede gestionar financiamiento." active={data.commercial.financingAvailable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, financingAvailable: !current.commercial.financingAvailable } }))} />
                                    <ToggleCard title="Acepta permuta" description="Útil para leads que ofrecen parte de pago." active={data.commercial.exchangeAvailable} onToggle={() => setData((current) => ({ ...current, commercial: { ...current.commercial, exchangeAvailable: !current.commercial.exchangeAvailable } }))} />
                                </>
                            ) : null}
                        </div>
                    </AccordionGroup>
                ) : null}
            </div>

            <div className="space-y-4">
                <PanelCard tone="subtle" size="md">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                            <IconCalculator size={18} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>Tasador online</p>
                            <h3 className="mt-1 text-lg font-semibold">Referencia de mercado</h3>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                {isAuction
                                    ? 'La subasta se publica sin tasación automática.'
                                    : 'Estimación basada en comparables, avisos internos y fuentes externas del mercado chileno.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <PanelButton type="button" variant="primary" className="w-full" onClick={() => void onRunValuation()} disabled={estimating || !valuationRequest || isAuction}>
                            {estimating ? 'Calculando estimación...' : 'Calcular estimación'}
                        </PanelButton>
                        {isAuction ? (
                            <PanelNotice tone="neutral">La subasta ya se puede publicar. El tasador se mantiene para venta y arriendo.</PanelNotice>
                        ) : !valuationRequest ? (
                            <PanelNotice tone="neutral">Completa marca, modelo, año, kilometraje y ubicación para habilitar el tasador.</PanelNotice>
                        ) : !estimate ? (
                            <PanelNotice tone="neutral">Obtén una referencia de precio, rango y confianza antes de publicar el aviso.</PanelNotice>
                        ) : null}
                    </div>

                    {estimate ? (
                        <div className="mt-4 space-y-3">
                            <PanelSummaryCard
                                eyebrow="Resultado"
                                title={formatAmount(estimate.estimatedPrice, estimate.currency as 'CLP' | 'USD')}
                                rows={[
                                    { label: 'Rango bajo', value: formatAmount(estimate.minPrice, estimate.currency as 'CLP' | 'USD') },
                                    { label: 'Rango alto', value: formatAmount(estimate.maxPrice, estimate.currency as 'CLP' | 'USD') },
                                    { label: 'Confianza', value: `${estimate.confidenceScore}%` },
                                    { label: 'Comparables', value: String(estimate.comparablesUsed) },
                                    { label: 'Liquidez', value: estimate.estimatedLiquidityDays != null ? `${estimate.estimatedLiquidityDays} días` : 'Sin dato' },
                                    { label: 'Tendencia 30d', value: formatSignedPercent(estimate.marketTrendPct30d) },
                                ]}
                            />

                            {estimate.comparables.length > 0 ? (
                                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                                    <p className="text-sm font-semibold">Comparables usados</p>
                                    <div className="mt-3 space-y-2">
                                        {estimate.comparables.slice(0, 3).map((comparable, index) => (
                                            <div key={`${comparable.source}-${comparable.externalId || comparable.title}-${index}`} className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="min-w-0 truncate text-sm font-medium">{comparable.title}</p>
                                                    <span className="text-sm font-semibold">{formatAmount(comparable.price, comparable.currency as 'CLP' | 'USD')}</span>
                                                </div>
                                                <p className="mt-1 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                                    {[comparable.source, comparable.year ? String(comparable.year) : null, comparable.mileageKm != null ? `${Math.round(comparable.mileageKm).toLocaleString('es-CL')} km` : null, comparable.addressLabel].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

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
                                                <span className="font-medium">{formatAmount(point.medianPrice, estimate.currency as 'CLP' | 'USD')}</span>
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


function AccordionGroup(props: { title: string; description?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <section className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={props.onToggle} className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left cursor-pointer">
                <span>
                    <span className="block text-sm font-medium">{props.title}</span>
                    {props.description ? <span className="block text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{props.description}</span> : null}
                </span>
                <span className="text-xs mt-0.5 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                    {props.open ? 'Contraer' : 'Expandir'}
                    {props.open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </span>
            </button>
            {props.open ? (
                <div className="px-4 pb-2 pt-1">
                    {props.children}
                </div>
            ) : null}
        </section>
    );
}

function Field(props: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>
                {props.label}
                {props.required ? <abbr title="requerido" style={{ color: 'var(--color-error, #ef4444)', textDecoration: 'none' }}> *</abbr> : null}
            </label>
            {props.children}
            {props.error ? <ErrorText text={props.error} /> : null}
        </div>
    );
}

function ToggleCard(props: { title: string; description?: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onToggle}
            className="rounded-2xl border px-3 py-3 text-left transition-colors"
            style={{
                borderColor: props.active ? 'var(--fg)' : 'var(--border)',
                background: props.active ? 'var(--bg-subtle)' : 'var(--surface)',
            }}
        >
            <p className="text-sm font-medium">{props.title}</p>
            {props.description ? <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>{props.description}</p> : null}
            <p className="text-[11px] mt-2 uppercase tracking-[0.08em]" style={{ color: props.active ? 'var(--fg)' : 'var(--fg-muted)' }}>{props.active ? 'Activo' : 'Inactivo'}</p>
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

function FichaGroup(props: { label: string }) {
    return (
        <div className="mt-6 mb-3">
            <h3 className="text-xs uppercase tracking-[0.16em] font-semibold" style={{ color: 'var(--fg-muted)' }}>
                {props.label}
            </h3>
        </div>
    );
}

function FichaSection(props: {
    title: string;
    description?: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <PanelCard className="border" size="md">
            <button
                type="button"
                onClick={props.onToggle}
                className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
            >
                <span>
                    <span className="block text-sm font-medium">{props.title}</span>
                    {props.description ? (
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            {props.description}
                        </span>
                    ) : null}
                </span>
                <span className="text-xs mt-0.5 inline-flex items-center gap-1.5 shrink-0" style={{ color: 'var(--fg-muted)' }}>
                    {props.open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </span>
            </button>
            {props.open ? (
                <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                    {props.children}
                </div>
            ) : null}
        </PanelCard>
    );
}

