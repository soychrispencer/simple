'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { IconClock, IconEye, IconHeart, IconMapPin, IconUser, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { fetchPublicListing, type PublicListing } from '@/lib/public-listings';
import { buildPropertyJsonLd, JsonLd } from '@/lib/schema';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';

export default function PropertyDetailPage() {
    const params = useParams<{ slug: string }>();
    const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState<PublicListing | null>(null);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        void (async () => {
            const nextItem = await fetchPublicListing(slug);
            setItem(nextItem);
            setLoading(false);
        })();
    }, [slug]);

    return (
        <div className="container-app py-8">
            {item && <JsonLd data={buildPropertyJsonLd(item)} />}
            <PublicBreadcrumbs
                className="mb-6 flex items-center gap-1.5 text-sm"
                items={[
                    { label: 'Inicio', href: '/' },
                    { label: item?.sectionLabel ?? 'Propiedad', href: item?.section === 'rent' ? '/arriendos' : item?.section === 'project' ? '/proyectos' : '/ventas' },
                    { label: item?.title ?? 'Detalle' },
                ]}
            />

            {loading ? null : !item ? (
                <PanelNotice tone="warning">La publicación no existe o ya no está activa.</PanelNotice>
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                        <ImageGallery images={item.images} title={item.title} sectionLabel={item.sectionLabel} section={item.section} />

                        <PanelCard size="lg">
                            <PanelBlockHeader title="Resumen" className="mb-4" />
                            <div className="flex flex-wrap gap-2">
                                {item.summary.map((entry) => (
                                    <span
                                        key={entry}
                                        className="rounded-full px-3 py-1 text-xs"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                    >
                                        {entry}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                <MetricCard icon={<IconMapPin size={14} />} label="Ubicación" value={item.location || 'No informada'} />
                                <MetricCard icon={<IconEye size={14} />} label="Visitas" value={item.views.toLocaleString('es-CL')} />
                                <MetricCard icon={<IconHeart size={14} />} label="Guardados" value={item.favs.toLocaleString('es-CL')} />
                                <MetricCard icon={<IconClock size={14} />} label="Actualizada" value={`Hace ${item.publishedAgo}`} />
                            </div>
                        </PanelCard>

                        <PanelCard size="lg">
                            <PanelBlockHeader title="Descripción" className="mb-3" />
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                {item.description || 'Esta publicación no incluye descripción adicional.'}
                            </p>
                        </PanelCard>
                    </div>

                    <aside className="w-full shrink-0 lg:w-80">
                        <div className="space-y-4 lg:sticky lg:top-[72px]">
                            <PanelCard size="lg">
                                <PanelBlockHeader title="Publicación" className="mb-4" />
                                <p className="text-3xl font-semibold" style={{ color: 'var(--fg)' }}>{item.price}</p>
                                <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <p className="flex items-center gap-2"><IconMapPin size={14} /> {item.location || 'Ubicación no informada'}</p>
                                    <p className="flex items-center gap-2"><IconClock size={14} /> Activa hace {item.days} días</p>
                                    <p className="flex items-center gap-2"><IconEye size={14} /> {item.views.toLocaleString('es-CL')} visualizaciones</p>
                                </div>
                            </PanelCard>

                            <PanelCard size="md">
                                <PanelBlockHeader title="Publicado por" className="mb-4" />
                                <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>
                                        <IconUser size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            {item.seller?.name ?? 'Cuenta SimplePropiedades'}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            Perfil público del anunciante
                                        </p>
                                    </div>
                                </div>
                                {item.seller?.profileHref ? (
                                    <Link href={item.seller.profileHref} className="mt-3 inline-flex text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                        Ver perfil público
                                    </Link>
                                ) : null}
                            </PanelCard>

                            <PublicListingContactCard
                                listingId={item.id}
                                listingTitle={item.title}
                                sourcePage={item.href}
                                seller={item.seller ? { email: item.seller.email, phone: item.seller.phone } : null}
                            />
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

function ImageGallery({ images, title, sectionLabel, section }: { images: string[]; title: string; sectionLabel: string; section: string }) {
    const [current, setCurrent] = useState(0);
    const touchStart = useRef<number | null>(null);
    const validImages = images.filter((img) => img && img.length > 0);
    const hasMultiple = validImages.length > 1;

    const prev = useCallback(() => {
        setCurrent((c) => (c > 0 ? c - 1 : validImages.length - 1));
    }, [validImages.length]);

    const next = useCallback(() => {
        setCurrent((c) => (c < validImages.length - 1 ? c + 1 : 0));
    }, [validImages.length]);

    const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart.current === null) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
        touchStart.current = null;
    };

    if (validImages.length === 0) {
        return (
            <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                <div className="aspect-16/9 flex items-end p-6">
                    <div className="max-w-2xl">
                        <PanelStatusBadge label={sectionLabel} tone={section === 'project' ? 'info' : section === 'rent' ? 'warning' : 'success'} size="sm" />
                        <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">{title}</h1>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[24px] border relative" style={{ borderColor: 'var(--border)' }}
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="aspect-16/9 relative">
                <img src={validImages[current]} alt={`${title} ${current + 1}`} className="w-full h-full object-cover" />

                {/* Overlay info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                    <PanelStatusBadge label={sectionLabel} tone={section === 'project' ? 'info' : section === 'rent' ? 'warning' : 'success'} size="sm" />
                    <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">{title}</h1>
                </div>

                {/* Navigation arrows */}
                {hasMultiple && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); prev(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
                            <IconChevronLeft size={20} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); next(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
                            <IconChevronRight size={20} />
                        </button>
                        {/* Counter badge */}
                        <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-black/50 text-white z-10">
                            {current + 1} / {validImages.length}
                        </span>
                    </>
                )}

                {/* Dot indicators */}
                {hasMultiple && validImages.length <= 12 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {validImages.map((_, idx) => (
                            <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                                className={`h-1.5 rounded-full transition-all ${idx === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl p-3" style={{ background: 'var(--bg-muted)' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                {props.icon}
                <span className="text-[11px] uppercase tracking-[0.12em]">{props.label}</span>
            </div>
            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>{props.value}</p>
        </div>
    );
}
