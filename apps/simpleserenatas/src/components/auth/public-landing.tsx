'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    IconCalendar,
    IconCheck,
    IconChevronRight,
    IconClockHour4,
    IconHeart,
    IconHeartHandshake,
    IconMusic,
    IconSearch,
    IconShieldCheck,
    IconSparkles,
    IconUsersGroup,
} from '@tabler/icons-react';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/layout/footer';
import { PanelButton, PanelButtonLink, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui/panel';
import { MarketplaceSearchPanel } from '@/components/public/marketplace-search-panel';
import { PublicProviderGroupCard } from '@/components/public/public-provider-group-card';
import { sortMarketplaceGroups } from '@/lib/marketplace-group-display';
import {
    defaultLandingSearch,
    marketplaceCatalogHref,
    profileHrefWithDate,
    type MarketplaceSearchFilters,
} from '@/lib/marketplace-search';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { useLandingHashScroll } from '@/hooks/use-landing-hash-scroll';

const BENEFIT_ICONS = [IconClockHour4, IconShieldCheck, IconHeartHandshake] as const;

type PublicLandingProps = {
    onLogin: () => void;
    onRegister: () => void;
    /** Header de invitado; si se omite y hay sesión, pásalo desde el padre (p. ej. chrome del panel). */
    header?: ReactNode;
    isLoggedIn?: boolean;
};

const HERO_IMAGE =
    'https://images.unsplash.com/photo-1769230367366-13ed92feb145?auto=format&fit=crop&w=1800&q=82';

const HERO_SECONDARY_BUTTON_STYLE = {
    '--panel-btn-bg': 'rgb(255 255 255 / 0.12)',
    '--panel-btn-color': '#fff',
    '--panel-btn-border': 'rgb(255 255 255 / 0.28)',
    '--panel-btn-hover-bg': 'rgb(255 255 255 / 0.2)',
    '--panel-btn-hover-color': '#fff',
    '--panel-btn-hover-border': 'rgb(255 255 255 / 0.28)',
    '--panel-btn-shadow': 'none',
    '--panel-btn-hover-shadow': 'none',
} as CSSProperties;

const OCCASIONS = ['Cumpleaños', 'Aniversarios', 'Sorpresas', 'Bodas', 'Día de la Madre', 'Reconciliaciones'];

const HOW_IT_WORKS = [
    { icon: IconSearch, title: 'Elige un mariachi', desc: 'Revisa fotos, servicios, zonas y precio desde.' },
    { icon: IconCalendar, title: 'Solicita fecha y lugar', desc: 'Indica comuna, dirección, hora y destinatario.' },
    { icon: IconCheck, title: 'Recibe confirmación', desc: 'El dueño revisa disponibilidad y conforma el grupo.' },
];

const FEATURED_COUNT = 3;

type FeaturedStatus = { loading: boolean; error: string | null };

export function PublicLanding({
    onLogin,
    onRegister,
    header,
    isLoggedIn = false,
}: PublicLandingProps) {
    const router = useRouter();
    useLandingHashScroll();
    const copy = resolveOperatorLandingCopy('serenatas');
    const ownerBenefits = copy.benefits.map((item, index) => ({
        ...item,
        icon: BENEFIT_ICONS[index] ?? IconHeartHandshake,
    }));
    const [search, setSearch] = useState<MarketplaceSearchFilters>(defaultLandingSearch);
    const [featured, setFeatured] = useState<ProviderGroup[]>([]);
    const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatus>({ loading: true, error: null });

    useEffect(() => {
        let cancelled = false;
        void serenatasApi.marketplaceGroups({ limit: 24, offset: 0 }).then((response) => {
            if (cancelled) return;
            if (!response.ok) {
                setFeatured([]);
                setFeaturedStatus({
                    loading: false,
                    error: response.error ?? 'No pudimos cargar destacados.',
                });
                return;
            }
            setFeatured(sortMarketplaceGroups(response.items, 'recommended').slice(0, FEATURED_COUNT));
            setFeaturedStatus({ loading: false, error: null });
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const submitSearch = useCallback(
        (event?: FormEvent<HTMLFormElement>) => {
            event?.preventDefault();
            router.push(marketplaceCatalogHref(search));
        },
        [router, search],
    );

    const openMariachi = useCallback(
        (slug: string) => {
            router.push(profileHrefWithDate(slug, search.date));
        },
        [router, search.date],
    );

    return (
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-(--bg) text-(--fg)">
            {header ?? <LandingHeader onLogin={onLogin} onRegister={onRegister} />}

            <main className="flex-1">
                <section id="hero" className="relative isolate overflow-hidden border-b border-border">
                    <img
                        src={HERO_IMAGE}
                        alt="Mariachis tocando en una celebración"
                        className="absolute inset-0 -z-20 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden />
                    <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-black/75 to-transparent" aria-hidden />

                    <div className="container-app vertical-hero-texture flex min-h-[calc(100svh-9rem)] max-w-6xl flex-col justify-center section-marketing sm:min-h-[calc(100svh-11rem)]">
                        <div className="max-w-3xl">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                                <IconSparkles size={14} />
                                Marketplace de mariachis
                            </div>
                            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white text-balance sm:text-6xl lg:text-7xl">
                                Encuentra mariachis para tu serenata
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/82 sm:text-xl">
                                Encuentra grupos destacados, revisa servicios, precios y zonas de atención, y solicita tu fecha desde un solo lugar.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <PanelButtonLink
                                    href="/mariachis"
                                    variant="accent"
                                    className="h-13 px-7 text-base sm:h-14 sm:px-9"
                                >
                                    Explorar mariachis
                                    <IconChevronRight size={19} />
                                </PanelButtonLink>
                                {isLoggedIn ? (
                                    <PanelButtonLink
                                        href="/panel"
                                        variant="ghost"
                                        className="h-13 border px-7 text-base backdrop-blur sm:h-14 sm:px-9"
                                        style={HERO_SECONDARY_BUTTON_STYLE}
                                    >
                                        Mi panel
                                    </PanelButtonLink>
                                ) : (
                                    <PanelButton
                                        type="button"
                                        variant="ghost"
                                        className="h-13 border px-7 text-base backdrop-blur sm:h-14 sm:px-9"
                                        style={HERO_SECONDARY_BUTTON_STYLE}
                                        onClick={onRegister}
                                    >
                                        Registrar mi mariachi
                                    </PanelButton>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="para-clientes" className="relative z-10 -mt-10 scroll-mt-20">
                    <div className="container-app">
                        <MarketplaceSearchPanel
                            value={search}
                            onChange={setSearch}
                            onSubmit={submitSearch}
                        />
                    </div>
                </section>

                <section id="destacados" className="scroll-mt-24 border-b py-14 border-border sm:py-18">
                    <div className="container-app max-w-6xl">
                        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                                    Marketplace
                                </p>
                                <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                                    Mariachis destacados
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm text-fg-muted">
                                    Una muestra del catálogo. Filtra por zona, nombre y fecha con cupo disponible.
                                </p>
                            </div>
                            <PanelButtonLink
                                href="/mariachis"
                                variant="secondary"
                                className="h-11 px-5 sm:self-center"
                            >
                                Ver todos
                                <IconChevronRight size={17} />
                            </PanelButtonLink>
                        </div>
                        {featuredStatus.loading ? null : featured.length === 0 ? (
                            <div className="rounded-card border p-8 text-center border-border bg-surface">
                                <p className="text-sm text-fg-muted">
                                    {featuredStatus.error ?? 'Aún no hay mariachis publicados en el catálogo.'}
                                </p>
                                <PanelButtonLink href="/mariachis" variant="accent" className="mt-4 h-11 px-6">
                                    Explorar catálogo
                                </PanelButtonLink>
                            </div>
                        ) : (
                            <div className="grid gap-5 md:grid-cols-3">
                                {featured.map((group) => (
                                    <PublicProviderGroupCard
                                        key={group.id}
                                        group={group}
                                        href={profileHrefWithDate(group.slug, search.date)}
                                        onOpen={openMariachi}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section id="como-funciona" className="border-b py-14 border-border bg-bg-subtle scroll-mt-20 sm:py-18">
                    <div className="container-app max-w-6xl">
                        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                                    Cómo funciona
                                </p>
                                <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                                    De la idea a la serenata en tres pasos
                                </h2>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {HOW_IT_WORKS.map((step, index) => (
                                    <StepCard key={step.title} step={step} index={index + 1} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b py-14 border-border sm:py-18">
                    <div className="container-app max-w-6xl">
                        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                            <div className="max-w-xl">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                                    Para cada ocasión
                                </p>
                                <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
                                    La música correcta para el momento correcto
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-3 lg:justify-end">
                                {OCCASIONS.map((occasion) => (
                                    <span
                                        key={occasion}
                                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium border-border bg-surface text-fg-secondary"
                                    >
                                        <IconHeart size={15} className="text-accent" />
                                        {occasion}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="para-duenos" className="border-b py-14 border-border bg-bg-subtle scroll-mt-20 sm:py-18">
                    <div className="container-app max-w-6xl">
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                                {copy.sectionEyebrow}
                            </p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                                {copy.sectionTitle}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">
                                {copy.sectionSubtitle}
                            </p>
                        </div>
                        <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
                            {ownerBenefits.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-card border p-5 text-center border-border bg-surface"
                                >
                                    <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-button bg-accent-soft text-accent">
                                        <item.icon size={20} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-fg">{item.title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 text-center">
                            <PanelButton
                                type="button"
                                variant="accent"
                                className="h-12 px-8"
                                onClick={onRegister}
                            >
                                {copy.sectionCta}
                                <IconChevronRight size={17} />
                            </PanelButton>
                            <p className="mt-4 text-xs text-fg-muted max-w-md mx-auto">
                                {copy.sectionFootnote}
                            </p>
                        </div>
                    </div>
                </section>

                <section id="musicos" className="py-14 scroll-mt-20 sm:py-18">
                    <div className="container-app max-w-6xl">
                        <div className="grid gap-5 lg:grid-cols-2">
                            <AudienceCard
                                icon={IconUsersGroup}
                                title="¿Tienes un mariachi?"
                                description={copy.audienceOwnerDescription}
                                cta="Empezar gratis"
                                onClick={onRegister}
                            />
                            <AudienceCard
                                icon={IconMusic}
                                title="Toca con más grupos"
                                description="Crea tu cuenta y elige Soy músico para completar tu perfil musical y recibir invitaciones."
                                cta="Registrarme"
                                onClick={onRegister}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function StepCard({
    step,
    index,
}: {
    step: (typeof HOW_IT_WORKS)[number];
    index: number;
}) {
    return (
        <div className="rounded-card border p-5 border-border bg-surface">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-button bg-accent-soft text-accent">
                    <step.icon size={22} />
                </div>
                <span className="text-sm font-bold text-fg-muted">{String(index).padStart(2, '0')}</span>
            </div>
            <h3 className="text-lg font-bold text-fg">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.desc}</p>
        </div>
    );
}

function AudienceCard({
    icon: Icon,
    title,
    description,
    cta,
    href,
    onClick,
    accent,
}: {
    icon: typeof IconMusic;
    title: string;
    description: string;
    cta: string;
    href?: string;
    onClick?: () => void;
    accent?: boolean;
}) {
    const content = (
        <>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                <Icon size={24} />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-fg">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{description}</p>
                <span
                    className={getPanelButtonClassName({ className: 'mt-5 inline-flex h-11 px-5' })}
                    style={getPanelButtonStyle(accent ? 'accent' : 'secondary')}
                >
                    {cta}
                    <IconChevronRight size={17} />
                </span>
            </div>
        </>
    );

    const className =
        'grid gap-5 rounded-card border p-6 border-border bg-surface shadow-sm sm:grid-cols-[auto_1fr] sm:p-7';

    if (href) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" className={`${className} text-left`} onClick={onClick}>
            {content}
        </button>
    );
}
