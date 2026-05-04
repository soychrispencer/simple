'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@/lib/saved-listings';
import { 
    IconHeart, 
    IconHeartFilled,
    IconShare, 
    IconBookmark, 
    IconBookmarkFilled,
    IconDotsVertical,
    IconCar,
    IconGauge,
    IconGasStation,
    IconManualGearbox,
    IconMapPin,
    IconVolume,
    IconVolumeOff,
    IconPlayerPause,
    IconPlayerPlay,
    IconCrown,
    IconDiscount,
    IconCheck
} from '@tabler/icons-react';

// Helper para formatear precio en peso chileno (CLP)
function formatPriceCLP(price: string): string {
    // Extraer solo los números del string
    const numericValue = price.replace(/[^0-9]/g, '');
    const num = parseInt(numericValue, 10);
    if (isNaN(num)) return price;
    // Formatear con separador de miles (punto para CLP)
    return '$' + num.toLocaleString('es-CL');
}

type CardVariant = 'sale' | 'rent' | 'auction';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type VehicleListingCardData = {
    id: string;
    href: string;
    title: string;
    price: string;
    priceOriginal?: string;
    discountLabel?: string;
    priceLabel?: string;
    subtitle?: string;
    meta: string[];
    location: string;
    sellerName: string;
    sellerMeta?: string;
    sellerAvatarUrl?: string;
    sellerProfileHref?: string;
    sellerIsFeatured?: boolean;
    badge: string;
    variant?: CardVariant;
    images?: string[];
    videoUrl?: string;
    videoThumbnail?: string;
    vehicleType?: string;
    km?: string;
    fuelType?: string;
    transmission?: string;
    auctionBids?: number;
    auctionTime?: string;
    live?: boolean;
    listedSince?: string;
    createdAt?: string;
    engagement?: CardEngagement;
    ctaLabel?: string;
    isSponsored?: boolean;
    likeCount?: number;
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
};

type Props = {
    data: VehicleListingCardData;
    mode: 'grid' | 'list';
};

// Componente de partículas de corazón
function HeartParticles({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
    const [particles] = useState(() => 
        Array.from({ length: 8 }, (_, i) => ({
            id: i,
            angle: (i / 8) * Math.PI * 2,
            distance: 60 + Math.random() * 40,
        }))
    );

    useEffect(() => {
        const timer = setTimeout(onComplete, 800);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="absolute pointer-events-none z-30" style={{ left: x, top: y }}>
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-4 h-4"
                    style={{
                        animation: `heartParticle 0.8s ease-out forwards`,
                        transform: `rotate(${p.angle}rad)`,
                        '--distance': `${p.distance}px`,
                    } as React.CSSProperties}
                >
                    <IconHeartFilled size={16} className="text-red-500" />
                </div>
            ))}
        </div>
    );
}

// Formato de tiempo relativo
function formatTimeAgo(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function extractVehicleInfo(meta: string[], title: string): {
    type: string;
    km: string;
    fuel: string;
    transmission: string;
} {
    const allText = [...meta, title].join(' ').toLowerCase();
    
    // Detectar tipo
    const typeMatch = allText.match(/(sedán|sedan|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|coupe|moto|cuatrimoto|convertible)/);
    const type = typeMatch ? typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1) : 'Auto';
    
    // Detectar km
    const kmMatch = allText.match(/(\d+[\d.]*)\s*(km|kilometros|kilómetros)/);
    const km = kmMatch ? `${kmMatch[1]} km` : 'N/A';
    
    // Detectar combustible
    const fuel = allText.includes('bencina') || allText.includes('gasolina') ? 'Bencina' :
                 allText.includes('diesel') || allText.includes('diésel') ? 'Diesel' :
                 allText.includes('hibrido') || allText.includes('híbrido') ? 'Híbrido' :
                 allText.includes('electrico') || allText.includes('eléctrico') ? 'Eléctrico' : 'N/A';
    
    // Detectar transmisión
    const transmission = allText.includes('automatico') || allText.includes('automático') ? 'Auto' :
                         allText.includes('cvt') ? 'CVT' :
                         allText.includes('secuencial') ? 'Secuencial' : 'Manual';
    
    return { type, km, fuel, transmission };
}

export default function VehicleListingCard({ data, mode }: Props) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [favorite, setFavorite] = useState(false);
    const [liked, setLiked] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [showParticles, setShowParticles] = useState<{ x: number; y: number } | null>(null);
    const [isVideoPaused, setIsVideoPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isInViewport, setIsInViewport] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef<number>(0);
    const lastTapTime = useRef<number>(0);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Lazy load con IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsInViewport(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    // Pausar video cuando sale del viewport
    useEffect(() => {
        if (videoRef.current) {
            if (!isInViewport && !isVideoPaused) {
                videoRef.current.pause();
            } else if (isInViewport && !isVideoPaused) {
                videoRef.current.play();
            }
        }
    }, [isInViewport, isVideoPaused]);

    const media: Array<{ type: 'video'; url: string; thumbnail?: string } | { type: 'image'; url: string; thumbnail?: string }> = data.videoUrl 
        ? [{ type: 'video' as const, url: data.videoUrl, thumbnail: data.videoThumbnail }, ...(data.images || []).map(img => ({ type: 'image' as const, url: img }))]
        : (data.images || []).map(img => ({ type: 'image' as const, url: img }));

    useEffect(() => {
        setFavorite(isListingSaved(data.id));
        return subscribeSavedListings(() => setFavorite(isListingSaved(data.id)));
    }, [data.id]);

    const vehicleInfo = extractVehicleInfo(data.meta, data.title);
    const timeAgo = formatTimeAgo(data.createdAt);
    const displayLikeCount = (data.likeCount || 0) + (liked ? 1 : 0);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!requireAuth()) return;
        const result = await toggleSavedListing({
            id: data.id,
            href: data.href,
            title: data.title,
            price: data.price,
            location: data.location,
            subtitle: data.subtitle,
            meta: data.meta,
            badge: data.badge,
            sellerName: data.sellerName,
            sellerMeta: data.sellerMeta,
        });
        if (result.ok) setFavorite(result.saved);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${data.href}`;
        try {
            await navigator.clipboard.writeText(url);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch {
            // Fallback: intentar usar la Web Share API
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: data.title,
                        text: `Mira este vehículo: ${data.title} - ${data.price}`,
                        url: url,
                    });
                } catch {
                    // User cancelled or error
                }
            }
        }
    };

    const handleShareWhatsApp = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${data.href}`;
        const text = `Mira este vehículo: ${data.title} - ${data.price}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
        setShowMoreMenu(false);
    };

    const handleShareInstagram = async (e: React.MouseEvent) => {
        e.stopPropagation();
        // Instagram no tiene API directa, copiamos al portapapeles
        const url = `${window.location.origin}${data.href}`;
        try {
            await navigator.clipboard.writeText(url);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch {}
        setShowMoreMenu(false);
    };

    const handleShareFacebook = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${data.href}`;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        setShowMoreMenu(false);
    };

    const handleMoreClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMoreMenu((prev) => !prev);
    };

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMoreMenu(false);
        alert('Función de reportar próximamente disponible');
    };

    const handleHide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMoreMenu(false);
        alert('Función de ocultar próximamente disponible');
    };

    // Cerrar menú al hacer click fuera
    useEffect(() => {
        if (!showMoreMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoreMenu]);

    // Manejar tap y doble tap
    const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        const timeDiff = now - lastTapTime.current;
        
        // Obtener coordenadas
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        // Doble tap = like
        if (timeDiff < 300) {
            setLiked(true);
            const rect = cardRef.current?.getBoundingClientRect();
            if (rect) {
                setShowParticles({
                    x: clientX - rect.left,
                    y: clientY - rect.top
                });
            }
            setTimeout(() => setShowParticles(null), 800);
        } else {
            // Tap simple = pause/play video
            if (currentMedia?.type === 'video' && videoRef.current) {
                if (isVideoPaused) {
                    videoRef.current.play();
                } else {
                    videoRef.current.pause();
                }
                setIsVideoPaused(!isVideoPaused);
            }
        }
        lastTapTime.current = now;
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY.current - touchEndY;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentMediaIndex < media.length - 1) {
                setCurrentMediaIndex(prev => prev + 1);
            } else if (diff < 0 && currentMediaIndex > 0) {
                setCurrentMediaIndex(prev => prev - 1);
            }
        }
    };

    // Swipe horizontal con wheel (desktop)
    const handleWheel = (e: React.WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
            e.preventDefault();
            if (e.deltaX > 0 && currentMediaIndex < media.length - 1) {
                setCurrentMediaIndex(prev => prev + 1);
            } else if (e.deltaX < 0 && currentMediaIndex > 0) {
                setCurrentMediaIndex(prev => prev - 1);
            }
        }
    };

    const currentMedia = media[currentMediaIndex];

    if (media.length === 0) return null;

    return (
        <>
        <style>{`
            @keyframes heartParticle {
                0% { transform: rotate(var(--angle)) translateX(0) scale(1); opacity: 1; }
                100% { transform: rotate(var(--angle)) translateX(var(--distance)) scale(0); opacity: 0; }
            }
        `}</style>
        <div 
            ref={cardRef}
            className="relative w-full max-w-[400px] mx-auto rounded-2xl overflow-hidden bg-black select-none"
            style={{ aspectRatio: '9/16' }}
            onClick={handleTap}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
        >
            {/* Media Content */}
            <div className="absolute inset-0">
                {!imageLoaded && 'thumbnail' in currentMedia && currentMedia.thumbnail && (
                    <img
                        src={currentMedia.thumbnail}
                        alt=""
                        className="w-full h-full object-cover blur-sm"
                    />
                )}
                {currentMedia.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentMedia.url}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        autoPlay={isInViewport}
                        muted={isMuted}
                        loop
                        playsInline
                        controls={false}
                        onLoadedData={() => setImageLoaded(true)}
                    />
                ) : (
                    <img
                        src={currentMedia.url}
                        alt={data.title}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        draggable={false}
                        onLoad={() => setImageLoaded(true)}
                    />
                )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Video Controls Overlay */}
            {currentMedia.type === 'video' && (
                <>
                    {/* Pause/Play indicator */}
                    {isVideoPaused && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                                <IconPlayerPlay size={32} className="text-white ml-1" />
                            </div>
                        </div>
                    )}
                    {/* Mute toggle */}
                    <button
                        onClick={toggleMute}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                    >
                        {isMuted ? <IconVolumeOff size={16} className="text-white" /> : <IconVolume size={16} className="text-white" />}
                    </button>
                </>
            )}

            {/* Particle Effects */}
            {showParticles && (
                <HeartParticles 
                    x={showParticles.x} 
                    y={showParticles.y} 
                    onComplete={() => setShowParticles(null)} 
                />
            )}

            {/* Media Indicators */}
            {media.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {media.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentMediaIndex(idx);
                            }}
                            className={`h-1 rounded-full transition-all ${
                                idx === currentMediaIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* Badges Superiores Izquierda - en columna */}
            <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5 z-10 max-w-[120px]">
                {/* Section badge - primero */}
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                    {data.variant === 'sale' ? 'Venta' : data.variant === 'rent' ? 'Arriendo' : 'Subasta'}
                </span>

                {/* Discount Badge - color principal, solo número y % */}
                {data.discountPercent && data.discountPercent > 0 && (
                    <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full font-semibold"
                          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                        -{data.discountPercent}%
                    </span>
                )}

                {/* Financiamiento */}
                {data.financing && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                        <span className="text-[10px]">🏦</span>
                        Financiamiento
                    </span>
                )}

                {/* Permuta o Conversable */}
                {data.exchange && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                        <span className="text-[10px]">🔄</span>
                        Permuta
                    </span>
                )}
                {!data.exchange && data.negotiable && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                        <span className="text-[10px]">💬</span>
                        Conversable
                    </span>
                )}
            </div>

            {/* Botón Guardar - Superior Derecha con número */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={handleSave}
                    className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform"
                >
                    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        {favorite ? <IconBookmarkFilled size={20} className="text-yellow-400" /> : <IconBookmark size={20} className="text-white" />}
                    </div>
                    {data.engagement?.saves !== undefined && (
                        <span className="text-white text-[10px] font-medium drop-shadow">{data.engagement.saves}</span>
                    )}
                </button>
            </div>

            {/* Share Toast */}
            {showShareToast && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg"
                     style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                    Link copiado al portapapeles
                </div>
            )}

            {/* Pie - Nuevo diseño definitivo */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                {/* 1. Precio */}
                <p className="text-white font-bold text-2xl mb-0.5 tracking-tight drop-shadow-sm text-center">
                    {formatPriceCLP(data.price)}
                </p>

                {/* 2. Título */}
                <h3 className="text-white font-semibold text-lg leading-tight mb-2 line-clamp-1 px-2 text-center">
                    {data.title}
                </h3>

                {/* 3. Tags - Columnas: icono arriba, valor abajo, alineados */}
                <div className="flex items-start gap-4 mb-2 justify-center">
                    {vehicleInfo.type && (
                        <div className="flex flex-col items-center gap-0.5">
                            <IconCar size={14} className="text-white/60" />
                            <span className="text-[10px] text-white/90">{vehicleInfo.type}</span>
                        </div>
                    )}
                    {vehicleInfo.km && (
                        <div className="flex flex-col items-center gap-0.5">
                            <IconGauge size={14} className="text-white/60" />
                            <span className="text-[10px] text-white/90">{vehicleInfo.km}</span>
                        </div>
                    )}
                    {vehicleInfo.fuel && (
                        <div className="flex flex-col items-center gap-0.5">
                            <IconGasStation size={14} className="text-white/60" />
                            <span className="text-[10px] text-white/90">{vehicleInfo.fuel}</span>
                        </div>
                    )}
                    {vehicleInfo.transmission && (
                        <div className="flex flex-col items-center gap-0.5">
                            <IconManualGearbox size={14} className="text-white/60" />
                            <span className="text-[10px] text-white/90">{vehicleInfo.transmission}</span>
                        </div>
                    )}
                </div>

                {/* 4. Ubicación */}
                <div className="flex items-center justify-center gap-1.5 text-white/70 text-[11px] mb-3">
                    <IconMapPin size={11} />
                    <span className="truncate">{data.location}</span>
                    {timeAgo && (
                        <>
                            <span className="mx-0.5">·</span>
                            <span>{timeAgo}</span>
                        </>
                    )}
                </div>

                {/* 5. Fila inferior: Avatar + CTA + 3 puntos */}
                <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.sellerProfileHref) router.push(data.sellerProfileHref);
                        }}
                        className="relative active:scale-95 transition-shrink-0"
                    >
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-gray-200 flex-shrink-0">
                            {data.sellerAvatarUrl ? (
                                <img
                                    src={data.sellerAvatarUrl}
                                    alt={data.sellerName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                    <span className="text-gray-600 text-sm font-bold">
                                        {data.sellerName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        {data.sellerIsFeatured && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center border border-white">
                                <IconCheck size={8} className="text-white" strokeWidth={3} />
                            </div>
                        )}
                    </button>

                    {/* CTA */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(data.href);
                        }}
                        className="flex-1 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition active:scale-[0.98]"
                    >
                        Ver detalle
                    </button>

                    {/* Botón 3 puntos con menú */}
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={handleMoreClick}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
                        >
                            <IconDotsVertical size={18} className="text-white" />
                        </button>

                        {/* Menú desplegable - opciones de compartir y reportar */}
                        {showMoreMenu && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl overflow-hidden shadow-2xl z-[100] border border-white/10"
                                 style={{ background: 'var(--surface)' }}>
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200/50">
                                    Compartir
                                </div>
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                                    style={{ color: 'var(--fg)' }}
                                >
                                    <span className="text-base">💬</span> WhatsApp
                                </button>
                                <button
                                    onClick={handleShareFacebook}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                                    style={{ color: 'var(--fg)' }}
                                >
                                    <span className="text-base">📘</span> Facebook
                                </button>
                                <button
                                    onClick={handleShareInstagram}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                                    style={{ color: 'var(--fg)' }}
                                >
                                    <span className="text-base">📸</span> Instagram
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                                    style={{ color: 'var(--fg)' }}
                                >
                                    <span className="text-base">🔗</span> Copiar link
                                </button>
                                <div className="border-t border-gray-200/50 my-1"></div>
                                <button
                                    onClick={handleReport}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600"
                                >
                                    <span className="text-base">🚩</span> Reportar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
