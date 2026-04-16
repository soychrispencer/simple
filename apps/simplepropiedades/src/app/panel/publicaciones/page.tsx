'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconBrandWhatsapp,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
    IconCopy,
    IconDots,
    IconEdit,
    IconEye,
    IconGridDots,
    IconHeart,
    IconHome2,
    IconList,
    IconMapPin,
    IconPlayerPause,
    IconPlus,
    IconRefresh,
    IconShare3,
    IconSquarePlus,
    IconTrendingUp,
    IconTrash,
    IconX,
    IconPlugConnected,
    IconExternalLink,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import ModernSelect from '@/components/ui/modern-select';
import { PanelIconButton } from '@simple/ui';
import { useAuth } from '@/context/auth-context';
import {
    fetchInstagramIntegrationStatus,
    generateSmartTemplates,
    publishListingToInstagramEnhanced,
    type InstagramPublicationView,
    type InstagramTemplateView,
} from '@/lib/instagram';
import {
    type ListingStatus,
    type PanelListing,
    type PortalKey,
    fetchMyPanelListings,
    publishListingToPortal,
    renewPanelListing,
    updatePanelListingStatus,
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

const PORTAL_ORDER: PortalKey[] = ['yapo', 'mercadolibre', 'facebook'];

type FilterKey = 'all' | 'active' | 'review_required' | 'paused' | 'sold' | 'draft';
type ManagedStatus = Extract<ListingStatus, 'draft' | 'active' | 'paused' | 'sold'>;

const STATUS_LABELS: Record<ListingStatus, string> = {
    active: 'Activa',
    paused: 'Pausada',
    draft: 'Borrador',
    archived: 'Archivada',
    sold: 'Vendida',
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
    if (section === 'rent') return 'Arrendada';
    if (section === 'project') return 'Cerrada';
    return 'Vendida';
}

function getClosedActionLabel(section: PanelListing['section']): string {
    if (section === 'rent') return 'Arrendado';
    if (section === 'project') return 'Cerrar';
    return 'Vendido';
}

function getFallbackHref(section: PanelListing['section']): string {
    if (section === 'rent') return '/arriendos';
    if (section === 'project') return '/proyectos';
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

function orderPropertyTags(tags: string[]): string[] {
    const allowedPatterns = [
        /casa|departamento|oficina|terreno|local|bodega|estacionamiento/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /m²|m2|metros|metraje|superficie/i,
        /habitaciones|dormitorios|habitación|dormitorio/i,
        /baños|baño/i
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
    const setup = payload.setup || {};
    const basic = payload.basic || {};
    const project = payload.project || {};
    const summary: string[] = [];
    const isProject = listing.section === 'project' || setup.operationType === 'project';
    
    // Extract property tags matching API logic
    if (isProject) {
        if (project.projectName) summary.push(String(project.projectName));
        if (project.availableUnits) {
            const units = parseInt(String(project.availableUnits).replace(/[^\d]/g, ''), 10);
            if (!isNaN(units)) summary.push(`${units.toLocaleString('es-CL')} unidades`);
        }
    } else {
        if (basic.propertyType) summary.push(String(basic.propertyType));
        if (basic.condition) summary.push(String(basic.condition));
        
        if (basic.bedrooms) {
            const bedrooms = parseInt(String(basic.bedrooms).replace(/[^\d]/g, ''), 10);
            if (!isNaN(bedrooms)) summary.push(`${bedrooms} dormitorios`);
        }
        
        if (basic.bathrooms) {
            const bathrooms = parseInt(String(basic.bathrooms).replace(/[^\d]/g, ''), 10);
            if (!isNaN(bathrooms)) summary.push(`${bathrooms} baños`);
        }
        
        if (basic.totalArea || basic.surface) {
            const surface = parseInt(String(basic.totalArea || basic.surface).replace(/[^\d]/g, ''), 10);
            if (!isNaN(surface)) summary.push(`${surface.toLocaleString('es-CL')} m²`);
        }
    }
    
    return orderPropertyTags(summary.slice(0, 5));
}

export default function PublicacionesPage() {
    const { user, authLoading, requireAuth } = useAuth();
    const [listings, setListings] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [instagramPublications, setInstagramPublications] = useState<InstagramPublicationView[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [statusBusyKey, setStatusBusyKey] = useState<string | null>(null);
    const [portalBusyKey, setPortalBusyKey] = useState<string | null>(null);
    const [carouselSlide, setCarouselSlide] = useState<Record<string, number>>({});
    const [instagramBusyKey, setInstagramBusyKey] = useState<string | null>(null);

    // Instagram Preview States
    const [instagramPreviewOpen, setInstagramPreviewOpen] = useState(false);
    const [previewListing, setPreviewListing] = useState<PanelListing | null>(null);
    const [previewCaption, setPreviewCaption] = useState('');
    const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);
    const [isInstagramSuccess, setIsInstagramSuccess] = useState(false);
    const [lastPublishedPermalink, setLastPublishedPermalink] = useState<string | null>(null);
    const [instagramCarouselIndex, setInstagramCarouselIndex] = useState(0);
    const [instagramTemplates, setInstagramTemplates] = useState<InstagramTemplateView[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [shareMenuOpenId, setShareMenuOpenId] = useState<string | null>(null);

    const closeMenus = () => {
        setActionMenuOpenId(null);
        setShareMenuOpenId(null);
    };

    const loadListings = async () => {
        setLoading(true);
        const [result, igResult] = await Promise.all([
            fetchMyPanelListings(),
            fetchInstagramIntegrationStatus()
        ]);
        if (result.unauthorized) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión.');
            setListings([]);
            setLoading(false);
            requireAuth(() => void loadListings());
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
            requireAuth(() => void loadListings());
            return;
        }
        void loadListings();
    }, [authLoading, user]);

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

    const onChangeListingStatus = async (listing: PanelListing, status: ManagedStatus) => {
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            requireAuth(() => {
                void onChangeListingStatus(listing, status);
            });
            return;
        }
        setStatusBusyKey(`${listing.id}:${status}`);
        const result = await updatePanelListingStatus(listing.id, status);
        setStatusBusyKey(null);
        if (!result.ok) {
            if (result.unauthorized) {
                setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
                requireAuth(() => {
                    void onChangeListingStatus(listing, status);
                });
                return;
            }
            setNotice(result.error || 'No se pudo actualizar el estado.');
            return;
        }
        setNotice(`Estado actualizado a ${STATUS_LABELS[status]}.`);
        void loadListings();
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

        setStatusBusyKey(`${listing.id}:delete`);
        const result = await updatePanelListingStatus(listing.id, 'archived');
        setStatusBusyKey(null);
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

    const loadInstagramTemplatesForListing = async (listingId: string) => {
        setTemplatesLoading(true);
        const result = await generateSmartTemplates(listingId);
        if (!result.ok || !result.recommendedTemplate) {
            setInstagramTemplates([]);
            setSelectedTemplateId(null);
            setTemplatesLoading(false);
            if (result.error) setNotice(result.error);
            return;
        }

        const allTemplates = [result.recommendedTemplate, ...(result.alternatives ?? [])];
        const order = ['essential-watermark', 'professional-centered', 'signature-complete'];
        const nextTemplates = [...allTemplates].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        setInstagramTemplates(nextTemplates);
        setSelectedTemplateId(result.recommendedTemplate.id ?? nextTemplates[0]?.id ?? null);
        setTemplatesLoading(false);
    };

    const shareOnInstagram = (listing: PanelListing) => {
        closeMenus();
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            return;
        }

        const baseDescription = listing.description?.trim() ? listing.description : `🏠 ${listing.title}\n💰 ${listing.price || 'Consultar precio'}\n📍 ${getListingCommune(listing)}`;
        const defaultCaption = `${baseDescription}\n\n🔗 Ver más: https://simplepropiedades.cl/propiedad/${listing.id}\n\n#SimplePropiedades #PropiedadesChile #Inmuebles #VentaPropiedades #Casa`;

        setPreviewListing(listing);
        setPreviewCaption(defaultCaption);
        setInstagramCarouselIndex(0);
        setIsInstagramSuccess(false);
        setLastPublishedPermalink(null);
        setInstagramTemplates([]);
        setSelectedTemplateId(null);
        setInstagramPreviewOpen(true);
        void loadInstagramTemplatesForListing(listing.id);
    };

    const handleConfirmInstagramPublish = async () => {
        if (!previewListing) return;
        if (templatesLoading || !activeTemplate) {
            setNotice('Espera a que cargue el template de portada antes de publicar.');
            return;
        }

        setIsPublishingInstagram(true);
        const key = `${previewListing.id}:instagram`;
        setInstagramBusyKey(key);

        try {
            const result = await publishListingToInstagramEnhanced(previewListing.id, {
                useAI: true,
                useTemplates: Boolean(activeTemplate),
                captionOverride: previewCaption,
                templateId: activeTemplate?.id ?? null,
                layoutVariant: activeTemplate?.layoutVariant ?? 'portrait',
                tone: 'professional',
                targetAudience: previewListing.section === 'project' ? 'investors' : 'families',
            });
            const publication = result.publication ?? result.result;
            if (result.ok && publication) {
                setIsInstagramSuccess(true);
                setLastPublishedPermalink(publication.instagramPermalink || null);
            } else {
                setNotice(result.error ?? 'No se pudo publicar en Instagram.');
            }
        } catch (error) {
            setNotice('Error inesperado al publicar en Instagram.');
        } finally {
            setIsPublishingInstagram(false);
            setInstagramBusyKey(null);
            closeMenus();
        }
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
        const closedLabel = listing.section === 'rent' ? 'Arrendado' : 'Vendido';

        return (
            <div className="relative">
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
                        className="absolute right-0 mt-2 w-64 rounded-xl border p-2 z-50"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
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
            <div className="relative">
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
                        className="absolute right-0 mt-2 w-72 rounded-xl border p-2 z-50"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                    >
                        {renderMenuItem('Link', () => {
                            void copyListingLink(listing);
                        }, <IconCopy size={14} />)}
                        {renderMenuItem('WhatsApp', () => shareOnWhatsapp(listing), <IconBrandWhatsapp size={14} />, false, 'mt-1')}
                        {renderMenuItem(instagramBusyKey === `${listing.id}:instagram` ? 'Instagram publicando...' : 'Instagram', () => {
                            void shareOnInstagram(listing);
                        }, <IconPlugConnected size={14} />, instagramBusyKey === `${listing.id}:instagram`, 'mt-1')}
                    </div>
                ) : null}
            </div>
        );
    };

    const filters = useMemo(() => [
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
    ], [listings]);

    const fixBrokenB2Url = (url: string): string => {
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
    };

    const getListingCoverImage = (listing: PanelListing): string | null => {
        const rawData = listing.rawData as any;
        const photos = rawData?.media?.photos;
        if (!Array.isArray(photos) || photos.length === 0) return null;

        const first = photos[0];
        let imageUrl = '';
        if (typeof first === 'string') {
            imageUrl = first.trim();
        } else {
            imageUrl = first?.url || first?.previewUrl || first?.dataUrl || '';
        }
        
        if (typeof imageUrl === 'string' && imageUrl.trim()) {
            return fixBrokenB2Url(imageUrl.trim());
        }
        return null;
    };

    const getListingImages = (listing: PanelListing): string[] => {
        const rawData = listing.rawData as any;
        const photos = rawData?.media?.photos;
        if (!Array.isArray(photos) || photos.length === 0) return [];
        
        return photos.map(p => {
            let url = '';
            if (typeof p === 'string') {
                url = p.trim();
            } else {
                url = p?.url || p?.previewUrl || p?.dataUrl || '';
            }
            return typeof url === 'string' && url.trim() ? fixBrokenB2Url(url.trim()) : null;
        }).filter(Boolean) as string[];
    };

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

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader
                title="Mis publicaciones"
                description={`${listings.length} publicaciones`}
                actions={<Link href="/panel/publicar" className={getPanelButtonClassName({ size: 'sm', className: 'h-9 px-4 text-sm' })} style={getPanelButtonStyle('primary')}><IconPlus size={13} /> Nueva publicación</Link>}
            />

            {notice ? <PanelNotice className="mb-4">{notice}</PanelNotice> : null}

            <div className="mb-5">
                <div className="sm:hidden flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <ModernSelect value={filter} onChange={(value) => setFilter(value as typeof filter)} options={filters.map((item) => ({ value: item.id, label: `${item.label} (${item.count})` }))} ariaLabel="Filtro" />
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
                            onChange={(key) => setFilter(key as typeof filter)}
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
                        const sectionLabel = listing.section === 'sale' ? 'Venta' : listing.section === 'rent' ? 'Arriendo' : 'Proyecto';
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
                                        <img src={currentImage} alt={listing.title} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" decoding="async" />
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
                        const sectionLabel = listing.section === 'sale' ? 'Venta' : listing.section === 'rent' ? 'Arriendo' : 'Proyecto';
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
                                        <img src={currentImage} alt={listing.title} className="w-full h-full object-cover rounded-lg transition-opacity duration-300" loading="lazy" decoding="async" />
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
                        className="w-full max-w-6xl max-h-[calc(100dvh-0.75rem)] sm:max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b p-4 px-6 shrink-0" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                Vista previa de Instagram
                            </h3>
                            <button 
                                onClick={() => setInstagramPreviewOpen(false)}
                                className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col min-h-0">
                            {isInstagramSuccess ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 ring-4 ring-green-500/20">
                                        <IconPlugConnected size={48} />
                                    </div>
                                    <h4 className="mb-2 text-2xl font-bold" style={{ color: 'var(--fg)' }}>¡Publicado Exitosamente!</h4>
                                    <p className="mb-8 max-w-sm text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                        Tu propiedad ha sido publicada en tu cuenta de Instagram. Puede tardar unos segundos en aparecer en tu feed.
                                    </p>
                                    
                                    <div className="flex w-full gap-3">
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
                                <div className="flex flex-col md:flex-row gap-6 md:gap-8 h-full min-h-0 relative">
                                    {isPublishingInstagram && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl text-white">
                                            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
                                            <h4 className="text-lg font-bold">Publicando en Instagram...</h4>
                                            <p className="mt-2 max-w-xs text-center text-sm opacity-80">
                                                Conectando con los servidores de Meta. Esto puede tomar unos segundos, por favor espera.
                                            </p>
                                        </div>
                                    )}
                                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                                        <InstagramTemplatePreview
                                            className="w-full max-w-[420px] mx-auto group"
                                            imageUrl={getListingImages(previewListing)[instagramCarouselIndex] ?? null}
                                            template={instagramCarouselIndex === 0 ? activeTemplate : null}
                                            layoutVariant={activeTemplate?.layoutVariant ?? 'portrait'}
                                            fallback={<IconHome2 size={48} />}
                                        >
                                            {getListingImages(previewListing).length > 1 && (
                                                <>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setInstagramCarouselIndex(prev => prev > 0 ? prev - 1 : getListingImages(previewListing).length - 1)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setInstagramCarouselIndex(prev => prev < getListingImages(previewListing).length - 1 ? prev + 1 : 0)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                    </button>
                                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                                                        {getListingImages(previewListing).map((_, i) => (
                                                            <div key={i} className={`h-1.5 rounded-full transition-all ${i === instagramCarouselIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </InstagramTemplatePreview>
                                    </div>

                                {/* Lado derecho: Descripción editable */}
                                <div className="w-full md:w-1/2 flex flex-col min-h-0 flex-1">
                                    <div
                                        className="mb-4 rounded-[1.25rem] border p-4"
                                        style={{
                                            borderColor: 'var(--border)',
                                            background: 'var(--surface)',
                                        }}
                                    >
                                        <div className="mb-3">
                                            <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Templates de SimplePropiedades</div>
                                            <div className="text-[11px]" style={{ color: 'var(--fg-secondary)' }}>
                                                {templatesLoading ? 'Analizando la ficha y el contexto del aviso...' : activeTemplate ? `3:4 · ${activeTemplate.score}/100` : 'Sin template'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {instagramTemplates.map((template) => {
                                                const isSelected = template.id === activeTemplate?.id;
                                                return (
                                                    <button
                                                        key={template.id}
                                                        type="button"
                                                        onClick={() => setSelectedTemplateId(template.id)}
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
                                    </div>
                                    <div className="mb-2 flex items-center justify-between shrink-0">
                                        <label 
                                            className="text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--fg-muted)' }}
                                        >
                                            Pie de foto (Editable)
                                        </label>
                                        <span className="text-[10px] opacity-50" style={{ color: 'var(--fg)' }}>
                                            {previewCaption.length} / 2200
                                        </span>
                                    </div>
                                    <textarea
                                        value={previewCaption}
                                        onChange={(e) => setPreviewCaption(e.target.value)}
                                        className="mb-4 w-full flex-1 rounded-xl border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        {!isInstagramSuccess && (
                            <div className="border-t px-4 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shrink-0 bg-white dark:bg-black/10" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex flex-col sm:flex-row gap-3 max-w-md ml-auto">
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
