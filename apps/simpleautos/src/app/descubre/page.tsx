'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconBookmark,
    IconLoader2,
    IconMapPin,
    IconUserCheck,
    IconUserPlus,
    IconCar,
    IconGauge,
    IconGasStation,
    IconManualGearbox,
    IconCalendar,
    IconBuilding,
    IconBed,
    IconBath,
    IconRuler,
    IconDotsVertical,
    IconShare,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { fetchSocialFeed, toggleFollowAuthor, type SocialClip, type SocialSection } from '@simple/utils';

const FILTERS: Array<{ value: SocialSection; label: string }> = [
    { value: 'todos', label: 'Todo' },
    { value: 'ventas', label: 'Venta' },
    { value: 'arriendos', label: 'Arriendo' },
    { value: 'subastas', label: 'Subasta' },
];

function authorInitial(name: string): string {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'S'
    );
}

// Helper para formatear precio en peso chileno (CLP)
function formatPriceCLP(price: string): string {
    // Extraer solo los números del string
    const numericValue = price.replace(/[^0-9]/g, '');
    const num = parseInt(numericValue, 10);
    if (isNaN(num)) return price;
    // Formatear con separador de miles (punto para CLP)
    return '$' + num.toLocaleString('es-CL');
}

export default function FeedPage() {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [section, setSection] = useState<SocialSection>('todos');
    const [loading, setLoading] = useState(true);
    const [clips, setClips] = useState<SocialClip[]>([]);
    const [activeClipId, setActiveClipId] = useState<string | null>(null);
    const [followingBusy, setFollowingBusy] = useState<Record<string, boolean>>({});
    const [highlightHref, setHighlightHref] = useState('');

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const value = new URLSearchParams(window.location.search).get('highlight') ?? '';
        setHighlightHref(value);
    }, []);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            const data = await fetchSocialFeed('autos', section);
            if (!mounted) return;
            const prioritized = highlightHref
                ? [...data].sort((a, b) => {
                      const aMatch = a.href === highlightHref ? 1 : 0;
                      const bMatch = b.href === highlightHref ? 1 : 0;
                      return bMatch - aMatch;
                  })
                : data;
            setClips(prioritized);
            setActiveClipId(prioritized[0]?.id ?? null);
            setLoading(false);
        };
        void load();
        return () => {
            mounted = false;
        };
    }, [section, highlightHref]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-clip-id]'));
        if (!nodes.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (!visible) return;
                const clipId = visible.target.getAttribute('data-clip-id');
                if (clipId) setActiveClipId(clipId);
            },
            {
                root: container,
                threshold: [0.45, 0.65, 0.85],
            }
        );

        nodes.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, [clips]);

    useEffect(() => {
        for (const clip of clips) {
            const video = videoRefs.current[clip.id];
            if (!video) continue;
            if (clip.id === activeClipId) {
                void video.play().catch(() => undefined);
            } else {
                video.pause();
            }
        }
    }, [activeClipId, clips]);

    const handleFollow = (clip: SocialClip, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!clip.author.canFollow) return;

        const execute = async () => {
            setFollowingBusy((prev) => ({ ...prev, [clip.author.id]: true }));
            const result = await toggleFollowAuthor(clip.author.id, 'autos');
            setFollowingBusy((prev) => ({ ...prev, [clip.author.id]: false }));
            if (!result) return;

            setClips((prev) =>
                prev.map((item) =>
                    item.author.id === clip.author.id
                        ? {
                              ...item,
                              author: {
                                  ...item.author,
                                  isFollowing: result.following,
                                  followers: result.followers,
                              },
                          }
                        : item
                )
            );
        };

        if (requireAuth(() => void execute())) {
            void execute();
        }
    };

    // Estados para menú de compartir
    const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);

    const handleShareWhatsApp = (clip: SocialClip, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${clip.href}`;
        const text = `Mira esto: ${clip.title} - ${clip.price}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
        setShareMenuOpen(null);
    };

    const handleShareFacebook = (clip: SocialClip, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${clip.href}`;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        setShareMenuOpen(null);
    };

    const handleShareInstagram = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShareMenuOpen(null);
        // Instagram no tiene API directa, solo copiamos
    };

    const handleCopyLink = (clip: SocialClip, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}${clip.href}`;
        navigator.clipboard.writeText(url);
        setShareToast(clip.id);
        setTimeout(() => setShareToast(null), 2000);
        setShareMenuOpen(null);
    };

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShareMenuOpen(null);
        alert('Función de reportar próximamente disponible');
    };

    // Icon mapper para specs
    const getSpecIcon = (iconName?: string) => {
        switch (iconName) {
            case 'car': return <IconCar size={14} className="text-white/60" />;
            case 'gauge': return <IconGauge size={14} className="text-white/60" />;
            case 'gas': return <IconGasStation size={14} className="text-white/60" />;
            case 'gear': return <IconManualGearbox size={14} className="text-white/60" />;
            case 'calendar': return <IconCalendar size={14} className="text-white/60" />;
            case 'building': return <IconBuilding size={14} className="text-white/60" />;
            case 'bed': return <IconBed size={14} className="text-white/60" />;
            case 'bath': return <IconBath size={14} className="text-white/60" />;
            case 'ruler': return <IconRuler size={14} className="text-white/60" />;
            default: return <IconCar size={14} className="text-white/60" />;
        }
    };

    const emptyState = useMemo(
        () => (
            <div className="h-[calc(100vh-12rem)] rounded-2xl border flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    No hay publicaciones disponibles en Descubre para esta sección.
                </p>
            </div>
        ),
        []
    );

    return (
        <div className="container-app py-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setSection(filter.value)}
                        className="h-8 px-3.5 rounded-lg text-sm border"
                        style={{
                            borderColor: section === filter.value ? 'var(--fg)' : 'var(--border)',
                            background: section === filter.value ? 'var(--fg)' : 'var(--surface)',
                            color: section === filter.value ? 'var(--bg)' : 'var(--fg-secondary)',
                        }}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="h-[calc(100vh-12rem)] rounded-2xl border flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <p className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                        <IconLoader2 size={14} className="animate-spin" />
                        Cargando contenido...
                    </p>
                </div>
            ) : clips.length === 0 ? (
                emptyState
            ) : (
                <div ref={scrollRef} className="h-[calc(100vh-12rem)] overflow-y-auto snap-y snap-mandatory space-y-4 pr-1">
                    {clips.map((clip) => {
                        const isFollowing = clip.author.isFollowing;
                        const followBusy = !!followingBusy[clip.author.id];

                        return (
                            <article
                                key={clip.id}
                                data-clip-id={clip.id}
                                className="relative mx-auto w-full max-w-[430px] aspect-[9/16] rounded-2xl overflow-hidden border snap-start cursor-pointer"
                                style={{ borderColor: 'var(--border)', background: '#0a0a0a' }}
                                onClick={() => router.push(clip.href)}
                            >
                                {clip.mediaType === 'video' ? (
                                    <video
                                        ref={(node) => {
                                            videoRefs.current[clip.id] = node;
                                        }}
                                        src={clip.mediaUrl}
                                        poster={clip.posterUrl}
                                        muted
                                        loop
                                        playsInline
                                        preload="metadata"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0" style={{ background: clip.mediaUrl }} />
                                )}

                                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.78) 100%)' }} />

                                {/* Badges Superiores - mismo diseño que cards */}
                                <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5 z-10 max-w-[120px]">
                                    {/* Section badge - primero */}
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                        {clip.section === 'ventas' ? 'Venta' : clip.section === 'arriendos' ? 'Arriendo' : clip.section === 'subastas' ? 'Subasta' : 'Proyecto'}
                                    </span>

                                    {/* Discount Badge - color principal, solo número y % */}
                                    {clip.discountPercent && clip.discountPercent > 0 && (
                                        <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full font-semibold bg-emerald-500 text-white">
                                            -{clip.discountPercent}%
                                        </span>
                                    )}

                                    {/* Financiamiento */}
                                    {clip.financing && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                            <span className="text-[10px]">🏦</span>
                                            Financiamiento
                                        </span>
                                    )}

                                    {/* Conversable */}
                                    {clip.negotiable && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                            <span className="text-[10px]">💬</span>
                                            Conversable
                                        </span>
                                    )}
                                </div>

                                {/* Botón Guardar - Superior Derecha con número */}
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // handleSave
                                        }}
                                        className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                            <IconBookmark size={20} className="text-white" />
                                        </div>
                                        <span className="text-white text-[10px] font-medium drop-shadow">{clip.saves}</span>
                                    </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                                    {/* 1. Precio */}
                                    <p className="text-white font-bold text-2xl mb-0.5 tracking-tight drop-shadow-sm text-center">
                                        {formatPriceCLP(clip.price)}
                                    </p>

                                    {/* 2. Título */}
                                    <h2 className="text-white font-semibold text-lg leading-tight mb-2 line-clamp-1 px-2 text-center">
                                        {clip.title}
                                    </h2>

                                    {/* 3. Tags - Columnas con iconos arriba y valores abajo */}
                                    {clip.specs && clip.specs.length > 0 ? (
                                        <div className="flex items-start gap-4 mb-2 justify-center">
                                            {clip.specs.slice(0, 4).map((spec, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                                    {getSpecIcon(spec.icon)}
                                                    <span className="text-[10px] text-white/90 whitespace-nowrap">{spec.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-4 mb-2 justify-center">
                                            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                                <IconCar size={14} className="text-white/60" />
                                                <span className="text-[10px] text-white/90">Auto</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                                <IconGauge size={14} className="text-white/60" />
                                                <span className="text-[10px] text-white/90">-</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                                <IconGasStation size={14} className="text-white/60" />
                                                <span className="text-[10px] text-white/90">-</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                                <IconManualGearbox size={14} className="text-white/60" />
                                                <span className="text-[10px] text-white/90">-</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. Ubicación */}
                                    <div className="flex items-center justify-center gap-1.5 text-white/80 text-[11px] mb-3">
                                        <IconMapPin size={12} className="text-white/60" />
                                        <span className="truncate font-medium">{clip.location || 'Chile'}</span>
                                    </div>

                                    {/* 5. Fila inferior: Avatar + CTA + 3 puntos */}
                                    <div className="flex items-center gap-2">
                                        {/* Avatar */}
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (clip.author.profileHref) router.push(clip.author.profileHref);
                                            }}
                                            className="relative active:scale-95 flex-shrink-0"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-gray-200 flex-shrink-0">
                                                {clip.author.avatar ? (
                                                    <img
                                                        src={clip.author.avatar}
                                                        alt={clip.author.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600">
                                                        <span className="text-white font-bold text-sm">
                                                            {authorInitial(clip.author.name)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>

                                        {/* CTA */}
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                router.push(clip.href);
                                            }}
                                            className="flex-1 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition active:scale-[0.98]"
                                        >
                                            Ver detalle
                                        </button>

                                        {/* Botón 3 puntos con menú */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShareMenuOpen(shareMenuOpen === clip.id ? null : clip.id);
                                                }}
                                                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
                                            >
                                                <IconDotsVertical size={18} className="text-white" />
                                            </button>

                                            {/* Menú desplegable */}
                                            {shareMenuOpen === clip.id && (
                                                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl overflow-hidden shadow-2xl z-[100] border border-white/10 bg-black/90 backdrop-blur-md">
                                                    <div className="px-3 py-2 text-xs font-medium text-white/50 border-b border-white/10">
                                                        Compartir
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleShareWhatsApp(clip, e)}
                                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
                                                    >
                                                        <span className="text-base">💬</span> WhatsApp
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleShareFacebook(clip, e)}
                                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
                                                    >
                                                        <span className="text-base">📘</span> Facebook
                                                    </button>
                                                    <button
                                                        onClick={(e) => { handleCopyLink(clip, e); handleShareInstagram(e); }}
                                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
                                                    >
                                                        <span className="text-base">🔗</span> Copiar link
                                                    </button>
                                                    <div className="border-t border-white/10 my-1"></div>
                                                    <button
                                                        onClick={handleReport}
                                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 text-red-400"
                                                    >
                                                        <span className="text-base">🚩</span> Reportar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Share Toast */}
                                    {shareToast === clip.id && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg bg-white text-black">
                                            Link copiado al portapapeles
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
