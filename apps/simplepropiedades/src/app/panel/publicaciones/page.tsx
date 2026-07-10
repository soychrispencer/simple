'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    IconEyeOff,
    IconCheck,
    IconRocket,
    IconChartBar,
    IconPencil,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { ListingShareSheet } from '@/components/panel/listing-share-sheet';
import { ModernSelect } from '@simple/ui/forms';
import { fetchInstagramIntegrationStatus, generateSmartTemplates, publishListingToInstagramEnhanced, type InstagramPublicationView, type InstagramTemplateView, } from '@/lib/instagram';
import {
    type ListingStatus, type PanelListing, type PortalKey, fetchMyPanelListings, publishListingToPortal, renewPanelListing, updatePanelListingStatus, deletePanelListing, } from '@/lib/panel-listings';
import { InstagramTemplatePreview } from '@simple/ui/integrations';
import { PanelIconButton } from '@simple/ui/panel';
import { useAuth } from '@simple/auth';
import { PanelButton, PanelNotice, PanelPillNav, PanelSegmentedToggle, PanelStatusBadge, PanelScrollModal, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui/panel';
import { OwnerListingCard } from '@simple/ui/listings';
import type { OwnerListingAction, OwnerListingStatus, ListingVariant } from '@simple/ui/listings';

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

function getListingTags(listing: PanelListing): string[] {
    const rawData = listing.rawData as any;
    const payload = rawData || {};
    const setup = payload.setup || {};
    const basic = payload.basic || {};
    const project = payload.project || {};
    const summary: string[] = [];
    const isProject = listing.section === 'project' || setup.operationType === 'project';

    if (isProject) {
        if (project.projectName) summary.push(String(project.projectName));
        if (project.availableUnits) {
            const units = parseInt(String(project.availableUnits).replace(/[^\d]/g, ''), 10);
            if (!isNaN(units)) summary.push(`${units.toLocaleString('es-CL')} unidades`);
        }
        if (project.usableAreaFrom) {
            const from = parseInt(String(project.usableAreaFrom).replace(/[^\d]/g, ''), 10);
            if (!isNaN(from)) summary.push(`Desde ${from.toLocaleString('es-CL')} m²`);
        }
        return summary.slice(0, 4);
    }

    const propertyType = String(basic.propertyType || '');
    const rooms = parseInt(String(basic.rooms ?? basic.bedrooms || '').replace(/[^\d]/g, ''), 10);
    const bathrooms = parseInt(String(basic.bathrooms || '').replace(/[^\d]/g, ''), 10);
    const parking = parseInt(String(basic.parkingSpaces || '').replace(/[^\d]/g, ''), 10);
    const storage = parseInt(String(basic.storageUnits || '').replace(/[^\d]/g, ''), 10);
    const residential = /casa|depto|departamento|townhouse|loft|penthouse|duplex|dúplex|studio|estudio/i.test(propertyType)
        || Number.isFinite(rooms)
        || Number.isFinite(bathrooms);

    if (residential) {
        if (Number.isFinite(rooms)) summary.push(`${rooms}D`);
        if (Number.isFinite(bathrooms)) summary.push(`${bathrooms}B`);
        if (Number.isFinite(parking)) summary.push(`${parking}E`);
        if (Number.isFinite(storage)) summary.push(`${storage}Bo`);
        return summary.slice(0, 4);
    }

    if (propertyType) summary.push(propertyType);
    const surface = parseInt(String(basic.totalArea || basic.surface || '').replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(surface)) summary.push(`${surface.toLocaleString('es-CL')} m²`);
    if (Number.isFinite(parking)) summary.push(`${parking}E`);
    return summary.slice(0, 4);
}

export default function PublicacionesPage() {
    const router = useRouter();
    const { user, authLoading, requireAuth } = useAuth();
    const [listings, setListings] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>(() => {
        if (typeof window === 'undefined') return 'horizontal';
        const saved = window.localStorage.getItem('simplepropiedades:panel:publicaciones:viewMode');
        return saved === 'vertical' ? 'vertical' : 'horizontal';
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simplepropiedades:panel:publicaciones:viewMode', viewMode);
        }
    }, [viewMode]);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [instagramPublications, setInstagramPublications] = useState<InstagramPublicationView[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [statusBusyKey, setStatusBusyKey] = useState<string | null>(null);
    const [portalBusyKey, setPortalBusyKey] = useState<string | null>(null);
    const [instagramBusyKey, setInstagramBusyKey] = useState<string | null>(null);

    // Instagram Preview States
    const [instagramPreviewOpen, setInstagramPreviewOpen] = useState(false);
    const [previewListing, setPreviewListing] = useState<PanelListing | null>(null);
    const [shareListing, setShareListing] = useState<PanelListing | null>(null);
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
        const result = await deletePanelListing(listing.id);
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
        const defaultCaption = `${baseDescription}\n\n🔗 Ver más: https://simplepropiedades.app/propiedad/${listing.id}\n\n#SimplePropiedades #PropiedadesChile #Inmuebles #VentaPropiedades #Casa`;

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
            return typeof url === 'string' && url.trim() ? url.trim() : null;
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

    const toOwnerCardData = (listing: PanelListing, mode: 'grid' | 'list') => {
        const amount = parseInt(String(listing.price).replace(/[^\d]/g, ''), 10);
        const priceCaption = /^UF\b/i.test(String(listing.price).trim())
            ? 'UF'
            : /^USD\b/i.test(String(listing.price).trim())
                ? 'USD'
                : undefined;
        const sectionToVariant: Record<PanelListing['section'], ListingVariant> = {
            sale: 'sale',
            rent: 'rent',
            auction: 'auction',
            project: 'project',
        };
        const variant = sectionToVariant[listing.section] ?? 'sale';

        const lifecycle = listing.publicationLifecycle?.state;
        const status: OwnerListingStatus =
            lifecycle === 'review_required'
                ? 'review_required'
                : lifecycle === 'review_expired'
                    ? 'expired'
                    : (listing.status as OwnerListingStatus);

        const closedLabel = getClosedActionLabel(listing.section);
        const needsRenewal = lifecycle === 'review_required' || lifecycle === 'review_expired';
        const badge = publicationBadgeMeta(listing);

        const secondaryActions: OwnerListingAction[] = [];

        // Editar
        secondaryActions.push({
            key: 'edit',
            label: 'Editar',
            icon: <IconPencil size={14} />,
            onSelect: () => {
                router.push(`/panel/publicar?edit=${encodeURIComponent(listing.id)}`);
            },
        });

        // Ver publicación
        secondaryActions.push({
            key: 'view',
            label: 'Ver publicación',
            icon: <IconEye size={14} />,
            onSelect: () => {
                window.open(listing.href || getFallbackHref(listing.section), '_blank');
            },
        });

        // Duplicar
        secondaryActions.push({
            key: 'duplicate',
            label: 'Duplicar',
            icon: <IconCopy size={14} />,
            onSelect: async () => {
                const { duplicatePanelListing } = await import('@/lib/panel-listings');
                const result = await duplicatePanelListing(listing.id);
                if (result.ok && result.item) {
                    setNotice(`Publicación duplicada: "${result.item.title}". Recargando...`);
                    await loadListings();
                } else {
                    alert(result.error ?? 'No se pudo duplicar la publicación');
                }
            },
        });

        if (needsRenewal) {
            secondaryActions.push({
                key: 'renew',
                label: 'Renovar',
                icon: <IconRefresh size={14} />,
                onSelect: () => void onRenewListing(listing),
            });
        }
        if (listing.status !== 'active') {
            secondaryActions.push({
                key: 'active',
                label: listing.status === 'sold' ? 'Reactivar' : 'Activar',
                icon: <IconCheck size={14} className="text-green-500" />,
                tone: 'primary',
                onSelect: () => void onChangeListingStatus(listing, 'active'),
            });
        }
        if (listing.status === 'active') {
            secondaryActions.push({
                key: 'paused',
                label: 'Pausar',
                icon: <IconPlayerPause size={14} />,
                onSelect: () => void onChangeListingStatus(listing, 'paused'),
            });
        }
        if (listing.status !== 'sold') {
            secondaryActions.push({
                key: 'sold',
                label: closedLabel,
                icon: <IconCheck size={14} />,
                onSelect: () => void onChangeListingStatus(listing, 'sold'),
            });
        }
        if (listing.status !== 'draft') {
            secondaryActions.push({
                key: 'draft',
                label: 'Mover a borrador',
                icon: <IconEyeOff size={14} />,
                onSelect: () => void onChangeListingStatus(listing, 'draft'),
            });
        }
        secondaryActions.push({
            key: 'delete',
            label: 'Eliminar',
            icon: <IconTrash size={14} />,
            tone: 'danger',
            onSelect: () => void onDeleteListing(listing),
        });

        const busyKey = statusBusyKey && statusBusyKey.startsWith(`${listing.id}:`)
            ? statusBusyKey.slice(listing.id.length + 1)
            : null;

        return {
            id: listing.id,
            href: listing.href || getFallbackHref(listing.section),
            title: listing.title,
            price: {
                amount: Number.isFinite(amount) ? amount : 0,
                caption: priceCaption,
            },
            variant,
            mode,
            accent: 'propiedades' as const,
            images: getListingImages(listing).map((src) => ({ src })),
            location: listing.location || 'Chile',
            metaTags: getListingTags(listing),
            status,
            statusLabel: badge.label,
            engagement: {
                views: listing.views,
                clicks: listing.clicks,
                saves: listing.favs,
                messages: listing.leads,
                conversionRate: listing.leads > 0 && listing.views > 0 ? (listing.leads / listing.views) * 100 : 0,
                listedSinceLabel: `${listing.days}d`,
            },
            secondaryActions,
            busyActionKey: busyKey,
            onBoost: () => {
                router.push(`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`);
            },
            shareOptions: {
                onOpenSharePanel: () => setShareListing(listing),
            },
        };
    };

    return (
        <div className="container-app panel-page py-4 lg:py-8">
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

            {!loading && filtered.length > 0 ? (
                <div
                    className={
                        viewMode === 'horizontal'
                            ? 'space-y-3'
                            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    }
                >
                    {filtered.map((listing) => (
                        <OwnerListingCard
                            key={listing.id}
                            {...toOwnerCardData(listing, viewMode === 'horizontal' ? 'list' : 'grid')}
                        />
                    ))}
                </div>
            ) : null}

            {/* Instagram Preview Modal */}
            {instagramPreviewOpen && previewListing && (
                <PanelScrollModal
                    open
                    title={isInstagramSuccess ? '¡Publicación exitosa! 🎉' : 'Vista previa de Instagram'}
                    onClose={() => setInstagramPreviewOpen(false)}
                    size="6xl"
                    height="tall"
                    zIndexClass="z-[120]"
                    overlayClassName="bg-black/70 backdrop-blur-sm"
                    bodyClassName="flex flex-col p-4 md:p-6"
                    footer={!isInstagramSuccess ? (
                        <div className="flex flex-col gap-3 sm:ml-auto sm:max-w-md sm:flex-row">
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
                    ) : undefined}
                >
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
                                                            borderColor: isSelected ? 'var(--fg)' : 'var(--border)',
                                                            background: isSelected ? 'var(--fg)' : 'var(--surface)',
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
                </PanelScrollModal>
            )}

            {shareListing ? (
                <ListingShareSheet
                    listing={shareListing}
                    onClose={() => setShareListing(null)}
                />
            ) : null}
        </div>
    );
}
