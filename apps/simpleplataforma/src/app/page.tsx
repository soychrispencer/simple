'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import React, { useState, useEffect } from 'react';
import {
    IconArrowRight,
    IconCar,
    IconHome,
    IconCalendar,
    IconMusic,
    IconUsers,
    IconShieldCheck,
    IconChartBar,
    IconSun,
    IconMoon,
    IconCheck,
    IconSearch,
    IconMapPin,
    IconTool,
    IconHeartHandshake,
    IconBuildingSkyscraper,
    IconTree,
    IconBriefcase,
    IconCreditCard,
    IconBell,
    IconMessageCircle,
    IconSparkles,
    IconTrendingUp,
    IconStar,
    IconClock,
    IconDeviceMobile,
    IconLock,
    IconBolt,
    IconSteeringWheel,
    IconBuilding,
    IconMenu2,
    IconX,
    IconChevronRight,
    IconLeaf,
    IconGift,
    IconHeart,
    IconPin,
    IconPhone,
    IconMail,
    IconExternalLink,
} from '@tabler/icons-react';

// ============================================================================
// BRAND CONFIG - Colores reales de cada vertical según el repo
// ============================================================================
const BRAND = {
    autos: {
        name: 'SimpleAutos',
        color: '#ff3600',
        icon: IconSteeringWheel,
        url: 'https://autos.simple.cl',
    },
    propiedades: {
        name: 'SimplePropiedades',
        color: '#3b82f6',
        icon: IconBuildingSkyscraper,
        url: 'https://propiedades.simple.cl',
    },
    agenda: {
        name: 'SimpleAgenda',
        color: '#0D9488',
        icon: IconCalendar,
        url: 'https://agenda.simple.cl',
    },
    serenatas: {
        name: 'SimpleSerenatas',
        color: '#E11D48',
        icon: IconMusic,
        url: 'https://serenatas.simple.cl',
    },
} as const;

// ============================================================================
// COMPONENTES
// ============================================================================

function HeaderIconChip({
    children,
    onClick,
    'aria-label': ariaLabel,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-xs)]"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
        >
            {children}
        </button>
    );
}

function Logo({ brand }: { brand?: keyof typeof BRAND }) {
    const b = brand ? BRAND[brand] : null;
    const Icon = b?.icon || IconBuilding;
    const color = b ? b.color : '#475569';
    const name = b ? b.name : 'Plataforma';
    return (
        <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:opacity-80" style={{ borderColor: color, color }}>
                <Icon size={18} />
            </span>
            <span className="hidden sm:inline-flex items-baseline gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                <span className="font-semibold leading-none">Simple</span>
                <span className="font-normal leading-none" style={{ color }}>{name}</span>
            </span>
        </Link>
    );
}

function NavLink({ href, children, isNew }: { href: string; children: React.ReactNode; isNew?: boolean }) {
    return (
        <Link
            href={href}
            className="px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200 hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
            style={{ color: 'var(--fg-secondary)' }}
        >
            <span className="inline-flex items-center gap-1.5">
                {children}
                {isNew && (
                    <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                    >
                        <IconSparkles size={10} />
                        Nuevo
                    </span>
                )}
            </span>
        </Link>
    );
}

function ButtonPrimary({
    children,
    href,
    onClick,
    external,
}: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    external?: boolean;
}) {
    const className =
        'h-10 px-5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 hover:shadow-[var(--button-primary-hover-shadow)]';
    const style = {
        background: 'var(--button-primary-bg)',
        color: 'var(--button-primary-color)',
        border: '1px solid var(--button-primary-border)',
        boxShadow: 'var(--button-primary-shadow)',
    };

    const content = (
        <>
            {children}
            {external && <IconExternalLink size={14} />}
        </>
    );

    if (href) {
        const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
        return (
            <Link href={href} className={className} style={style} {...linkProps}>
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className={className} style={style}>
            {content}
        </button>
    );
}

function ButtonOutline({
    children,
    href,
    onClick,
}: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
}) {
    const className =
        'h-10 px-5 rounded-lg text-sm font-medium flex items-center gap-1.5 border transition-all duration-200 hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]';
    const style = {
        borderColor: 'var(--border)',
        color: 'var(--fg-secondary)',
    };

    if (href) {
        return (
            <Link href={href} className={className} style={style}>
                {children}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className={className} style={style}>
            {children}
        </button>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="text-center max-w-2xl mx-auto mb-16">
            {eyebrow && (
                <span
                    className="inline-block text-xs font-semibold tracking-[0.08em] uppercase mb-4"
                    style={{ color: 'var(--accent)' }}
                >
                    {eyebrow}
                </span>
            )}
            <h2 className="type-display mb-4" style={{ color: 'var(--fg)' }}>
                {title}
            </h2>
            {description && (
                <p className="type-subtitle text-base">{description}</p>
            )}
        </div>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof IconCar;
    title: string;
    description: string;
}) {
    return (
        <div
            className="p-6 rounded-xl border transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-subtle)', color: 'var(--accent)' }}
            >
                <Icon size={20} stroke={1.5} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {description}
            </p>
        </div>
    );
}

function VerticalCard({
    id,
    isActive,
    onClick,
}: {
    id: keyof typeof BRAND;
    isActive: boolean;
    onClick: () => void;
}) {
    const brand = BRAND[id];
    const Icon = brand.icon;

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
                isActive ? 'ring-1' : 'hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]'
            }`}
            style={{
                borderColor: isActive ? brand.color : 'var(--border)',
                background: isActive ? `${brand.color}08` : 'var(--surface)',
                ['--tw-ring-color' as string]: isActive ? brand.color : undefined,
            }}
        >
            <div className="flex items-start gap-4">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isActive ? brand.color : `${brand.color}15`, color: isActive ? '#fff' : brand.color }}
                >
                    <Icon size={22} stroke={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
                        {brand.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {id === 'autos' && 'Compra, vende y arrienda vehículos'}
                        {id === 'propiedades' && 'Encuentra tu hogar ideal'}
                        {id === 'agenda' && 'Gestión de citas y servicios'}
                        {id === 'serenatas' && 'Contrata artistas para eventos'}
                    </p>
                </div>
                <IconChevronRight
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`}
                    style={{ color: isActive ? brand.color : 'var(--fg-muted)' }}
                />
            </div>
        </button>
    );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LandingPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeVertical, setActiveVertical] = useState<keyof typeof BRAND>('autos');

    useEffect(() => {
        setMounted(true);
    }, []);

    const stats = [
        { value: '33,000+', label: 'Publicaciones activas' },
        { value: '25,000+', label: 'Usuarios registrados' },
        { value: '50,000+', label: 'Citas agendadas' },
        { value: '4', label: 'Verticales conectadas' },
    ];

    const features = [
        {
            icon: IconUsers,
            title: 'Una cuenta, todo Simple',
            description: 'Un solo login para acceder a todas las verticales. Tu perfil te sigue donde vayas.',
        },
        {
            icon: IconLock,
            title: 'Seguridad de verdad',
            description: 'Autenticación centralizada, verificación de identidad y protección contra fraudes en todo el ecosistema.',
        },
        {
            icon: IconBolt,
            title: 'Todo sincronizado',
            description: 'Notificaciones, preferencias y datos unificados. Una experiencia fluida entre verticales.',
        },
        {
            icon: IconChartBar,
            title: 'Dashboard unificado',
            description: 'Métricas y actividad de todas tus cuentas en una sola vista centralizada.',
        },
    ];

    const verticalFeatures: Record<keyof typeof BRAND, Array<{ icon: typeof IconCar; title: string; desc: string }>> = {
        autos: [
            { icon: IconSearch, title: 'Búsqueda inteligente', desc: 'Filtros avanzados por marca, modelo, año, precio y ubicación' },
            { icon: IconTool, title: 'Publicación guiada', desc: 'Wizard paso a paso para crear anuncios profesionales' },
            { icon: IconCreditCard, title: 'Simulador de crédito', desc: 'Calcula tu capacidad de pago y opciones de financiamiento' },
            { icon: IconShieldCheck, title: 'Verificación VIN', desc: 'Validación de historial y antecedentes del vehículo' },
            { icon: IconMessageCircle, title: 'Chat integrado', desc: 'Comunicación directa entre compradores y vendedores' },
            { icon: IconChartBar, title: 'Analytics', desc: 'Estadísticas de vistas, contactos y conversiones' },
        ],
        propiedades: [
            { icon: IconMapPin, title: 'Mapa interactivo', desc: 'Explora propiedades en mapa con filtros por zona' },
            { icon: IconBuilding, title: 'Proyectos nuevos', desc: 'Preventas y edificios en construcción' },
            { icon: IconCreditCard, title: 'Simulador hipotecario', desc: 'Crédito hipotecario con tasas actualizadas al día' },
            { icon: IconTree, title: 'Terrenos y parcelas', desc: 'Encuentra terrenos urbanos y rurales en todo Chile' },
            { icon: IconBriefcase, title: 'Perfil de corredor', desc: 'Página profesional para corredores certificados' },
            { icon: IconHeartHandshake, title: 'Visitas virtuales', desc: 'Agenda visitas presenciales y virtuales' },
        ],
        agenda: [
            { icon: IconClock, title: 'Reservas 24/7', desc: 'Tus clientes agendan sin llamadas telefónicas' },
            { icon: IconBell, title: 'Recordatorios automáticos', desc: 'SMS, WhatsApp y email de confirmación' },
            { icon: IconCreditCard, title: 'Pagos integrados', desc: 'MercadoPago, transferencias y efectivo' },
            { icon: IconDeviceMobile, title: 'App móvil', desc: 'Gestiona tu negocio desde cualquier lugar' },
            { icon: IconUsers, title: 'CRM integrado', desc: 'Historial de clientes y preferencias' },
            { icon: IconStar, title: 'Reseñas y NPS', desc: 'Feedback y evaluación de servicio' },
        ],
        serenatas: [
            { icon: IconSearch, title: 'Catálogo de artistas', desc: 'Navega por género, precio y disponibilidad' },
            { icon: IconCalendar, title: 'Reserva instantánea', desc: 'Confirma fechas y horarios en tiempo real' },
            { icon: IconCreditCard, title: 'Pago protegido', desc: 'Tu dinero está seguro hasta que el servicio se complete' },
            { icon: IconStar, title: 'Reviews verificadas', desc: 'Calificaciones reales de clientes' },
            { icon: IconMapPin, title: 'Cobertura nacional', desc: 'Artistas en todas las regiones de Chile' },
            { icon: IconGift, title: 'Personalización', desc: 'Solicita canciones especiales y dedicatorias' },
        ],
    };

    const activeBrand = BRAND[activeVertical];
    const activeFeatures = verticalFeatures[activeVertical];

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            {/* HEADER - Consistente con otras apps */}
            <header className="sticky top-0 z-40" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="container-app flex items-center justify-between h-16">
                    <Logo />

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink href="#verticales">Verticales</NavLink>
                        <NavLink href="#ecosistema">Ecosistema</NavLink>
                        <NavLink href="#como-funciona">Cómo funciona</NavLink>
                        <NavLink href="#contacto" isNew>
                            Contacto
                        </NavLink>
                    </nav>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {mounted && (
                            <HeaderIconChip
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                aria-label="Cambiar tema"
                            >
                                {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                            </HeaderIconChip>
                        )}

                        <div className="hidden md:block">
                            <ButtonPrimary href="#verticales">
                                Explorar <IconArrowRight size={14} />
                            </ButtonPrimary>
                        </div>

                        {/* Mobile Menu */}
                        <div className="md:hidden">
                            <HeaderIconChip onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menú">
                                {mobileMenuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                            </HeaderIconChip>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div
                        className="md:hidden absolute top-full left-0 right-0 border-b p-4 animate-slide-down"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div className="flex flex-col gap-2">
                            <Link
                                href="#verticales"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium"
                                style={{ color: 'var(--fg-secondary)', background: 'var(--bg-subtle)' }}
                            >
                                Verticales
                            </Link>
                            <Link
                                href="#ecosistema"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium"
                                style={{ color: 'var(--fg-secondary)', background: 'var(--bg-subtle)' }}
                            >
                                Ecosistema
                            </Link>
                            <Link
                                href="#como-funciona"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium"
                                style={{ color: 'var(--fg-secondary)', background: 'var(--bg-subtle)' }}
                            >
                                Cómo funciona
                            </Link>
                            <Link
                                href="#contacto"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
                                style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}
                            >
                                <IconSparkles size={14} /> Contacto
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* HERO SECTION */}
            <section className="relative overflow-hidden">
                {/* Background gradient */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${activeBrand.color}15, transparent)`,
                    }}
                />

                <div className="container-app relative pt-20 pb-16 md:pt-28 md:pb-24">
                    <div className="max-w-3xl mx-auto text-center">
                        {/* Badge */}
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border"
                            style={{ background: `${activeBrand.color}10`, borderColor: `${activeBrand.color}30`, color: activeBrand.color }}
                        >
                            <IconSparkles size={12} />
                            <span>Ecosistema de Marketplaces</span>
                        </div>

                        {/* Headline */}
                        <h1 className="type-display mb-6" style={{ color: 'var(--fg)' }}>
                            Todo lo que necesitas,
                            <br />
                            <span style={{ color: activeBrand.color }}>en un solo lugar.</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--fg-secondary)' }}>
                            SimplePlataforma conecta <strong>autos, propiedades, agenda y serenatas</strong> bajo una
                            identidad única. Una cuenta, un ecosistema infinito de posibilidades.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <ButtonPrimary href="#verticales">
                                Descubre las verticales <IconArrowRight size={15} />
                            </ButtonPrimary>
                            <ButtonOutline href="#ecosistema">Conoce el ecosistema</ButtonOutline>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <span className="flex items-center gap-1.5">
                                <IconCheck size={14} style={{ color: 'var(--color-success)' }} /> Sin costo de registro
                            </span>
                            <span className="flex items-center gap-1.5">
                                <IconCheck size={14} style={{ color: 'var(--color-success)' }} /> Una cuenta, todo Simple
                            </span>
                            <span className="flex items-center gap-1.5">
                                <IconCheck size={14} style={{ color: 'var(--color-success)' }} /> Hecho en Chile
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS BAR */}
            <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="container-app py-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="type-kpi-value" style={{ color: 'var(--fg)' }}>
                                    {stat.value}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VERTICALS SECTION */}
            <section id="verticales" className="py-20 md:py-28">
                <div className="container-app">
                    <SectionHeading
                        eyebrow="Nuestros Productos"
                        title="Cuatro verticales, infinitas posibilidades"
                        description="Cada vertical está diseñada específicamente para su industria, con herramientas profesionales y una experiencia optimizada."
                    />

                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* Vertical selector - Left side */}
                        <div className="lg:col-span-5 space-y-3">
                            {(Object.keys(BRAND) as Array<keyof typeof BRAND>).map((id) => (
                                <VerticalCard
                                    key={id}
                                    id={id}
                                    isActive={activeVertical === id}
                                    onClick={() => setActiveVertical(id)}
                                />
                            ))}
                        </div>

                        {/* Vertical detail - Right side */}
                        <div className="lg:col-span-7">
                            <div
                                className="rounded-2xl border overflow-hidden"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                {/* Header with brand color */}
                                <div
                                    className="p-6 md:p-8"
                                    style={{ background: `linear-gradient(135deg, ${activeBrand.color}08 0%, ${activeBrand.color}03 100%)` }}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                                            style={{ background: activeBrand.color, color: '#fff' }}
                                        >
                                            <activeBrand.icon size={28} stroke={1.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                                                {activeBrand.name}
                                            </h3>
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                                                style={{ background: `${activeBrand.color}20`, color: activeBrand.color }}
                                            >
                                                Activo
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                        {activeVertical === 'autos' &&
                                            'El marketplace de vehículos más completo de Chile. Desde autos y motos hasta camiones y maquinaria. Conectamos compradores con vendedores de forma segura, rápida y eficiente.'}
                                        {activeVertical === 'propiedades' &&
                                            'El marketplace inmobiliario que conecta compradores, arrendatarios y corredores. Casas, departamentos, oficinas, terrenos y proyectos nuevos en un solo lugar.'}
                                        {activeVertical === 'agenda' &&
                                            'El sistema de agendamiento preferido por profesionales y negocios. Desde peluquerías hasta consultas médicas, gestiona tu tiempo y el de tus clientes sin complicaciones.'}
                                        {activeVertical === 'serenatas' &&
                                            'La plataforma líder en contratación de artistas para eventos. Mariachis, tríos, solistas y grupos musicales en todas las regiones de Chile.'}
                                    </p>
                                </div>

                                {/* Features grid */}
                                <div className="p-6 md:p-8">
                                    <h4
                                        className="text-xs font-semibold uppercase tracking-wider mb-4"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        Funcionalidades destacadas
                                    </h4>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {activeFeatures.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: `${activeBrand.color}12`, color: activeBrand.color }}
                                                >
                                                    <feature.icon size={16} stroke={1.5} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium mb-0.5" style={{ color: 'var(--fg)' }}>
                                                        {feature.title}
                                                    </h5>
                                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                        {feature.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                                        <a
                                            href={activeBrand.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90"
                                            style={{ background: activeBrand.color, color: '#fff' }}
                                        >
                                            Visitar {activeBrand.name}
                                            <IconExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ECOSYSTEM SECTION */}
            <section id="ecosistema" className="py-20 md:py-28" style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Content */}
                        <div>
                            <span
                                className="inline-block text-xs font-semibold tracking-[0.08em] uppercase mb-4"
                                style={{ color: 'var(--accent)' }}
                            >
                                El Ecosistema
                            </span>
                            <h2 className="type-display mb-6" style={{ color: 'var(--fg)' }}>
                                Por qué SimplePlataforma es diferente
                            </h2>
                            <p className="text-base mb-10" style={{ color: 'var(--fg-secondary)' }}>
                                No somos solo otra plataforma. Somos un ecosistema pensado para que crezcas. Tu perfil,
                                tus preferencias y tu actividad te siguen en cada vertical.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {features.map((f, i) => (
                                    <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} />
                                ))}
                            </div>
                        </div>

                        {/* Right: Visual */}
                        <div className="relative">
                            <div
                                className="rounded-2xl p-8 border"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                {/* App icons */}
                                <div className="flex items-center gap-3 mb-8">
                                    {(Object.keys(BRAND) as Array<keyof typeof BRAND>).map((id) => {
                                        const b = BRAND[id];
                                        const Icon = b.icon;
                                        return (
                                            <div
                                                key={id}
                                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                style={{ background: b.color, color: '#fff' }}
                                            >
                                                <Icon size={24} stroke={1.5} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Features list */}
                                <div className="space-y-4">
                                    {[
                                        { icon: IconCheck, title: 'Perfil unificado', desc: 'Regístrate una vez, usa en todas' },
                                        { icon: IconBell, title: 'Notificaciones centralizadas', desc: 'Todas tus alertas en un lugar' },
                                        { icon: IconLock, title: 'Preferencias sincronizadas', desc: 'Configura una vez, aplica en todas' },
                                        { icon: IconChartBar, title: 'Dashboard unificado', desc: 'Métricas de todo tu negocio' },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 p-4 rounded-xl"
                                            style={{ background: 'var(--bg-subtle)' }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ background: 'var(--accent)', color: '#fff' }}
                                            >
                                                <item.icon size={18} stroke={1.5} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Decorative elements */}
                            <div
                                className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-40 pointer-events-none"
                                style={{ background: 'var(--accent)' }}
                            />
                            <div
                                className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-3xl opacity-30 pointer-events-none"
                                style={{ background: activeBrand.color }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="como-funciona" className="py-20 md:py-28">
                <div className="container-app">
                    <SectionHeading
                        eyebrow="Proceso Simple"
                        title="Tres pasos para empezar"
                        description="No necesitas ser experto en tecnología. Nuestro ecosistema está diseñado para que cualquiera pueda usarlo en minutos."
                    />

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        {[
                            {
                                step: '01',
                                title: 'Crea tu cuenta',
                                description: 'Regístrate una sola vez y accede a todas las verticales del ecosistema.',
                                icon: IconUsers,
                            },
                            {
                                step: '02',
                                title: 'Elige tu vertical',
                                description: 'Navega entre SimpleAutos, SimplePropiedades, SimpleAgenda o SimpleSerenatas.',
                                icon: IconBuilding,
                            },
                            {
                                step: '03',
                                title: 'Empieza a usar',
                                description: 'Publica, agenda, compra o vende. Tu perfil y preferencias te siguen automáticamente.',
                                icon: IconBolt,
                            },
                        ].map((item, i) => (
                            <div key={i} className="relative text-center">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                                >
                                    <item.icon size={28} stroke={1.5} style={{ color: 'var(--accent)' }} />
                                </div>
                                <span
                                    className="absolute top-0 right-0 md:right-8 text-6xl font-bold opacity-10 pointer-events-none"
                                    style={{ color: 'var(--fg)' }}
                                >
                                    {item.step}
                                </span>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                                    {item.title}
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section id="contacto" className="py-20 md:py-28" style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app">
                    <div
                        className="max-w-4xl mx-auto rounded-3xl p-10 md:p-16 text-center border"
                        style={{
                            borderColor: 'var(--border)',
                            background: `linear-gradient(135deg, ${activeBrand.color}08 0%, var(--surface) 50%, ${activeBrand.color}05 100%)`,
                        }}
                    >
                        <h2 className="type-display mb-4" style={{ color: 'var(--fg)' }}>
                            ¿Listo para simplificar?
                        </h2>
                        <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: 'var(--fg-secondary)' }}>
                            Únete a miles de chilenos que ya usan SimplePlataforma para comprar, vender, agendar y celebrar.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <ButtonPrimary href="#verticales">
                                Explorar verticales <IconArrowRight size={15} />
                            </ButtonPrimary>
                            <a
                                href="mailto:hola@simple.cl"
                                className="h-10 px-5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ color: 'var(--fg-secondary)' }}
                            >
                                <IconMail size={16} /> Contactar
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="container-app">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-1">
                            <Logo />
                            <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Ecosistema de marketplaces para Chile. Una cuenta, infinitas posibilidades.
                            </p>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                                Verticales
                            </h4>
                            <ul className="space-y-2">
                                {(Object.keys(BRAND) as Array<keyof typeof BRAND>).map((id) => (
                                    <li key={id}>
                                        <a
                                            href={BRAND[id].url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm transition-colors hover:text-[var(--fg)]"
                                            style={{ color: 'var(--fg-muted)' }}
                                        >
                                            {BRAND[id].name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                                Producto
                            </h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="#verticales"
                                        className="text-sm transition-colors hover:text-[var(--fg)]"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        Características
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#ecosistema"
                                        className="text-sm transition-colors hover:text-[var(--fg)]"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        Ecosistema
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#como-funciona"
                                        className="text-sm transition-colors hover:text-[var(--fg)]"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        Cómo funciona
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                                Soporte
                            </h4>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="mailto:hola@simple.cl"
                                        className="text-sm transition-colors hover:text-[var(--fg)]"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        Contacto
                                    </a>
                                </li>
                                <li>
                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        FAQ
                                    </span>
                                </li>
                                <li>
                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        Términos de uso
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div
                        className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
                        style={{ borderTop: '1px solid var(--border)' }}
                    >
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            &copy; {new Date().getFullYear()} SimplePlataforma. Todos los derechos reservados.
                        </p>
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                            Hecho con <IconHeart size={12} className="text-red-500" fill="currentColor" /> en Chile
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

