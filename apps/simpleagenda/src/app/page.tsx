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
    IconShieldCheck,
    IconSparkles,
    IconChevronDown,
    IconStar,
    IconBuilding,
    IconBrandWhatsapp,
    IconCalendarEvent,
} from '@tabler/icons-react';
import {
    AGENDA_PLAN_CATALOG,
    AGENDA_PRICING,
    formatAgendaProMonthlyPrice,
    formatAgendaProAnnualMonthlyPrice,
    isPlatformLaunchActive,
    resolveOperatorLandingCopy,
} from '@simple/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { FeaturedProfessionalsSection } from '@/components/landing/featured-professionals-section';
import { PlanComparisonTable } from '@/components/landing/plan-comparison-table';
import { InteractiveBookingDemo } from '@/components/landing/interactive-booking-demo';
import { PainComparisonSection } from '@/components/landing/pain-comparison-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { RoiCalculator } from '@/components/landing/roi-calculator';
import { WhatsAppSnippetCard } from '@/components/landing/whatsapp-snippet-card';
import { MobileStickyCTA } from '@/components/landing/mobile-sticky-cta';

/* ────────────────────────── Data ────────────────────────── */

const CORE_FEATURES = [
    {
        icon: IconCalendar,
        title: 'Reservas online 24/7',
        desc: 'Tus clientes eligen servicio, fecha y hora desde tu propio link según tu disponibilidad real, sin llamadas ni mensajes.',
    },
    {
        icon: IconBell,
        title: 'Recordatorios automáticos',
        desc: 'Reduce inasistencias drásticamente con avisos por correo antes de cada atención sin enviar mensajes manuales.',
    },
    {
        icon: IconCreditCard,
        title: 'Pagos en CLP con 0% comisión',
        desc: 'Recibe pagos con Mercado Pago (Webpay / Tarjetas) o transferencias directas. No cobramos comisiones por cita.',
    },
    {
        icon: IconUsers,
        title: 'Ficha de clientes y notas',
        desc: 'Historial de sesiones, notas privadas de atención y datos de contacto centralizados en un solo lugar.',
    },
    {
        icon: IconBrandWhatsapp,
        title: 'Link directo y personalizable',
        desc: 'Tu link exclusivo (simpleagenda.app/tu-nombre) listo para poner en tu Instagram, WhatsApp Business o tarjeta digital.',
    },
    {
        icon: IconCalendarEvent,
        title: 'Google Calendar integrado',
        desc: 'Conecta tu calendario personal en 2 clics. Tus compromisos personales bloquean automáticamente la agenda para evitar cualquier tope.',
    },
];

const STEPS = [
    {
        step: '1',
        title: 'Crea tu perfil en 2 minutos',
        desc: 'Define tus servicios, precios en pesos chilenos y tus horarios de atención disponibles.',
    },
    {
        step: '2',
        title: 'Comparte tu propio link',
        desc: 'Pégalo en tu biografía de Instagram, en tu estado de WhatsApp o envíalo a quien te pida hora.',
    },
    {
        step: '3',
        title: 'Recibe reservas automáticas',
        desc: 'Tus clientes agendan solos 24/7. Ambos reciben confirmación inmediata con los detalles de la cita.',
    },
];

const PROFESSION_TAGS = [
    'Psicólogos y Terapeutas',
    'Médicos y Kinesiólogos',
    'Barberías y Salones',
    'Centros de Estética',
    'Nutrición y Bienestar',
    'Consultorías y Coaching',
];

const CHILEAN_FAQS = [
    {
        q: '¿Mis pacientes o clientes tienen que crearse una cuenta o bajar una app para reservar?',
        a: 'No. Tus clientes acceden directamente desde el navegador de su celular o computador (Safari, Chrome, etc.) a través de tu link. Eligen servicio, fecha y hora en 30 segundos sin necesidad de registrarse, sin contraseñas y sin descargar ninguna aplicación.',
    },
    {
        q: '¿Puedo cobrar por transferencia bancaria (Cuenta RUT u otros bancos) si no uso Mercado Pago?',
        a: 'Sí, totalmente. Puedes configurar tus datos de transferencia (RUT, Banco, Tipo y Número de cuenta) para que el paciente los vea al momento de reservar. Una vez que recibas el comprobante, marcas la cita como pagada en un solo clic desde tu panel.',
    },
    {
        q: '¿Cómo funciona la integración con Mercado Pago en Chile?',
        a: 'Puedes conectar tu cuenta de Mercado Pago Chile para permitir cobro inmediato con tarjetas de débito (incluyendo Cuenta RUT), tarjetas de crédito y Webpay Plus. El dinero llega directo a tu cuenta bancaria o de Mercado Pago con 0% de comisión por parte de SimpleAgenda.',
    },
    {
        q: '¿Se sincroniza con mi Google Calendar personal?',
        a: 'Sí. Conectas tu cuenta de Google en dos clics. Si agregas un evento o compromiso en tu Google Calendar personal, ese horario se bloquea de inmediato en SimpleAgenda para evitar topes de horario, y cada nueva reserva se agrega automáticamente a tu calendario.',
    },
    {
        q: '¿Qué pasa cuando terminan los 30 días de prueba del plan Pro?',
        a: 'Tu cuenta pasa automáticamente al plan Gratis para siempre (con hasta 30 reservas mensuales incluidas). Como no solicitamos tarjeta de crédito al registrarte, nunca habrá ningún cobro sorpresa ni penalización.',
    },
    {
        q: '¿Cobran comisión por cada cita o atención agendada?',
        a: 'No. SimpleAgenda cobra 0% de comisión por cita. El 100% de lo que cobras a tus pacientes o clientes es tuyo.',
    },
];

/* ────────────────────────── Helpers ────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border-b transition-colors last:border-b-0"
            style={{ borderColor: 'var(--border)' }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between py-5 text-left transition-colors"
                aria-expanded={open}
            >
                <span className="font-semibold text-sm sm:text-base text-[var(--fg)] pr-4">{q}</span>
                <IconChevronDown
                    size={18}
                    className="shrink-0 text-[var(--fg-muted)] transition-transform duration-200"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>
            <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: open ? '260px' : '0px', opacity: open ? 1 : 0 }}
            >
                <p className="pb-5 text-xs sm:text-sm leading-relaxed text-[var(--fg-secondary)]">{a}</p>
            </div>
        </div>
    );
}

/* ────────────────────────── Page ────────────────────────── */

export default function HomePage() {
    const { isLoggedIn, openAuth } = useAuth();
    const router = useRouter();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const showPlans = !isPlatformLaunchActive('agenda');

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
            <section className="vertical-hero-texture relative overflow-hidden border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                <div className="container-app pt-12 sm:pt-16 lg:pt-24 pb-16 sm:pb-20 lg:pb-28">
                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(460px,1.15fr)] lg:gap-12">
                        
                        {/* Hero Left: Value proposition */}
                        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                            
                            {/* Chilean active badge */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)] animate-fade-in shadow-2xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <IconSparkles size={13} className="text-amber-500" />
                                    <span><strong>+140 citas agendadas</strong> esta semana en Chile · 98% de asistencia</span>
                                </span>
                            </div>

                            {/* Main Headline: Punchy, clean */}
                            <h1
                                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] mb-5 animate-slide-up"
                                style={{ color: 'var(--fg)', letterSpacing: '-0.025em' }}
                            >
                                Tu agenda profesional,{' '}
                                <span style={{ color: 'var(--accent)' }}>sin el caos de WhatsApp.</span>
                            </h1>

                            {/* Subtitle: Crisp and readable */}
                            <p
                                className="text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 animate-slide-up text-[var(--fg-secondary)]"
                                style={{ animationDelay: '80ms' }}
                            >
                                Comparte tu link de reservas. Tus clientes eligen día y hora en 30 segundos según tu disponibilidad real, con confirmación y recordatorios automáticos.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '140ms' }}>
                                <PanelButton
                                    type="button"
                                    variant="accent"
                                    className="h-12 px-7 text-sm font-semibold shadow-md gap-2 rounded-xl"
                                    onClick={handleCTA}
                                >
                                    {isLoggedIn ? 'Ir a mi agenda' : 'Crear mi agenda gratis'}
                                    <IconArrowRight size={16} />
                                </PanelButton>
                                <PanelButtonLink href="#demo-interactiva" variant="secondary" className="h-12 px-6 text-sm font-semibold rounded-xl">
                                    <IconCalendar size={15} />
                                    Probar demo en vivo
                                </PanelButtonLink>
                            </div>

                            {/* Social Proof & Chilean trust indicators */}
                            <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in" style={{ animationDelay: '240ms' }}>
                                <div className="flex -space-x-2.5 overflow-hidden">
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-bold text-white shadow-2xs">VM</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow-2xs">EC</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-600 text-xs font-bold text-white shadow-2xs">CS</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-bold text-white shadow-2xs">RV</div>
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-xs font-bold text-white shadow-2xs">+90</div>
                                </div>
                                <div className="flex flex-col text-center sm:text-left text-xs">
                                    <div className="flex items-center justify-center sm:justify-start gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <IconStar key={s} size={13} className="fill-amber-400 text-amber-400" />
                                        ))}
                                        <span className="font-bold ml-1 text-[var(--fg)]">5.0 / 5.0</span>
                                    </div>
                                    <span className="mt-0.5 text-[var(--fg-secondary)]">
                                        Recomendado por psicólogos, médicos y terapeutas en Chile
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* Hero Right: Live Interactive Mockup Card */}
                        <div className="relative mx-auto w-full max-w-xl animate-scale-in">
                            {/* Outer App Window Frame */}
                            <div
                                className="relative rounded-2xl border overflow-hidden shadow-xl transition-all"
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
                                    <div className="flex items-center gap-1 px-3 py-0.5 rounded-md bg-[var(--surface)] border text-[11px] font-mono text-[var(--fg-muted)] shadow-2xs" style={{ borderColor: 'var(--border)' }}>
                                        <IconLock size={10} className="text-emerald-500" />
                                        <span>simpleagenda.app/dra-valentina</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>En línea</span>
                                    </div>
                                </div>

                                {/* Mockup Content Area: Professional profile header */}
                                <div className="p-4 sm:p-5">
                                    <div className="relative aspect-16/9 rounded-xl overflow-hidden mb-4 border border-[var(--border)]">
                                        <img
                                            src="/hero/consultation-hero.webp"
                                            alt="Consulta profesional de psicología clínica"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                        <div className="absolute bottom-3 left-3 right-3 text-white">
                                            <p className="font-bold text-sm sm:text-base">Dra. Valentina Muñoz</p>
                                            <p className="text-xs text-white/80">Psicología Clínica · Providencia</p>
                                        </div>
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-zinc-800 shadow-xs backdrop-blur-xs">
                                                Agenda abierta
                                            </span>
                                        </div>
                                    </div>

                                    {/* Simulated Live Booking State */}
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                <IconCheck size={16} stroke={3} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--fg)]">¡Nueva reserva confirmada!</p>
                                                <p className="text-[11px] text-[var(--fg-muted)]">Camila S. reservó Sesión Individual · Jueves 16:30</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-[var(--fg-muted)] font-medium">Hace 3 min</span>
                                    </div>

                                    {/* Mini Metrics Row */}
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                                            <p className="text-[10px] text-[var(--fg-muted)]">Hoy</p>
                                            <p className="font-bold text-[var(--fg)]">6 citas</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                                            <p className="text-[10px] text-[var(--fg-muted)]">Facturado</p>
                                            <p className="font-bold text-[var(--accent)]">$280.000</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                                            <p className="text-[10px] text-[var(--fg-muted)]">Asistencia</p>
                                            <p className="font-bold text-emerald-600">98%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating WhatsApp Bubble */}
                            <div
                                className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-6 rounded-2xl border p-3.5 shadow-xl flex items-center gap-3 backdrop-blur-md animate-fade-in"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'var(--surface)',
                                }}
                            >
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                    <IconBrandWhatsapp size={20} />
                                </div>
                                <div className="text-xs">
                                    <p className="font-bold text-[var(--fg)]">Cero horas perdidas</p>
                                    <p className="text-[11px] text-[var(--fg-muted)]">Tus clientes se agendan solos 24/7</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════ ACTO 1: DOLOR VS SOLUCIÓN ═══════════════ */}
            <PainComparisonSection />

            {/* ═══════════════ ACTO 1 (CONT): DEMO INTERACTIVA ═══════════════ */}
            <InteractiveBookingDemo onStartFree={handleCTA} />

            {/* ═══════════════ ACTO 2: FUNCIONALIDADES ESENCIALES ═══════════════ */}
            <section id="funciones" className="py-14 sm:py-20 border-b border-[var(--border)] scroll-mt-20" style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app">
                    <SectionHeader
                        badgeIcon={<IconSparkles size={14} />}
                        badgeLabel="Plataforma todo en uno"
                        title="Todo lo que necesitas para tu consulta"
                        subtitle="Diseñado especialmente para profesionales independientes, consultas y salones que atienden con citas en Chile."
                    />

                    {/* 6 feature cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                        {CORE_FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="p-5 sm:p-6 rounded-2xl border transition-all duration-200 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent-border)] hover:shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[var(--accent-subtle)] text-[var(--accent)]">
                                    <f.icon size={20} />
                                </div>
                                <h3 className="text-base font-bold mb-1.5 text-[var(--fg)]">{f.title}</h3>
                                <p className="text-xs sm:text-sm leading-relaxed text-[var(--fg-secondary)]">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Rubros adaptados */}
                    <div className="mt-10 pt-6 border-t border-[var(--border)] max-w-5xl mx-auto text-center">
                        <p className="text-xs font-semibold mb-3 text-[var(--fg-secondary)]">Adaptado a tu especialidad y rubro en Chile:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {PROFESSION_TAGS.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-secondary)] shadow-2xs"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ ACTO 2 (CONT): CÓMO FUNCIONA — 3 PASOS ═══════════════ */}
            <section id="como-funciona" className="py-14 sm:py-20 border-b border-[var(--border)] scroll-mt-20" style={{ background: 'var(--bg)' }}>
                <div className="container-app">
                    <SectionHeader
                        badgeIcon={<IconCheck size={14} />}
                        badgeLabel="Puesta en marcha"
                        title="Empieza en 3 sencillos pasos"
                        subtitle="Sin instalaciones complejas ni configuraciones técnicas. Tu agenda lista en menos de 5 minutos."
                    />

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {STEPS.map((step) => (
                            <div
                                key={step.step}
                                className="relative rounded-2xl border p-6 text-center transition-all bg-[var(--surface)] border-[var(--border)] shadow-xs"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-extrabold text-sm shadow-2xs"
                                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                >
                                    {step.step}
                                </div>
                                <h4 className="font-bold text-base mb-2 text-[var(--fg)]">{step.title}</h4>
                                <p className="text-xs sm:text-sm leading-relaxed text-[var(--fg-secondary)]">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 text-center">
                        <PanelButton
                            type="button"
                            variant="accent"
                            className="h-12 px-8 text-sm font-semibold shadow-md gap-2 rounded-xl"
                            onClick={handleCTA}
                        >
                            {isLoggedIn ? 'Ir a mi agenda' : 'Crear mi agenda gratis ahora'}
                            <IconArrowRight size={16} />
                        </PanelButton>
                        <p className="mt-3 text-xs text-[var(--fg-muted)]">
                            Prueba Pro completa de 30 días sin tarjeta · Sin cobros automáticos
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══════════════ ACTO 3: COMUNIDAD ACTIVA EN CHILE ═══════════════ */}
            <FeaturedProfessionalsSection />

            {/* ═══════════════ ACTO 3 (CONT): TESTIMONIOS Y MÉTRICAS ═══════════════ */}
            <TestimonialsSection />

            {/* ═══════════════ ACTO 4: CALCULADORA DE RETORNO / AHORRO ═══════════════ */}
            <RoiCalculator onStartFree={handleCTA} />

            {/* ═══════════════ ACTO 4 (CONT): RESPUESTA RÁPIDA WHATSAPP ═══════════════ */}
            <WhatsAppSnippetCard />

            {/* ═══════════════ ACTO 5: PLANES Y PRECIOS ═══════════════ */}
            {showPlans ? (
                <section id="planes" className="scroll-mt-20 py-14 sm:py-20 border-b border-[var(--border)]" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="container-app">
                        <SectionHeader
                            badgeIcon={<IconCreditCard size={14} />}
                            badgeLabel="Planes transparentes"
                            title="Empieza gratis, prueba Pro 30 días y después decides"
                            subtitle={`Al registrarte tienes acceso completo a Pro por 30 días sin tarjeta. Al terminar, sigues en el plan Gratis para siempre o activas Pro desde ${formatAgendaProAnnualMonthlyPrice()}. No hay cobros automáticos.`}
                        />

                        {/* Trust badges strip */}
                        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--fg-secondary)] shadow-2xs">
                                <IconShieldCheck size={14} className="text-emerald-500" />
                                Mercado Pago Chile (Webpay / Tarjetas)
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--fg-secondary)] shadow-2xs">
                                <IconCreditCard size={14} className="text-blue-500" />
                                Transferencias (Cuenta RUT / Bancos)
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--fg-secondary)] shadow-2xs">
                                <IconCalendarEvent size={14} className="text-indigo-500" />
                                Google Calendar integrado
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)] font-bold shadow-2xs">
                                0% comisión por cita
                            </span>
                        </div>

                        {/* Billing Period Selector */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setBillingPeriod('monthly')}
                                    className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                                        billingPeriod === 'monthly'
                                            ? 'bg-[var(--accent)] text-white shadow-2xs'
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
                                            ? 'bg-[var(--accent)] text-white shadow-2xs'
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
                                className="flex flex-col rounded-2xl border p-6 sm:p-8 transition-shadow bg-[var(--surface)] border-[var(--border)]"
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

                                <ul className="mb-8 space-y-3 text-xs text-[var(--fg-secondary)]">
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        Página pública con link propio (simpleagenda.app/tu-nombre)
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        Agenda online 24/7 con disponibilidad en tiempo real
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        Confirmación inmediata por correo para ti y tu cliente
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        Pagos por transferencia bancaria (0% comisión)
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        Panel de gestión con calendario diario y semanal
                                    </li>
                                </ul>

                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    className="mt-auto h-12 w-full text-sm font-semibold rounded-xl"
                                    onClick={handleCTA}
                                >
                                    {isLoggedIn ? 'Ir a mi panel' : 'Crear cuenta gratis'}
                                </PanelButton>
                            </article>

                            {/* Pro Plan (Featured) */}
                            <article
                                className="relative flex flex-col rounded-2xl border-2 p-6 sm:p-8 shadow-xl bg-[var(--surface)]"
                                style={{ borderColor: 'var(--accent)' }}
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
                                            <li>• <strong>Servicios ilimitados</strong> con duración y precios propios</li>
                                            <li>• <strong>Múltiples sucursales</strong> o consultorios simultáneos</li>
                                        </ul>
                                    </div>
                                </div>

                                <ul className="mb-8 space-y-3 text-xs text-[var(--fg-secondary)]">
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        <strong>Todo lo de Gratis, más:</strong>
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        <strong>Recordatorios automáticos por email</strong> para reducir inasistencias
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        <strong>Sincronización con Google Calendar</strong> (evita topes de horario)
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Cobro en línea con <strong>Mercado Pago y Webpay Plus</strong>
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Ficha completa de pacientes, historial y notas de sesión
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Módulo de finanzas y control detallado de cobros
                                    </li>
                                    <li className="flex gap-2">
                                        <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        Packs de sesiones, promociones y descuentos automáticos
                                    </li>
                                </ul>

                                <PanelButton
                                    type="button"
                                    variant="accent"
                                    className="mt-auto h-12 w-full text-sm font-semibold gap-2 shadow-md rounded-xl"
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
                                className="sm:col-span-2 flex flex-col justify-between rounded-2xl border p-5 sm:p-6 bg-[var(--surface)] border-[var(--border)]"
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
                                        <p className="mt-1 text-xs text-[var(--fg-secondary)] leading-relaxed">
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
                                className="flex flex-col justify-between rounded-2xl border p-5 sm:p-6 bg-[var(--surface)] border-[var(--border)]"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <IconBrandWhatsapp size={18} className="text-[#25D366]" />
                                        <h3 className="text-sm font-bold text-[var(--fg)]">Próximamente Pro+</h3>
                                    </div>
                                    <p className="mt-1.5 text-xs text-[var(--fg-secondary)] leading-relaxed">
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

            {/* ═══════════════ ACTO 5 (CONT): FAQ CHILENO ═══════════════ */}
            <section style={{ background: 'var(--bg)' }} className="py-14 sm:py-20 border-b border-[var(--border)]">
                <div className="container-app">
                    <div className="max-w-2xl mx-auto">
                        <SectionHeader
                            badgeIcon={<IconShieldCheck size={14} />}
                            badgeLabel="Preguntas frecuentes"
                            title="Todo lo que necesitas saber antes de empezar"
                            subtitle="Respuestas claras sobre pagos, sincronización y funcionamiento en Chile."
                        />
                        <div
                            className="rounded-2xl border overflow-hidden px-4 sm:px-6 shadow-2xs divide-y divide-[var(--border)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            {CHILEAN_FAQS.map((faq) => (
                                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ ACTO 5 (FINAL): BANNER DE CIERRE ═══════════════ */}
            <section className="py-14 sm:py-20" style={{ background: 'var(--bg)' }}>
                <div className="container-app">
                    <div
                        className="relative overflow-hidden rounded-2xl px-6 py-12 sm:px-12 sm:py-16 lg:py-20 text-center bg-[linear-gradient(135deg,var(--accent)_0%,color-mix(in_oklab,var(--accent)_75%,black)_100%)] shadow-xl"
                    >
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
                                    className="h-12 px-8 text-sm font-bold gap-2 bg-white text-[var(--accent)] hover:bg-white/90 shadow-lg rounded-xl"
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
                </div>
            </section>

            {/* ═══════════════ MOBILE STICKY CTA ═══════════════ */}
            <MobileStickyCTA onStartFree={handleCTA} />

        </div>
    );
}
