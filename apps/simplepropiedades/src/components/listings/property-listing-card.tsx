'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
    IconDots,
    IconEye,
    IconMapPin,
    IconShare2,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@/lib/saved-listings';
import { PanelButton, PanelIconButton, PanelStatusBadge } from '@simple/ui';

type CardMode = 'grid' | 'list';
type CardVariant = 'sale' | 'rent' | 'project';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type PropertyListingCardData = {
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
    badge: string;
    variant?: CardVariant;
    images?: string[];
    highlights?: string[];
    projectStatus?: string;
    delivery?: string;
    listedSince?: string;
    engagement?: CardEngagement;
    ctaLabel?: string;
};

type Props = {
    data: PropertyListingCardData;
    mode: CardMode;
};

function makeSeededSlides(title: string): string[] {
    const palettes = [
        ['#172554', '#1e3a8a'],
        ['#111827', '#1f2937'],
        ['#0f172a', '#334155'],
        ['#312e81', '#4338ca'],
    ];
    const seed = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 3 }).map((_, index) => {
        const pair = palettes[(seed + index) % palettes.length];
        return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
    });
}

function initialsFromName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function formatMetric(value: number): string {
    return value.toLocaleString('es-CL');
}

function variantBadgeTone(variant: CardVariant | undefined): 'success' | 'warning' | 'info' {
    if (variant === 'rent') return 'warning';
    if (variant === 'project') return 'info';
    return 'success';
}

function secondaryBadgeTone(label: string): 'success' | 'warning' | 'info' | 'neutral' {
    const normalized = label.toLowerCase();
    if (normalized.includes('ultima')) return 'warning';
    if (normalized.includes('preventa')) return 'info';
    if (normalized.includes('venta')) return 'success';
    return 'neutral';
}

function defaultCtaByVariant(variant: CardVariant | undefined): string {
    if (variant === 'rent') return 'Ver disponibilidad';
    if (variant === 'project') return 'Ver proyecto';
    return 'Ver detalle';
}

export default function PropertyListingCard({ data, mode }: Props) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [slide, setSlide] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [favorite, setFavorite] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const slides = useMemo(
        () => (data.images && data.images.length > 0 ? data.images : makeSeededSlides(data.title)),
        [data.images, data.title]
    );
    const max = slides.length;
    const current = slides[slide % max] ?? slides[0];
    const isImageUrl = /^https?:\/\//i.test(current) || current.startsWith('data:image/');
    const ctaLabel = data.ctaLabel ?? defaultCtaByVariant(data.variant);
    const sellerProfileHref = data.sellerProfileHref ?? null;

    useEffect(() => {
        setFavorite(isListingSaved(data.id));
        return subscribeSavedListings(() => setFavorite(isListingSaved(data.id)));
    }, [data.id]);

    useEffect(() => {
        setImageLoaded(!isImageUrl);
    }, [isImageUrl, current]);

    const go = (direction: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setSlide((value) => (value + direction + max) % max);
    };

    const openListing = () => {
        router.push(data.href);
    };

    const openListingFromCta = (event: React.MouseEvent) => {
        event.stopPropagation();
        router.push(data.href);
    };

    const openSellerProfile = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!sellerProfileHref) return;
        router.push(sellerProfileHref);
    };

    const toggleMenu = (event: React.MouseEvent) => {
        event.stopPropagation();
        setMenuOpen((value) => !value);
    };

    const toggleFavoriteState = async (event: React.MouseEvent) => {
        event.stopPropagation();
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
        if (!result.ok) return;
        setFavorite(result.saved);
        setMenuOpen(false);
    };

    const share = async (event: React.MouseEvent) => {
        event.stopPropagation();
        const url = typeof window === 'undefined' ? data.href : `${window.location.origin}${data.href}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: data.title, url });
            } else {
                await navigator.clipboard.writeText(url);
            }
        } catch {
            // ignore share cancel errors
        }
        setMenuOpen(false);
    };

    const actionGroupStyle: CSSProperties = {
        borderColor: 'var(--border)',
        background: 'var(--surface)',
    };

    const sellerAvatar = data.sellerAvatarUrl ? (
        <img src={data.sellerAvatarUrl} alt={data.sellerName} className="w-7 h-7 rounded-full object-cover" />
    ) : (
        <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
        >
            {initialsFromName(data.sellerName)}
        </div>
    );

    const detailItems = (data.highlights && data.highlights.length > 0 ? data.highlights : data.meta).slice(0, 5);
    const secondaryBadgeLabel = data.projectStatus;
    const secondaryPriceInfo = data.delivery ? `Entrega ${data.delivery}` : undefined;
    const engagementItems: Array<{ key: string; value: string; icon: React.ReactNode }> = [];

    if (data.listedSince) {
        engagementItems.push({ key: 'listed', value: data.listedSince, icon: <IconClock size={12} /> });
    }
    if (typeof data.engagement?.views24h === 'number') {
        engagementItems.push({
            key: 'views',
            value: formatMetric(data.engagement.views24h),
            icon: <IconEye size={12} />,
        });
    }
    if (typeof data.engagement?.saves === 'number') {
        engagementItems.push({
            key: 'saves',
            value: formatMetric(data.engagement.saves),
            icon: <IconBookmark size={12} />,
        });
    }
    engagementItems.push({ key: 'location', value: data.location, icon: <IconMapPin size={12} /> });

    const renderActionCluster = (stretch = false) => (
        <div
            className={`inline-flex items-center gap-1 rounded-[14px] border p-1.5 ${stretch ? 'w-full' : ''}`}
            style={actionGroupStyle}
        >
            <PanelButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={openSellerProfile}
                disabled={!sellerProfileHref}
                className={`h-8 min-w-0 justify-start gap-2 rounded-[10px] border-transparent px-2.5 text-xs ${stretch ? 'flex-1' : ''}`}
            >
                {sellerAvatar}
                <span className="truncate" style={{ color: 'var(--fg-secondary)' }}>
                    {data.sellerName}
                </span>
            </PanelButton>
            <PanelButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={openListingFromCta}
                className="h-8 shrink-0 rounded-[10px] px-3 text-xs"
            >
                {ctaLabel}
            </PanelButton>
            <PanelIconButton
                type="button"
                label="Más acciones"
                variant="soft"
                size="md"
                onClick={toggleMenu}
                className="rounded-[10px]"
            >
                <IconDots size={16} />
            </PanelIconButton>
        </div>
    );

    const renderMenu = () => {
        if (!menuOpen) return null;
        return (
            <div
                className="absolute right-3 bottom-14 z-30 w-44 rounded-xl border py-1.5 shadow-lg"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                onClick={(event) => event.stopPropagation()}
            >
                <PanelButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={share}
                    className="h-9 w-full justify-start rounded-none border-transparent px-3 text-sm"
                >
                    <IconShare2 size={16} /> Compartir
                </PanelButton>
            </div>
        );
    };

    const renderMedia = (heightClass: string, isListMode = false) => (
        <div
            className={`relative w-full ${heightClass} rounded-lg overflow-hidden flex-shrink-0`}
            style={{ background: 'var(--bg-muted)' }}
        >
            {isImageUrl ? (
                <>
                    <img
                        src={current}
                        alt={data.title}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                    />
                    {!imageLoaded ? (
                        <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    ) : null}
                </>
            ) : (
                <div className="absolute inset-0" style={{ background: current }} />
            )}

            <PanelStatusBadge
                label={data.badge}
                tone={variantBadgeTone(data.variant)}
                variant="solid"
                className="absolute top-2 left-2 shadow-sm"
            />

            {secondaryBadgeLabel ? (
                <PanelStatusBadge
                    label={secondaryBadgeLabel}
                    tone={secondaryBadgeTone(secondaryBadgeLabel)}
                    variant="solid"
                    className="absolute top-2 left-20 shadow-sm"
                />
            ) : null}

            {data.discountLabel ? (
                <div
                    className={`absolute right-2 inline-flex items-center justify-center h-7 min-w-[46px] rounded-[9px] px-2 text-[11px] font-semibold ${
                        isListMode ? 'top-2' : 'top-12'
                    }`}
                    style={{ background: 'var(--fg)', color: 'var(--bg)', boxShadow: 'var(--shadow-xs)' }}
                >
                    {data.discountLabel}
                </div>
            ) : null}

            {max > 1 ? (
                <>
                    <PanelIconButton
                        type="button"
                        label="Imagen anterior"
                        variant="overlay"
                        size="md"
                        onClick={(event) => go(-1, event)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                    >
                        <IconChevronLeft size={14} />
                    </PanelIconButton>
                    <PanelIconButton
                        type="button"
                        label="Siguiente imagen"
                        variant="overlay"
                        size="md"
                        onClick={(event) => go(1, event)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                    >
                        <IconChevronRight size={14} />
                    </PanelIconButton>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {slides.map((_, index) => (
                            <span
                                key={`dot-${data.id}-${index}`}
                                className="rounded-full"
                                style={{
                                    width: slide === index ? 20 : 7,
                                    height: 4,
                                    background: slide === index ? '#ffffff' : 'rgba(255,255,255,0.55)',
                                }}
                            />
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );

    if (mode === 'list') {
        return (
            <article
                className="relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                onClick={openListing}
                onMouseLeave={() => setMenuOpen(false)}
            >
                {renderMenu()}
                <div className="absolute top-4 right-4 z-20">
                    <PanelIconButton
                        type="button"
                        label={favorite ? 'Quitar de guardados' : 'Guardar propiedad'}
                        variant="overlay"
                        size="md"
                        onClick={toggleFavoriteState}
                        className="rounded-full shadow-sm"
                    >
                        {favorite ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                    </PanelIconButton>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_240px] gap-4 p-4">
                    {renderMedia('h-44 xl:h-full xl:min-h-[180px]', true)}

                    <div className="min-w-0 flex flex-col justify-between gap-3">
                        <div>
                            <h3 className="text-[1.2rem] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--fg)' }}>
                                {data.title}
                            </h3>
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {detailItems.map((item) => (
                                    <span
                                        key={`${data.id}-${item}`}
                                        className="text-[11px] px-2 py-1 rounded-md"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {engagementItems.map((item) => (
                                <span
                                    key={`${data.id}-${item.key}`}
                                    className="inline-flex items-center gap-1 text-[11px]"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    {item.icon}
                                    {item.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between xl:items-end gap-3 xl:pr-10">
                        <div className="text-left xl:text-right">
                            {data.priceLabel ? (
                                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                    {data.priceLabel}
                                </p>
                            ) : null}
                            <div className="flex items-baseline gap-2 xl:justify-end">
                                <p className="type-listing-price" style={{ color: 'var(--fg)' }}>
                                    {data.price}
                                </p>
                                {data.priceOriginal ? (
                                    <span className="text-xs line-through" style={{ color: 'var(--fg-muted)' }}>
                                        {data.priceOriginal}
                                    </span>
                                ) : null}
                            </div>
                            {secondaryPriceInfo ? (
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                    {secondaryPriceInfo}
                                </p>
                            ) : null}
                        </div>
                        <div className="w-full xl:w-auto xl:max-w-full">{renderActionCluster(false)}</div>
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article
            className="relative rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            onClick={openListing}
            onMouseLeave={() => setMenuOpen(false)}
        >
                {renderMenu()}

                <div className="relative">
                    {renderMedia('aspect-[4/3]')}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <PanelIconButton
                            type="button"
                            label={favorite ? 'Quitar de guardados' : 'Guardar propiedad'}
                            variant="overlay"
                            size="md"
                            onClick={toggleFavoriteState}
                            className="rounded-full shadow-sm"
                        >
                            {favorite ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                        </PanelIconButton>
                    </div>
                </div>

            <div className="p-4 space-y-2.5">
                <h3 className="text-[1.02rem] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--fg)' }}>
                    {data.title}
                </h3>

                {data.priceLabel ? (
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                        {data.priceLabel}
                    </p>
                ) : null}
                <div className="flex items-baseline gap-2">
                    <p className="type-listing-price" style={{ color: 'var(--fg)' }}>
                        {data.price}
                    </p>
                    {data.priceOriginal ? (
                        <span className="text-xs line-through" style={{ color: 'var(--fg-muted)' }}>
                            {data.priceOriginal}
                        </span>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {detailItems.map((item) => (
                        <span
                            key={`${data.id}-${item}`}
                            className="text-[11px] px-2 py-1 rounded-md"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                        >
                            {item}
                        </span>
                    ))}
                </div>

                {secondaryPriceInfo ? (
                    <div className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                        {secondaryPriceInfo}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                    {engagementItems.map((item) => (
                        <span
                            key={`${data.id}-${item.key}`}
                            className="inline-flex items-center gap-1 text-[11px]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            {item.icon}
                            {item.value}
                        </span>
                    ))}
                </div>

                <div className="pt-0.5">{renderActionCluster(true)}</div>
            </div>
        </article>
    );
}
