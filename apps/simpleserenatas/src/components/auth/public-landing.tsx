'use client';

import Link from 'next/link';
import {
    IconHeart,
    IconShield,
    IconMessageCircle,
    IconPhone,
    IconUser,
    IconMusic,
    IconUsersGroup,
    IconMapPin,
    IconClock,
    IconChevronRight,
    IconSparkles,
} from '@tabler/icons-react';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/layout/footer';

type PublicLandingProps = {
    onLogin: () => void;
    onRegisterClient: () => void;
    onRegisterMusician: () => void;
};

export function PublicLanding({ onLogin, onRegisterClient, onRegisterMusician }: PublicLandingProps) {
    const clientFeatures = [
        { icon: IconHeart, text: 'Ordena fecha, dirección, horario y datos del homenaje.' },
        { icon: IconShield, text: 'Mantén la información importante en un solo lugar.' },
        { icon: IconMessageCircle, text: 'Evita perder detalles en conversaciones desordenadas.' },
        { icon: IconPhone, text: 'Ten a mano los datos de contacto del evento.' },
    ];

    const productPreviewItems = [
        { title: 'Cumpleaños', place: 'Las Condes', time: '20:30', status: 'Confirmada' },
        { title: 'Aniversario', place: 'Providencia', time: '21:45', status: 'Grupo listo' },
        { title: 'Sorpresa', place: 'Ñuñoa', time: '23:00', status: 'En ruta' },
    ];

    const howItWorksClient = [
        { title: 'Explora mariachis', desc: 'Revisa grupos de mariachis y serenateros disponibles en tu zona.' },
        { title: 'Solicita tu serenata', desc: 'Indica fecha, lugar y detalles del homenaje.' },
        { title: 'Celebra sin estrés', desc: 'Sigue el estado de tu evento desde el celular.' },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
            <LandingHeader onLogin={onLogin} onRegister={onRegisterClient} />

            <main className="flex-1">
                <section id="hero" className="relative overflow-hidden border-b py-16 landing-border sm:py-20 lg:py-28">
                    <div className="container-app relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
                        <div className="max-w-2xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider landing-border landing-bg-surface landing-text-secondary">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                                <p className="mb-0">Para quienes quieren sorprender</p>
                            </div>
                            <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance landing-text-fg sm:text-5xl lg:text-[4.5rem] lg:leading-[1.1]">
                                Contrata la <span className="landing-text-accent">serenata perfecta</span> en minutos
                            </h1>
                            <p className="mb-10 max-w-xl text-lg leading-relaxed landing-text-muted sm:text-xl">
                                Encuentra grupos de mariachis y serenateros en Chile, compara opciones y coordina tu evento sin perder
                                mensajes en WhatsApp.
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <button
                                    type="button"
                                    className="btn btn-primary h-14 px-10 text-lg font-semibold"
                                    onClick={onRegisterClient}
                                >
                                    Quiero una serenata
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline h-14 px-10 text-lg font-semibold"
                                    onClick={onLogin}
                                >
                                    Ya tengo cuenta
                                </button>
                            </div>

                            <div className="mt-12 flex items-center gap-6">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="landing-avatar-ring flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2"
                                        >
                                            <IconUser size={20} className="landing-text-muted" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm font-medium landing-text-secondary">
                                    Familias en Santiago ya confían en SimpleSerenatas
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="relative rounded-card border p-4 shadow-lg landing-border landing-bg-surface">
                                <div className="rounded-card p-6 landing-bg-subtle">
                                    <div className="mb-6 flex items-center justify-between">
                                        <PreviewHeader />
                                    </div>
                                    <div className="space-y-4">
                                        {productPreviewItems.map((item) => (
                                            <div
                                                key={item.title}
                                                className="rounded-card border p-4 landing-border landing-bg-surface"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-button landing-bg-subtle landing-text-accent">
                                                            <IconMusic size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold landing-text-fg">{item.title}</p>
                                                            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium landing-text-muted">
                                                                <IconMapPin size={12} />
                                                                <span>{item.place}</span>
                                                                <span className="landing-dot-separator">·</span>
                                                                <IconClock size={12} />
                                                                <span>{item.time}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="rounded-button border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest landing-status-chip">
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="para-clientes" className="relative overflow-hidden border-b py-20 landing-bg-subtle landing-border scroll-mt-20 sm:py-24">
                    <div className="container-app">
                        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
                            <div>
                                <div className="mb-6 inline-flex rounded-button border p-3 landing-accent-chip">
                                    <IconHeart size={28} />
                                </div>
                                <h2 className="mb-6 text-3xl font-bold tracking-tight landing-text-fg sm:text-4xl">
                                    Todo para tu evento, en un solo lugar
                                </h2>
                                <div className="grid gap-5">
                                    {clientFeatures.map((f, i) => (
                                        <FeatureRow key={i} icon={f.icon} text={f.text} />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary mt-10 h-12 px-8 font-semibold"
                                    onClick={onRegisterClient}
                                >
                                    Crear cuenta de cliente
                                </button>
                            </div>
                            <ClientSummaryCard />
                        </div>
                    </div>
                </section>

                <section id="partners" className="border-b py-20 landing-border scroll-mt-20 sm:py-24">
                    <div className="container-app">
                        <div className="mb-10 text-center md:mb-14">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] landing-text-accent">También para profesionales</p>
                            <h2 className="mb-4 text-3xl font-bold tracking-tight landing-text-fg sm:text-4xl">
                                ¿Eres músico o administras un grupo?
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg landing-text-muted">
                                Elige tu camino. Cada perfil tiene herramientas diseñadas para lo que necesitas en terreno.
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <PartnerCard
                                id="musicos"
                                icon={IconMusic}
                                eyebrow="Para músicos"
                                title="Recibe invitaciones y organiza tu agenda"
                                description="Perfil profesional, invitaciones claras y calendario desde el celular. Ideal si tocas con varios grupos."
                                bullets={['Perfil con instrumento y comuna', 'Invitaciones con un toque', 'Agenda de eventos confirmados']}
                                ctaLabel="Registrarme como músico"
                                onCta={onRegisterMusician}
                            />
                            <PartnerCard
                                icon={IconUsersGroup}
                                eyebrow="Para dueños"
                                title="Administra tu mariachi como un negocio"
                                description="Agenda, músicos, marketplace, mapa y rutas. La suite para quien administra uno o más grupos de mariachis."
                                bullets={['Perfil público y servicios', 'Grupos e integrantes', 'Mapa y logística del día']}
                                ctaLabel="Crear cuenta de dueño"
                                href="/para-duenos"
                                accent
                            />
                        </div>
                    </div>
                </section>

                <section id="como-funciona" className="py-20 scroll-mt-20 sm:py-24">
                    <div className="container-app max-w-4xl">
                        <HowItWorksHeader />
                        <div className="grid gap-8 md:grid-cols-3">
                            {howItWorksClient.map((step, i) => (
                                <div key={step.title} className="text-center">
                                    <div className="landing-badge-num mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                                        {i + 1}
                                    </div>
                                    <h3 className="mb-2 text-lg font-bold landing-text-fg">{step.title}</h3>
                                    <p className="text-base leading-relaxed landing-text-muted">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20">
                    <div className="container-app">
                        <div className="rounded-card border p-8 text-center landing-border landing-bg-subtle sm:p-16">
                            <div className="mx-auto max-w-3xl">
                                <h2 className="mb-6 text-3xl font-bold tracking-tight landing-text-fg sm:text-4xl">
                                    Sorprende a quien más quieres
                                </h2>
                                <p className="mb-10 text-lg leading-relaxed landing-text-muted">
                                    Crea tu cuenta gratis y solicita tu próxima serenata con grupos verificados en la plataforma.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-primary h-14 px-10 text-lg font-bold"
                                    onClick={onRegisterClient}
                                >
                                    Empezar como cliente
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function PreviewHeader() {
    return (
        <>
            <div>
                <p className="text-base font-bold landing-text-fg">Tu serenata</p>
                <p className="text-xs font-medium landing-text-muted">Sábado, 24 de Mayo</p>
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold landing-accent-soft">
                <span className="landing-progress-fill flex h-1.5 w-1.5 rounded-full" />
                Confirmada
            </div>
        </>
    );
}

function FeatureRow({ icon: Icon, text }: { icon: typeof IconHeart; text: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border landing-border landing-bg-surface landing-text-accent">
                <Icon size={20} />
            </div>
            <p className="py-1.5 text-lg font-medium landing-text-secondary">{text}</p>
        </div>
    );
}

function ClientSummaryCard() {
    return (
        <div className="relative flex aspect-[4/3] flex-col overflow-hidden rounded-card border shadow-md landing-border landing-bg-surface">
            <div className="p-8 pb-4">
                <h3 className="mb-1 text-lg font-bold landing-text-fg">Resumen de tu serenata</h3>
                <p className="text-sm landing-text-muted">Gestiona los detalles de tu evento</p>
            </div>
            <div className="flex-1 px-8 py-2">
                <ClientSummaryRows />
            </div>
            <div className="p-8 pt-4">
                <div className="mb-3 flex items-center justify-between text-xs font-bold">
                    <span className="landing-text-muted">Progreso de solicitud</span>
                    <span className="landing-text-accent">80%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full landing-bg-subtle">
                    <div className="landing-progress-fill h-full w-[80%] rounded-full" />
                </div>
            </div>
        </div>
    );
}

function ClientSummaryRows() {
    const rows = [
        { label: 'Fecha y lugar', val: '24 Mayo, Las Condes' },
        { label: 'Paquete', val: 'Serenata Estándar' },
        { label: 'Músicos', val: '3 músicos' },
    ];
    return (
        <div className="space-y-4">
            {rows.map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b py-2 landing-border">
                    <span className="text-sm landing-text-muted">{item.label}</span>
                    <span className="text-sm font-bold landing-text-fg">{item.val}</span>
                </div>
            ))}
        </div>
    );
}

function HowItWorksHeader() {
    return (
        <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight landing-text-fg sm:text-4xl">Cómo contratar</h2>
            <p className="text-lg landing-text-muted">Tres pasos simples para tu próxima sorpresa</p>
        </div>
    );
}

type PartnerCardProps = {
    id?: string;
    icon: typeof IconMusic;
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
    ctaLabel: string;
    onCta?: () => void;
    href?: string;
    accent?: boolean;
};

function PartnerCard({
    id,
    icon: Icon,
    eyebrow,
    title,
    description,
    bullets,
    ctaLabel,
    onCta,
    href,
    accent,
}: PartnerCardProps) {
    const cardClass = accent
        ? 'rounded-card border p-6 sm:p-8 landing-border landing-accent-soft shadow-sm transition-shadow hover:shadow-md'
        : 'rounded-card border p-6 sm:p-8 landing-border landing-bg-surface transition-shadow hover:shadow-md';

    const ctaClass = accent ? 'btn btn-primary w-full sm:w-auto' : 'btn btn-outline w-full sm:w-auto';
    const rootClass = id ? `${cardClass} scroll-mt-20` : cardClass;

    return (
        <div id={id} className={rootClass}>
            <div className="mb-4 flex items-center gap-3">
                <div className="landing-feature-icon-box inline-flex rounded-card border p-3">
                    <Icon size={26} className="landing-text-accent" />
                </div>
                {accent ? (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider landing-border landing-bg-surface landing-text-accent">
                        <IconSparkles size={12} />
                        {eyebrow}
                    </span>
                ) : (
                    <span className="text-xs font-bold uppercase tracking-wider landing-text-muted">{eyebrow}</span>
                )}
            </div>
            <h3 className="mb-3 text-xl font-bold landing-text-fg sm:text-2xl">{title}</h3>
            <p className="mb-5 text-base leading-relaxed landing-text-secondary">{description}</p>
            <ul className="mb-8 space-y-2 text-sm landing-text-muted">
                {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                        <IconChevronRight size={16} className="mt-0.5 shrink-0 landing-text-accent" />
                        {b}
                    </li>
                ))}
            </ul>
            {href ? (
                <Link href={href} className={`${ctaClass} inline-flex h-12 items-center justify-center px-6 font-semibold`}>
                    {ctaLabel}
                    <IconChevronRight size={18} className="ml-1" />
                </Link>
            ) : (
                <button type="button" className={`${ctaClass} h-12 px-6 font-semibold`} onClick={onCta}>
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}
