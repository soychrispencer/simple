'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconBrandWhatsapp,
    IconCopy,
    IconEdit,
    IconEye,
    IconGridDots,
    IconHeart,
    IconHome2,
    IconList,
    IconMapPin,
    IconPlus,
    IconShare3,
    IconTrendingUp,
    IconX,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import ModernSelect from '@/components/ui/modern-select';
import { useAuth } from '@/context/auth-context';
import { publishListingToInstagram as publishInstagramPost } from '@/lib/instagram';
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

export default function PublicacionesPage() {
    const { user, authLoading, requireAuth } = useAuth();
    const [listings, setListings] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [notice, setNotice] = useState<string | null>(null);
    const [statusBusyKey, setStatusBusyKey] = useState<string | null>(null);
    const [portalBusyKey, setPortalBusyKey] = useState<string | null>(null);
    const [instagramBusyKey, setInstagramBusyKey] = useState<string | null>(null);

    // Instagram Preview States
    const [instagramPreviewOpen, setInstagramPreviewOpen] = useState(false);
    const [previewListing, setPreviewListing] = useState<PanelListing | null>(null);
    const [previewCaption, setPreviewCaption] = useState('');
    const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [shareMenuOpenId, setShareMenuOpenId] = useState<string | null>(null);

    const closeMenus = () => {
        setActionMenuOpenId(null);
        setShareMenuOpenId(null);
    };

    const loadListings = async () => {
        setLoading(true);
        const result = await fetchMyPanelListings();
        if (result.unauthorized) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión.');
            setListings([]);
            setLoading(false);
            requireAuth(() => void loadListings());
            return;
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
        } else if (listing.section === 'project') {
            setNotice('Publicación cerrada.');
        } else {
            setNotice(`Aviso marcado como ${getClosedLabel(listing.section).toLowerCase()}.`);
        }
        void loadListings();
    };

    const buildPublicUrl = (listing: PanelListing): string => {
        if (typeof window === 'undefined') return listing.href || getFallbackHref(listing.section);
        if (!listing.href) return `${window.location.origin}${getFallbackHref(listing.section)}`;
        if (/^https?:\/\//i.test(listing.href)) return listing.href;
        return `${window.location.origin}${listing.href}`;
    };

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

    const shareOnInstagram = (listing: PanelListing) => {
        closeMenus();
        if (!user) {
            setNotice('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
            return;
        }

        const defaultCaption = `🏠 ${listing.title}\n💰 ${listing.price || 'Consultar precio'}\n📍 ${listing.location || 'Chile'}\n\n${listing.description || ''}\n\n¡Consulta sin compromiso en SimplePropiedades, te respondemos de inmediato! 📲\n\n🔗 Ver más: https://simplepropiedades.cl/propiedad/${listing.id}\n\n#SimplePropiedades #PropiedadesChile #Inmuebles #VentaPropiedades`;

        setPreviewListing(listing);
        setPreviewCaption(defaultCaption);
        setInstagramPreviewOpen(true);
    };

    const handleConfirmInstagramPublish = async () => {
        if (!previewListing) return;

        setIsPublishingInstagram(true);
        const key = `${previewListing.id}:instagram`;
        setInstagramBusyKey(key);

        try {
            const result = await publishInstagramPost(previewListing.id, previewCaption);
            if (result.ok && result.publication) {
                setNotice('Publicado en Instagram correctamente.');
                setInstagramPreviewOpen(false);
                if (result.publication.instagramPermalink) {
                    window.open(result.publication.instagramPermalink, '_blank', 'noopener,noreferrer');
                }
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
            {label}
        </button>
    );

    const renderActionMenu = (listing: PanelListing) => {
        const needsRenewal =
            listing.publicationLifecycle?.state === 'review_required' ||
            listing.publicationLifecycle?.state === 'review_expired';
        const menuOpen = actionMenuOpenId === listing.id;

        return (
            <div className="relative">
                <PanelButton
                    variant="secondary"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                        setShareMenuOpenId(null);
                        setActionMenuOpenId((current) => (current === listing.id ? null : listing.id));
                    }}
                >
                    Acción
                </PanelButton>
                {menuOpen ? (
                    <div
                        className="absolute right-0 mt-2 w-64 rounded-xl border p-2 z-20"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                    >
                        {needsRenewal
                            ? renderMenuItem(
                                  'Renovar',
                                  () => {
                                      closeMenus();
                                      void onRenewListing(listing);
                                  },
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
                                  statusBusyKey === `${listing.id}:paused`,
                                  needsRenewal ? 'mt-1' : ''
                              )
                            : null}
                        {listing.status !== 'sold'
                            ? renderMenuItem(
                                  getClosedActionLabel(listing.section),
                                  () => {
                                      closeMenus();
                                      void onChangeListingStatus(listing, 'sold');
                                  },
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
                                  statusBusyKey === `${listing.id}:draft`,
                                  'mt-1'
                              )
                            : null}
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
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                        setActionMenuOpenId(null);
                        setShareMenuOpenId((current) => (current === listing.id ? null : listing.id));
                    }}
                >
                    <IconShare3 size={11} /> Compartir
                </PanelButton>
                {menuOpen ? (
                    <div
                        className="absolute right-0 mt-2 w-72 rounded-xl border p-2 z-20"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                    >
                        {renderMenuItem('Link', () => {
                            void copyListingLink(listing);
                        })}
                        {renderMenuItem('WhatsApp', () => shareOnWhatsapp(listing), false, 'mt-1')}
                        {renderMenuItem(instagramBusyKey === `${listing.id}:instagram` ? 'Instagram publicando...' : 'Instagram', () => {
                            void shareOnInstagram(listing);
                        }, instagramBusyKey === `${listing.id}:instagram`, 'mt-1')}
                        {integrations.length > 0 ? (
                            <>
                                <div className="mx-3 my-2 border-t" style={{ borderColor: 'var(--border)' }} />
                                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                                    Integraciones
                                </p>
                                {integrations.map((integration) => {
                                    const busy = portalBusyKey === `${listing.id}:${integration.portal}`;
                                    return (
                                        <button
                                            key={integration.portal}
                                            type="button"
                                            className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                            style={{ color: 'var(--fg)' }}
                                            onClick={() => {
                                                void onPublishPortal(listing, integration.portal);
                                            }}
                                            disabled={busy}
                                        >
                                            <span>{integration.label}</span>
                                            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                                {busy ? 'Publicando...' : statusText(integration.status)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </>
                        ) : null}
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
                            { key: 'horizontal', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista lista' },
                            { key: 'vertical', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista tarjetas' },
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
                            { key: 'horizontal', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista lista' },
                            { key: 'vertical', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista tarjetas' },
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
                        const coverImage = getListingCoverImage(listing);
                        return (
                            <article key={listing.id} className="rounded-xl p-4 flex flex-col sm:flex-row gap-4" style={{ border: '1px solid var(--border)' }}>
                                <div className="w-full sm:w-28 h-20 sm:h-auto rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }}>
                                    {coverImage ? (
                                        <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <IconHome2 size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div>
                                            <h3 className="type-listing-title" style={{ color: 'var(--fg)' }}>{listing.title}</h3>
                                            <p className="type-listing-price mt-0.5" style={{ color: 'var(--fg)' }}>{listing.price}</p>
                                            {listing.location ? <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}><IconMapPin size={11} />{listing.location}</p> : null}
                                        </div>
                                        <PanelStatusBadge label={badge.label} tone={badge.tone} size="sm" className="shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        <span className="flex items-center gap-1"><IconEye size={11} />{listing.views}</span>
                                        <span className="flex items-center gap-1"><IconHeart size={11} />{listing.favs}</span>
                                        <span className="flex items-center gap-1"><IconTrendingUp size={11} />{listing.leads}</span>
                                        <span>{listing.days}d publicada</span>
                                    </div>
                                    {lifecycleHint ? <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{lifecycleHint}</p> : null}
                                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 mt-3">
                                        <Link href={listing.href || getFallbackHref(listing.section)} className={getPanelButtonClassName({ size: 'sm', className: 'h-8 w-full px-3 text-xs sm:w-auto' })} style={getPanelButtonStyle('secondary')}><IconEye size={11} /> Ver</Link>
                                        <Link href={`/panel/publicar?edit=${encodeURIComponent(listing.id)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-8 w-full px-3 text-xs sm:w-auto' })} style={getPanelButtonStyle('secondary')}><IconEdit size={11} /> Editar</Link>
                                        <div className="col-span-2 sm:col-span-1">{renderActionMenu(listing)}</div>
                                        <Link href={`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-8 w-full px-3 text-xs sm:w-auto' })} style={getPanelButtonStyle('primary')}><IconTrendingUp size={11} /> Boost</Link>
                                        <div className="col-span-2 sm:col-span-1">{renderShareMenu(listing)}</div>
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
                        const coverImage = getListingCoverImage(listing);
                        return (
                            <article key={listing.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                                <div className="aspect-4/3 flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }}>
                                    {coverImage ? (
                                        <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <IconHome2 size={26} />
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-1"><h3 className="type-listing-title line-clamp-1">{listing.title}</h3><PanelStatusBadge label={badge.label} tone={badge.tone} size="sm" className="shrink-0" /></div>
                                    <p className="type-listing-price mb-1">{listing.price}</p>
                                    {listing.location ? <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}><IconMapPin size={11} />{listing.location}</p> : null}
                                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}><span className="flex items-center gap-1"><IconEye size={11} />{listing.views}</span><span className="flex items-center gap-1"><IconHeart size={11} />{listing.favs}</span><span className="flex items-center gap-1"><IconTrendingUp size={11} />{listing.leads}</span></div>
                                    {lifecycleHint ? <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{lifecycleHint}</p> : null}
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <Link href={listing.href || getFallbackHref(listing.section)} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 px-3 text-xs' })} style={getPanelButtonStyle('secondary')}><IconEye size={11} /> Ver</Link>
                                        <Link href={`/panel/publicar?edit=${encodeURIComponent(listing.id)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 px-3 text-xs' })} style={getPanelButtonStyle('secondary')}><IconEdit size={11} /> Editar</Link>
                                        {renderActionMenu(listing)}
                                        <Link href={`/panel/publicidad?tab=boost&listingId=${encodeURIComponent(listing.id)}&section=${encodeURIComponent(listing.section)}`} className={getPanelButtonClassName({ size: 'sm', className: 'h-7 px-3 text-xs' })} style={getPanelButtonStyle('primary')}><IconTrendingUp size={11} /> Boost</Link>
                                        {renderShareMenu(listing)}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : null}

            {/* Instagram Preview Modal */}
            {instagramPreviewOpen && previewListing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div 
                        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                Vista previa de Instagram
                            </h3>
                            <button 
                                onClick={() => setInstagramPreviewOpen(false)}
                                className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <div className="mb-4 aspect-square w-full overflow-hidden rounded-xl bg-black/5">
                            {getListingCoverImage(previewListing) ? (
                                <div className="relative h-full w-full">
                                    <img 
                                        src={getListingCoverImage(previewListing)!} 
                                        alt="Vista previa" 
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--fg-faint)' }}>
                                    <IconHome2 size={48} />
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label 
                                className="mb-2 block text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                Pie de foto (Editable)
                            </label>
                            <textarea
                                value={previewCaption}
                                onChange={(e) => setPreviewCaption(e.target.value)}
                                className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ 
                                    background: 'var(--surface-sunken)', 
                                    borderColor: 'var(--border)',
                                    color: 'var(--fg)',
                                    minHeight: '160px'
                                }}
                                placeholder="Escribe el pie de foto..."
                            />
                        </div>

                        <div className="flex gap-3">
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
                                disabled={isPublishingInstagram}
                            >
                                {isPublishingInstagram ? 'Publicando...' : 'Publicar ahora'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
