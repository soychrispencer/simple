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
    IconBuilding,
    IconBrandWhatsapp,
    IconLock,
} from '@tabler/icons-react';
import {
    AGENDA_PLAN_CATALOG,
    AGENDA_PRICING,
    formatAgendaProMonthlyPrice,
    formatAgendaProAnnualMonthlyPrice,
    isPlatformLaunchActive,
    resolveOperatorLandingCopy,
} from '@simple/utils';
import { FeaturedProfessionalsSection } from '@/components/landing/featured-professionals-section';
import { PlanComparisonTable } from '@/components/landing/plan-comparison-table';
import { InteractiveBookingDemo } from '@/components/landing/interactive-booking-demo';
import { PainComparisonSection } from '@/components/landing/pain-comparison-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';

const BENEFIT_ICONS = [IconClockHour4, IconShieldCheck, IconHeartHandshake] as const;

/* ────────────────────────── Data ────────────────────────── */

const FEATURES = [
    {
        icon: IconCalendar,
        title: 'Agenda inteligente 24/7',
        desc: 'Calendario visual con reservas online. Tus clientes o pacientes eligen horario según tu disponibilidad real sin cruces ni llamadas.',
    },
    {
        icon: IconUsers,
        title: 'Ficha de clientes y pacientes',
        desc: 'Historial de atenciones, notas clínicas o de servicio y datos de contacto centralizados en un solo lugar.',
    },
    {
        icon: IconCreditCard,
        title: 'Control de pagos y anticipos',
        desc: 'Registra cobros, cobra online con Mercado Pago o transferencia bancaria y visualiza tus ingresos del mes.',
    },
    {
        icon: IconBell,
        title: 'Recordatorios automáticos',
        desc: 'Reduce inasistencias drásticamente con recordatorios por email antes de cada sesión o cita programada.',
    },
];

const STEPS = [
    {
        icon: IconLink,
        title: '1. Crea tu perfil',
        desc: 'Configura tus servicios, duración, precios y tus horarios de atención en menos de 5 minutos.',
    },
    {
        icon: IconCalendar,
        title: '2. Comparte tu link',
        desc: 'Pégalo en tu biografía de Instagram, en tu estado de WhatsApp o envíalo directamente cuando te pidan hora.',
    },
    {
        icon: IconClockHour4,
        title: '3. Recibe reservas',
        desc: 'Tus clientes reservan de inmediato. Ambos reciben la confirmación por email con los datos de la cita.',
    },
];

const DIFFERENTIATORS = [
    {
        icon: IconShieldCheck,
        title: 'Sin comisiones por cita (0%)',
        desc: 'Todo lo que cobras es 100% tuyo. No cobramos porcentajes ni comisiones ocultas sobre tus atenciones.',
    },
    {
        icon: IconDeviceMobile,
        title: 'Desde cualquier celular o PC',
        desc: 'Tanto tú como tus clientes acceden directamente desde el navegador web, sin obligar a nadie a descargar aplicaciones.',
    },
    {
        icon: IconHeartHandshake,
        title: 'Pensado para servicios en Chile',
        desc: 'Montos en pesos chilenos (CLP), integración con Mercado Pago local y transferencias con RUT y cuenta bancaria.',
    },
    {
        icon: IconClockHour4,
        title: 'Listo en 5 minutos',
        desc: 'Registro sin tarjeta de crédito. Tu página pública de reservas queda lista para compartir hoy mismo.',
    },
];

const PROFESSIONALS = [
    { icon: IconMoodSmile, label: 'Psicólogos y Terapeutas' },
    { icon: IconStethoscope, label: 'Médicos y Kinesiólogos' },
    { icon: IconScissors, label: 'Barberías y Salones' },
    { icon: IconSparkles, label: 'Centros de Estética' },
    { icon: IconYoga, label: 'Nutrición y Bienestar' },
    { icon: IconBriefcase, label: 'Consultorías y Coaching' },
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
                <span className="font-medium text-sm sm:text-base" style={{ color: 'var(--fg)' }}>{q}</span>
                <IconChevronDown
                    size={18}
                    className="shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--fg-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>
            <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: open ? '260px' : '0px', opacity: open ? 1 : 0 }}
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
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const copy = resolveOperatorLandingCopy('agenda');
    const showPlans = !isPlatformLaunchActive('agenda');
    const trialBenefits = copy.benefits.map((item, index) => ({
        ...item,
        icon: BENEFIT_ICONS[index] ?? IconHeartHandshake,
    }));

    const handleCTA = () => {
        if (isLoggedIn) {
            router.push('/panel');
        } else {
            openAuth('register');
        }
    };

    return (
        <div className="flex flex-col">

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="vertical-hero-texture relative overflow-hidden" style={{ background: 'var(--bg)' }}>
                <div className="container-app pt-12 sm:pt-16 lg:pt-24 pb-16 sm:pb-20 lg:pb-28">
                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(460px,1.15fr)] lg:gap-12">
                        
                        {/* Hero Left: Value proposition */}
                        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                            
                            {/* Chilean active badge */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)] animate-fade-in shadow-xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                                </span>
                                <span>Agenda online para profesionales en Chile</span>
                            </div>

                            {/* Main Headline: Punchy, clean, 2 lines */}
                            <h1
                                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] mb-5 animate-slide-up"
                                style={{ color: 'var(--fg)', letterSpacing: '-0.025em' }}
                            >
                                Tu agenda profesional,{' '}
                                <span style={{ color: 'var(--accent)' }}>sin el caos de WhatsApp.</span>
                            </h1>

                            {/* Subtitle: Crisp and readable */}
                            <p
                                className="text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 animate-slide-up"
                                style={{ color: 'var(--fg-secondary)', animationDelay: '80ms' }}
                            >
                                Comparte tu link de reservas. Tus clientes eligen día y hora en 30 segundos según tu disponibilidad real, con confirmación y recordatorios automáticos.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '140ms' }}>
                                <PanelButton
                                    type="button"
                                    variant="accent"
                                    className="h-12 px-7 text-sm font-semibold shadow-md gap-2"
                                    onClick={handleCTA}
                                >
                                    {isLoggedIn ? 'Ir a mi agenda' : 'Crear mi agenda gratis'}
                                    <IconArrowRight size={16} />
                                </PanelButton>
                                <PanelButtonLink href="#demo-interactiva" variant="secondary" className="h-12 px-6 text-sm font-semibold">
                                    <IconCalendar size={15} />
                                    Probar demo en vivo
                                </PanelButtonLink>
                            </div>

                            {/* Social Proof & Chilean trust indicators */}
                            <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in" style={{ animationDelay: '240ms' }}>
                                <div className="flex -space-x-2.5 overflow-hidden">
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-bold text-white shadow-xs">VM</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow-xs">EC</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-600 text-xs font-bold text-white shadow-xs">CS</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-bold text-white shadow-xs">RV</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-xs font-bold text-white shadow-xs">+90</div>
                                </div>
                                <div className="flex flex-col text-center sm:text-left text-xs">
                                    <div className="flex items-center justify-center sm:justify-start gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <IconStar key={s} size={13} fill="#eab308" className="text-yellow-500" />
                                        ))}
                                        <span className="font-bold ml-1" style={{ color: 'var(--fg)' }}>5.0 / 5.0</span>
                                    </div>
                                    <span style={{ color: 'var(--fg-secondary)' }} className="mt-0.5">
                                        Recomendado por psicólogos, médicos y terapeutas en Chile
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* Hero Right: Live Interactive Mockup Card */}
                        <div className="relative mx-auto w-full max-w-xl animate-scale-in">
                            
                            {/* Outer App Window Frame */}
                            <div
                                className="relative rounded-2xl border overflow-hidden shadow-2xl transition-all"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'var(--surface)',
                                }}
                            >
                                {/* Top URL browser bar */}
                                <div className="flex items-center justify-between border-b px-4 py-3 bg-[var(--bg-subtle)] text-xs" style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)] font-mono text-[11px] max-w-[260px] truncate">
                                        <IconLock size={11} className="text-emerald-500 shrink-0" />
                                        <span>simpleagenda.app/dra-valentina</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        ● En línea
                                    </span>
                                </div>

                                {/* Consultation hero picture with active badge overlay */}
                                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                                    <img
                                        src="/hero/consultation-hero.webp"
                                        alt="Profesional atendiendo en su consulta con SimpleAgenda"
                                        width={1200}
                                        height={675}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    
                                    {/* Bottom profile tag over image */}
                                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                                        <div>
                                            <p className="text-sm font-bold drop-shadow-sm">Dra. Valentina Muñoz</p>
                                            <p className="text-xs text-white/90 drop-shadow-sm">Psicología Clínica · Providencia</p>
                                        </div>
                                        <span className="rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 text-xs font-semibold text-white">
                                            Agenda abierta
                                        </span>
                                    </div>
                                </div>

                                {/* Body: Simulated live booking & status */}
                                <div className="p-4 sm:p-5 space-y-3 bg-[var(--surface)]">
                                    
                                    {/* Live Notification Pill */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                            <IconCheck size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                                    ¡Nueva reserva confirmada!
                                                </p>
                                                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Hace 3 min</span>
                                            </div>
                                            <p className="text-xs text-[var(--fg-secondary)] truncate">
                                                Camila S. reservó <strong>Sesión Individual</strong> · Jueves 16:30
                                            </p>
                                        </div>
                                    </div>

                                    {/* Daily metrics preview */}
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-center">
                                            <p className="text-[11px] text-[var(--fg-muted)]">Hoy</p>
                                            <p className="text-sm font-bold text-[var(--fg)] mt-0.5">8 citas</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-center">
                                            <p className="text-[11px] text-[var(--fg-muted)]">Facturado</p>
                                            <p className="text-sm font-bold text-[var(--accent)] mt-0.5">$280.000</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-center">
                                            <p className="text-[11px] text-[var(--fg-muted)]">Asistencia</p>
                                            <p className="text-sm font-bold text-emerald-600 mt-0.5">98%</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════ PAIN COMPARISON: WHATSAPP VS SIMPLEAGENDA ═══════════════ */}
            <PainComparisonSection />

            {/* ═══════════════ INTERACTIVE BOOKING DEMO ═══════════════ */}
            <InteractiveBookingDemo onStartFree={handleCTA} />

            {/* ═══════════════ FEATURED PROFESSIONALS DIRECTORY (NEVER EMPTY) ═══════════════ */}
            <FeaturedProfessionalsSection />

            {/* ═══════════════ REAL TESTIMONIALS & METRICS FROM CHILE ═══════════════ */}
            <TestimonialsSection />

            {/* ═══════════════ WHY SIMPLEAGENDA + PROFESSIONS ═══════════════ */}
            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app section-marketing">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
                        
                        {/* Left — real professional mobile usage image */}
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
                                    className="absolute bottom-4 left-4 right-4 rounded-2xl border p-3.5 shadow-lg"
                                    style={{ borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                                            <IconDeviceMobile size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Control total desde tu celular</p>
                                            <p className="text-xs" style={{ color: '#475569' }}>Revisa tus citas entre atenciones o fuera del consultorio.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — differentiators + professional types */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent)]">
                                Ventajas claras
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-[var(--fg)]">
                                ¿Por qué elegir SimpleAgenda?
                            </h2>
                            <p className="mb-8 text-sm sm:text-base leading-relaxed text-[var(--fg-muted)]">
                                Diseñado para simplificar el día a día de profesionales independientes y centros que trabajan con citas programadas en Chile.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {DIFFERENTIATORS.map((d, i) => (
                                    <div
                                        key={d.title}
                                        className="flex gap-3 p-4 rounded-xl border transition-all duration-200"
                                        style={{
                                            borderColor: 'var(--border)',
                                            background: 'var(--surface)',
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
                                            <h3 className="text-sm font-bold mb-0.5" style={{ color: 'var(--fg)' }}>{d.title}</h3>
                                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{d.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Professional types */}
                            <div className="mt-8 pt-6 border-t border-[var(--border)]">
                                <p className="text-xs font-semibold mb-3 text-[var(--fg-secondary)]">Adaptado a tu rubro y especialidad:</p>
                                <div className="flex flex-wrap gap-2">
                                    {PROFESSIONALS.map((pro) => (
                                        <div
                                            key={pro.label}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200"
                                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
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

            {/* ═══════════════ FEATURE SHOWCASE — alternating visual+text ═══════════════ */}
            <section id="funciones" className="container-app section-marketing scroll-mt-20">
                <div className="text-center mb-10 sm:mb-14 lg:mb-16">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent)]">Funcionalidades</p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 text-[var(--fg)]">
                        Todo lo que necesitas en un solo lugar
                    </h2>
                    <p className="max-w-xl mx-auto text-sm sm:text-base text-[var(--fg-muted)]">
                        Una plataforma completa pensada para profesionales, consultas y negocios que necesitan ordenar reservas sin complicaciones técnicas.
                    </p>
                </div>

                {/* Row 1: Booking page — image left, text right */}
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-5xl mx-auto">
                    <div className="flex justify-center">
                        <div
                            className="w-full max-w-sm rounded-2xl overflow-hidden"
                            style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)' }}
                        >
                            <img src="/hero/booking.svg" alt="Página de reservas online de SimpleAgenda" width={480} height={420} className="w-full h-auto" />
                        </div>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                            <IconCalendar size={20} />
                        </div>
                        <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Reservas online automáticas 24/7</h3>
                        <p className="leading-relaxed mb-5 text-sm sm:text-base text-[var(--fg-muted)]">
                            Tus clientes eligen servicio, fecha y hora directamente desde tu link público. Sin llamadas interminables, sin audios de WhatsApp a deshoras.
                        </p>
                        <ul className="flex flex-col gap-2.5">
                            {[
                                'Página pública personalizada con tu nombre y servicios',
                                'Horarios disponibles actualizados en tiempo real',
                                'Confirmación instantánea por email para ti y tu cliente',
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={16} className="shrink-0" style={{ color: 'var(--accent)' }} />
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
                        <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--fg)' }}>Control total de tu consulta y finanzas</h3>
                        <p className="leading-relaxed mb-5 text-sm sm:text-base text-[var(--fg-muted)]">
                            Visualiza tus citas del día, clientes activos e ingresos del mes en un panel intuitivo. Registra pagos y mantén orden contable sin planillas de Excel desordenadas.
                        </p>
                        <ul className="flex flex-col gap-2.5">
                            {[
                                'Panel con métricas de reservas, ingresos y asistencia',
                                'Historial de pagos y atenciones por paciente',
                                'Notas de sesión privadas para tus atenciones',
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={16} className="shrink-0" style={{ color: 'var(--accent)' }} />
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
                            <img src="/hero/dashboard.svg" alt="Dashboard de SimpleAgenda con métricas y citas" width={480} height={340} className="w-full h-auto" />
                        </div>
                    </div>
                </div>

                {/* Feature cards — compact row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-12 sm:mt-16">
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.title}
                            className="p-5 rounded-xl border transition-all duration-200"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                <f.icon size={18} />
                            </div>
                            <h4 className="text-sm font-bold mb-1.5" style={{ color: 'var(--fg)' }}>{f.title}</h4>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS — 3 steps ═══════════════ */}
            <section id="como-funciona" className="scroll-mt-20" style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app section-marketing">
                    <div className="text-center mb-10 sm:mb-12">
                        <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent)]">Cómo funciona</p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mb-3 text-[var(--fg)]">Empieza en 3 sencillos pasos</h3>
                        <p className="max-w-md mx-auto text-sm text-[var(--fg-muted)]">Sin instalaciones complejas ni configuraciones difíciles. Listo en menos de 5 minutos.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                        {STEPS.map((step, i) => (
                            <div key={i} className="relative text-center">
                                {i < STEPS.length - 1 && (
                                    <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px" style={{ background: 'var(--border)' }} />
                                )}
                                <div
                                    className="relative w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold shadow-md"
                                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                >
                                    <step.icon size={20} />
                                </div>
                                <h4 className="font-bold text-base mb-1.5" style={{ color: 'var(--fg)' }}>{step.title}</h4>
                                <p className="text-xs sm:text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--fg-muted)' }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ FREE TRIAL CTA ═══════════════ */}
            <section id="prueba-gratis" className="container-app section-marketing scroll-mt-20">
                <div className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent)]">{copy.sectionEyebrow}</p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 text-[var(--fg)]">
                        {copy.sectionTitle}
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--fg-muted)]">
                        {copy.sectionSubtitle}
                    </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
                    {trialBenefits.map((item) => (
                        <div
                            key={item.title}
                            className="p-5 rounded-xl border text-center"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                <item.icon size={20} />
                            </div>
                            <h3 className="text-sm font-bold mb-1.5 text-[var(--fg)]">{item.title}</h3>
                            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{item.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="text-center">
                    <PanelButton
                        type="button"
                        variant="accent"
                        className="h-12 px-8 text-sm font-semibold shadow-md gap-2"
                        onClick={handleCTA}
                    >
                        {isLoggedIn ? 'Ir a mi agenda' : copy.sectionCta}
                        <IconArrowRight size={16} />
                    </PanelButton>
                    <p className="mt-4 text-xs max-w-md mx-auto text-[var(--fg-muted)]">
                        {copy.sectionFootnote}
                    </p>
                </div>
            </section>

            {/* ═══════════════ PLANS & PRICING ═══════════════ */}
            {showPlans ? (
                <section id="planes" className="scroll-mt-20" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="container-app section-marketing">
                        <div className="mx-auto mb-10 max-w-2xl text-center">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                                Planes transparentes y sin letra chica
                            </p>
                            <h2 className="mb-3 text-2xl font-extrabold sm:text-3xl lg:text-4xl text-[var(--fg)]">
                                Empieza gratis, prueba Pro 30 días y después decides.
                            </h2>
                            <p className="text-sm sm:text-base text-[var(--fg-muted)]">
                                Al registrarte tienes acceso completo a Pro por 30 días sin tarjeta. Al terminar, sigues en el plan Gratis para siempre o activas Pro desde {formatAgendaProAnnualMonthlyPrice()}. No hay cobros automáticos.
                            </p>

                            {/* Billing Period Selector */}
                            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setBillingPeriod('monthly')}
                                    className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                                        billingPeriod === 'monthly'
                                            ? 'bg-[var(--accent)] text-white shadow-xs'
                                            : 'text-[var(--fg-secondary)] hover:text-[var(--fg)]'
                                    }`}
                                >
                                    Facturación mensual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingPeriod('annual')}
                                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                                        billingPeriod === 'annual'
                                            ? 'bg-[var(--accent)] text-white shadow-xs'
                                            : 'text-[var(--fg-secondary)] hover:text-[var(--fg)]'
                                    }`}
                                >
                                    <span>Facturación anual</span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            billingPeriod === 'annual'
                                                ? 'bg-white/20 text-white'
                                                : 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                                        }`}
                                    >
                                        2 meses gratis (-20%)
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* 2 Main Plans Grid: Free vs Pro */}
                        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 items-stretch">
                            
                            {/* Free Plan */}
                            <article
                                className="flex flex-col rounded-2xl border p-6 sm:p-8 transition-shadow"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'var(--surface)',
                                }}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-[var(--fg-muted)]">Gratis</p>
                                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--fg-secondary)]">
                                            Para empezar
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-extrabold text-[var(--fg)] tracking-tight">$0</span>
                                        <span className="text-xs text-[var(--fg-muted)]">/ para siempre</span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                                        Sin tarjeta requerida · sin cobros automáticos sorpresa
                                    </p>
                                    <p className="mt-4 text-xs leading-relaxed text-[var(--fg-secondary)]">
                                        {AGENDA_PLAN_CATALOG.free.description}
                                    </p>

                                    {/* Capacidad resumida */}
                                    <div className="my-5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/60 p-3.5 text-xs">
                                        <p className="font-semibold text-[var(--fg)]">Capacidad mensual incluida:</p>
                                        <ul className="mt-1.5 space-y-1 text-[var(--fg-secondary)]">
                                            <li>• <strong>Hasta {AGENDA_PRICING.free.monthlyBookings} reservas</strong> nuevas al mes</li>
                                            <li>• <strong>Hasta {AGENDA_PRICING.free.activeServices} servicios</strong> activos en tu perfil</li>
                                            <li>• <strong>{AGENDA_PRICING.free.activeLocations} ubicación</strong> o consultorio</li>
                                        </ul>
                                    </div>
                                </div>

                                <ul className="mb-6 grid gap-2.5 text-xs leading-relaxed text-[var(--fg-secondary)]">
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Perfil público y link de reservas online personalizado
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Agenda interactiva y fichas de clientes
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Confirmación automática por email
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Cobros por Mercado Pago o transferencia bancaria
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Sin comisión por reserva (0%)
                                    </li>
                                </ul>

                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    className="mt-auto h-12 w-full text-sm font-semibold"
                                    onClick={handleCTA}
                                >
                                    {isLoggedIn ? 'Ir a mi agenda' : 'Crear cuenta gratis'}
                                </PanelButton>
                            </article>

                            {/* Pro Plan (Featured) */}
                            <article
                                className="relative flex flex-col rounded-2xl border-2 p-6 sm:p-8 shadow-xl"
                                style={{
                                    borderColor: 'var(--accent)',
                                    background: 'var(--surface)',
                                }}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-[var(--accent)]">Pro</p>
                                        <span
                                            className="rounded-full px-3 py-1 text-[11px] font-bold"
                                            style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}
                                        >
                                            Más popular · Recomendado
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-extrabold text-[var(--fg)] tracking-tight">
                                            {billingPeriod === 'annual'
                                                ? `$${AGENDA_PRICING.proAnnualMonthlyEquivalentNetClp.toLocaleString('es-CL')}`
                                                : `$${AGENDA_PRICING.proMonthlyNetClp.toLocaleString('es-CL')}`}
                                        </span>
                                        <span className="text-xs text-[var(--fg-muted)]">+ IVA / mes</span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                                        {billingPeriod === 'annual'
                                            ? `Facturado anualmente ($${AGENDA_PRICING.proAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año) · Ahorras 2 meses`
                                            : 'Facturado mes a mes · cancela cuando quieras sin permanencia'}
                                    </p>
                                    <p className="mt-4 text-xs leading-relaxed text-[var(--fg-secondary)]">
                                        {AGENDA_PLAN_CATALOG.pro.description}
                                    </p>

                                    {/* Capacidad resumida */}
                                    <div className="my-5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-subtle)]/40 p-3.5 text-xs">
                                        <p className="font-semibold text-[var(--fg)]">Capacidad profesional completa:</p>
                                        <ul className="mt-1.5 space-y-1 text-[var(--fg-secondary)]">
                                            <li>• <strong>Reservas ilimitadas</strong> sin tope mensual</li>
                                            <li>• <strong>Servicios y sucursales ilimitados</strong></li>
                                            <li>• <strong>Prueba Pro completa de 30 días</strong> sin tarjeta</li>
                                        </ul>
                                    </div>
                                </div>

                                <ul className="mb-6 grid gap-2.5 text-xs leading-relaxed text-[var(--fg-secondary)]">
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        <span><strong>Todo lo incluido en Gratis</strong> sin restricciones de volumen</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Recordatorios automáticos por email para reducir inasistencias
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Módulo de finanzas y control detallado de cobros
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Packs de sesiones, promociones y descuentos automáticos
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Estadísticas de rendimiento, encuestas NPS y referidos
                                    </li>
                                </ul>

                                <PanelButton
                                    type="button"
                                    variant="accent"
                                    className="mt-auto h-12 w-full text-sm font-semibold gap-2 shadow-md"
                                    onClick={() => isLoggedIn ? router.push('/panel/mi-cuenta/suscripcion') : openAuth('register')}
                                >
                                    {isLoggedIn ? 'Ver plan Pro' : 'Crear cuenta gratis y probar Pro'}
                                    <IconArrowRight size={16} />
                                </PanelButton>
                            </article>
                        </div>

                        {/* Complete Feature Comparison Table */}
                        <PlanComparisonTable />

                        {/* Multi-professional center & Pro+ WhatsApp Preview */}
                        <div className="mx-auto mt-10 max-w-4xl grid gap-4 sm:grid-cols-3">
                            <div
                                className="sm:col-span-2 flex flex-col justify-between rounded-2xl border p-5 sm:p-6"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                                        <IconBuilding size={22} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-[var(--fg)]">¿Múltiples profesionales o consultas?</h3>
                                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--fg-secondary)]">
                                                Plan Empresa
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                                            Centraliza agendas, recepcionistas, múltiples sucursales y reportes consolidados para tu clínica, salón o centro.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex sm:justify-end">
                                    <a
                                        href="mailto:contacto@simpleagenda.app?subject=Consulta%20Plan%20Empresa%20/%20Cl%C3%ADnicas"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                                    >
                                        Cotizar para equipos y consultorios
                                        <IconArrowRight size={14} />
                                    </a>
                                </div>
                            </div>

                            <div
                                className="flex flex-col justify-between rounded-2xl border p-5 sm:p-6"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <IconBrandWhatsapp size={18} className="text-[#25D366]" />
                                        <h3 className="text-sm font-bold text-[var(--fg)]">Próximamente Pro+</h3>
                                    </div>
                                    <p className="mt-1.5 text-xs text-[var(--fg-muted)] leading-relaxed">
                                        Confirmaciones, recordatorios y seguimiento de clientes automático por WhatsApp.
                                    </p>
                                </div>
                                <span className="mt-4 inline-block text-[11px] font-semibold text-[var(--fg-secondary)]">
                                    En desarrollo activo
                                </span>
                            </div>
                        </div>

                        <p className="mt-8 text-center text-xs text-[var(--fg-muted)]">
                            Pro cuesta {formatAgendaProMonthlyPrice()} (o {formatAgendaProAnnualMonthlyPrice()} pagando anual). Sin permanencia mínima ni comisiones por reserva.
                        </p>
                    </div>
                </section>
            ) : null}

            {/* ═══════════════ FAQ ═══════════════ */}
            <section style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app section-marketing">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-10 sm:mb-12">
                            <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent)]">FAQ</p>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--fg)]">Preguntas frecuentes</h2>
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

            {/* ═══════════════ FINAL HIGH-CONVERSION CTA ═══════════════ */}
            <section className="container-app section-marketing">
                <div
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl px-6 py-12 sm:px-12 sm:py-16 lg:py-20 text-center bg-[linear-gradient(135deg,var(--accent)_0%,color-mix(in_oklab,var(--accent)_75%,black)_100%)] shadow-xl"
                >
                    {/* Decorative circles */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

                    <div className="relative z-10 max-w-xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 bg-white/20 text-white backdrop-blur-xs">
                            <IconSparkles size={14} />
                            Comienza hoy en menos de 5 minutos
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-4 text-white" style={{ letterSpacing: '-0.02em' }}>
                            ¿Listo para dejar atrás el caos de WhatsApp y organizar tu agenda?
                        </h2>
                        <p className="text-sm sm:text-base mb-8 text-white/90 leading-relaxed">
                            Únete a profesionales de la salud, estética, bienestar y servicios que ya automatizan sus citas con SimpleAgenda en Chile.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <PanelButton
                                type="button"
                                variant="accent"
                                onClick={handleCTA}
                                className="h-12 px-8 text-sm font-bold gap-2 bg-white text-[var(--accent)] hover:bg-white/90 shadow-lg"
                            >
                                {isLoggedIn ? 'Ir a mi agenda' : 'Crear mi agenda gratis ahora'}
                                <IconArrowRight size={16} />
                            </PanelButton>
                        </div>
                        <p className="mt-4 text-xs text-white/75">
                            Prueba Pro completa de 30 días · Sin tarjeta de crédito · Sin letra chica
                        </p>
                    </div>
                </div>
            </section>

        </div>
    );
}