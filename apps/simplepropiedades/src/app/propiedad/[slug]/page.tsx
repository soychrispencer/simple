'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { IconClock, IconEye, IconHeart, IconMapPin, IconUser } from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { fetchPublicListing, type PublicListing } from '@/lib/public-listings';
import { PanelBlockHeader, PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui';

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

    const coverImage = item?.images[0] ?? null;

    return (
        <div className="container-app py-8">
            <PublicBreadcrumbs
                className="mb-6 flex items-center gap-1.5 text-sm"
                items={[
                    { label: 'Inicio', href: '/' },
                    { label: item?.sectionLabel ?? 'Propiedad', href: item?.section === 'rent' ? '/arriendos' : item?.section === 'project' ? '/proyectos' : '/ventas' },
                    { label: item?.title ?? 'Detalle' },
                ]}
            />

            {loading ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="h-[420px] rounded-[24px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    <div className="h-72 rounded-[24px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                </div>
            ) : !item ? (
                <PanelNotice tone="warning">La publicación no existe o ya no está activa.</PanelNotice>
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                        <div
                            className="overflow-hidden rounded-[24px] border"
                            style={{
                                borderColor: 'var(--border)',
                                background: coverImage
                                    ? `linear-gradient(to bottom, rgba(15,23,42,0.12), rgba(15,23,42,0.38)), url(${coverImage}) center / cover no-repeat`
                                    : 'var(--bg-muted)',
                            }}
                        >
                            <div className="aspect-[16/9] flex items-end p-6">
                                <div className="max-w-2xl">
                                    <PanelStatusBadge label={item.sectionLabel} tone={item.section === 'project' ? 'info' : item.section === 'rent' ? 'warning' : 'success'} size="sm" />
                                    <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">{item.title}</h1>
                                    <p className="mt-2 text-sm text-white/85">{item.location || 'Ubicación por confirmar'}</p>
                                </div>
                            </div>
                        </div>

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

                    <aside className="w-full flex-shrink-0 lg:w-80">
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
