'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    IconArrowRight,
    IconSparkles,
    IconShieldCheck,
    IconClock,
    IconTrendingUp,
    IconUsers,
} from '@tabler/icons-react';
import HomeSearchBox from '@/components/search/home-searchbox';
import BoostedListingsSlider from '@/components/featured/boosted-listings-slider';
import { PanelCard, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui';
import { getCardAdPlaceholders } from '@/lib/ad-placeholders';
import {
    AD_UPDATE_EVENT,
    fetchPublicAdCampaigns,
    getActiveCampaignsByFormat,
    getActiveHeroCampaigns,
    getCampaignDestinationHref,
    type AdCampaign,
    type AdOverlayAlign,
} from '@/lib/advertising';

type HeroSlide = {
    id: string;
    headline: string;
    sub: string;
    cta: string;
    href: string;
    sponsored: boolean;
    overlayEnabled: boolean;
    align: AdOverlayAlign;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    heroPosition?: string;
};

type SponsoredBlock = {
    id: string;
    href: string;
    external: boolean;
    title: string;
    subtitle: string;
    cta: string;
    imageUrl?: string;
    mobileImageUrl?: string;
    overlayEnabled: boolean;
};

const BASE_SLIDES: HeroSlide[] = [
    {
        id: 'base-1',
        headline: 'Tu hogar está aquí.',
        sub: 'Miles de propiedades verificadas. Compra, arrienda o invierte en proyectos.',
        cta: 'Explorar',
        href: '/ventas',
        sponsored: false,
        overlayEnabled: true,
        align: 'left',
        desktopImageUrl: '/hero/home.svg',
        mobileImageUrl: '/hero/home.svg',
        heroPosition: 'center center',
    },
    {
        id: 'base-2',
        headline: 'Arrienda de forma segura.',
        sub: 'Contratos transparentes, arrendatarios verificados y soporte.',
        cta: 'Ver arriendos',
        href: '/arriendos',
        sponsored: false,
        overlayEnabled: true,
        align: 'left',
        desktopImageUrl: '/hero/rent.svg',
        mobileImageUrl: '/hero/rent.svg',
        heroPosition: 'center center',
    },
    {
        id: 'base-3',
        headline: 'Proyectos desde plano.',
        sub: 'Invierte desde la fase inicial con precios de preventa.',
        cta: 'Ver proyectos',
        href: '/proyectos',
        sponsored: false,
        overlayEnabled: true,
        align: 'left',
        desktopImageUrl: '/hero/projects.svg',
        mobileImageUrl: '/hero/projects.svg',
        heroPosition: 'center center',
    },
];

const EMPTY_CARD_ADS = getCardAdPlaceholders();

function campaignToSlide(campaign: AdCampaign): HeroSlide {
    return {
        id: campaign.id,
        headline: campaign.overlayTitle?.trim() ?? '',
        sub: campaign.overlaySubtitle?.trim() ?? '',
        cta: campaign.overlayCta?.trim() ?? '',
        href: getCampaignDestinationHref(campaign),
        sponsored: true,
        overlayEnabled: campaign.overlayEnabled,
        align: campaign.overlayAlign,
        desktopImageUrl: campaign.desktopImageDataUrl,
        mobileImageUrl: campaign.mobileImageDataUrl ?? undefined,
        heroPosition: 'center center',
    };
}

function alignmentClass(align: AdOverlayAlign): string {
    if (align === 'right') return 'items-end text-right ml-auto';
    if (align === 'center') return 'items-center text-center mx-auto';
    return 'items-start text-left';
}

export default function HomePage() {
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const [slides, setSlides] = useState<HeroSlide[]>(BASE_SLIDES);
    const [cardAds, setCardAds] = useState<SponsoredBlock[]>([]);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const dragStartXRef = useRef<number | null>(null);
    const dragDeltaXRef = useRef(0);
    const suppressClickRef = useRef(false);

    const reloadSlides = useCallback(() => {
        void (async () => {
            const campaigns = await fetchPublicAdCampaigns();
            const activeHeroSlides = getActiveHeroCampaigns(campaigns).map(campaignToSlide);
            const activeCardAds = getActiveCampaignsByFormat(campaigns, 'card')
                .slice(0, 3)
                .map((campaign) => ({
                    id: campaign.id,
                    href: getCampaignDestinationHref(campaign),
                    external:
                        getCampaignDestinationHref(campaign).startsWith('http://') ||
                        getCampaignDestinationHref(campaign).startsWith('https://'),
                    title: campaign.overlayTitle?.trim() || '',
                    subtitle: campaign.overlaySubtitle?.trim() || '',
                    cta: campaign.overlayCta?.trim() || '',
                    imageUrl: campaign.desktopImageDataUrl,
                    mobileImageUrl: campaign.mobileImageDataUrl ?? undefined,
                    overlayEnabled: campaign.overlayEnabled,
                }));
            setSlides([...activeHeroSlides, ...BASE_SLIDES]);
            setCardAds(activeCardAds);
        })();
    }, []);

    useEffect(() => {
        setHasMounted(true);
        reloadSlides();
        const onCampaignUpdate = () => reloadSlides();

        window.addEventListener(AD_UPDATE_EVENT, onCampaignUpdate as EventListener);

        return () => {
            window.removeEventListener(AD_UPDATE_EVENT, onCampaignUpdate as EventListener);
        };
    }, [reloadSlides]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const apply = () => setIsMobileViewport(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        setIdx((current) => {
            if (slides.length === 0) return 0;
            return current % slides.length;
        });
    }, [slides.length]);

    const next = useCallback(() => {
        setIdx((current) => (slides.length > 0 ? (current + 1) % slides.length : 0));
    }, [slides.length]);

    const prev = useCallback(() => {
        setIdx((current) => (slides.length > 0 ? (current - 1 + slides.length) % slides.length : 0));
    }, [slides.length]);

    useEffect(() => {
        if (paused || slides.length <= 1) return;
        const timer = setInterval(next, 5500);
        return () => clearInterval(timer);
    }, [paused, next, slides.length]);

    const activeSlide = slides[idx] ?? BASE_SLIDES[0];

    const handleHeroPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (slides.length <= 1) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            dragStartXRef.current = event.clientX;
            dragDeltaXRef.current = 0;
            setPaused(true);
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [slides.length]
    );

    const handleHeroPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (dragStartXRef.current === null) return;
        dragDeltaXRef.current = event.clientX - dragStartXRef.current;
    }, []);

    const endHeroDrag = useCallback(() => {
        dragStartXRef.current = null;
        dragDeltaXRef.current = 0;
        setPaused(false);
    }, []);

    const handleHeroPointerUp = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (dragStartXRef.current === null) return;

            if (Math.abs(dragDeltaXRef.current) > 56) {
                suppressClickRef.current = true;
                if (dragDeltaXRef.current < 0) next();
                else prev();
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            endHeroDrag();
        },
        [next, prev, endHeroDrag]
    );

    const handleHeroPointerCancel = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            endHeroDrag();
        },
        [endHeroDrag]
    );

    const handleHeroClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
    }, []);

    // Use desktop image during SSR to ensure consistent hydration,
    // then switch to mobile-aware selection after mount.
    const heroImage = hasMounted && isMobileViewport
        ? activeSlide.mobileImageUrl ?? activeSlide.desktopImageUrl
        : activeSlide.desktopImageUrl ?? activeSlide.mobileImageUrl;

    const heroStyle = useMemo<React.CSSProperties>(() => {
        if (!heroImage) {
            return { minHeight: '560px', background: 'var(--bg-subtle)' };
        }

        return {
            minHeight: '560px',
            backgroundImage: `linear-gradient(90deg, rgba(6, 10, 14, 0.72) 0%, rgba(6, 10, 14, 0.42) 46%, rgba(6, 10, 14, 0.16) 100%), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: activeSlide.heroPosition ?? 'center',
        };
    }, [activeSlide.heroPosition, heroImage]);

    const showOverlayContent = !activeSlide.sponsored || activeSlide.overlayEnabled;
    const isExternalHref = activeSlide.href.startsWith('http://') || activeSlide.href.startsWith('https://');
    const contentColor = heroImage ? '#ffffff' : 'var(--fg)';
    const subColor = heroImage ? 'rgba(255,255,255,0.86)' : 'var(--fg-secondary)';
    const cardSlots = useMemo(() => Array.from({ length: 3 }, (_, index) => cardAds[index] ?? null), [cardAds]);

    return (
        <div>
            <section className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <div
                    className="relative select-none overflow-hidden"
                    style={{ ...heroStyle, touchAction: 'pan-y' }}
                    onPointerDown={handleHeroPointerDown}
                    onPointerMove={handleHeroPointerMove}
                    onPointerUp={handleHeroPointerUp}
                    onPointerCancel={handleHeroPointerCancel}
                    onPointerLeave={handleHeroPointerCancel}
                    onClickCapture={handleHeroClickCapture}
                >
                    {activeSlide.sponsored && activeSlide.href !== '#' ? (
                        <Link
                            href={activeSlide.href}
                            target={isExternalHref ? '_blank' : undefined}
                            rel={isExternalHref ? 'noopener noreferrer' : undefined}
                            aria-label="Ir al anuncio patrocinado"
                            className="absolute inset-0 z-1"
                        />
                    ) : null}

                    <div className="container-app relative z-2 flex items-center" style={{ minHeight: '500px' }}>
                        <div
                            className={`w-full max-w-2xl pt-16 pb-28 md:py-20 animate-fade-in ${alignmentClass(activeSlide.align)}`}
                            key={`${idx}-${activeSlide.id}`}
                        >
                            {showOverlayContent ? (
                                <>
                                    <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1.05] mb-5" style={{ color: contentColor }}>
                                        {activeSlide.headline}
                                    </h1>
                                    {activeSlide.sub ? (
                                        <p className="text-[clamp(1rem,1.8vw,1.15rem)] mb-8 max-w-lg" style={{ color: subColor }}>
                                            {activeSlide.sub}
                                        </p>
                                    ) : null}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {activeSlide.cta ? (
                                            <Link
                                                href={activeSlide.href}
                                                target={isExternalHref ? '_blank' : undefined}
                                                rel={isExternalHref ? 'noopener noreferrer' : undefined}
                                                className={getPanelButtonClassName({ className: 'h-12 px-7 text-sm' })}
                                                style={getPanelButtonStyle('primary')}
                                            >
                                                {activeSlide.cta} <IconArrowRight size={15} />
                                            </Link>
                                        ) : null}
                                        {!activeSlide.sponsored ? (
                                            <Link
                                                href="/servicios"
                                                className={getPanelButtonClassName({ className: 'h-12 px-7 text-sm' })}
                                                style={getPanelButtonStyle('secondary')}
                                            >
                                                Servicios <IconSparkles size={14} />
                                            </Link>
                                        ) : null}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-20 md:bottom-20 z-12">
                        <div className="container-app flex items-center justify-center">
                            <div
                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5"
                                style={{ borderColor: heroImage ? 'rgba(255,255,255,0.28)' : 'var(--border)', background: heroImage ? 'rgba(0,0,0,0.34)' : 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                            >
                                {slides.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setIdx(index)}
                                        aria-label={`Ir al slide ${index + 1}`}
                                        className="transition-all duration-300"
                                        style={{
                                            width: idx === index ? 24 : 8,
                                            height: 4,
                                            borderRadius: 4,
                                            background: idx === index
                                                ? (heroImage ? '#ffffff' : 'var(--fg)')
                                                : (heroImage ? 'rgba(255,255,255,0.35)' : 'var(--fg-faint)'),
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-11 -mt-12 md:-mt-16">
                    <HomeSearchBox />
                </div>

                <div className="container-app pt-8 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {cardSlots.map((ad, slotIndex) => {
                            if (!ad) {
                                const placeholder = EMPTY_CARD_ADS[slotIndex] ?? EMPTY_CARD_ADS[0];
                                return (
                                    <article
                                        key={`empty-slot-${slotIndex}`}
                                        className="relative overflow-hidden rounded-xl min-h-42.5"
                                        style={{
                                            border: '1px solid var(--border)',
                                            background: `linear-gradient(to right, rgba(0,0,0,0.58), rgba(0,0,0,0.24)), url(${placeholder.imageUrl}) center / cover no-repeat`,
                                        }}
                                    >
                                        <div className="relative z-2 h-full p-4 flex items-start">
                                            <span className="inline-flex w-fit rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                                                {placeholder.label}
                                            </span>
                                        </div>
                                    </article>
                                );
                            }

                            const href = ad.href || '#';
                            const hasLink = href !== '#';
                            const image = isMobileViewport ? ad.mobileImageUrl ?? ad.imageUrl : ad.imageUrl ?? ad.mobileImageUrl;
                            return (
                                <article
                                    key={ad.id}
                                    className="relative rounded-xl overflow-hidden min-h-42.5"
                                    style={{ border: '1px solid var(--border)', background: image ? `linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.2)), url(${image}) center / cover no-repeat` : 'var(--bg-muted)' }}
                                >
                                    {hasLink ? (
                                        <Link
                                            href={href}
                                            target={ad.external ? '_blank' : undefined}
                                            rel={ad.external ? 'noopener noreferrer' : undefined}
                                            className="absolute inset-0 z-1"
                                            aria-label="Ir al anuncio"
                                        />
                                    ) : null}
                                    <div className="relative z-2 h-full p-4 flex flex-col justify-end">
                                        {ad.overlayEnabled ? (
                                            <>
                                                {ad.title ? <h3 className="text-base font-semibold text-white leading-tight line-clamp-2">{ad.title}</h3> : null}
                                                {ad.subtitle ? <p className="text-sm text-white/80 mt-1 line-clamp-2">{ad.subtitle}</p> : null}
                                            </>
                                        ) : (
                                            ad.title ? <p className="text-sm text-white/90">{ad.title}</p> : null
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <BoostedListingsSlider />

            <section className="container-app py-20">
                <h2 className="text-2xl md:text-3xl font-semibold text-center mb-4" style={{ color: 'var(--fg)' }}>¿Por qué Simple?</h2>
                <p className="text-center text-base mb-12" style={{ color: 'var(--fg-muted)' }}>La plataforma que simplifica todo.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[ 
                        { icon: <IconShieldCheck size={20} />, t: 'Verificado', d: 'Propiedades revisadas y corredores certificados.' },
                        { icon: <IconClock size={20} />, t: 'Rápido', d: 'Publica en minutos. Encuentra compradores en días.' },
                        { icon: <IconTrendingUp size={20} />, t: 'Boost', d: 'Destaca tus propiedades y multiplica visitas.' },
                        { icon: <IconUsers size={20} />, t: 'Comunidad', d: 'Miles de compradores y arrendatarios activos.' },
                    ].map((feature) => (
                        <PanelCard key={feature.t} size="md" className="h-full">
                            <div className="mb-3" style={{ color: 'var(--fg-muted)' }}>{feature.icon}</div>
                            <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>{feature.t}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{feature.d}</p>
                        </PanelCard>
                    ))}
                </div>
            </section>

            <section style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container-app py-20 text-center">
                    <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--fg)' }}>¿Listo para empezar?</h2>
                    <p className="text-base mb-8" style={{ color: 'var(--fg-muted)' }}>Publica gratis o deja que gestionemos por ti.</p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/panel/publicar" className={getPanelButtonClassName({ className: 'h-12 px-8 text-sm' })} style={getPanelButtonStyle('primary')}>Publicar gratis</Link>
                        <Link href="/servicios/venta-asistida" className={getPanelButtonClassName({ className: 'h-12 px-8 text-sm' })} style={getPanelButtonStyle('secondary')}>Gestión inmobiliaria</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

