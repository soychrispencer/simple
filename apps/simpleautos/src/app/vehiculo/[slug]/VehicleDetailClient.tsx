'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, type ReactNode } from 'react';
import { 
    IconClock, IconEye, IconMapPin, IconUser, IconBookmark, IconBookmarkFilled,
    IconCalendar, IconGauge, IconManualGearbox, IconGasStation, IconShare3,
    IconChevronLeft, IconChevronRight, IconPhoto
} from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { type PublicListing } from '@/lib/public-listings';
import { buildVehicleJsonLd, JsonLd } from '@/lib/schema';
import { PanelBlockHeader, PanelCard, PanelStatusBadge } from '@simple/ui';

// Helper para formatear precio chileno
function formatPrice(price: string): string {
    return price.replace(/\$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/^/, '$');
}

interface VehicleDetailClientProps {
    item: PublicListing;
}

export default function VehicleDetailClient({ item }: VehicleDetailClientProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isSaved, setIsSaved] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem(`saved-listing-${item.id}`);
        return saved === 'true';
    });
    const [showCopied, setShowCopied] = useState(false);
    
    const images = item.images ?? [];
    const coverImage = images[activeImageIndex] ?? images[0] ?? null;

    const handleSave = useCallback(() => {
        setIsSaved((s) => {
            const newState = !s;
            if (typeof window !== 'undefined') {
                localStorage.setItem(`saved-listing-${item.id}`, String(newState));
            }
            return newState;
        });
    }, [item.id]);

    const handleNextImage = useCallback(() => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrevImage = useCallback(() => {
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    const handleShare = useCallback(async () => {
        const url = typeof window === 'undefined' ? item.href : `${window.location.origin}${item.href}`;
        
        // Try Web Share API first (mobile native sharing)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `Mira este ${item.title} en SimpleAutos`,
                    url,
                });
                return;
            } catch {
                // User cancelled or share failed, fall through to clipboard
            }
        }
        
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(url);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch {
            window.prompt('Copia este enlace:', url);
        }
    }, [item.href, item.title]);

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
                {/* Main Content - Full width on mobile, left side on desktop */}
                <div className="min-w-0 flex-1 space-y-4">
                    {/* Gallery Section */}
                    <div className="space-y-3">
                        {/* Hero Image */}
                        <div
                            className="relative overflow-hidden rounded-[32px] border transition-all duration-500 shadow-sm"
                            style={{
                                borderColor: 'var(--border)',
                                background: coverImage ? 'var(--bg-muted)' : 'var(--surface)',
                            }}
                        >
                            {coverImage ? (
                                <div className="relative aspect-[16/9]">
                                    <Image
                                        src={coverImage}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                    {/* Desktop overlay gradient */}
                                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                    
                                    {/* Badge - top left (mobile & desktop) */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <PanelStatusBadge label={item.sectionLabel} tone={item.section === 'auction' ? 'info' : item.section === 'rent' ? 'warning' : 'success'} variant="solid" size="sm" className="shadow-sm" />
                                    </div>
                                    
                                    {/* Action buttons top right */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                        <button
                                            onClick={handleSave}
                                            className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                            aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
                                        >
                                            {isSaved ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={handleShare}
                                                className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                                aria-label="Compartir"
                                            >
                                                <IconShare3 size={20} />
                                            </button>
                                            {showCopied && (
                                                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[10px] font-medium rounded-md whitespace-nowrap backdrop-blur-sm z-20">
                                                    Copiado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Carousel arrows - desktop only, subtle on mobile */}
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={handlePrevImage}
                                                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
                                                aria-label="Imagen anterior"
                                            >
                                                <IconChevronLeft size={20} />
                                            </button>
                                            <button
                                                onClick={handleNextImage}
                                                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
                                                aria-label="Siguiente imagen"
                                            >
                                                <IconChevronRight size={20} />
                                            </button>
                                        </>
                                    )}

                                    {/* Image counter - bottom right corner (mobile only) */}
                                    {images.length > 1 && (
                                        <div className="md:hidden absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium z-10">
                                            {activeImageIndex + 1} / {images.length}
                                        </div>
                                    )}

                                    {/* Desktop overlay content */}
                                    <div className="hidden md:block absolute bottom-0 left-0 right-0 p-8 lg:p-10">
                                        <div className="flex flex-wrap gap-2 items-center mb-3">
                                            {item.summary.filter(s => s.toLowerCase().includes('dueño') || s.toLowerCase().includes('garantía')).map(s => (
                                                <span key={s} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/90 backdrop-blur-sm border border-white/20">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                        <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight line-clamp-2">{item.title}</h1>
                                        <p className="mt-3 text-sm lg:text-base text-white/90 flex items-center gap-2">
                                            <IconMapPin size={16} />
                                            {item.location || 'Ubicación por confirmar'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-[16/9] flex flex-col items-center justify-center bg-[var(--bg-muted)] gap-3">
                                    <IconPhoto size={48} style={{ color: 'var(--fg-muted)' }} />
                                    <span className="text-[var(--fg-muted)] text-sm">Sin imagen disponible</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails - Directly below image (Baymard best practice) */}
                        {images.length > 1 && (
                            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1 -mt-1">
                                {images.map((img, idx) => (
                                    <button
                                        key={`${img}-${idx}`}
                                        onClick={() => setActiveImageIndex(idx)}
                                        aria-label={`Ver imagen ${idx + 1} de ${images.length}`}
                                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                                            activeImageIndex === idx ? 'border-[var(--accent)] shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <Image src={img} alt={`${item.title} - ${idx + 1}`} width={96} height={64} className="h-full w-full object-cover" loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Mobile title section - below thumbnails */}
                        <div className="md:hidden px-1 pt-4 text-center">
                            <div className="flex flex-wrap gap-2 items-center justify-center mb-2">
                                {item.summary.filter(s => s.toLowerCase().includes('dueño') || s.toLowerCase().includes('garantía')).map(s => (
                                    <span key={s} className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-[var(--bg-subtle)] text-[var(--fg-secondary)] border border-[var(--border)]">
                                        {s}
                                    </span>
                                ))}
                            </div>
                            <h1 className="text-xl font-bold leading-tight px-2" style={{ color: 'var(--fg)' }}>{item.title}</h1>
                            <p className="mt-2 text-sm flex items-center justify-center gap-1.5" style={{ color: 'var(--fg-secondary)' }}>
                                <IconMapPin size={14} />
                                {item.location || 'Ubicación por confirmar'}
                            </p>
                        </div>

                        {/* Mobile Price - Card similar a desktop */}
                        <div className="md:hidden mb-4">
                            <div className="rounded-[24px] border border-t-4 shadow-sm p-5 text-center" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)', background: 'var(--surface)' }}>
                                <p className="text-xs uppercase font-black tracking-widest mb-2" style={{ color: 'var(--fg-muted)' }}>Precio</p>
                                <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--fg)' }}>
                                    {formatPrice(item.price)}
                                </p>
                                <div className="mt-4 space-y-2.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <p className="flex items-center justify-center gap-2"><IconClock size={16} style={{ color: 'var(--fg-muted)' }} /> Publicado {item.publishedAgo}</p>
                                    <p className="flex items-center justify-center gap-2"><IconEye size={16} style={{ color: 'var(--fg-muted)' }} /> {item.views.toLocaleString('es-CL')} vistas</p>
                                </div>
                            </div>
                        </div>
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
                        <PanelBlockHeader title="Descripción del vendedor" className="mb-3" />
                        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--fg-secondary)' }}>
                            {item.description || 'Esta publicación no incluye descripción adicional.'}
                        </div>
                    </PanelCard>

                    {/* Mobile Seller & Contact - At the end in mobile */}
                    <div className="md:hidden space-y-4">
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
                                    {item.seller && (
                                        <p className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--color-success)' }}>
                                            En SimpleAutos
                                        </p>
                                    )}
                                </div>
                            </div>
                            {item.seller?.profileHref && (
                                <Link href={item.seller.profileHref} className="mt-4 flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold border transition-all hover:bg-[var(--fg)] hover:text-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
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
                </div>

                {/* Desktop Sidebar - Right side only */}
                <aside className="hidden lg:block w-full shrink-0 lg:w-80">
                    <div className="space-y-4 lg:sticky lg:top-20">
                        <div className="rounded-[24px] border border-t-4 shadow-sm p-5 md:p-6" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)', background: 'var(--surface)' }}>
                            <PanelBlockHeader title="Precio" className="mb-4" />
                            <p className="text-4xl font-black tracking-tight" style={{ color: 'var(--fg)' }}>
                                {formatPrice(item.price)}
                            </p>
                            <div className="mt-5 space-y-3.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <p className="flex items-center gap-3"><IconClock size={16} style={{ color: 'var(--fg-muted)' }} /> Publicado {item.publishedAgo}</p>
                                <p className="flex items-center gap-3"><IconEye size={16} style={{ color: 'var(--fg-muted)' }} /> {item.views.toLocaleString('es-CL')} visualizaciones</p>
                            </div>
                        </div>

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
                                    {item.seller && (
                                        <p className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--color-success)' }}>
                                            En SimpleAutos
                                        </p>
                                    )}
                                </div>
                            </div>
                            {item.seller?.profileHref && (
                                <Link href={item.seller.profileHref} className="mt-4 flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold border transition-all hover:bg-[var(--fg)] hover:text-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
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
        <div className="flex flex-col items-center justify-center rounded-[24px] border p-4 text-center transition-all" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <span className="mb-2 text-[var(--accent)]">{icon}</span>
            <span className="text-[10px] uppercase font-black tracking-[0.15em] text-[var(--fg-muted)]">{label}</span>
            <p className="mt-1.5 text-sm font-bold truncate w-full" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

