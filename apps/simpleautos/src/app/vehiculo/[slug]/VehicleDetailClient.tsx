'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { 
    IconClock, IconEye, IconHeart, IconMapPin, IconUser, 
    IconCalendar, IconGauge, IconManualGearbox, IconGasStation 
} from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { type PublicListing } from '@/lib/public-listings';
import { buildVehicleJsonLd, JsonLd } from '@/lib/schema';
import { PanelBlockHeader, PanelCard, PanelStatusBadge } from '@simple/ui';

interface VehicleDetailClientProps {
    item: PublicListing;
}

export default function VehicleDetailClient({ item }: VehicleDetailClientProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const images = item.images ?? [];
    const coverImage = images[activeImageIndex] ?? images[0] ?? null;

    return (
        <div className="container-app py-8">
            <JsonLd data={buildVehicleJsonLd(item)} />
            <PublicBreadcrumbs
                className="mb-6 flex items-center gap-1.5 text-sm"
                items={[
                    { label: 'Inicio', href: '/' },
                    { label: item.sectionLabel ?? 'Vehículo', href: item.section === 'rent' ? '/arriendos' : item.section === 'auction' ? '/subastas' : '/ventas' },
                    { label: item.title ?? 'Detalle' },
                ]}
            />

            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1 space-y-4">
                    {/* Gallery Section */}
                    <div className="space-y-3">
                        <div
                            className="relative overflow-hidden rounded-[32px] border transition-all duration-500 shadow-sm"
                            style={{
                                borderColor: 'var(--border)',
                                background: coverImage
                                    ? `linear-gradient(to bottom, rgba(15,23,42,0.05), rgba(15,23,42,0.4)), url(${coverImage}) center / cover no-repeat`
                                    : 'var(--bg-muted)',
                            }}
                        >
                            <div className="aspect-16/9 flex items-end p-6 md:p-10">
                                <div className="max-w-2xl">
                                    <div className="flex flex-wrap gap-2 items-center mb-3">
                                        <PanelStatusBadge label={item.sectionLabel} tone={item.section === 'auction' ? 'info' : item.section === 'rent' ? 'warning' : 'success'} size="sm" />
                                        {item.summary.filter(s => s.toLowerCase().includes('dueño') || s.toLowerCase().includes('garantía')).map(s => (
                                            <span key={s} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-white/20 text-white backdrop-blur-md border border-white/30">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                    <h1 className="text-3xl font-bold text-white md:text-5xl leading-tight drop-shadow-lg">{item.title}</h1>
                                    <p className="mt-3 text-sm md:text-base text-white/90 flex items-center gap-2 drop-shadow-md">
                                        <IconMapPin size={16} />
                                        {item.location || 'Ubicación por confirmar'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
                                {images.map((img, idx) => (
                                    <button
                                        key={`${img}-${idx}`}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                                            activeImageIndex === idx ? 'border-[#FF3600] scale-95 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={img} alt={`${item.title} - ${idx + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Specs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SpecItem
                            icon={<IconCalendar size={20} />}
                            label="Año"
                            value={item.summary.find(s => /^\d{4}$/.test(s)) || 'N/A'}
                        />
                        <SpecItem
                            icon={<IconGauge size={20} />}
                            label="Kilometraje"
                            value={item.summary.find(s => s.toLowerCase().includes('km')) || 'N/A'}
                        />
                        <SpecItem
                            icon={<IconManualGearbox size={20} />}
                            label="Transmisión"
                            value={item.summary.find(s => ['Manual', 'Automática', 'CVT'].includes(s)) || 'Por definir'}
                        />
                        <SpecItem
                            icon={<IconGasStation size={20} />}
                            label="Combustible"
                            value={item.summary.find(s => ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'].includes(s)) || 'Por definir'}
                        />
                    </div>

                    <PanelCard size="lg">
                        <PanelBlockHeader title="Aspectos destacados" className="mb-4" />
                        <div className="flex flex-wrap gap-2">
                            {item.summary.map((entry) => (
                                <span
                                    key={entry}
                                    className="rounded-xl px-4 py-2 text-xs font-medium border transition-colors hover:bg-(--bg-muted)"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)', borderColor: 'var(--border)' }}
                                >
                                    {entry}
                                </span>
                            ))}
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                            <MetricCard icon={<IconMapPin size={16} />} label="Ubicación" value={item.location || 'No informada'} />
                            <MetricCard icon={<IconEye size={16} />} label="Visitas" value={item.views.toLocaleString('es-CL')} />
                            <MetricCard icon={<IconHeart size={16} />} label="Guardados" value={item.favs.toLocaleString('es-CL')} />
                            <MetricCard icon={<IconClock size={16} />} label="Publicado" value={item.publishedAgo} />
                        </div>
                    </PanelCard>

                    <PanelCard size="lg">
                        <PanelBlockHeader title="Descripción del vendedor" className="mb-3" />
                        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--fg-secondary)' }}>
                            {item.description || 'Esta publicación no incluye descripción adicional.'}
                        </div>
                    </PanelCard>
                </div>

                <aside className="w-full shrink-0 lg:w-80">
                    <div className="space-y-4 lg:sticky lg:top-[72px]">
                        <PanelCard size="lg" className="border-t-4 border-t-[#FF3600] shadow-sm">
                            <PanelBlockHeader title="Valor comercial" className="mb-4" />
                            <p className="text-4xl font-black tracking-tight" style={{ color: 'var(--fg)' }}>{item.price}</p>
                            <div className="mt-5 space-y-3.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <p className="flex items-center gap-3"><IconMapPin size={18} className="text-(--fg-muted)" /> {item.location || 'Ubicación no informada'}</p>
                                <p className="flex items-center gap-3"><IconClock size={18} className="text-(--fg-muted)" /> Activa hace {item.days} días</p>
                                <p className="flex items-center gap-3"><IconEye size={18} className="text-(--fg-muted)" /> {item.views.toLocaleString('es-CL')} visualizaciones</p>
                            </div>
                        </PanelCard>

                        <PanelCard size="md">
                            <PanelBlockHeader title="Vendedor" className="mb-4" />
                            <div className="flex items-center gap-3 rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                                    <IconUser size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>
                                        {item.seller?.name ?? 'Cuenta SimpleAutos'}
                                    </p>
                                    <p className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: '#059669' }}>
                                        Verificado ✓
                                    </p>
                                </div>
                            </div>
                            {item.seller?.profileHref && (
                                <Link href={item.seller.profileHref} className="mt-4 flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold border transition-all hover:bg-(--fg) hover:text-white" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                                    Ver perfil completo
                                </Link>
                            )}
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
        </div>
    );
}

function SpecItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-[24px] border p-4 text-center transition-all hover:shadow-md hover:-translate-y-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <span className="mb-2 text-[#FF3600] scale-110">{icon}</span>
            <span className="text-[10px] uppercase font-black tracking-[0.15em] text-(--fg-muted)">{label}</span>
            <p className="mt-1.5 text-sm font-bold truncate w-full" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl p-4 transition-colors hover:bg-(--bg-subtle)" style={{ background: 'var(--bg-muted)' }}>
            <div className="flex items-center gap-2.5" style={{ color: 'var(--fg-muted)' }}>
                {props.icon}
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">{props.label}</span>
            </div>
            <p className="mt-2.5 text-sm font-bold" style={{ color: 'var(--fg)' }}>{props.value}</p>
        </div>
    );
}
