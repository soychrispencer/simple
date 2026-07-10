'use client';

import { PanelButtonLink } from '@simple/ui/panel';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    IconBookmark,
    IconBuildingStore,
    IconClockHour4,
    IconDotsVertical,
    IconEye,
    IconLoader2,
    IconMapPin,
    IconPlayerPlayFilled,
    IconUserCheck,
    IconUserPlus,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import {
    fetchSocialFeed,
    formatListingPrice,
    toggleFollowAuthor,
    type SocialClip,
    type SocialSection,
} from '@simple/utils';
import {
    LISTING_SOCIAL_VERTICAL_ASPECT,
    MarketplaceReelShareMenu,
    abbreviateListingSpecLabel,
    buildDefaultReelShareMenuItems,
    orderPropertyCardTags,
    propertySpecIconForLabel,
    reelSpecPlaceholder,
    shortenListingLocation,
    type MarketplaceReelSpec,
} from '@simple/ui/listings';

const FILTERS: Array<{ value: SocialSection; label: string }> = [
    { value: 'todos', label: 'Todo' },
    { value: 'ventas', label: 'Venta' },
    { value: 'arriendos', label: 'Arriendo' },
    { value: 'proyectos', label: 'Proyectos' },
];

function buildClipSpecs(clip: SocialClip) {
    const tags = orderPropertyCardTags(
        (clip.specs ?? []).map((spec) => (spec.value || spec.label).trim()).filter(Boolean),
    );
    const abbreviated: MarketplaceReelSpec[] = tags.slice(0, 4).map((label) => ({
        label: abbreviateListingSpecLabel(label),
        icon: propertySpecIconForLabel(label),
    }));
    const slots: MarketplaceReelSpec[] = [...abbreviated];
    while (slots.length < 4) {
        slots.push(reelSpecPlaceholder(slots.length, 'propiedades'));
    }
    return { abbreviated, slots };
}

function sectionLabel(section: SocialSection): string {
    if (section === 'ventas') return 'Venta';
    if (section === 'arriendos') return 'Arriendo';
    if (section === 'proyectos') return 'Proyecto';
    return section;
}

function DiscoverClipShareMenu({
    href,
    title,
    price,
    onCopied,
}: {
    href: string;
    title: string;
    price: string;
    onCopied: (message: string) => void;
}) {
    const menuAnchorRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const shareUrl = () => {
        if (typeof window === 'undefined') return href;
        return href.startsWith('http') ? href : `${window.location.origin}${href}`;
    };

    const items = buildDefaultReelShareMenuItems({
        shareUrl: shareUrl(),
        shareText: `Mira esto: ${title} - ${price}`,
        onClose: () => setOpen(false),
        onCopied: (message) => onCopied(message || 'Link copiado'),
        onReport: () => {
            alert('Función de reportar próximamente disponible');
        },
        onOpenListing: () => {
            if (typeof window === 'undefined') return;
            window.open(shareUrl(), '_blank', 'noopener,noreferrer');
        },
    });

    return (
        <div className="relative shrink-0" ref={menuAnchorRef}>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className="marketplace-reel-card__menu-btn"
                aria-label="Más opciones"
                aria-expanded={open}
            >
                <IconDotsVertical size={18} />
            </button>
            <MarketplaceReelShareMenu
                open={open}
                anchorRef={menuAnchorRef}
                onClose={() => setOpen(false)}
                items={items}
            />
        </div>
    );
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
    const [shareToast, setShareToast] = useState<string | null>(null);

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
            const data = await fetchSocialFeed('propiedades', section);
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
            const result = await toggleFollowAuthor(clip.author.id, 'propiedades');
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

    const emptyState = useMemo(
        () => (
            <div className="h-[calc(100vh-12rem)] rounded-card border flex flex-col items-center justify-center gap-4 px-6 text-center border-(--border) bg-(--surface)">
                <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                    Descubre es solo para videos
                </p>
                <p className="max-w-sm text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Sube un video al publicar tu propiedad para aparecer aquí. Las publicaciones solo con fotos no entran a este feed.
                </p>
                <PanelButtonLink href="/panel/publicar" variant="accent">
                    Publicar con video
                </PanelButtonLink>
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
                <div className="h-[calc(100vh-12rem)] rounded-card border flex items-center justify-center border-(--border) bg-(--surface)">
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
                        const { abbreviated, slots } = buildClipSpecs(clip);

                        return (
                            <article
                                key={clip.id}
                                data-clip-id={clip.id}
                                className={`marketplace-reel-card marketplace-reel-card--grid relative mx-auto w-full max-w-[430px] ${LISTING_SOCIAL_VERTICAL_ASPECT} rounded-card overflow-hidden border snap-start cursor-pointer`}
                                style={{ borderColor: 'var(--border)', background: '#0a0a0a' }}
                                onClick={() => router.push(clip.href)}
                            >
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

                                <div className="marketplace-reel-card__scrim pointer-events-none absolute inset-0" aria-hidden />

                                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] text-white backdrop-blur">
                                            <IconClockHour4 size={11} />
                                            {clip.publishedAgo}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] text-white backdrop-blur">
                                            <IconEye size={11} />
                                            {clip.views.toLocaleString('es-CL')}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] text-white backdrop-blur">
                                            <IconBookmark size={11} />
                                            {clip.saves.toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] text-white backdrop-blur">
                                        <IconPlayerPlayFilled size={10} />
                                        {sectionLabel(clip.section)}
                                    </span>
                                </div>

                                {shareToast === clip.id && (
                                    <div className="marketplace-reel-toast absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                                        Link copiado al portapapeles
                                    </div>
                                )}

                                <div className="marketplace-reel-card__panel absolute inset-x-0 bottom-0 z-20 px-3 pb-2.5 pt-10 sm:px-3.5 sm:pb-3 sm:pt-12">
                                    <div className="marketplace-reel-card__head">
                                        <div className="marketplace-reel-card__location">
                                            <IconMapPin size={11} className="shrink-0" />
                                            <span>{shortenListingLocation(clip.location || 'Chile')}</span>
                                        </div>
                                        <div className="marketplace-reel-card__identity">
                                            <div className="flex flex-col items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (!clip.author.profileHref) return;
                                                        router.push(clip.author.profileHref);
                                                    }}
                                                    disabled={!clip.author.profileHref}
                                                    className="shrink-0 transition-transform active:scale-95"
                                                    aria-label={`Perfil de ${clip.author.name}`}
                                                >
                                                    <span className="marketplace-reel-card__avatar">
                                                        {clip.author.avatar ? (
                                                            <Image
                                                                src={clip.author.avatar}
                                                                alt=""
                                                                width={40}
                                                                height={40}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="marketplace-reel-card__avatar-fallback" aria-hidden>
                                                                <IconBuildingStore size={16} stroke={1.75} />
                                                            </span>
                                                        )}
                                                    </span>
                                                </button>
                                                {clip.author.canFollow ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => handleFollow(clip, event)}
                                                        disabled={followBusy}
                                                        className="h-7 shrink-0 rounded-md border border-white/25 px-1.5 text-[10px] font-medium text-white backdrop-blur"
                                                        style={{ background: isFollowing ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)' }}
                                                        aria-label={isFollowing ? 'Siguiendo' : 'Seguir'}
                                                    >
                                                        {followBusy ? (
                                                            <IconLoader2 size={12} className="animate-spin" />
                                                        ) : isFollowing ? (
                                                            <IconUserCheck size={12} />
                                                        ) : (
                                                            <IconUserPlus size={12} />
                                                        )}
                                                    </button>
                                                ) : null}
                                            </div>
                                            <div className="marketplace-reel-card__head-text">
                                                <p className="marketplace-reel-card__price">{formatListingPrice(clip.price)}</p>
                                                <h2 className="marketplace-reel-card__title">{clip.title}</h2>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="marketplace-reel-card__meta-row">
                                        <div className="marketplace-reel-card__specs marketplace-reel-card__specs--stack">
                                            {slots.map((spec, index) => {
                                                const isPlaceholder = !abbreviated[index] || !spec.label || spec.label === '—';
                                                return (
                                                    <span
                                                        key={`${spec.label}-${index}`}
                                                        className={
                                                            isPlaceholder
                                                                ? 'marketplace-reel-card__spec-stack marketplace-reel-card__spec-stack--placeholder'
                                                                : 'marketplace-reel-card__spec-stack'
                                                        }
                                                        aria-hidden={isPlaceholder ? true : undefined}
                                                    >
                                                        <span className="marketplace-reel-card__spec-stack-icon">{spec.icon}</span>
                                                        <span className="marketplace-reel-card__spec-stack-label">
                                                            {isPlaceholder ? '—' : spec.label}
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <span className="marketplace-reel-card__meta-menu">
                                            <DiscoverClipShareMenu
                                                href={clip.href}
                                                title={clip.title}
                                                price={clip.price}
                                                onCopied={() => {
                                                    setShareToast(clip.id);
                                                    setTimeout(() => setShareToast(null), 2000);
                                                }}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
