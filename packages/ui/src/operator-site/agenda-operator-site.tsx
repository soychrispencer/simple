'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandWhatsapp,
    IconBrandX,
    IconBrandYoutube,
    IconBuildingBank,
    IconCalendarEvent,
    IconCreditCard,
    IconLink,
    IconMail,
    IconMapPin,
    IconPhone,
    IconWorld,
} from '@tabler/icons-react';
import {
    DEFAULT_OPERATOR_SITE_COLOR_MODE,
    DEFAULT_OPERATOR_SITE_LAYOUT,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    resolveAppMediaUrl,
    type OperatorSiteLayout,
} from '@simple/utils';
import { OperatorSiteAboutSection } from './operator-site-about.js';
import { OperatorSiteBookingHeroCard } from './operator-site-booking-hero-card.js';
import { OperatorSiteThemeShell } from './operator-site-theme-shell.js';
import { OperatorSiteReveal } from './operator-site-reveal.js';
import { OperatorSiteScheduleSection, OperatorSiteScheduleSidebar } from './operator-site-schedule.js';
import { OperatorSiteOffersBlock } from './operator-site-catalog.js';
import { OperatorSiteServiceGrid } from './operator-site-service-grid.js';
import { OperatorSiteStudioBento } from './operator-site-studio-bento.js';
import { OperatorSiteNav } from './operator-site-nav.js';
import type { AgendaOperatorSiteProps, OperatorSiteCatalog, OperatorSiteSocialLink } from './types.js';

const ALL_NAV_ITEMS = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'sobre-mi', label: 'Sobre mí' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'horarios', label: 'Horarios' },
    { id: 'ubicacion', label: 'Ubicación' },
    { id: 'contacto', label: 'Contacto' },
    { id: 'pagos', label: 'Pagos' },
] as const;

const BOOKING_SECTION_ID = 'servicios';

function socialIcon(kind: OperatorSiteSocialLink['kind']) {
    const size = 18;
    switch (kind) {
        case 'instagram': return <IconBrandInstagram size={size} />;
        case 'facebook': return <IconBrandFacebook size={size} />;
        case 'linkedin': return <IconBrandLinkedin size={size} />;
        case 'tiktok': return <IconBrandTiktok size={size} />;
        case 'youtube': return <IconBrandYoutube size={size} />;
        case 'x': return <IconBrandX size={size} />;
    }
}

function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PaymentMethodsBlock({ pm }: { pm: AgendaOperatorSiteProps['profile']['paymentMethods'] }) {
    const hasMercadoPago = pm.mpConnected || pm.acceptsMp;
    const hasTransfer = Boolean(pm.bankTransferData);
    const hasPaymentLink = Boolean(pm.paymentLinkUrl);

    if (!hasMercadoPago && !hasTransfer && !hasPaymentLink) return null;

    return (
        <OperatorSiteReveal>
            <section id="pagos" className="os-section">
                <div className="os-section__inner">
                    <p className="os-section__label">Pagos</p>
                    <h2 className="os-section__title">Medios de pago</h2>
                    <div className="os-glass" style={{ padding: '1.25rem' }}>
                        <div className="flex flex-col gap-3">
                            {pm.requiresAdvancePayment ? (
                                <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                    Puede solicitarse pago anticipado al reservar.
                                </p>
                            ) : null}
                            {hasMercadoPago ? (
                                <div className="os-contact-card">
                                    <span className="os-contact-card__icon" style={{ background: 'rgba(0,158,227,0.12)', color: '#009EE3' }}>
                                        <IconCreditCard size={16} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-(--fg)">Mercado Pago</p>
                                        <p className="text-xs text-(--fg-muted)">
                                            {pm.mpConnected ? 'Tarjeta o débito al reservar.' : 'Acepta Mercado Pago.'}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            {hasTransfer && pm.bankTransferData ? (
                                <div className="os-contact-card items-start">
                                    <span className="os-contact-card__icon">
                                        <IconBuildingBank size={16} />
                                    </span>
                                    <div className="text-xs text-(--fg-secondary) min-w-0">
                                        <p className="text-sm font-semibold text-(--fg) mb-1">Transferencia</p>
                                        <p>{pm.bankTransferData.bank} · {pm.bankTransferData.accountType}</p>
                                        <p>Cuenta {pm.bankTransferData.accountNumber}</p>
                                        <p>{pm.bankTransferData.holderName}</p>
                                    </div>
                                </div>
                            ) : null}
                            {hasPaymentLink && pm.paymentLinkUrl ? (
                                <a href={pm.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="os-contact-card">
                                    <span className="os-contact-card__icon">
                                        <IconLink size={16} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-(--fg)">Link de pago</p>
                                        <p className="text-xs text-(--accent) truncate">{pm.paymentLinkUrl}</p>
                                    </div>
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </OperatorSiteReveal>
    );
}

function LocationSection({ profile }: { profile: AgendaOperatorSiteProps['profile'] }) {
    return (
        <OperatorSiteReveal delayMs={80}>
            <section id="ubicacion" className="os-section">
                <div className="os-section__inner">
                    <p className="os-section__label">Ubicación</p>
                    <h2 className="os-section__title">Dónde atiendo</h2>
                    <div className="flex flex-col gap-3">
                        {profile.city ? (
                            <div className="os-location-card">
                                <span className="os-contact-card__icon">
                                    <IconMapPin size={16} />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-(--fg)">Zona de operación</p>
                                    <p className="text-sm text-(--fg-secondary)">
                                        {[profile.city, profile.region].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        {profile.locations.map((loc) => {
                            const mapUrl = loc.googleMapsUrl
                                || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.addressLine, loc.city, loc.region].filter(Boolean).join(', '))}`;
                            return (
                                <a
                                    key={loc.id}
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="os-location-card"
                                >
                                    <span className="os-contact-card__icon">
                                        <IconMapPin size={16} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-(--fg)">{loc.name}</p>
                                        <p className="text-sm text-(--fg-secondary)">{loc.addressLine}</p>
                                        {(loc.city || loc.region) ? (
                                            <p className="text-xs text-(--fg-muted)">
                                                {[loc.city, loc.region].filter(Boolean).join(', ')}
                                            </p>
                                        ) : null}
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </section>
        </OperatorSiteReveal>
    );
}

function ContactSection({
    profile,
    socialLinks,
    whatsappHref,
}: {
    profile: AgendaOperatorSiteProps['profile'];
    socialLinks: OperatorSiteSocialLink[];
    whatsappHref: string | null;
}) {
    return (
        <OperatorSiteReveal delayMs={120}>
            <section id="contacto" className="os-section">
                <div className="os-section__inner">
                    <p className="os-section__label">Contacto</p>
                    <h2 className="os-section__title">Hablemos</h2>
                    <p className="os-section__lead">Escríbeme por el canal que prefieras.</p>
                    <div className="os-grid-2">
                        {profile.publicPhone ? (
                            <a href={`tel:${profile.publicPhone}`} className="os-contact-card">
                                <span className="os-contact-card__icon"><IconPhone size={16} /></span>
                                <span className="text-sm font-medium text-(--fg)">Teléfono</span>
                            </a>
                        ) : null}
                        {whatsappHref ? (
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="os-contact-card">
                                <span className="os-contact-card__icon" style={{ background: '#25D36615', color: '#25D366' }}>
                                    <IconBrandWhatsapp size={16} />
                                </span>
                                <span className="text-sm font-medium text-(--fg)">WhatsApp</span>
                            </a>
                        ) : null}
                        {profile.publicEmail ? (
                            <a href={`mailto:${profile.publicEmail}`} className="os-contact-card">
                                <span className="os-contact-card__icon"><IconMail size={16} /></span>
                                <span className="text-sm font-medium text-(--fg)">Email</span>
                            </a>
                        ) : null}
                        {profile.websiteUrl ? (
                            <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="os-contact-card">
                                <span className="os-contact-card__icon"><IconWorld size={16} /></span>
                                <span className="text-sm font-medium text-(--fg)">Sitio web</span>
                            </a>
                        ) : null}
                    </div>
                    {socialLinks.length > 0 ? (
                        <div className="os-social-row">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="os-social-chip"
                                    title={link.label}
                                    aria-label={link.label}
                                >
                                    {socialIcon(link.kind)}
                                </a>
                            ))}
                        </div>
                    ) : null}
                </div>
            </section>
        </OperatorSiteReveal>
    );
}

function HeroIntro({
    profile,
    typeLabel,
    businessLabel,
    modalityBadges,
    whatsappHref,
    hasContact,
    layout,
}: {
    profile: AgendaOperatorSiteProps['profile'];
    typeLabel: string;
    businessLabel: string;
    modalityBadges: string[];
    whatsappHref: string | null;
    hasContact: boolean;
    layout: OperatorSiteLayout;
}) {
    const avatarUrl = resolveAppMediaUrl(profile.avatarUrl);
    const initials = profile.displayName?.charAt(0).toUpperCase() ?? '?';
    const compact = layout === 'studio';

    return (
        <div className="os-hero__intro">
            <div className={`os-hero__grid${compact ? ' os-hero__grid--compact' : ''}`}>
                <div className="os-hero__avatar">
                    {avatarUrl ? (
                        <Image src={avatarUrl} alt={profile.displayName} width={120} height={120} className="h-full w-full object-cover" />
                    ) : (
                        initials
                    )}
                </div>
                <div>
                    <div className="os-hero__eyebrow">
                        <span className="os-hero__badge">{typeLabel}</span>
                        {modalityBadges.map((badge) => (
                            <span key={badge} className="os-hero__badge">{badge}</span>
                        ))}
                    </div>
                    <h1 className="os-hero__title">{profile.displayName}</h1>
                    {profile.headline ? (
                        <p className="os-hero__headline">{profile.headline}</p>
                    ) : profile.profession ? (
                        <p className="os-hero__headline">{profile.profession}</p>
                    ) : null}
                    <p className="os-hero__subtitle">{businessLabel}</p>
                    {layout === 'booking' ? (
                        <div className="os-hero__actions os-hero__actions--compact">
                            {whatsappHref ? (
                                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="os-btn os-btn--whatsapp">
                                    <IconBrandWhatsapp size={18} />
                                    WhatsApp
                                </a>
                            ) : null}
                            {hasContact ? (
                                <button type="button" className="os-btn os-btn--ghost" onClick={() => scrollToSection('contacto')}>
                                    Contacto
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="os-hero__actions">
                            <button type="button" className="os-btn os-btn--primary" onClick={() => scrollToSection(BOOKING_SECTION_ID)}>
                                <IconCalendarEvent size={18} />
                                Reservar cita
                            </button>
                            {whatsappHref ? (
                                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="os-btn os-btn--whatsapp">
                                    <IconBrandWhatsapp size={18} />
                                    WhatsApp
                                </a>
                            ) : null}
                            {hasContact ? (
                                <button type="button" className="os-btn os-btn--ghost" onClick={() => scrollToSection('contacto')}>
                                    Contacto
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function HeroSection({
    profile,
    typeLabel,
    businessLabel,
    modalityBadges,
    whatsappHref,
    hasContact,
    layout,
    catalog,
    onServiceBook,
}: {
    profile: AgendaOperatorSiteProps['profile'];
    typeLabel: string;
    businessLabel: string;
    modalityBadges: string[];
    whatsappHref: string | null;
    hasContact: boolean;
    layout: OperatorSiteLayout;
    catalog: OperatorSiteCatalog | null | undefined;
    onServiceBook?: (serviceId: string) => void;
}) {
    const coverUrl = resolveAppMediaUrl(profile.coverUrl);
    const heroClass = [
        'os-hero',
        layout === 'booking' ? 'os-hero--booking' : '',
        layout === 'portfolio' ? 'os-hero--portfolio' : '',
        layout === 'studio' ? 'os-hero--studio' : '',
    ].filter(Boolean).join(' ');

    return (
        <section id="inicio" className={heroClass}>
            <div className="os-hero__media" aria-hidden>
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt=""
                        fill
                        priority
                        className="os-hero__cover"
                        sizes="100vw"
                    />
                ) : (
                    <div className="os-hero__fallback" />
                )}
                <div className="os-hero__overlay" />
            </div>

            <div className="os-hero__content">
                {layout === 'booking' ? (
                    <div className="os-hero__booking-split">
                        <HeroIntro
                            profile={profile}
                            typeLabel={typeLabel}
                            businessLabel={businessLabel}
                            modalityBadges={modalityBadges}
                            whatsappHref={whatsappHref}
                            hasContact={hasContact}
                            layout={layout}
                        />
                        {catalog && onServiceBook ? (
                            <OperatorSiteBookingHeroCard
                                catalog={catalog}
                                onBook={onServiceBook}
                                onViewAll={() => scrollToSection(BOOKING_SECTION_ID)}
                            />
                        ) : null}
                    </div>
                ) : (
                    <HeroIntro
                        profile={profile}
                        typeLabel={typeLabel}
                        businessLabel={businessLabel}
                        modalityBadges={modalityBadges}
                        whatsappHref={whatsappHref}
                        hasContact={hasContact}
                        layout={layout}
                    />
                )}
            </div>
        </section>
    );
}

function ServicesSection({
    layout,
    catalog,
    hasServices,
    hasOffers,
    profile,
    onServiceBook,
    booking,
    showInlineBooking,
}: {
    layout: OperatorSiteLayout;
    catalog: NonNullable<AgendaOperatorSiteProps['catalog']>;
    hasServices: boolean;
    hasOffers: boolean;
    profile: AgendaOperatorSiteProps['profile'];
    onServiceBook?: (serviceId: string) => void;
    booking: ReactNode | null;
    showInlineBooking: boolean;
}) {
    const serviceVariant = layout === 'portfolio' ? 'carousel' : 'grid';
    const lead = layout === 'portfolio'
        ? 'Explora mis servicios y reserva la experiencia que buscas.'
        : layout === 'studio'
            ? 'Servicios disponibles con reserva en línea.'
            : 'Conoce mis servicios y reserva en línea en pocos pasos.';

    return (
        <OperatorSiteReveal delayMs={40}>
            <section id={BOOKING_SECTION_ID} className="os-section os-section--flush">
                <div className="os-section__inner os-section__inner--flush">
                    <p className="os-section__label">Servicios</p>
                    <h2 className="os-section__title">
                        {layout === 'portfolio' ? 'Mi trabajo' : 'Qué ofrezco'}
                    </h2>
                    <p className="os-section__lead">{lead}</p>

                    {hasServices ? (
                        <OperatorSiteServiceGrid
                            services={catalog.services}
                            imageFallbackUrl={profile.avatarUrl}
                            onBook={onServiceBook}
                            variant={serviceVariant}
                        />
                    ) : null}

                    {hasOffers ? <OperatorSiteOffersBlock catalog={catalog} /> : null}

                    {showInlineBooking ? (
                        <div className="os-booking-panel">
                            <h3 className="os-booking-panel__title">Reserva online</h3>
                            <p className="os-booking-panel__lead">
                                {hasServices
                                    ? 'Toca Reservar en un servicio o continúa aquí con fecha y horario.'
                                    : 'Elige fecha y horario. Confirmación inmediata según disponibilidad.'}
                            </p>
                            <div className="os-booking-shell">{booking}</div>
                        </div>
                    ) : (
                        <div className="os-booking-cta-strip">
                            <p>¿Listo para agendar?</p>
                            <button type="button" className="os-btn os-btn--primary" onClick={() => scrollToSection('inicio')}>
                                <IconCalendarEvent size={18} />
                                Ver servicios y reservar
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </OperatorSiteReveal>
    );
}

export function AgendaOperatorSite({
    profile,
    typeLabel,
    businessLabel,
    socialLinks,
    booking,
    schedule,
    catalog,
    onServiceBook,
    appearance,
    brandName = 'SimpleAgenda',
    brandHref = 'https://simpleagenda.app',
}: AgendaOperatorSiteProps) {
    const [navScrolled, setNavScrolled] = useState(false);
    const [hideFloatCta, setHideFloatCta] = useState(true);

    const whatsappHref = profile.publicWhatsapp
        ? `https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`
        : null;

    const hasLocation = Boolean(profile.city || profile.locations.length > 0);
    const hasContact = Boolean(
        profile.publicEmail || profile.publicPhone || whatsappHref || profile.websiteUrl || socialLinks.length > 0,
    );
    const hasBio = Boolean(profile.bio);
    const hasSchedule = Boolean(schedule && (schedule.alwaysOpen || schedule.days.some((day) => day.isActive)));
    const hasServices = Boolean(catalog && catalog.services.length > 0);
    const hasOffers = Boolean(
        catalog && (catalog.packs.length > 0 || catalog.promotions.length > 0),
    );
    const hasPayments = Boolean(
        profile.paymentMethods.mpConnected
        || profile.paymentMethods.acceptsMp
        || profile.paymentMethods.bankTransferData
        || profile.paymentMethods.paymentLinkUrl,
    );

    const layout = normalizeOperatorSiteLayout(appearance?.layout ?? DEFAULT_OPERATOR_SITE_LAYOUT);
    const colorMode = normalizeOperatorSiteColorMode(appearance?.colorMode ?? DEFAULT_OPERATOR_SITE_COLOR_MODE);
    const isStudio = layout === 'studio';
    const isPortfolio = layout === 'portfolio';
    const isBooking = layout === 'booking';

    const navItems = useMemo(() => ALL_NAV_ITEMS.filter((item) => {
        if (item.id === 'sobre-mi') return hasBio;
        if (item.id === 'horarios') return hasSchedule;
        if (item.id === 'ubicacion') return hasLocation;
        if (item.id === 'contacto') return hasContact;
        if (item.id === 'pagos') return hasPayments;
        return true;
    }), [hasBio, hasSchedule, hasLocation, hasContact, hasPayments]);

    const modalityBadges = useMemo(() => {
        const items: string[] = [];
        if (profile.servesOnline) items.push('Online');
        if (profile.servesPresential) items.push('Presencial');
        return items;
    }, [profile.servesOnline, profile.servesPresential]);

    const showInlineBooking = !isBooking;
    const useScheduleSidebar = hasSchedule && isBooking;
    const useContentLayout = !isStudio;

    useEffect(() => {
        const onScroll = () => {
            setNavScrolled(window.scrollY > 24);
            const heroBottom = document.getElementById('inicio')?.offsetHeight ?? 400;
            setHideFloatCta(window.scrollY < heroBottom * 0.55);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const servicesBlock = catalog ? (
        <ServicesSection
            layout={layout}
            catalog={catalog}
            hasServices={hasServices}
            hasOffers={hasOffers}
            profile={profile}
            onServiceBook={onServiceBook}
            booking={showInlineBooking ? booking : null}
            showInlineBooking={showInlineBooking}
        />
    ) : null;

    return (
        <OperatorSiteThemeShell
            slug={profile.slug}
            layout={layout}
            defaultColorMode={colorMode}
        >
            <OperatorSiteNav
                brandLabel={profile.displayName}
                items={navItems.map((item) => ({ id: item.id, label: item.label }))}
                scrolled={navScrolled}
                onNavigate={scrollToSection}
                reserveLabel="Reservar"
                reserveSectionId={isBooking ? 'inicio' : BOOKING_SECTION_ID}
            />

            <HeroSection
                profile={profile}
                typeLabel={typeLabel}
                businessLabel={businessLabel}
                modalityBadges={modalityBadges}
                whatsappHref={whatsappHref}
                hasContact={hasContact}
                layout={layout}
                catalog={catalog}
                onServiceBook={onServiceBook}
            />

            <main className="os-main">
                {hasBio && !isStudio ? (
                    <OperatorSiteAboutSection
                        bio={profile.bio!}
                        variant={isPortfolio ? 'editorial' : 'standard'}
                    />
                ) : null}

                {useContentLayout ? (
                    <div className={`os-content-layout${useScheduleSidebar ? '' : ' os-content-layout--no-sidebar'}`}>
                        <div className="os-content-layout__services">
                            {servicesBlock}
                        </div>

                        {useScheduleSidebar && schedule ? (
                            <aside id="horarios" className="os-content-layout__sidebar">
                                <OperatorSiteScheduleSidebar schedule={schedule} />
                            </aside>
                        ) : null}

                        <div className="os-content-layout__rest">
                            {isPortfolio && hasSchedule && schedule ? (
                                <OperatorSiteReveal delayMs={60}>
                                    <OperatorSiteScheduleSection schedule={schedule} />
                                </OperatorSiteReveal>
                            ) : null}

                            {hasLocation ? <LocationSection profile={profile} /> : null}
                            {hasContact ? (
                                <ContactSection
                                    profile={profile}
                                    socialLinks={socialLinks}
                                    whatsappHref={whatsappHref}
                                />
                            ) : null}
                            <PaymentMethodsBlock pm={profile.paymentMethods} />
                        </div>
                    </div>
                ) : (
                    <>
                        {servicesBlock}
                        <OperatorSiteStudioBento
                            profile={profile}
                            bio={profile.bio}
                            schedule={schedule ?? null}
                            socialLinks={socialLinks}
                            hasLocation={hasLocation}
                            hasContact={hasContact}
                            hasPayments={hasPayments}
                            whatsappHref={whatsappHref}
                        />
                    </>
                )}
            </main>

            {isBooking ? booking : null}

            <footer className="os-footer">
                <p>
                    Página profesional con{' '}
                    <Link href={brandHref} target="_blank" rel="noopener noreferrer">{brandName}</Link>
                </p>
            </footer>

            <button
                type="button"
                className={`os-float-cta ${hideFloatCta ? 'os-float-cta--hidden' : ''}`}
                onClick={() => scrollToSection(isBooking ? 'inicio' : BOOKING_SECTION_ID)}
                aria-label="Ir a reservar cita"
            >
                <IconCalendarEvent size={18} />
                Reservar
            </button>
        </OperatorSiteThemeShell>
    );
}
