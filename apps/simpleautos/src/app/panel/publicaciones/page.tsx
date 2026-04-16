'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    IconBrandInstagram,
    IconCar,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconClock,
    IconEdit,
    IconExternalLink,
    IconEye,
    IconFilter,
    IconGrid3x3,
    IconHeart,
    IconLayoutList,
    IconLoader2,
    IconMapPin,
    IconPlus,
    IconRefresh,
    IconShare3,
    IconSquarePlus,
    IconTrash,
    IconTrendingUp,
    IconX,
    IconPlayerPause,
    IconCopy,
    IconBrandWhatsapp,
    IconList,
    IconGridDots,
    IconPlugConnected,
    IconDots,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import ModernSelect from '@/components/ui/modern-select';
import { PanelIconButton } from '@simple/ui';
import { useAuth } from '@/context/auth-context';
import {
    fetchInstagramIntegrationStatus,
    publishListingToInstagramEnhanced,
    generateSmartTemplates,
    type InstagramPublicationView,
    type InstagramTemplateView,
} from '@/lib/instagram';
import {
    deletePanelListing,
    fetchMyPanelListings,
    publishListingToPortal,
    renewPanelListing,
    updatePanelListingStatus,
    type PanelListing,
    type ListingStatus,
    type PortalKey,
    type RawDataPhoto,
} from '@/lib/panel-listings';
import {
    InstagramTemplatePreview,
    PanelButton,
    PanelNotice,
    PanelPillNav,
    PanelSegmentedToggle,
    PanelStatusBadge,
    getPanelButtonClassName,
    getPanelButtonStyle,
} from '@simple/ui';

const PORTAL_ORDER: PortalKey[] = ['yapo', 'chileautos', 'mercadolibre', 'facebook'];

type FilterKey = 'all' | 'active' | 'review_required' | 'paused' | 'sold' | 'draft';
type ManagedStatus = Extract<ListingStatus, 'draft' | 'active' | 'paused' | 'sold'>;

const STATUS_LABELS: Record<Exclude<ListingStatus, 'sold'>, string> = {
    active: 'Activa',
    paused: 'Pausada',
    draft: 'Borrador',
    archived: 'Archivada',
};

function statusText(status: string): string {
    if (status === 'published') return 'Publicado';
    if (status === 'ready') return 'Listo';
    if (status === 'failed') return 'Revisar';
    return 'Pendiente';
}

function listingStatusTone(status: ListingStatus): 'neutral' | 'success' | 'warning' | 'info' {
    if (status === 'active') return 'success';
    if (status === 'paused') return 'warning';
    if (status === 'sold') return 'info';
    return 'neutral';
}

function getClosedLabel(section: PanelListing['section']): string {
    if (section === 'rent') return 'Arrendado';
    if (section === 'auction') return 'Subastado';
    return 'Vendido';
}

function getFallbackHref(section: PanelListing['section']): string {
    if (section === 'rent') return '/arriendos';
    if (section === 'auction') return '/subastas';
    return '/ventas';
}

function publicationBadgeMeta(listing: PanelListing): { label: string; tone: 'neutral' | 'success' | 'warning' | 'info' } {
    if (listing.status === 'sold') {
        return { label: getClosedLabel(listing.section), tone: 'info' };
    }
    if (listing.publicationLifecycle?.state === 'review_required') {
        return { label: 'Requiere renovación', tone: 'warning' };
    }
    if (listing.publicationLifecycle?.state === 'review_expired') {
        return { label: 'Vencido por revisión', tone: 'warning' };
    }
    return { label: STATUS_LABELS[listing.status] ?? 'Borrador', tone: listingStatusTone(listing.status) };
}

function publicationLifecycleHint(listing: PanelListing): string | null {
    if (listing.publicationLifecycle?.state === 'review_required') {
        return 'Renueva este aviso para mantener su vigencia.';
    }
    if (listing.publicationLifecycle?.state === 'review_expired') {
        return 'Necesita renovación antes de volver a exponerse con normalidad.';
    }
    if (listing.status === 'active' && listing.publicationLifecycle?.nextReviewAt) {
        const daysLeft = Math.max(
            0,
            Math.ceil((listing.publicationLifecycle.nextReviewAt - Date.now()) / (24 * 60 * 60 * 1000))
        );
        return `Próxima revisión en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`;
    }
    return null;
}

function getListingCommune(listing: PanelListing): string {
    const commune = listing.locationData?.communeName?.trim();
    if (commune) return commune;

    const parts = (listing.location || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (parts.length >= 3) return parts[1];
    return parts[0] || 'Chile';
}

function formatChileanPeso(price: string): string {
    const num = parseInt(price.replace(/[^\d]/g, ''), 10);
    if (isNaN(num)) return price;
    return '$' + num.toLocaleString('es-CL');
}

function orderVehicleTags(tags: string[]): string[] {
    const allowedPatterns = [
        /auto|sedán|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /km|kilometraje|kilómetro/i,
        /bencina|diesel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i,
        /automático|automatico|manual|cvt|secuencial/i
    ];

    const ordered: string[] = [];

    for (const tag of tags) {
        for (const pattern of allowedPatterns) {
            if (pattern.test(tag)) {
                ordered.push(tag);
                break;
            }
        }
    }

    return ordered.filter(Boolean).slice(0, 5);
}

function getListingTags(listing: PanelListing): string[] {
    const rawData = listing.rawData as any;
    const payload = rawData || {};
    const basic = payload.basic || {};
    const summary: string[] = [];
    
    // Extract vehicle tags matching API logic
    if (basic.year) summary.push(String(basic.year));
    if (basic.bodyType) summary.push(String(basic.bodyType));
    
    if (basic.mileage) {
        const mileage = parseInt(String(basic.mileage).replace(/[^\d]/g, ''), 10);
        if (!isNaN(mileage)) summary.push(`${mileage.toLocaleString('es-CL')} km`);
    }
    
    if (basic.fuelType) summary.push(String(basic.fuelType));
    if (basic.transmission) summary.push(String(basic.transmission));
    if (basic.condition) summary.push(String(basic.condition));
    
    return orderVehicleTags(summary.slice(0, 5));
}

export default function PublicacionesPage() {
    const { user, authLoading, requireAuth } = useAuth();
    const [listings, setListings] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [instagramPublications, setInstagramPublications] = useState<InstagramPublicationView[]>([]);
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [shareMenuOpenId, setShareMenuOpenId] = useState<string | null>(null);
    const [portalBusyKey, setPortalBusyKey] = useState<string | null>(null);
    const [instagramBusyKey, setInstagramBusyKey] = useState<string | null>(null);
    const [carouselSlide, setCarouselSlide] = useState<Record<string, number>>({});

    // Instagram Preview States
    const [instagramPreviewOpen, setInstagramPreviewOpen] = useState(false);
    const [previewListing, setPreviewListing] = useState<PanelListing | null>(null);
    const [previewCaption, setPreviewCaption] = useState('');
    const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);
    const [instagramCarouselIndex, setInstagramCarouselIndex] = useState(0);
    const [statusBusyKey, setStatusBusyKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    
    const [instagramTemplates, setInstagramTemplates] = useState<InstagramTemplateView[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [templatesLoading, setTemplatesLoading] = useState(false);

    const closeMenus = useCallback(() => {
        setActionMenuOpenId(null);
        setShareMenuOpenId(null);
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.menu-container')) {
                closeMenus();
            }
        };

        if (actionMenuOpenId || shareMenuOpenId) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [actionMenuOpenId, shareMenuOpenId]);

    const loadListings = async () => {
        setLoading(true);
        const [result, igResult] = await Promise.all([
            fetchMyPanelListings(),
            fetchInstagramIntegrationStatus()
        ]);
        
        if (result.unauthorized) {
            setListings([]);
            setLoading(false);
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión.');
            requireAuth(() => {
                void loadListings();
            });
            return;
        }
        if (igResult) {
            setInstagramPublications(igResult.recentPublications || []);
        }
        setListings(result.items);
        setLoading(false);
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            setListings([]);
            setNotice('Inicia sesión para ver tus publicaciones.');
            requireAuth(() => {
                void loadListings();
            });
            return;
        }
        void loadListings();
    }, [authLoading, user]);

    const filtered = useMemo(() => {
        if (filter === 'all') return listings;
        if (filter === 'review_required') {
            return listings.filter((item) =>
                item.publicationLifecycle?.state === 'review_required' ||
                item.publicationLifecycle?.state === 'review_expired'
            );
        }
        return listings.filter((item) => item.status === filter);
    }, [filter, listings]);

    const filters = useMemo(
        () => [
            { id: 'all' as const, label: 'Todas', count: listings.length },
            { id: 'active' as const, label: 'Activas', count: listings.filter((item) => item.status === 'active').length },
            {
                id: 'review_required' as const,
                label: 'Requieren renovación',
                count: listings.filter((item) =>
                    item.publicationLifecycle?.state === 'review_required' ||
                    item.publicationLifecycle?.state === 'review_expired'
                ).length,
                tone: 'warning' as const,
            },
            { id: 'paused' as const, label: 'Pausadas', count: listings.filter((item) => item.status === 'paused').length },
            { id: 'sold' as const, label: 'Finalizadas', count: listings.filter((item) => item.status === 'sold').length },
            { id: 'draft' as const, label: 'Borradores', count: listings.filter((item) => item.status === 'draft').length },
        ],
        [listings]
    );

    const buildPublicUrl = (listing: PanelListing): string => {
        if (typeof window === 'undefined') return listing.href || getFallbackHref(listing.section);
        if (!listing.href) return `${window.location.origin}${getFallbackHref(listing.section)}`;
        if (/^https?:\/\//i.test(listing.href)) return listing.href;
        return `${window.location.origin}${listing.href}`;
    };

    const activeTemplate = useMemo(
        () => instagramTemplates.find((template) => template.id === selectedTemplateId) ?? instagramTemplates[0] ?? null,
        [instagramTemplates, selectedTemplateId]
    );

    const onPublishPortal = async (listing: PanelListing, portal: PortalKey) => {
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            requireAuth(() => {
                void onPublishPortal(listing, portal);
            });
            return;
        }
        const key = `${listing.id}:${portal}`;
        setPortalBusyKey(key);
        const result = await publishListingToPortal(listing.id, portal);
        setPortalBusyKey(null);
        closeMenus();

        if (!result.ok) {
            if (result.unauthorized) {
                setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
                requireAuth(() => {
                    void onPublishPortal(listing, portal);
                });
                return;
            }
            if (result.missingRequired && result.missingRequired.length > 0) {
                setNotice(`Faltan campos para ${portal.toUpperCase()}: ${result.missingRequired.join(', ')}`);
            } else {
                setNotice(result.error || 'No se pudo publicar en el portal.');
            }
            return;
        }

        setNotice(`Publicación enviada a ${portal.toUpperCase()} correctamente.`);
        void loadListings();
    };

    const copyListingLink = async (listing: PanelListing) => {
        const url = buildPublicUrl(listing);
        try {
            await navigator.clipboard.writeText(url);
            setNotice('Link copiado correctamente.');
        } catch {
            setNotice('No se pudo copiar el link.');
        }
        closeMenus();
    };

    const shareOnWhatsapp = (listing: PanelListing) => {
        const url = buildPublicUrl(listing);
        const text = `${listing.title}\n${listing.price}\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        closeMenus();
    };

    // Estado mejorado para carga asíncrona
    const [templatesLoadingProgress, setTemplatesLoadingProgress] = useState(0);
    const [templatesLoadingMessage, setTemplatesLoadingMessage] = useState('');
    const [templatesError, setTemplatesError] = useState<string | null>(null);
    const [templatesRetryCount, setTemplatesRetryCount] = useState(0);
    
    // Estado mejorado para preview en tiempo real
    const [templateTransitioning, setTemplateTransitioning] = useState(false);
    const [previousTemplateId, setPreviousTemplateId] = useState<string | null>(null);
    
    // Estado para sistema de rollback
    const [publishingState, setPublishingState] = useState<'idle' | 'validating' | 'publishing' | 'success' | 'failed' | 'rolling-back'>('idle');
    const [publishingError, setPublishingError] = useState<string | null>(null);
    const [rollbackAttempted, setRollbackAttempted] = useState(false);
    
    // Función para rollback si falla publicación
    const handleRollback = useCallback(async () => {
        if (!previewListing || rollbackAttempted) return;
        
        setPublishingState('rolling-back');
        setRollbackAttempted(true);
        
        try {
            // Simular rollback - limpiar estados y cache
            templatesCache.current.delete(previewListing.id);
            setPublishingError(null);
            setPublishingState('idle');
            setNotice('Publicación revertida exitosamente. Puedes intentar nuevamente.');
            
            // Resetear estados del modal
            setSelectedTemplateId(null);
            setInstagramTemplates([]);
            
        } catch (error) {
            setPublishingError('Error al revertir la publicación. Por favor, recarga la página.');
            setPublishingState('failed');
        }
    }, [previewListing, rollbackAttempted]);
    
    // Función para manejar cambio de template con transición suave
    const handleTemplateChange = useCallback(async (templateId: string) => {
        if (templateId === selectedTemplateId || templateTransitioning) return;
        
        setTemplateTransitioning(true);
        setPreviousTemplateId(selectedTemplateId);
        
        // Pequeño delay para mostrar la transición
        await new Promise(resolve => setTimeout(resolve, 150));
        
        setSelectedTemplateId(templateId);
        
        // Delay adicional para completar la transición
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setTemplateTransitioning(false);
        setPreviousTemplateId(null);
    }, [selectedTemplateId, templateTransitioning]);
    
    // Cache inteligente de templates por listing
    const templatesCache = useRef<Map<string, { templates: InstagramTemplateView[]; timestamp: number }>>(new Map());
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    const loadInstagramTemplatesForListing = useCallback(async (listingId: string, forceRefresh = false) => {
        const now = Date.now();
        
        setTemplatesLoading(true);
        setTemplatesError(null);
        setTemplatesLoadingProgress(0);
        setTemplatesLoadingMessage('Iniciando generación de templates...');
        
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
            try {
                setTemplatesLoadingProgress(20 + (retryCount * 15));
                setTemplatesLoadingMessage('Analizando vehículo...');
                
                // Simular delay para mejor UX
                await new Promise(resolve => setTimeout(resolve, 300));
                
                setTemplatesLoadingProgress(40 + (retryCount * 15));
                setTemplatesLoadingMessage('Generando diseños inteligentes...');
                
                const result = await generateSmartTemplates(listingId);
                
                setTemplatesLoadingProgress(80);
                setTemplatesLoadingMessage('Optimizando templates...');
                
                if (!result.ok || !result.recommendedTemplate) {
                    throw new Error(result.error || 'Error al generar templates');
                }
                
                const allTemplates = [result.recommendedTemplate, ...(result.alternatives ?? [])];
                const order = ['essential-watermark', 'professional-centered', 'signature-complete'];
                const nextTemplates = [...allTemplates].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
                
                // Guardar en cache
                templatesCache.current.set(listingId, {
                    templates: nextTemplates,
                    timestamp: now
                });
                
                setInstagramTemplates(nextTemplates);
                setSelectedTemplateId(result.recommendedTemplate.id ?? nextTemplates[0]?.id ?? null);
                setTemplatesLoadingProgress(100);
                setTemplatesLoadingMessage('Templates listos');
                
                // Limpiar mensaje de éxito después de un delay
                setTimeout(() => {
                    setTemplatesLoading(false);
                    setTemplatesLoadingProgress(0);
                    setTemplatesLoadingMessage('');
                }, 500);
                
                return;
                
            } catch (error) {
                retryCount++;
                setTemplatesRetryCount(retryCount);
                
                if (retryCount <= maxRetries) {
                    setTemplatesLoadingProgress(50);
                    setTemplatesLoadingMessage(`Reintentando (${retryCount}/${maxRetries})...`);
                    
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 3000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    setTemplatesError(`No se pudieron cargar los templates después de ${maxRetries} intentos: ${errorMessage}`);
                    setInstagramTemplates([]);
                    setSelectedTemplateId(null);
                    setTemplatesLoading(false);
                    setTemplatesLoadingProgress(0);
                    setTemplatesLoadingMessage('');
                    
                    // Mostrar notificación
                    setNotice(`Error al cargar templates: ${errorMessage}`);
                }
            }
        }
    }, []);

    const [isInstagramSuccess, setIsInstagramSuccess] = useState(false);
    const [lastPublishedPermalink, setLastPublishedPermalink] = useState<string | null>(null);

    const shareOnInstagram = (listing: PanelListing) => {
        closeMenus();
        setIsInstagramSuccess(false);
        setLastPublishedPermalink(null);
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            return;
        }

        const baseDescription = listing.description?.trim()
            ? listing.description
            : `${listing.title}\nPrecio: ${listing.price || 'Consultar precio'}\nUbicacion: ${getListingCommune(listing)}`;
        const defaultCaption = `${baseDescription}\n\nVer mas en: https://simpleautos.app/vehiculo/${listing.id}\n\n#SimpleAutos #AutosChile #VentaAutos #Automovil #Oferta`;

        setPreviewListing(listing);
        setPreviewCaption(defaultCaption);
        setInstagramCarouselIndex(0);
        setInstagramTemplates([]);
        setSelectedTemplateId(null);
        setInstagramPreviewOpen(true);
        void loadInstagramTemplatesForListing(listing.id);
    };

    // Validación de imágenes y contenido antes de publicar
    const validateInstagramContent = useCallback(async (listing: PanelListing, caption: string, template: InstagramTemplateView | null) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validación de imágenes
        const images = getListingImages(listing);
        if (images.length === 0) {
            errors.push('El vehículo no tiene imágenes.');
        } else {
            // Validar calidad de imágenes (simulado)
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                try {
                    // Verificar si la imagen existe y es accesible
                    const response = await fetch(img, { method: 'HEAD' });
                    if (!response.ok) {
                        errors.push(`La imagen ${i + 1} no está disponible.`);
                    } else {
                        const contentType = response.headers.get('content-type');
                        if (!contentType?.startsWith('image/')) {
                            errors.push(`La imagen ${i + 1} no es un formato válido.`);
                        }
                    }
                } catch {
                    warnings.push(`No se pudo verificar la imagen ${i + 1}.`);
                }
            }
        }
        
        // Validación de caption
        if (!caption.trim()) {
            errors.push('El caption no puede estar vacío.');
        } else if (caption.length < 10) {
            warnings.push('El caption es muy corto, podría tener menos alcance.');
        } else if (caption.length > 2200) {
            errors.push('El caption excede el límite de 2200 caracteres.');
        }
        
        // Validación de contenido inapropiado (simulado)
        const prohibitedWords = ['spam', 'estafa', 'fraude', 'ilegal'];
        const foundWords = prohibitedWords.filter(word => 
            caption.toLowerCase().includes(word)
        );
        if (foundWords.length > 0) {
            warnings.push(`El caption contiene palabras que podrían ser marcadas: ${foundWords.join(', ')}`);
        }
        
        // Validación de template
        if (!template) {
            warnings.push('No se ha seleccionado ningún template de diseño.');
        }
        
        // Validación de información del vehículo
        if (!listing.price || Number(listing.price) <= 0) {
            warnings.push('El vehículo no tiene precio definido.');
        }
        
        if (!listing.location?.trim()) {
            warnings.push('El vehículo no tiene ubicación definida.');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            canProceed: errors.length === 0
        };
    }, []);

    const handleConfirmInstagramPublish = async () => {
        if (!previewListing) return;
        if (templatesLoading || !activeTemplate) {
            setNotice('Espera a que cargue el template de portada antes de publicar.');
            return;
        }
        
        // Validar contenido antes de publicar
        setPublishingState('validating');
        setNotice('Validando contenido...');
        const validation = await validateInstagramContent(previewListing, previewCaption, activeTemplate);
        
        if (!validation.canProceed) {
            setPublishingState('failed');
            setPublishingError(`Error de validación: ${validation.errors.join('. ')}`);
            setNotice(`Error de validación: ${validation.errors.join('. ')}`);
            return;
        }
        
        if (validation.warnings.length > 0) {
            const proceedWithWarnings = confirm(
                `Advertencias:\n${validation.warnings.join('\n')}\n\n¿Deseas continuar con la publicación?`
            );
            if (!proceedWithWarnings) {
                setPublishingState('idle');
                setNotice('Publicación cancelada por el usuario.');
                return;
            }
        }

        setPublishingState('publishing');
        setIsPublishingInstagram(true);
        setPublishingError(null);
        setRollbackAttempted(false);
        
        const key = `${previewListing.id}:instagram`;
        setInstagramBusyKey(key);

        try {
            const result = await publishListingToInstagramEnhanced(previewListing.id, {
                useAI: true,
                useTemplates: Boolean(activeTemplate),
                tone: 'professional',
                targetAudience: 'general',
                captionOverride: previewCaption,
                templateId: activeTemplate?.id ?? null,
                layoutVariant: activeTemplate?.layoutVariant ?? 'square',
            });
            const publication = result.publication ?? result.result;
            if (result.ok && publication) {
                setPublishingState('success');
                setLastPublishedPermalink(publication.instagramPermalink ?? null);
                setIsInstagramSuccess(true);
                setNotice('¡Publicado exitosamente en Instagram!');
                // No cerramos el modal inmediatamente, mostramos el éxito
            } else {
                setPublishingState('failed');
                setPublishingError(result.error ?? 'No se pudo publicar en Instagram.');
                setNotice(result.error ?? 'No se pudo publicar en Instagram.');
            }
        } catch (error) {
            setPublishingState('failed');
            const errorMessage = error instanceof Error ? error.message : 'Error inesperado';
            setPublishingError(errorMessage);
            setNotice('Error inesperado al publicar en Instagram.');
        } finally {
            setIsPublishingInstagram(false);
            setInstagramBusyKey(null);
            closeMenus();
        }
    };

    const onRenewListing = async (listing: PanelListing) => {
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            requireAuth(() => {
                void onRenewListing(listing);
            });
            return;
        }
        setStatusBusyKey(`${listing.id}:renew`);
        const result = await renewPanelListing(listing.id);
        setStatusBusyKey(null);
        if (!result.ok) {
            if (result.unauthorized) {
                setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
                requireAuth(() => {
                    void onRenewListing(listing);
                });
                return;
            }
            setNotice(result.error || 'No se pudo renovar el aviso.');
            return;
        }
        setNotice('Aviso renovado correctamente.');
        void loadListings();
    };

    const onChangeListingStatus = async (listing: PanelListing, nextStatus: ManagedStatus) => {
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            requireAuth(() => {
                void onChangeListingStatus(listing, nextStatus);
            });
            return;
        }
        setStatusBusyKey(`${listing.id}:${nextStatus}`);
        const result = await updatePanelListingStatus(listing.id, nextStatus);
        setStatusBusyKey(null);
        if (!result.ok) {
            if (result.unauthorized) {
                setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
                requireAuth(() => {
                    void onChangeListingStatus(listing, nextStatus);
                });
                return;
            }
            setNotice(result.error || 'No se pudo cambiar el estado del aviso.');
            return;
        }

        if (nextStatus === 'active') {
            setNotice(listing.status === 'sold' ? 'Aviso reactivado.' : 'Aviso activado.');
        } else if (nextStatus === 'paused') {
            setNotice('Aviso pausado.');
        } else if (nextStatus === 'draft') {
            setNotice('Aviso movido a borrador.');
        } else {
            const closedLabel = getClosedLabel(listing.section);
            setNotice(`Aviso marcado como ${closedLabel.toLowerCase()}.`);
        }

        void loadListings();
    };

    const getListingCoverImage = (listing: PanelListing): string | null => {
        const rawData = listing.rawData as { media?: { photos?: RawDataPhoto[] } } | undefined;
        const photos = rawData?.media?.photos ?? [];
        const cover = photos.find((p) => p?.isCover) ?? photos[0];
        const imageUrl = cover?.previewUrl || cover?.dataUrl || cover?.url;
        if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl;
        return null;
    };

    const getListingImages = (listing: PanelListing): string[] => {
        const rawData = listing.rawData as any;
        const photos = rawData?.media?.photos ?? [];
        
        if (!Array.isArray(photos) || photos.length === 0) return [];
        
        return photos.map(p => {
            let url = '';
            if (typeof p === 'string') {
                url = p.trim();
            } else {
                url = p?.url || p?.previewUrl || p?.dataUrl || '';
            }
            return typeof url === 'string' && url.trim() ? url : null;
        }).filter(Boolean) as string[];
    };

    const onDeleteListing = async (listing: PanelListing) => {
        const confirmed = window.confirm('¿Estás seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.');
        if (!confirmed) return;

        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            requireAuth(() => {
                void onDeleteListing(listing);
            });
            return;
        }

        const result = await deletePanelListing(listing.id);
        if (!result.ok) {
            if (result.unauthorized) {
                setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
                requireAuth(() => {
                    void onDeleteListing(listing);
                });
                return;
            }
            setNotice(result.error || 'No se pudo eliminar la publicación.');
            return;
        }

        setNotice('Publicación eliminada correctamente.');
        void loadListings();
    };

    const renderMenuItem = (
        label: string,
        onClick: () => void,
        icon?: React.ReactNode,
        disabled = false,
        className = ''
    ) => (
        <button
            type="button"
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${className}`.trim()}
            style={{ color: 'var(--fg)' }}
            onClick={onClick}
            disabled={disabled}
        >
            <div className="flex items-center gap-2">
                {icon ? <span className="inline-flex">{icon}</span> : null}
                <span>{label}</span>
            </div>
        </button>
    );

    const renderActionMenu = (listing: PanelListing) => {
        const needsRenewal =
            listing.publicationLifecycle?.state === 'review_required' ||
            listing.publicationLifecycle?.state === 'review_expired';
        const menuOpen = actionMenuOpenId === listing.id;
        const closedLabel = getClosedLabel(listing.section);

        return (
            <div className="relative menu-container">
                <PanelButton
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                        setShareMenuOpenId(null);
                        setActionMenuOpenId((current) => (current === listing.id ? null : listing.id));
                    }}
                >
                    <IconDots size={16} />
                </PanelButton>
                {menuOpen ? (
                    <div
                        className="absolute right-0 mt-2 w-64 rounded-xl border p-2 z-50 shadow-xl"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        {renderMenuItem(
                            'Ver',
                            () => {
                                closeMenus();
                                window.open(listing.href || getFallbackHref(listing.section), '_blank');
                            },
                            <IconEye size={14} />
                        )}
                        {renderMenuItem(
                            'Editar',
                            () => {
                                closeMenus();
                                window.location.href = `/panel/publicar?edit=${encodeURIComponent(listing.id)}`;
                            },
                            <IconEdit size={14} />
                        )}
                        <div className="mx-2 my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                        {needsRenewal
                            ? renderMenuItem(
                                  'Renovar',
                                  () => {
                                      closeMenus();
                                      void onRenewListing(listing);
                                  },
                                  <IconRefresh size={14} />, 
                                  statusBusyKey === `${listing.id}:renew`
                              )
                            : null}
                        {listing.status !== 'active'
                            ? renderMenuItem(
                                  listing.status === 'sold' ? 'Reactivar' : 'Activar',
                                  () => {
                                      closeMenus();
                                      void onChangeListingStatus(listing, 'active');
                                  },
                                  <IconSquarePlus size={14} />, 
                                  statusBusyKey === `${listing.id}:active`,
                                  needsRenewal ? 'mt-1' : ''
                              )
                            : null}
                        {listing.status === 'active'
                            ? renderMenuItem(
                                  'Pausar',
                                  () => {
                                      closeMenus();
                                      void onChangeListingStatus(listing, 'paused');
                                  },
                                  <IconPlayerPause size={14} />, 
                                  statusBusyKey === `${listing.id}:paused`,
                                  needsRenewal ? 'mt-1' : ''
                              )
                            : null}
                        {listing.status !== 'sold'
                            ? renderMenuItem(
                                  closedLabel,
                                  () => {
                                      closeMenus();
                                      void onChangeListingStatus(listing, 'sold');
                                  },
                                  <IconX size={14} />, 
                                  statusBusyKey === `${listing.id}:sold`,
                                  'mt-1'
                              )
                            : null}
                        {listing.status !== 'draft'
                            ? renderMenuItem(
                                  'Borrador',
                                  () => {
                                      closeMenus();
                                      void onChangeListingStatus(listing, 'draft');
                                  },
                                  <IconEdit size={14} />, 
                                  statusBusyKey === `${listing.id}:draft`,
                                  'mt-1'
                              )
                            : null}
                        <div className="mx-2 my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                        {renderMenuItem(
                            'Eliminar',
                            () => {
                                closeMenus();
                                void onDeleteListing(listing);
                            },
                            <IconTrash size={14} />, 
                            false,
                            'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    const renderShareMenu = (listing: PanelListing) => {
        const menuOpen = shareMenuOpenId === listing.id;
        const integrations = [...listing.integrations].sort(
            (a, b) => PORTAL_ORDER.indexOf(a.portal) - PORTAL_ORDER.indexOf(b.portal)
        );

        return (
            <div className="relative menu-container">
                <PanelButton
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                        setActionMenuOpenId(null);
                        setShareMenuOpenId((current) => (current === listing.id ? null : listing.id));
                    }}
                >
                    <IconShare3 size={16} /> Compartir
                </PanelButton>
                {menuOpen ? (
                    <div
                        className="absolute right-0 mt-2 w-72 rounded-xl border p-2 z-50 shadow-xl"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        {renderMenuItem('Copiar Link', () => {
                            void copyListingLink(listing);
                        }, <IconCopy size={14} />)}
                        {renderMenuItem('WhatsApp', () => shareOnWhatsapp(listing), <IconBrandWhatsapp size={14} />, false, 'mt-1')}
                        {renderMenuItem(instagramBusyKey === `${listing.id}:instagram` ? 'Publicando...' : 'Instagram', () => {
                            void shareOnInstagram(listing);
                        }, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>, instagramBusyKey === `${listing.id}:instagram`, 'mt-1')}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader
                title="Mis publicaciones"
                description={`${listings.length} publicaciones en total`}
                actions={
                    <Link
                        href="/panel/publicar"
                        className={getPanelButtonClassName({ size: 'sm', className: 'h-9 px-4 text-sm' })}
                        style={getPanelButtonStyle('primary')}
                    >
                        <IconPlus size={13} /> Nueva publicación
                    </Link>
                }
            />

            {notice ? <PanelNotice className="mb-4">{notice}</PanelNotice> : null}

            <div className="mb-5">
                <div className="sm:hidden flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <ModernSelect
                            value={filter}
                            onChange={(value) => setFilter(value as FilterKey)}
                            options={filters.map((item) => ({
                                value: item.id,
                                label: `${item.label} (${item.count})`,
                            }))}
                            ariaLabel="Filtrar publicaciones"
                        />
                    </div>
                    <PanelSegmentedToggle
                        className="shrink-0"
                        items={[
                            { key: 'vertical', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista tarjetas' },
                            { key: 'horizontal', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista lista' },
                        ]}
                        activeKey={viewMode}
                        onChange={(key) => setViewMode(key as 'horizontal' | 'vertical')}
                        iconOnly
                    />
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                    <div className="min-w-0 flex-1 overflow-x-auto">
                        <PanelPillNav
                            items={filters.map((item) => ({
                                key: item.id,
                                label: `${item.label} (${item.count})`,
                                tone: item.id === 'review_required' && item.count > 0 ? item.tone : 'neutral',
                                badge: item.id === 'review_required' && item.count > 0 ? String(item.count) : undefined,
                            }))}
                            activeKey={filter}
                            onChange={(key) => setFilter(key as FilterKey)}
                            ariaLabel="Filtros de publicaciones"
                            breakpoint="sm"
                            showMobileDropdown={false}
                            size="sm"
                        />
                    </div>
                    <PanelSegmentedToggle
                        className="shrink-0"
                        items={[
                            { key: 'vertical', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista tarjetas' },
                            { key: 'horizontal', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista lista' },
                        ]}
                        activeKey={viewMode}
                        onChange={(key) => setViewMode(key as 'horizontal' | 'vertical')}
                        iconOnly
                    />
                </div>
            </div>

            {loading ? <PanelNotice tone="neutral">Cargando publicaciones...</PanelNotice> : null}
            {!loading && filtered.length === 0 ? <PanelNotice tone="neutral">No tienes publicaciones en este estado.</PanelNotice> : null}

            {!loading && filtered.length > 0 && viewMode === 'horizontal' ? (
                <div className="space-y-3">
                    {filtered.map((listing) => {
                        const badge = publicationBadgeMeta(listing);
                        const lifecycleHint = publicationLifecycleHint(listing);
                        const images = getListingImages(listing);
                        const currentSlide = carouselSlide[listing.id] || 0;
                        const currentImage = images[currentSlide] || null;
                        const tags = getListingTags(listing);
                        const sectionLabel = listing.section === 'sale' ? 'Venta' : listing.section === 'rent' ? 'Arriendo' : 'Subasta';
                        const sectionTone = listing.section === 'sale' ? 'success' : listing.section === 'rent' ? 'warning' : 'info';
                        
                        const goToSlide = (direction: number) => {
                            const max = Math.max(1, images.length);
                            setCarouselSlide(prev => ({
                                ...prev,
                                [listing.id]: ((prev[listing.id] || 0) + direction + max) % max
                            }));
                        };
                        
                        return (
                            <article key={listing.id} className="rounded-xl p-3 sm:p-4 grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr] xl:grid-cols-[280px_minmax(0,1fr)_240px] gap-3 sm:gap-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none relative cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <PanelStatusBadge label={badge.label} tone={badge.tone} variant="solid" size="sm" className="hidden xl:block absolute top-2 right-2 shadow-sm z-30" />
                                {/* Z-Index Hierarchy: z-10=carousel controls, z-20=badges/dots, z-30=status/save */}
                                <div className="w-full h-40 sm:h-44 xl:h-auto xl:min-h-[180px] aspect-[3/4] sm:aspect-4/3 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative transition-all duration-300 motion-reduce:transition-none" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }}>
                                    <PanelStatusBadge label={sectionLabel} tone={sectionTone} variant="solid" size="sm" className="absolute top-1.5 left-1.5 shadow-sm z-20 text-[10px]" />
                                    {currentImage ? (
                                        <Image src={currentImage} alt={listing.title || 'Portada'} width={280} height={180} className="w-full h-full object-cover transition-opacity duration-300" priority sizes="(max-width: 640px) 100px, (max-width: 1024px) 140px, 280px" decoding="async" />
                                    ) : (
                                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 to-slate-900" />
                                    )}
                                    {images.length > 1 ? (
                                        <>
                                            <PanelIconButton
                                                type="button"
                                                label="Imagen anterior"
                                                aria-label="Imagen anterior"
                                                variant="overlay"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); goToSlide(-1); }}
                                                className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full shadow-sm z-10"
                                            >
                                                <IconChevronLeft size={12} className="sm:w-[14px] sm:h-[14px]" />
                                            </PanelIconButton>
                                            <PanelIconButton
                                                type="button"
                                                label="Imagen siguiente"
                                                aria-label="Imagen siguiente"
                                                variant="overlay"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); goToSlide(1); }}
                                                className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full shadow-sm z-10"
                                            >
                                                <IconChevronRight size={12} className="sm:w-[14px] sm:h-[14px]" />
                                            </PanelIconButton>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
                                                {images.map((_, idx) => (
                                                    <span
                                                        key={`dot-${listing.id}-${idx}`}
                                                        className="rounded-full transition-all duration-200 motion-reduce:transition-none"
                                                        style={{
                                                            width: carouselSlide[listing.id] === idx ? 20 : 7,
                                                            height: 4,
                                                            background: carouselSlide[listing.id] === idx ? '#ffffff' : 'rgba(255,255,255,0.55)',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm sm:text-lg font-semibold leading-tight line-clamp-2" style={{ color: 'var(--fg)' }}>{listing.title}</h3>
                                        <p className="font-bold text-sm sm:text-base mt-0.5" style={{ color: 'var(--fg)' }}>{formatChileanPeso(listing.price)}</p>
                                        {tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {tags.slice(0, 5).map((item) => (
                                                    <span
                                                        key={`${listing.id}-${item}`}
                                                        className="text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md"
                                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        {listing.location ? <p className="flex text-[10px] mt-0.5 items-center gap-1" style={{ color: 'var(--fg-muted)' }}><IconMapPin size={9} />{listing.location}</p> : null}
                                    </div>
                                    <div className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                                        <span className="flex items-center gap-0.5 sm:gap-1"><IconEye size={10} className="sm:w-3 sm:h-3" />{listing.views}</span>
                                        <span className="flex items-center gap-0.5 sm:gap-1"><IconHeart size={10} className="sm:w-3 sm:h-3" />{listing.favs}</span>
                                        <span className="flex items-center gap-0.5 sm:gap-1"><IconTrendingUp size={10} className="sm:w-3 sm:h-3" />{listing.leads}</span>
                                        <span className="hidden sm:inline">{listing.days}d</span>
                                        {lifecycleHint ? <span className="hidden sm:flex items-center gap-0.5 sm:gap-1"><IconClock size={10} className="sm:w-3 sm:h-3" />{lifecycleHint}</span> : null}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 flex-nowrap mt-auto xl:hidden">
                                        <Link href={`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 sm:h-8 px-2 sm:px-4 text-[10px] sm:text-xs whitespace-nowrap' })} style={getPanelButtonStyle('primary')}><IconTrendingUp size={10} className="sm:w-3 sm:h-3" /> Boost</Link>
                                        {renderShareMenu(listing)}
                                        {renderActionMenu(listing)}
                                    </div>
                                </div>
                                <div className="hidden xl:flex flex-col justify-end gap-3">
                                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                                        <Link href={`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 sm:h-8 px-2 sm:px-4 text-[10px] sm:text-xs whitespace-nowrap' })} style={getPanelButtonStyle('primary')}><IconTrendingUp size={10} className="sm:w-3 sm:h-3" /> Boost</Link>
                                        {renderShareMenu(listing)}
                                        {renderActionMenu(listing)}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}

            {!loading && filtered.length > 0 && viewMode === 'vertical' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((listing) => {
                        const badge = publicationBadgeMeta(listing);
                        const lifecycleHint = publicationLifecycleHint(listing);
                        const images = getListingImages(listing);
                        const currentSlide = carouselSlide[listing.id] || 0;
                        const currentImage = images[currentSlide] || null;
                        const tags = getListingTags(listing);
                        const sectionLabel = listing.section === 'sale' ? 'Venta' : listing.section === 'rent' ? 'Arriendo' : 'Subasta';
                        const sectionTone = listing.section === 'sale' ? 'success' : listing.section === 'rent' ? 'warning' : 'info';
                        
                        const goToSlide = (direction: number) => {
                            const max = Math.max(1, images.length);
                            setCarouselSlide(prev => ({
                                ...prev,
                                [listing.id]: ((prev[listing.id] || 0) + direction + max) % max
                            }));
                        };
                        
                        return (
                            <article key={listing.id} className="rounded-xl relative cursor-pointer transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                                {/* Z-Index Hierarchy: z-10=carousel controls, z-20=badges/dots, z-30=status/save */}
                                <div className="aspect-4/3 flex items-center justify-center overflow-hidden relative rounded-lg transition-all motion-reduce:transition-none" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }} aria-live="polite">
                                    <PanelStatusBadge label={sectionLabel} tone={sectionTone} variant="solid" size="sm" className="absolute top-2 left-2 shadow-sm z-20" />
                                    <PanelStatusBadge label={badge.label} tone={badge.tone} variant="solid" size="sm" className="absolute top-2 right-2 shadow-sm z-30" />
                                    {currentImage ? (
                                        <Image src={currentImage} alt={listing.title || 'Portada'} width={400} height={300} className="w-full h-full object-cover rounded-lg transition-opacity duration-300" loading="lazy" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" decoding="async" />
                                    ) : (
                                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 to-slate-900" />
                                    )}
                                    {images.length > 1 ? (
                                        <>
                                            <PanelIconButton
                                                type="button"
                                                label="Imagen anterior"
                                                aria-label="Imagen anterior"
                                                variant="overlay"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); goToSlide(-1); }}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-sm z-10"
                                            >
                                                <IconChevronLeft size={14} />
                                            </PanelIconButton>
                                            <PanelIconButton
                                                type="button"
                                                label="Imagen siguiente"
                                                aria-label="Imagen siguiente"
                                                variant="overlay"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); goToSlide(1); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-sm z-10"
                                            >
                                                <IconChevronRight size={14} />
                                            </PanelIconButton>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
                                                {images.map((_, index) => (
                                                    <span
                                                        key={`dot-${listing.id}-${index}`}
                                                        className="rounded-full transition-all duration-200 motion-reduce:transition-none"
                                                        style={{
                                                            width: currentSlide === index ? 20 : 7,
                                                            height: 4,
                                                            background: currentSlide === index ? '#ffffff' : 'rgba(255,255,255,0.55)',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                                <div className="p-4 text-center space-y-2">
                                    <p className="type-listing-price" style={{ color: 'var(--fg)' }}>{formatChileanPeso(listing.price)}</p>
                                    <h3 className="type-listing-title line-clamp-2" style={{ color: 'var(--fg)' }}>{listing.title}</h3>
                                    {tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 justify-center">
                                            {tags.map((item) => (
                                                <span
                                                    key={`${listing.id}-${item}`}
                                                    className="text-[11px] px-2 py-1 rounded-md"
                                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    {listing.location ? <p className="text-xs flex items-center justify-center gap-1" style={{ color: 'var(--fg-muted)' }}><IconMapPin size={11} />{listing.location}</p> : null}
                                    <div className="flex items-center justify-center gap-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                        <span className="flex items-center gap-1"><IconEye size={11} />{listing.views}</span>
                                        <span className="flex items-center gap-1"><IconHeart size={11} />{listing.favs}</span>
                                        <span className="flex items-center gap-1"><IconTrendingUp size={11} />{listing.leads}</span>
                                        {lifecycleHint ? <span className="flex items-center gap-1"><IconClock size={11} />{lifecycleHint}</span> : null}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <Link href={`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 px-6 text-xs' })} style={getPanelButtonStyle('primary')}><IconTrendingUp size={11} /> Boost</Link>
                                        {renderShareMenu(listing)}
                                        {renderActionMenu(listing)}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}

            {/* Instagram Preview Modal */}
            {instagramPreviewOpen && previewListing && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm transition-all"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={() => setInstagramPreviewOpen(false)}
                >
                    <div 
                        className="w-full max-w-5xl max-h-[calc(100dvh-0.75rem)] sm:max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b p-4 px-6 shrink-0" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                {isInstagramSuccess ? '¡Publicación exitosa! 🎉' : 'Vista previa de Instagram'}
                            </h3>
                            <button 
                                onClick={() => setInstagramPreviewOpen(false)}
                                className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
                            {isInstagramSuccess ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <div className="mb-6 flex h-20 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 ring-4 ring-green-500/20">
                                        <IconPlugConnected size={40} />
                                    </div>
                                    <h4 className="mb-2 text-xl font-bold" style={{ color: 'var(--fg)' }}>¡Publicado Exitosamente!</h4>
                                    <p className="mb-8 max-w-sm text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                        Tu vehículo ha sido publicado en tu cuenta de Instagram. Puede tardar unos segundos en aparecer en tu feed.
                                    </p>
                                    
                                    <div className="flex w-full max-w-md gap-3">
                                        {lastPublishedPermalink && (
                                            <a 
                                                href={lastPublishedPermalink} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="flex-1"
                                            >
                                                <PanelButton variant="primary" className="w-full">
                                                    <IconExternalLink size={14} /> Ver en Instagram
                                                </PanelButton>
                                            </a>
                                        )}
                                        <PanelButton 
                                            variant="secondary" 
                                            className="flex-1"
                                            onClick={() => setInstagramPreviewOpen(false)}
                                        >
                                            Cerrar
                                        </PanelButton>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-6 h-full min-h-0 relative">
                                    {isPublishingInstagram && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl text-white">
                                            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                                            <h4 className="text-lg font-bold">Publicando...</h4>
                                        </div>
                                    )}
                                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                                        <InstagramTemplatePreview
                                            className={`w-full max-w-[420px] mx-auto group transition-all duration-300 ${
                                                templateTransitioning ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
                                            }`}
                                            imageUrl={getListingImages(previewListing)[instagramCarouselIndex] ?? null}
                                            template={instagramCarouselIndex === 0 ? activeTemplate : null}
                                            layoutVariant={activeTemplate?.layoutVariant ?? 'square'}
                                            fallback={<IconCar size={40} />}
                                        >
                                            {getListingImages(previewListing).length > 1 && (
                                                <>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setInstagramCarouselIndex(prev => prev > 0 ? prev - 1 : getListingImages(previewListing).length - 1)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setInstagramCarouselIndex(prev => prev < getListingImages(previewListing).length - 1 ? prev + 1 : 0)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                    </button>
                                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                                                        {getListingImages(previewListing).map((_, i) => (
                                                            <div key={i} className={`h-1 rounded-full transition-all ${i === instagramCarouselIndex ? 'w-3 bg-white' : 'w-1 bg-white/50'}`} />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </InstagramTemplatePreview>
                                    </div>

                                    {/* Lado derecho: Descripción editable */}
                                    <div className="w-full md:w-1/2 flex flex-col min-h-0">
                                        <div
                                            className="mb-4 rounded-[1.25rem] border p-4"
                                            style={{
                                                borderColor: activeTemplate?.colors.accent ?? 'var(--border)',
                                                background: activeTemplate
                                                    ? `linear-gradient(135deg, ${activeTemplate.colors.accent}18 0%, ${activeTemplate.colors.secondary}18 100%)`
                                                    : 'linear-gradient(135deg, rgba(255,54,0,0.1) 0%, rgba(17,17,17,0.12) 100%)',
                                            }}
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Templates de SimpleAutos</div>
                                                    <div className="text-[11px]" style={{ color: 'var(--fg-secondary)' }}>
                                                        {templatesLoading ? (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <IconLoader2 size={10} className="animate-spin" />
                                                                    <span>{templatesLoadingMessage || 'Cargando...'}</span>
                                                                </div>
                                                                {templatesLoadingProgress > 0 && (
                                                                    <div className="w-full bg-gray-200 rounded-full h-1">
                                                                        <div 
                                                                            className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                                                                            style={{ width: `${templatesLoadingProgress}%` }}
                                                                        ></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : activeTemplate ? `${activeTemplate.layoutVariant === 'portrait' ? '3:4' : '1:1'} · ${activeTemplate.score}/100` : 'Sin template'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {instagramTemplates.map((template) => {
                                                    const isSelected = template.id === activeTemplate?.id;
                                                    return (
                                                        <button
                                                            key={template.id}
                                                            type="button"
                                                            onClick={() => void handleTemplateChange(template.id)}
                                                            className="flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all"
                                                            style={{
                                                                borderColor: isSelected ? '#111' : 'var(--border)',
                                                                background: isSelected ? '#111' : 'var(--surface)',
                                                                color: isSelected ? '#fff' : 'var(--fg)',
                                                            }}
                                                        >
                                                            {template.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Manejo de errores mejorado */}
                                            {templatesError && (
                                                <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: '#ef4444', background: '#ef444410' }}>
                                                    <div className="flex items-start gap-2">
                                                        <div className="text-red-500 mt-0.5">
                                                            <IconX size={14} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs font-semibold text-red-600 mb-1">Error al cargar templates</div>
                                                            <div className="text-xs text-red-500 mb-2">{templatesError}</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (previewListing) {
                                                                        setTemplatesRetryCount(0);
                                                                        void loadInstagramTemplatesForListing(previewListing.id, true);
                                                                    }
                                                                }}
                                                                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                                            >
                                                                Reintentar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mb-2 flex items-center justify-between shrink-0">
                                            <label 
                                                className="text-[11px] font-bold uppercase tracking-wider opacity-60"
                                                style={{ color: 'var(--fg)' }}
                                            >
                                                Pie de foto (Editable)
                                            </label>
                                            <span className="text-[10px] opacity-40" style={{ color: 'var(--fg)' }}>
                                                {previewCaption.length} / 2200
                                            </span>
                                        </div>
                                        <textarea
                                            value={previewCaption}
                                            onChange={(e) => setPreviewCaption(e.target.value)}
                                            className="w-full flex-1 rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            style={{ 
                                                background: 'var(--surface-sunken)', 
                                                borderColor: 'var(--border)',
                                                color: 'var(--fg)',
                                                minHeight: '180px',
                                                resize: 'none'
                                            }}
                                            placeholder="Escribe el pie de foto..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons (Fixed) */}
                        {!isInstagramSuccess && (
                            <div className="border-t px-4 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shrink-0 bg-white dark:bg-black/10" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex gap-3 max-w-md ml-auto">
                                    <PanelButton
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => setInstagramPreviewOpen(false)}
                                    >
                                        Cancelar
                                    </PanelButton>
                                    <PanelButton
                                        variant="primary"
                                        className="flex-1"
                                        onClick={handleConfirmInstagramPublish}
                                        disabled={isPublishingInstagram || templatesLoading || !activeTemplate}
                                    >
                                        {isPublishingInstagram ? 'Publicando...' : templatesLoading ? 'Cargando template...' : 'Publicar ahora'}
                                    </PanelButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
