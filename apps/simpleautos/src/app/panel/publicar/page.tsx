'use client';

// =============================================================================
// SIMPLE AUTOS - PUBLICAR V2 (3 PASOS ULTRA SIMPLE)
// Mobile-first, publicar en segundos, mejorar después
// =============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconCamera,
    IconPhoto,
    IconX,
    IconUpload,
    IconMapPin,
    IconCurrencyDollar,
    IconCar,
    IconMotorbike,
    IconTruck,
    IconBus,
    IconTractor,
    IconAnchor,
    IconPlane,
    IconTag,
    IconKey,
    IconHammer,
    IconChevronDown,
    IconChevronUp,
    IconSparkles,
    IconShare3,
    IconBrandWhatsapp,
    IconLoader2,
    IconPlus,
    IconTrash,
    IconGripVertical,
    IconStar,
    IconGauge,
    IconEngine,
    IconSteeringWheel,
    IconRocket,
    IconCalendar,
    IconGasStation,
    IconManualGearbox,
    IconBrandInstagram,
    IconExternalLink,
    IconLock,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
    type PublishWizardCatalog,
    type VehicleCatalogType,
    getBrandsForVehicleType,
    getModelsForBrand,
    loadPublishWizardCatalog,
} from '@/lib/publish-wizard-catalog';
import {
    createPanelListing,
    updatePanelListing,
    fetchPanelListingDetail,
    savePanelListingDraft,
    fetchPanelListingDraft,
    deletePanelListingDraft,
    type CreatePanelListingInput,
} from '@/lib/panel-listings';
import { PanelButton, PanelCard, PanelNotice, PanelVideoUploader } from '@simple/ui';
import type { PanelVideoAsset } from '@simple/ui';
import ModernSelect from '@/components/ui/modern-select';
import { ColorPicker } from '@/components/ui/color-picker';
import { fetchAddressBook, uploadMediaFile } from '@simple/utils';
import type { AddressBookEntry } from '@simple/types';
import { createEmptyListingLocation } from '@simple/types';
import {
    fetchInstagramIntegrationStatus,
    publishListingToInstagramEnhanced,
    type InstagramIntegrationStatus,
} from '@/lib/instagram';

// =============================================================================
// TIPOS
// =============================================================================

type Step = 1 | 2 | 3 | 'success';
type ListingType = 'sale' | 'rent' | 'auction';

interface FormData {
    // Paso 1: Identidad
    photos: Array<{ id: string; file: File; preview: string; isCover: boolean }>;
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
    // Video
    discoverVideo: PanelVideoAsset | null;
    
    // Paso 3: Ubicación y contacto
    regionId: string;
    communeId: string;
    title: string;
    description: string;
    // Opciones
    negotiable: boolean;
    financing: boolean;
    exchange: boolean;
}

const EMPTY_FORM: FormData = {
    photos: [],
    discoverVideo: null,
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
};

// =============================================================================
// CONSTANTES
// =============================================================================

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
    { value: 'sale', label: 'Venta', Icon: IconTag, color: '#22c55e' },
    { value: 'rent', label: 'Arriendo', Icon: IconKey, color: '#3b82f6' },
    { value: 'auction', label: 'Subasta', Icon: IconHammer, color: '#f59e0b' },
] as const;

const FUEL_TYPES = ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'];
const TRANSMISSIONS = ['Manual', 'Automática', 'CVT'];
const CONDITIONS = ['Nuevo', 'Seminuevo', 'Usado'];

// Regiones de Chile (simplificado)
const REGIONS = [
    { id: 'RM', name: 'Metropolitana' },
    { id: 'VA', name: 'Valparaíso' },
    { id: 'BI', name: 'Biobío' },
    { id: 'AR', name: 'La Araucanía' },
    { id: 'LL', name: 'Los Lagos' },
    { id: 'AN', name: 'Antofagasta' },
    { id: 'CO', name: 'Coquimbo' },
    { id: 'ML', name: 'Maule' },
    { id: 'LI', name: "O'Higgins" },
    { id: 'TA', name: 'Tarapacá' },
    { id: 'AT', name: 'Atacama' },
    { id: 'VS', name: 'Ñuble' },
    { id: 'RI', name: 'Los Ríos' },
    { id: 'AI', name: 'Aysén' },
    { id: 'MA', name: 'Magallanes' },
    { id: 'AP', name: 'Arica y Parinacota' },
];

// Comunas principales por región (simplificado)
const COMMUNES: Record<string, string[]> = {
    'RM': ['Santiago', 'Providencia', 'Las Condes', 'Vitacura', 'La Reina', 'Ñuñoa', 'La Florida', 'Puente Alto', 'Maipú', 'Pudahuel', 'Quilicura', 'Independencia', 'Recoleta', 'Estación Central', 'San Miguel', 'La Cisterna', 'El Bosque', 'Lo Prado', 'Cerro Navia', 'Quinta Normal', 'Lo Espejo', 'Pedro Aguirre Cerda', 'San Joaquín', 'Macul', 'Peñalolén', 'La Granja', 'San Ramón', 'San Bernardo', 'Calera de Tango', 'Paine', 'Buin', 'Isla de Maipo', 'El Monte', 'Talagante', 'Peñaflor', 'Curacaví', 'María Pinto', 'Melipilla', 'San Pedro', 'Alhué'],
    'VA': ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Limache', 'Olmué', 'Quillota', 'La Calera', 'Nogales', 'San Antonio', 'Cartagena', 'El Tabo', 'El Quisco', 'Algarrobo', 'Casablanca', 'San Felipe', 'Los Andes', 'San Esteban', 'Calle Larga', 'Rinconada', 'Cabrero', 'Placilla'],
    'BI': ['Concepción', 'Talcahuano', 'Chiguayante', 'San Pedro de la Paz', 'Hualpén', 'Hualqui', 'Coronel', 'Lota', 'Santa Juana', 'Tomé', 'Penco', 'Florida', 'Cabrero', 'Yumbel', 'San Rosendo', 'Laja', 'Negrete', 'Nacimiento', 'Mulchén', 'Santa Bárbara'],
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PublicarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const editingId = searchParams.get('edit');
    const isEditing = Boolean(editingId);
    
    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [loading, setLoading] = useState(false);
    const [published, setPublished] = useState<{ id: string; href: string; title: string } | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        details: false,
        history: false,
        video: false,
        equipment: false,
    });
    
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
                    // TODO: Mapear draft a FormData
                }
            }).catch(() => null);
        } else {
            // Cargar para edición
            setLoading(true);
            fetchPanelListingDetail(editingId!).then((listing) => {
                if (listing) {
                    // TODO: Mapear listing a FormData
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [editingId]);
    
    // Autosave borrador
    useEffect(() => {
        if (!isEditing && step !== 'success') {
            const timer = setTimeout(() => {
                // TODO: Guardar borrador
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [form, step, isEditing]);
    
    const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);
    
    const canProceed = () => {
        if (step === 1) {
            return form.photos.length >= 1 && form.brandId && form.modelId && form.year && form.price;
        }
        if (step === 2) {
            return true; // Todo opcional en paso 2
        }
        if (step === 3) {
            return form.regionId && form.communeId;
        }
        return false;
    };
    
    const handlePublish = async () => {
        setLoading(true);
        try {
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
            
            const photoFiles = form.photos.filter(p => p.file);
            
            for (const photo of photoFiles) {
                try {
                    const uploadResult = await uploadMediaFile(photo.file as File, {
                        fileType: 'image',
                    });
                    
                    if (uploadResult.ok && uploadResult.result) {
                        uploadedPhotos.push({
                            id: photo.id,
                            name: (photo.file as File).name,
                            dataUrl: uploadResult.result.publicUrl || uploadResult.result.url,
                            previewUrl: uploadResult.result.publicUrl || uploadResult.result.url,
                            isCover: photo.isCover,
                            width: 0,
                            height: 0,
                            sizeBytes: (photo.file as File).size,
                            mimeType: (photo.file as File).type,
                        });
                    }
                } catch (err) {
                    console.error('Error uploading photo:', err);
                }
            }
            
            // PASO 1B: Subir video si existe
            let discoverVideoUrl: string | null = null;
            if (form.discoverVideo) {
                try {
                    // Si es dataUrl (base64), convertir a Blob y subir
                    if (form.discoverVideo.dataUrl.startsWith('data:')) {
                        const blob = await fetch(form.discoverVideo.dataUrl).then((r) => r.blob());
                        const file = new File([blob], form.discoverVideo.name, { type: form.discoverVideo.mimeType });
                        const videoResult = await uploadMediaFile(file, { fileType: 'video' });
                        if (videoResult.ok && videoResult.result) {
                            discoverVideoUrl = videoResult.result.publicUrl || videoResult.result.url;
                        }
                    } else {
                        // Ya es una URL, no necesita subida
                        discoverVideoUrl = form.discoverVideo.dataUrl;
                    }
                } catch (err) {
                    console.error('Error uploading video:', err);
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
            
            const priceLabel = form.listingType === 'rent' 
                ? renderMoney(form.price, ' / mes') || '$0'
                : form.listingType === 'auction'
                    ? renderMoney(form.price) || '$0'
                    : renderMoney(offerPriceValue || form.price) || '$0';
            
            // PASO 4: Construir datos
            const brandName = form.brandId === '__custom__' ? form.customBrand : 
                catalog?.brands.find(b => b.id === form.brandId)?.name || form.brandId;
            const modelName = form.modelId === '__custom__' ? form.customModel : 
                catalog?.models.find(m => m.id === form.modelId)?.name || form.modelId;
            
            // Buscar región y comuna en el catálogo para obtener IDs correctos
            const catalogRegion = catalog?.regions.find(r => r.name === REGIONS.find(r2 => r2.id === form.regionId)?.name);
            const catalogCommune = catalog?.communes.find(c => c.name === form.communeId && c.regionId === catalogRegion?.id);
            
            const regionId = catalogRegion?.id || form.regionId;
            const regionName = catalogRegion?.name || REGIONS.find(r => r.id === form.regionId)?.name || '';
            const communeId = catalogCommune?.id || form.communeId;
            const communeName = catalogCommune?.name || form.communeId;
            
            const locationData = createEmptyListingLocation({
                sourceMode: 'area_only',
                countryCode: 'CL',
                regionId: regionId,
                regionName: regionName,
                communeId: communeId,
                communeName: communeName,
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
                    videoUrl: discoverVideoUrl || '',
                    discoverVideo: discoverVideoUrl ? {
                        id: form.discoverVideo?.id || '',
                        name: form.discoverVideo?.name || '',
                        dataUrl: discoverVideoUrl,
                        previewUrl: discoverVideoUrl,
                        durationSeconds: form.discoverVideo?.durationSeconds || 0,
                        width: form.discoverVideo?.width || 0,
                        height: form.discoverVideo?.height || 0,
                        sizeBytes: form.discoverVideo?.sizeBytes || 0,
                        mimeType: form.discoverVideo?.mimeType || '',
                    } : null,
                    documents: [],
                },
                location: createEmptyListingLocation({
                    sourceMode: 'area_only',
                    countryCode: 'CL',
                    regionId: regionId,
                    regionName: regionName,
                    communeId: communeId,
                    communeName: communeName,
                    visibilityMode: 'commune_only',
                    publicMapEnabled: true,
                    publicLabel: `${communeName}, ${regionName}`,
                }),
                commercial: {
                    currency: 'CLP',
                    price: parseDigits(form.price),
                    offerPrice: offerPriceValue,
                    rentDaily: '',
                    rentWeekly: '',
                    rentMonthly: form.listingType === 'rent' ? parseDigits(form.price) : '',
                    rentMinDays: '',
                    rentKmPerDayIncluded: '',
                    rentInsuranceIncluded: false,
                    rentAvailableFrom: '',
                    rentAvailableTo: '',
                    rentDeposit: '',
                    rentRequirements: '',
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
                priceLabel: priceLabel,
                location: [communeName, regionName].filter(Boolean).join(', '),
                locationData: locationData,
                status: 'active',
                rawData: rawData,
            };
            
            // PASO 7: Crear el listing
            const result = await createPanelListing(payload);
            
            if (result.ok && result.item) {
                setPublished({
                    id: result.item.id,
                    href: result.item.href || `/vehiculo/${result.item.id}`,
                    title: result.item.title
                });
                setStep('success');
                await deletePanelListingDraft('autos-quick').catch(() => null);
            } else {
                alert(result.error || 'No se pudo publicar. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error al publicar:', error);
            alert('Ocurrió un error al publicar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };
    
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
    
    return (
        <div className="min-h-screen bg-[var(--bg)]">
            {/* Header móvil */}
            <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)]">
                <div className="flex items-center justify-between h-14 px-4">
                    <button 
                        onClick={() => step === 1 ? router.push('/panel') : setStep(prev => (prev === 2 ? 1 : prev === 3 ? 2 : 1) as Step)}
                        className="p-2 -ml-2 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                        {step === 1 ? <IconX size={22} /> : <IconArrowLeft size={22} />}
                    </button>
                    <span className="text-sm font-medium">
                        {isEditing ? 'Editar publicación' : 'Nueva publicación'}
                    </span>
                    <div className="w-10" /> {/* Spacer */}
                </div>
                
                {/* Progress bar */}
                {step !== 'success' && (
                    <div className="flex h-1 bg-[var(--bg-subtle)]">
                        <div 
                            className="transition-all duration-300 bg-[var(--accent)]"
                            style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                        />
                    </div>
                )}
            </header>
            
            {/* Contenido - Responsive: mobile full width, desktop wider with sidebar-like spacing */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-2xl xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                    {step === 1 && (
                        <Step1PhotosAndIdentity 
                            form={form} 
                            updateForm={updateForm} 
                            catalog={catalog}
                        />
                    )}
                    
                    {step === 2 && (
                        <Step2Condition
                            form={form}
                            updateForm={updateForm}
                            expandedSections={expandedSections}
                            toggleSection={toggleSection}
                            catalog={catalog}
                        />
                    )}
                    
                    {step === 3 && (
                        <Step3LocationAndPublish
                            form={form}
                            updateForm={updateForm}
                            user={user}
                            catalog={catalog}
                        />
                    )}
                    
                    {step === 'success' && published && (
                        <StepSuccess published={published} />
                    )}
                </div>
            </main>
            
            {/* Footer con acción - sobre bottom nav en mobile, normal en desktop */}
            {step !== 'success' && (
                <footer className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] shadow-lg p-4 safe-area-pb lg:p-5">
                    <div className="max-w-2xl xl:max-w-5xl mx-auto flex items-center justify-between gap-4">
                        {/* Info del paso - solo desktop */}
                        <div className="hidden lg:block">
                            <p className="text-sm font-medium text-[var(--fg)]">
                                {step === 1 && 'Paso 1: Fotos e identidad'}
                                {step === 2 && 'Paso 2: Estado del vehículo'}
                                {step === 3 && 'Paso 3: Ubicación y publicar'}
                            </p>
                            <p className="text-xs text-[var(--fg-muted)]">
                                {step === 3 ? 'Revisa tu aviso antes de publicar' : 'Completa los datos requeridos'}
                            </p>
                        </div>
                        
                        <div className="flex-1 lg:flex-initial">
                            <button
                                onClick={() => {
                                    if (step === 3) handlePublish();
                                    else setStep(prev => ((prev as number) + 1) as Step);
                                }}
                                disabled={!canProceed() || loading}
                                className="w-full lg:w-auto lg:min-w-[200px] h-12 lg:h-14 rounded-xl font-semibold text-white transition-all shadow-md
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                    bg-[var(--accent)] hover:bg-[var(--accent)]/90 hover:shadow-lg hover:scale-[1.02]
                                    active:scale-[0.98]
                                    flex items-center justify-center gap-2 px-6"
                            >
                                {loading ? (
                                    <>
                                        <IconLoader2 size={20} className="animate-spin" />
                                        {step === 3 ? 'Publicando...' : 'Guardando...'}
                                    </>
                                ) : (
                                    <>
                                        {step === 3 ? (
                                            <>
                                                <IconRocket size={20} />
                                                <span>Publicar aviso</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Continuar</span>
                                                <IconArrowRight size={20} />
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                            
                            {step === 3 && !canProceed() && (
                                <p className="text-xs text-center lg:text-right text-[var(--fg-muted)] mt-2">
                                    Completa todos los campos requeridos para publicar
                                </p>
                            )}
                        </div>
                    </div>
                </footer>
            )}
        </div>
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
                ${isCover ? 'border-[#FF3600] shadow-md' : 'border-[var(--border)]'}
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
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#FF3600] text-white">
                    <IconStar size={8} fill="white" />
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
    catalog
}: {
    form: FormData;
    updateForm: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    catalog: PublishWizardCatalog | null;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const newPhotos = Array.from(files).slice(0, 20 - form.photos.length).map((file, idx) => ({
            id: Math.random().toString(36).slice(2),
            file,
            preview: URL.createObjectURL(file),
            isCover: form.photos.length === 0 && idx === 0,
        }));
        updateForm('photos', [...form.photos, ...newPhotos]);
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
    
    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            form.photos.forEach(p => {
                if (p.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(p.preview);
                }
            });
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
    
    return (
        <div className="space-y-8 pb-32">
            {/* Header Premium */}
            <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold mb-3">
                    <IconCamera size={14} />
                    Paso 1 de 3
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[var(--fg)] tracking-tight">
                    ¿Qué vehículo vendes?
                </h1>
                <p className="text-[var(--fg-muted)] text-base mt-2 max-w-lg">
                    Sube fotos de calidad y cuéntanos los datos básicos. Los avisos completos venden 3x más rápido.
                </p>
            </div>
            
            {/* Fotos - Grid con slots guía */}
            <section>
                <label className="block text-sm font-medium mb-3">Fotos *</label>
                
                {form.photos.length === 0 ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                            ${dragOver ? 'border-[#FF3600] bg-[#fff8f5]' : 'border-[var(--border)] hover:border-[#FF3600]/50'}`}
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center">
                            <IconCamera size={28} className="text-[#FF3600]" />
                        </div>
                        <p className="font-medium">Toma fotos o selecciona de tu galería</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-1">
                            Mínimo 1 foto · Máximo 20 · Arrastra para ordenar
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Grid premium con drag & drop */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={form.photos.map(p => p.id)}
                                strategy={rectSortingStrategy}
                            >
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {/* Fotos subidas - sortable */}
                                    {form.photos.map((photo, idx) => (
                                        <SortablePhotoItem
                                            key={photo.id}
                                            photo={photo}
                                            index={idx}
                                            onRemove={removePhoto}
                                            isCover={idx === 0}
                                        />
                                    ))}
                                    
                                    {/* Slot guía - una sugerencia a la vez */}
                            {(() => {
                                const suggestions = [
                                    { label: 'Frontal', Icon: IconCar, desc: 'Vista de frente' },
                                    { label: 'Trasera', Icon: IconCar, desc: 'Vista trasera' },
                                    { label: 'Lado Izquierdo', Icon: IconCar, desc: 'Perfil izquierdo' },
                                    { label: 'Lado Derecho', Icon: IconCar, desc: 'Perfil derecho' },
                                    { label: 'Interior', Icon: IconSteeringWheel, desc: 'Cabina/puesto' },
                                    { label: 'Asientos', Icon: IconCar, desc: 'Tapicería/interior' },
                                    { label: 'Motor', Icon: IconEngine, desc: 'Compartimiento motor' },
                                    { label: 'Kilometraje', Icon: IconGauge, desc: 'Tablero/odómetro' },
                                    { label: 'Adicional', Icon: IconPhoto, desc: 'Otro ángulo' },
                                ];
                                const suggestion = suggestions[Math.min(form.photos.length, suggestions.length - 1)];
                                
                                if (form.photos.length < 10) {
                                    return (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-2xl border-2 border-dashed border-[#FF3600]/40 
                                                flex flex-col items-center justify-center gap-1.5 
                                                transition-all hover:border-[#FF3600] hover:bg-[#fff8f5] active:scale-95"
                                            style={{ background: 'var(--bg-subtle)' }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[#FF3600]/10 flex items-center justify-center">
                                                <suggestion.Icon size={16} strokeWidth={1.5} className="text-[#FF3600]" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-[#FF3600]">{suggestion.label}</span>
                                            <span className="text-[9px] text-[var(--fg-muted)] opacity-70">{suggestion.desc}</span>
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                            
                            {/* Botón agregar más (+) */}
                            {form.photos.length < 20 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-[var(--border)]
                                        flex flex-col items-center justify-center gap-1 hover:border-[#FF3600] hover:bg-[#fff8f5] transition-all"
                                >
                                    <IconPlus size={20} className="text-[var(--fg-muted)]" />
                                </button>
                            )}
                        </div>
                        </SortableContext>
                        </DndContext>
                        
                        <p className="text-xs text-[var(--fg-muted)]">
                            Primera foto = portada · Arrastra para reordenar
                        </p>
                    </div>
                )}
                
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                />
            </section>
            
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
                                ${form.listingType === value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] group-hover:bg-[var(--accent-subtle)]'}`}
                                style={{ color: form.listingType === value ? 'white' : color }}
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
    
    // Auto-generar título si está vacío (Marca + Modelo + Año + Color)
    useEffect(() => {
        if (!form.title && form.brandId) {
            const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
            const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
            const parts = [brand, model, form.year, form.color].filter(Boolean);
            const newTitle = parts.join(' ').trim() || '';
            if (newTitle) {
                updateForm('title', newTitle);
            }
        }
    }, [form.brandId, form.modelId, form.year, form.color, catalog]);
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
                subtitle="Estos datos generan confianza"
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
            
            {/* Video del vehículo */}
            <ExpandibleSection
                title="Video del vehículo"
                subtitle="Mostrar el vehículo en movimiento genera más confianza"
                expanded={expandedSections.video}
                onToggle={() => toggleSection('video')}
            >
                <div className="pt-2">
                    <PanelVideoUploader
                        asset={form.discoverVideo}
                        onChange={(video) => updateForm('discoverVideo', video)}
                        title="Clip vertical del vehículo"
                        description="Graba un video corto mostrando el exterior e interior."
                        helperText="MP4, WEBM o MOV · hasta 10 MB · 9:16 (vertical) · max 30 seg."
                        maxBytes={10 * 1024 * 1024}
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
    const communes = COMMUNES[form.regionId] || [];
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
                // Si hay una dirección por defecto, preseleccionarla
                const defaultAddr = result.items.find(a => a.isDefault);
                if (defaultAddr && !form.regionId) {
                    handleSelectAddress(defaultAddr.id);
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
    const regionName = selectedAddress?.regionName || REGIONS.find(r => r.id === form.regionId)?.name;
    const communeName = selectedAddress?.communeName || form.communeId;
    
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
                                    ...REGIONS.map(r => ({ value: r.id, label: r.name }))
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
                                    ...communes.map(c => ({ value: c, label: c }))
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
            
            {/* Título autogenerado - Premium card */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">Título del aviso</label>
                    <button
                        onClick={() => {
                            const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
                            const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
                            const parts = [brand, model, form.year, form.color].filter(Boolean);
                            const newTitle = parts.join(' ').trim() || 'Vehículo en venta';
                            updateForm('title', newTitle);
                        }}
                        className="text-xs text-[var(--accent)] flex items-center gap-1 hover:underline"
                    >
                        <IconSparkles size={12} />
                        Regenerar
                    </button>
                </div>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder={`${form.brandId === '__custom__' ? form.customBrand : 'Marca'} ${form.modelId === '__custom__' ? form.customModel : 'Modelo'} ${form.year || ''}`.trim()}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-medium"
                />
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                    Se genera automáticamente con marca, modelo, año y color
                </p>
            </section>
            
            {/* Descripción autogenerada - Premium card */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">Descripción para redes sociales</label>
                    <button
                        onClick={() => {
                            const brand = form.brandId === '__custom__' ? form.customBrand : getBrandName(form.brandId);
                            const model = form.modelId === '__custom__' ? form.customModel : getModelName(form.modelId);
                            const vehicleEmoji = form.vehicleType === 'motorcycle' ? '🏍️' : 
                                form.vehicleType === 'truck' ? '🚛' : 
                                form.vehicleType === 'bus' ? '🚌' : 
                                form.vehicleType === 'nautical' ? '⛵' : 
                                form.vehicleType === 'aerial' ? '✈️' : 
                                form.vehicleType === 'machinery' ? '🚜' : '🚗';
                            
                            // Headline persuasiva según condición
                            const yearNum = form.year ? parseInt(form.year) : null;
                            const currentYear = new Date().getFullYear();
                            const age = yearNum ? currentYear - yearNum : null;
                            const kmNum = form.mileage ? parseInt(form.mileage.replace(/\D/g, '')) : null;
                            
                            let hook = '';
                            if (form.condition === 'Nuevo') {
                                hook = `✨ ${brand} ${model} 0km, sin uso y con todos sus accesorios de fábrica. ¡Aprovecha antes de que se vaya!`;
                            } else if (form.condition === 'Seminuevo' || (age !== null && age <= 3)) {
                                hook = `🌟 ${form.condition === 'Seminuevo' ? 'Seminuevo' : 'Poco uso'}, en excelente estado${kmNum && kmNum < 50000 ? ' y con bajo kilometraje' : ''}. Calidad sin precio de cero.`;
                            } else if (form.ownerCount === '1') {
                                hook = `👤 Único dueño, mantenido al día y en muy buen estado. Un auto cuidado que se nota desde el primer vistazo.`;
                            } else if (kmNum && kmNum < 80000) {
                                hook = `🛣️ Con solo ${kmNum.toLocaleString('es-CL')} km recorridos, este vehículo tiene mucha vida por delante. Revisado y listo.`;
                            } else {
                                hook = `✅ Vehículo en buen estado, revisado y listo para transferir. Ideal para quien busca confianza a buen precio.`;
                            }
                            
                            // Ficha técnica con emojis
                            const ficha = [
                                form.year ? `📅 Año: ${form.year}` : null,
                                form.color ? `🎨 Color: ${form.color}` : null,
                                form.mileage ? `🛣️ Kilometraje: ${parseInt(form.mileage.replace(/\D/g, '')).toLocaleString('es-CL')} km` : null,
                                form.transmission ? `⚙️ Transmisión: ${form.transmission}` : null,
                                form.fuelType ? `⛽ Combustible: ${form.fuelType}` : null,
                                form.condition ? `🔧 Estado: ${form.condition}` : null,
                                form.ownerCount ? `👤 Dueños: ${form.ownerCount === '1' ? '1° dueño' : form.ownerCount + ' dueños'}` : null,
                            ].filter(Boolean).join('\n');
                            
                            // Precio y opciones
                            const priceLines = [];
                            if (form.price) {
                                const priceNum = parseInt(form.price.replace(/\D/g, ''));
                                priceLines.push(`💰 Precio: $${priceNum.toLocaleString('es-CL')}`);
                            }
                            if (form.offerPrice) {
                                if (form.offerPriceMode === '%') {
                                    const pct = parseInt(form.discountPercent || form.offerPrice);
                                    const priceNum = parseInt(form.price.replace(/\D/g, ''));
                                    const offerPrice = Math.round(priceNum * (1 - pct / 100));
                                    priceLines.push(`🏷️ Oferta: $${offerPrice.toLocaleString('es-CL')} (-${pct}%)`);
                                } else {
                                    const offerNum = parseInt(form.offerPrice.replace(/\D/g, ''));
                                    const pct = Math.round((1 - offerNum / parseInt(form.price.replace(/\D/g, ''))) * 100);
                                    priceLines.push(`🏷️ Oferta: $${offerNum.toLocaleString('es-CL')} (-${pct}%)`);
                                }
                            }
                            if (form.negotiable) priceLines.push('💸 Precio conversable');
                            if (form.financing) priceLines.push('🏦 Financiamiento disponible');
                            if (form.exchange) priceLines.push('🔄 Acepto permuta');
                            
                            // Features destacados
                            const features = [
                                form.maintenanceUpToDate && '✅ Mantenciones al día',
                                form.technicalReviewUpToDate && '✅ Revisión técnica vigente',
                                form.papersUpToDate && '✅ Papeles al día',
                                form.noAccidents && '✅ Sin accidentes',
                                form.warranty && '✅ Con garantía'
                            ].filter(Boolean);
                            
                            const cta = '📲 ¡Consulta sin compromiso en SimpleAutos! Te respondemos de inmediato.';
                            
                            // Construir descripción completa
                            const parts = [
                                `${vehicleEmoji} ${brand} ${model} ${form.year || ''} – ¡En venta!`.trim(),
                                '',
                                hook,
                                '',
                                ficha,
                                priceLines.length > 0 ? '\n' + priceLines.join('\n') : '',
                                features.length > 0 ? '\n' + features.join('\n') : '',
                                '',
                                cta
                            ].filter(p => p !== '' || p === ''); // Keep empty strings for line breaks
                            
                            const autoDesc = parts.join('\n').trim();
                            updateForm('description', autoDesc.slice(0, 1000));
                        }}
                        className="text-xs text-[var(--accent)] flex items-center gap-1 hover:underline"
                    >
                        <IconSparkles size={12} />
                        Generar descripción completa
                    </button>
                </div>
                <textarea
                    placeholder="Se generará automáticamente con todos los datos del vehículo o puedes escribir tu propia descripción..."
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value.slice(0, 1000))}
                    rows={8}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm resize-none"
                />
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                    {form.description.length}/1000 caracteres · Lista para Instagram y WhatsApp
                </p>
            </section>
            
            {/* Preview de publicación - Tarjeta vertical tipo marketplace */}
            <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                        <IconPhoto size={18} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-sm font-semibold">Así se verá tu aviso</p>
                </div>
                
                {/* Tarjeta vertical estilo marketplace */}
                <div className="max-w-sm mx-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-md">
                    {/* Imagen - aspecto más vertical tipo móvil */}
                    {form.photos[0] ? (
                        <div className="aspect-square relative">
                            <img 
                                src={form.photos[0].preview} 
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            {form.photos.length > 1 && (
                                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/70 text-white text-xs font-medium">
                                    1 / {form.photos.length}
                                </div>
                            )}
                            {/* Badge de tipo */}
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-xs font-semibold text-[var(--fg)]">
                                {form.listingType === 'sale' ? 'Venta' : form.listingType === 'rent' ? 'Arriendo' : 'Subasta'}
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-square bg-[var(--bg-subtle)] flex items-center justify-center">
                            <IconPhoto size={64} className="text-[var(--fg-muted)] opacity-40" />
                        </div>
                    )}
                    
                    {/* Info de la tarjeta */}
                    <div className="p-4 space-y-3">
                        {/* Precio destacado */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {form.offerPrice ? (
                                <>
                                    <span className="text-2xl font-bold text-[var(--accent)]">${form.offerPrice}</span>
                                    <span className="text-sm text-[var(--fg-muted)] line-through">${form.price}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-bold">
                                        -{form.discountPercent}%
                                    </span>
                                </>
                            ) : (
                                <span className="text-2xl font-bold text-[var(--accent)]">${form.price || 'Consultar'}</span>
                            )}
                        </div>
                        
                        {/* Título */}
                        <h3 className="font-semibold text-base leading-snug text-[var(--fg)] line-clamp-2">
                            {form.title || `${form.brandId === '__custom__' ? form.customBrand : 'Marca'} ${form.modelId === '__custom__' ? form.customModel : 'Modelo'} ${form.year || ''}`.trim() || 'Título del vehículo'}
                        </h3>
                        
                        {/* Ubicación */}
                        <div className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                            <IconMapPin size={14} />
                            <span>
                                {selectedAddress?.communeName || communeName || 'Comuna'}, {selectedAddress?.regionName || regionName || 'Región'}
                            </span>
                        </div>
                        
                        {/* Specs en grid de 2 columnas */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {form.year && (
                                <div className="flex items-center gap-1.5 text-sm text-[var(--fg-secondary)]">
                                    <IconCalendar size={16} className="text-[var(--fg-muted)]" />
                                    <span>{form.year}</span>
                                </div>
                            )}
                            {form.mileage && (
                                <div className="flex items-center gap-1.5 text-sm text-[var(--fg-secondary)]">
                                    <IconGauge size={16} className="text-[var(--fg-muted)]" />
                                    <span>{form.mileage} km</span>
                                </div>
                            )}
                            {form.fuelType && (
                                <div className="flex items-center gap-1.5 text-sm text-[var(--fg-secondary)]">
                                    <IconGasStation size={16} className="text-[var(--fg-muted)]" />
                                    <span>{form.fuelType}</span>
                                </div>
                            )}
                            {form.transmission && (
                                <div className="flex items-center gap-1.5 text-sm text-[var(--fg-secondary)]">
                                    <IconManualGearbox size={16} className="text-[var(--fg-muted)]" />
                                    <span>{form.transmission}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Opciones de venta */}
                        {(form.negotiable || form.financing || form.exchange) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {form.negotiable && (
                                    <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                                        Conversable
                                    </span>
                                )}
                                {form.financing && (
                                    <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                                        Financiamiento
                                    </span>
                                )}
                                {form.exchange && (
                                    <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                                        Permuta
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

// =============================================================================
// PASO SUCCESS - Con integración Instagram completa
// =============================================================================

function StepSuccess({ published }: { published: { id: string; href: string; title: string } }) {
    const shareText = `¡Mira este ${published.title} que estoy vendiendo! ${typeof window !== 'undefined' ? window.location.origin : ''}${published.href}`;
    const [igStatus, setIgStatus] = useState<InstagramIntegrationStatus | null>(null);
    const [igLoading, setIgLoading] = useState(true);
    const [igPublishing, setIgPublishing] = useState(false);
    const [igResult, setIgResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchInstagramIntegrationStatus()
            .then((s) => setIgStatus(s))
            .catch(() => setIgStatus(null))
            .finally(() => setIgLoading(false));
    }, []);

    async function handleInstagramPost() {
        setIgPublishing(true);
        setIgResult(null);
        const result = await publishListingToInstagramEnhanced(published.id, {
            useAI: true,
            tone: 'professional',
            targetAudience: 'general'
        });
        setIgPublishing(false);
        setIgResult({
            ok: result.ok,
            message: result.ok
                ? '¡Publicado en Instagram con éxito!'
                : (result.error ?? 'No se pudo publicar en Instagram.'),
        });
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    }

    const igEligible = igStatus !== null && igStatus.eligible;
    const igConnected = igStatus !== null && igStatus.eligible && igStatus.account?.status === 'connected';

    return (
        <div className="flex flex-col items-center text-center pt-4 pb-32 px-4">
            {/* Header de éxito */}
            <div className="w-full max-w-md mx-auto mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mb-6 mx-auto shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                        <IconCheck size={28} className="text-white" strokeWidth={3} />
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold mb-2 text-[var(--fg)]">¡Publicado!</h1>
                <p className="text-[var(--fg-muted)] mb-6">
                    Tu aviso ya está activo y visible para compradores
                </p>
            </div>
            
            {/* Grid de acciones */}
            <div className="w-full max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ver publicación */}
                <a
                    href={published.href}
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold
                        hover:bg-[var(--accent)]/90 transition-all shadow-md hover:shadow-lg"
                >
                    Ver publicación
                    <IconExternalLink size={18} />
                </a>
                
                {/* WhatsApp */}
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-medium
                        hover:bg-[#128C7E] transition-colors"
                >
                    <IconBrandWhatsapp size={20} />
                    WhatsApp
                </a>
                
                {/* Instagram - Integración real */}
                <InstagramShareButton
                    loading={igLoading}
                    eligible={igEligible}
                    connected={igConnected}
                    publishing={igPublishing}
                    result={igResult}
                    onPublish={handleInstagramPost}
                />
                
                {/* Copiar link */}
                <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-all
                        ${copied 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'}`}
                >
                    {copied ? <IconCheck size={18} /> : <IconShare3 size={18} />}
                    {copied ? '¡Copiado!' : 'Copiar link'}
                </button>
                
                {/* Nueva publicación */}
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--border)] font-medium
                        hover:bg-[var(--bg-subtle)] transition-colors text-[var(--fg-muted)]"
                >
                    <IconPlus size={18} />
                    Publicar otro
                </button>
            </div>
            
            {/* Tip */}
            <div className="mt-8 p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] max-w-md">
                <p className="text-sm font-medium mb-1">💡 Tip para vender más rápido</p>
                <p className="text-xs text-[var(--fg-muted)]">
                    Comparte tu aviso en Instagram para llegar a más compradores potenciales
                </p>
            </div>
        </div>
    );
}

// Botón de Instagram con estados
function InstagramShareButton({
    loading,
    eligible,
    connected,
    publishing,
    result,
    onPublish,
}: {
    loading: boolean;
    eligible: boolean;
    connected: boolean;
    publishing: boolean;
    result: { ok: boolean; message: string } | null;
    onPublish: () => void;
}) {
    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f0f0f0] text-[var(--fg-muted)] animate-pulse">
                <div className="w-5 h-5 rounded-full bg-[var(--fg-muted)]/20" />
                Cargando...
            </div>
        );
    }

    // No elegible (plan free)
    if (!eligible) {
        return (
            <Link
                href="/panel/suscripciones"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-medium
                    hover:from-purple-200 hover:to-pink-200 transition-all border border-purple-200"
            >
                <IconLock size={16} />
                Instagram Pro
            </Link>
        );
    }

    // Elegible pero no conectado
    if (!connected) {
        return (
            <Link
                href="/panel/instagram"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-medium
                    hover:opacity-90 transition-opacity"
            >
                <IconBrandInstagram size={18} />
                Conectar IG
            </Link>
        );
    }

    // Conectado - Publicar - Éxito
    if (result?.ok) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-100 text-green-700 font-medium border border-green-300">
                <IconCheck size={18} />
                ¡Publicado!
            </div>
        );
    }
    
    // Conectado - Error
    if (result && !result.ok) {
        return (
            <button
                onClick={onPublish}
                disabled={publishing}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-100 text-red-700 font-medium border border-red-300"
            >
                <IconBrandInstagram size={18} />
                Reintentar IG
            </button>
        );
    }

    return (
        <button
            onClick={onPublish}
            disabled={publishing}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] 
                text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
            {publishing ? (
                <>
                    <IconLoader2 size={18} className="animate-spin" />
                    Publicando...
                </>
            ) : (
                <>
                    <IconBrandInstagram size={18} />
                    Publicar en IG
                </>
            )}
        </button>
    );
}

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
