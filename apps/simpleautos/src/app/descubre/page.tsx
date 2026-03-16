'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconBookmark,
    IconClockHour4,
    IconEye,
    IconLoader2,
    IconMapPin,
    IconPlayerPlayFilled,
    IconUserCheck,
    IconUserPlus,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { fetchSocialFeed, toggleFollowAuthor, type SocialClip, type SocialSection } from '@/lib/social-feed';

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

                                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                            <IconClockHour4 size={11} />
                                            {clip.publishedAgo}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                            <IconEye size={11} />
                                            {clip.views.toLocaleString('es-CL')}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                            <IconBookmark size={11} />
                                            {clip.saves.toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/35 text-white backdrop-blur">
                                        <IconPlayerPlayFilled size={10} />
                                        {clip.section}
                                    </span>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (!clip.author.profileHref) return;
                                                router.push(clip.author.profileHref);
                                            }}
                                            disabled={!clip.author.profileHref}
                                            className="inline-flex items-center gap-2 min-w-0 h-9 px-2.5 rounded-lg border border-white/25 bg-black/30 text-white backdrop-blur"
                                        >
                                            {clip.author.avatar ? (
                                                <img src={clip.author.avatar} alt={clip.author.name} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-white/20">
                                                    {authorInitial(clip.author.name)}
                                                </span>
                                            )}
                                            <span className="text-xs truncate max-w-[140px]">{clip.author.name}</span>
                                        </button>

                                        {clip.author.canFollow ? (
                                            <button
                                                onClick={(event) => handleFollow(clip, event)}
                                                disabled={followBusy}
                                                className="h-9 px-3 rounded-lg text-xs font-medium border border-white/25 text-white backdrop-blur"
                                                style={{ background: isFollowing ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)' }}
                                            >
                                                {followBusy ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <IconLoader2 size={12} className="animate-spin" />
                                                        ...
                                                    </span>
                                                ) : isFollowing ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <IconUserCheck size={12} />
                                                        Siguiendo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <IconUserPlus size={12} />
                                                        Seguir
                                                    </span>
                                                )}
                                            </button>
                                        ) : null}
                                    </div>

                                    <h2 className="text-lg font-semibold leading-tight mb-1 text-white">{clip.title}</h2>
                                    <p className="text-2xl font-semibold leading-tight mb-1 text-white">{clip.price}</p>
                                    <p className="text-sm inline-flex items-center gap-1 mb-3" style={{ color: 'rgba(255,255,255,0.82)' }}>
                                        <IconMapPin size={13} />
                                        {clip.location}
                                    </p>

                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {clip.author.followers.toLocaleString('es-CL')} seguidores
                                        </p>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                router.push(clip.href);
                                            }}
                                            className="h-9 px-4 rounded-lg text-sm font-medium border border-white/25 bg-white text-black"
                                        >
                                            Ver publicación
                                        </button>
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
