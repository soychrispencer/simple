'use client';

import { useState } from 'react';
import { PanelButton, PanelButtonLink } from '@simple/ui/panel';
import { useAuth } from '@simple/auth';
import { useRouter } from 'next/navigation';
import {
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconBell,
    IconArrowRight,
    IconCheck,
    IconClockHour4,
    IconLink,
    IconShieldCheck,
    IconDeviceMobile,
    IconHeartHandshake,
    IconStethoscope,
    IconYoga,
    IconMoodSmile,
    IconScissors,
    IconSparkles,
    IconBriefcase,
    IconChevronDown,
    IconStar,
    IconPlayerPlay,
} from '@tabler/icons-react';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { PublicAdCardRow } from '@simple/ui/public-advertising';
import { AGENDA_CARD_AD_PLACEHOLDERS } from '@/lib/ad-placeholders';
import { FeaturedProfessionalsSection } from '@/components/landing/featured-professionals-section';

const BENEFIT_ICONS = [IconClockHour4, IconShieldCheck, IconHeartHandshake] as const;

/* ────────────────────────── Data ────────────────────────── */

const FEATURES = [
    {
        icon: IconCalendar,
        title: 'Agenda inteligente',
        desc: 'Calendario visual con reservas online. Tus clientes o pacientes eligen horario según tu disponibilidad real.',
    },
    {
        icon: IconUsers,
        title: 'Ficha de clientes',
        desc: 'Historial de atenciones, notas y datos de contacto en un solo lugar.',
    },
    {
        icon: IconCreditCard,
        title: 'Control de pagos',
        desc: 'Registra cobros, marca sesiones pagadas y visualiza tus ingresos.',
    },
    {
        icon: IconBell,
        title: 'Recordatorios automáticos',
        desc: 'Reduce inasistencias con recordatorios por email antes de cada sesión.',
    },
];

const STEPS = [
    { icon: IconLink, title: 'Crea tu perfil', desc: 'Configura tus servicios, horarios y pagos en menos de 5 minutos.' },
    { icon: IconCalendar, title: 'Comparte tu link', desc: 'Envía tu página de reservas por WhatsApp, email o redes sociales.' },
    { icon: IconClockHour4, title: 'Recibe reservas', desc: 'Tus clientes eligen horario y reservan. Recibes la confirmación al instante.' },
];

const DIFFERENTIATORS = [
    { icon: IconShieldCheck, title: 'Sin comisiones ocultas', desc: 'Sin cobros por cita ni porcentajes sobre tus ingresos.' },
    { icon: IconDeviceMobile, title: 'Desde cualquier dispositivo', desc: 'Celular, tablet o computador. Sin descargar nada.' },
    { icon: IconHeartHandshake, title: 'Hecho para servicios con agenda', desc: 'Pensado para profesionales independientes y negocios que atienden con reserva.' },
    { icon: IconClockHour4, title: 'Listo en 5 minutos', desc: 'Sin curva de aprendizaje. Empieza a recibir reservas hoy.' },
];

const PROFESSIONALS = [
    { icon: IconScissors, label: 'Barberías' },
    { icon: IconSparkles, label: 'Estética' },
    { icon: IconMoodSmile, label: 'Psicólogos' },
    { icon: IconYoga, label: 'Bienestar' },
    { icon: IconStethoscope, label: 'Salud privada' },
    { icon: IconBriefcase, label: 'Consultorías' },
];

/* ────────────────────────── Helpers ────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border-b transition-colors"
            style={{ borderColor: 'var(--border)' }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left gap-4"
            >
                <span className="font-medium" style={{ color: 'var(--fg)' }}>{q}</span>
                <IconChevronDown
                    size={18}
                    className="shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--fg-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>
            <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: open ? '200px' : '0px', opacity: open ? 1 : 0 }}
            >
                <p className="pb-5 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{a}</p>
            </div>
        </div>
    );
}

/* ────────────────────────── Page ────────────────────────── */

export default function HomePage() {
    const { isLoggedIn, openAuth } = useAuth();
    const router = useRouter();
    const copy = resolveOperatorLandingCopy('agenda');
    const trialBenefits = copy.benefits.map((item, index) => ({
        ...item,
        icon: BENEFIT_ICONS[index] ?? IconHeartHandshake,
    }));

    const handleCTA = () => {
        if (isLoggedIn) { router.push('/panel'); } else { openAuth('register'); }
    };

    return (
        <div className="flex flex-col">

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="vertical-hero-texture" style={{ background: 'var(--bg)' }}>
                <div className="container-app pt-14 sm:pt-20 lg:pt-28 pb-14 sm:pb-20 lg:pb-24">
                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)] lg:gap-14">
                        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                            >
                                <IconCalendar size={13} />
                                Agenda profesional online
                            </div>
                            <h1
                                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 animate-slide-up"
                                style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}
                            >
                                Gestiona tu consulta de forma{' '}
                                <span style={{ color: 'var(--accent)' }}>simple</span>
                            </h1>
                            <p
                                className="text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up"
                                style={{ color: 'var(--fg-secondary)', animationDelay: '80ms' }}
                            >
                                {copy.heroSubtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '140ms' }}>
                                <PanelButton
                                    type="button"
                                    variant="accent"
                                    className="h-12 px-7"
                                    onClick={handleCTA}
                                >
                                    {copy.heroCta}
                                    <IconArrowRight size={16} />
                                </PanelButton>
                                <PanelButtonLink href="#como-funciona" variant="secondary" className="h-12 px-7">
                                    <IconPlayerPlay size={14} />
                                    Ver como funciona
                                </PanelButtonLink>
                            </div>
                            {/* Trust bar */}
                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 sm:gap-8 animate-fade-in" style={{ animationDelay: '280ms' }}>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <IconStar key={s} size={13} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
                                    ))}
                                    <span className="text-sm font-medium ml-1" style={{ color: 'var(--fg)' }}>5.0</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <span>{copy.trustPrimary}</span>
                                    <span style={{ color: 'var(--border)' }}>|</span>
                                    <span>{copy.trustSecondary}</span>
                                    <span style={{ color: 'var(--border)' }}>|</span>
                                    <span>{copy.trustTertiary}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-2xl animate-scale-in">
                            <div
                                className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)' }}
                            >
                                <img
                                    src="/hero/consultation-hero.webp"
                                    alt="Profesional usando SimpleAgenda con una paciente en consulta"
                                    width={1600}
                                    height={854}
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),rgba(0,0,0,0)_42%)]" />
                            </div>
                            <div
                                className="absolute -bottom-5 left-4 right-4 grid gap-2 rounded-2xl border p-3 shadow-lg sm:left-auto sm:right-6 sm:w-72"
                                style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--surface) 94%, transparent)' }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Agenda del día</span>
                                    <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>Organizada</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Citas', 'Pagos', 'Pacientes'].map((item, index) => (
                                        <div key={item} className="rounded-xl border p-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{item}</p>
                                            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--fg)' }}>{index === 0 ? '8' : index === 1 ? '$' : '24'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <PublicAdCardRow
                vertical="agenda"
                className="py-6"
                placeholderImages={[...AGENDA_CARD_AD_PLACEHOLDERS]}
            />

            <FeaturedProfessionalsSection />

            {/* ═══════════════ WHY SIMPLEAGENDA + PROFESSIONALS + IMAGE ═══════════════ */}
            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app section-marketing">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
                        {/* Left — real professional support image */}
                        <div className="flex justify-center">
                            <div
                                className="relative w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in"
                                style={{
                                    border: '1px solid var(--border)',
                                    boxShadow: 'var(--shadow-xl)',
                                    background: 'var(--surface)',
                                }}
                            >
                                <img
                                    src="/hero/mobile-agenda-professional.webp"
                                    alt="Profesional revisando su agenda desde el celular"
                                    width={1024}
                                    height={1536}
                                    className="aspect-[4/5] w-full object-cover"
                                />
                                <div
                                    className="absolute bottom-4 left-4 right-4 rounded-2xl border p-3"
                                    style={{ borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                                            <IconDeviceMobile size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Control desde el celular</p>
                                            <p className="text-xs" style={{ color: '#64748b' }}>Ideal entre atenciones o fuera de la consulta.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — differentiators + professionals */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>Ventajas</p>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--fg)' }}>¿Por qué elegir SimpleAgenda?</h2>
                            <p className="mb-8" style={{ color: 'var(--fg-muted)' }}>Diseñado para simplificar el día a día de profesionales y negocios que trabajan con horas reservadas.</p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {DIFFERENTIATORS.map((d, i) => (
                                    <div
                                        key={d.title}
                                        className="flex gap-3 p-4 rounded-xl border transition-all duration-200 stagger-item"
                                        style={{
                                            borderColor: 'var(--border)',
                                            background: 'var(--surface)',
                                            animationDelay: `${i * 80}ms`,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                                        >
                                            <d.icon size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>{d.title}</h3>
                                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{d.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Professional types */}
                            <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                                <p className="text-xs font-medium mb-4" style={{ color: 'var(--fg-secondary)' }}>Para todo tipo de profesionales</p>
                                <div className="flex flex-wrap gap-2">
                                    {PROFESSIONALS.map((pro) => (
                                        <div
                                            key={pro.label}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
                                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                        >
                                            <pro.icon size={15} style={{ color: 'var(--accent)' }} />
                                            <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>{pro.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FEATURE SHOWCASE — alternating image+text ═══════════════ */}
            <section id="funciones" className="container-app section-marketing scroll-mt-20">
                <div className="text-center mb-10 sm:mb-14 lg:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>Funcionalidades</p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Todo lo que necesitas en un solo lugar</h2>
                    <p className="max-w-lg mx-auto" style={{ color: 'var(--fg-muted)' }}>Una plataforma completa pensada para profesionales, equipos y negocios que necesitan ordenar reservas.</p>
                </div>

                {/* Row 1: Booking page — image left, text right */}
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-5xl mx-auto">
                    <div className="flex justify-center">
                        <div
                            className="w-full max-w-sm rounded-2xl overflow-hidden"
                            style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)' }}
                        >
                            { }
                            <img src="/hero/booking.svg" alt="Pagina de reservas" width={480} height={420} className="w-full h-auto" />
                        </div>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                            <IconCalendar size={20} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Reservas online 24/7</h3>
                        <p className="leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Tus clientes eligen servicio, fecha y hora desde tu perfil público. Sin llamadas, sin WhatsApp ida y vuelta.
                        </p>
                        <ul className="flex flex-col gap-2">
                            {['Página de reservas con tu marca', 'Selección de servicio y horario', 'Confirmación automática por email'].map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={14} style={{ color: 'var(--accent)' }} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Row 2: Dashboard — text left, image right */}
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-5xl mx-auto mt-14 sm:mt-16 lg:mt-20">
                    <div className="order-2 lg:order-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                            <IconCreditCard size={20} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Control total de tu consulta</h3>
                        <p className="leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Visualiza citas, ingresos y clientes activos desde un dashboard claro. Registra pagos y lleva el control financiero.
                        </p>
                        <ul className="flex flex-col gap-2">
                            {['Dashboard con métricas clave', 'Historial de pagos por cliente', 'Notas por atención o sesión'].map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={14} style={{ color: 'var(--accent)' }} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-center order-1 lg:order-2">
                        <div
                            className="w-full max-w-sm rounded-2xl overflow-hidden"
                            style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)' }}
                        >
                            { }
                            <img src="/hero/dashboard.svg" alt="Dashboard de SimpleAgenda" width={480} height={340} className="w-full h-auto" />
                        </div>
                    </div>
                </div>

                {/* Feature cards — compact row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-10 sm:mt-12 lg:mt-16">
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.title}
                            className="p-5 rounded-xl border transition-all duration-200 stagger-item"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xs)', animationDelay: `${i * 70}ms` }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                <f.icon size={18} />
                            </div>
                            <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>{f.title}</h4>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS — 3 steps ═══════════════ */}
            <section id="como-funciona" className="scroll-mt-20" style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app section-marketing">
                    <div className="text-center mb-10 sm:mb-12">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>Cómo funciona</p>
                        <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Empieza en 3 pasos</h3>
                        <p className="max-w-md mx-auto text-sm" style={{ color: 'var(--fg-muted)' }}>Sin curva de aprendizaje. Configura una vez y listo.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                        {STEPS.map((step, i) => (
                            <div key={i} className="relative text-center stagger-item" style={{ animationDelay: `${i * 100}ms` }}>
                                {i < STEPS.length - 1 && (
                                    <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px" style={{ background: 'var(--border)' }} />
                                )}
                                <div
                                    className="relative w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: '0 8px 24px rgba(13,148,136,0.25)' }}
                                >
                                    <step.icon size={20} />
                                </div>
                                <h4 className="font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>{step.title}</h4>
                                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--fg-muted)' }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ FREE TRIAL CTA ═══════════════ */}
            <section id="prueba-gratis" className="container-app section-marketing scroll-mt-20">
                <div className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>{copy.sectionEyebrow}</p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3" style={{ color: 'var(--fg)' }}>
                        {copy.sectionTitle}
                    </h2>
                    <p style={{ color: 'var(--fg-muted)' }}>
                        {copy.sectionSubtitle}
                    </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
                    {trialBenefits.map((item, i) => (
                        <div
                            key={item.title}
                            className="p-5 rounded-xl border text-center stagger-item"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', animationDelay: `${i * 80}ms` }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                <item.icon size={20} />
                            </div>
                            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>{item.title}</h3>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="text-center">
                    <PanelButton
                        type="button"
                        variant="accent"
                        className="h-12 px-8"
                        onClick={handleCTA}
                    >
                        {copy.sectionCta}
                        <IconArrowRight size={16} />
                    </PanelButton>
                    <p className="mt-4 text-xs max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>
                        {copy.sectionFootnote}
                    </p>
                </div>
            </section>

            {/* ═══════════════ FAQ ═══════════════ */}
            <section style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app section-marketing">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-10 sm:mb-12">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>FAQ</p>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: 'var(--fg)' }}>Preguntas frecuentes</h2>
                        </div>
                        <div
                            className="rounded-2xl border overflow-hidden px-4 sm:px-6"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            {copy.faqs.map((faq) => (
                                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FINAL CTA ═══════════════ */}
            <section className="container-app section-marketing">
                <div
                    className="relative overflow-hidden rounded-card sm:rounded-[1.5rem] px-5 py-12 sm:px-12 sm:py-16 lg:py-20 text-center bg-[linear-gradient(135deg,var(--accent)_0%,color-mix(in_oklab,var(--accent)_78%,black)_100%)]"
                >
                    {/* Decorative circles */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

                    <div className="relative z-10 max-w-lg mx-auto">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                            ¿Listo para organizar tu consulta?
                        </h2>
                        <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {copy.finalSubtitle}
                        </p>
                        <PanelButton
                            type="button"
                            variant="accent"
                            onClick={handleCTA}
                            className="h-12 px-8 text-sm font-semibold gap-2 bg-(--accent-contrast) text-(--accent) shadow-(--shadow-md)"
                        >
                            {copy.finalCta}
                            <IconArrowRight size={16} />
                        </PanelButton>
                    </div>
                </div>
            </section>

        </div>
    );
}
