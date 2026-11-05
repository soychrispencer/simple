'use client';

import {
    IconX,
    IconCheck,
    IconBrandWhatsapp,
    IconSparkles,
    IconClock,
    IconAlertCircle,
    IconTrendingUp,
    IconCalendarCheck,
    IconMoonStars,
    IconCreditCard,
    IconMailForward,
} from '@tabler/icons-react';

const WHATSAPP_PAINS = [
    {
        title: 'El "¿tienes hora el jueves?" interminable',
        desc: 'Intercambias 10 audios y mensajes entre atenciones para intentar coincidir en un día libre.',
    },
    {
        title: 'Revisar cuadernos y notas con apuro',
        desc: 'Abres agendas en papel o notas del celular mientras estás con otro cliente, arriesgando dobles reservas.',
    },
    {
        title: 'Mensajes a las 23:30 hrs y fines de semana',
        desc: 'Tu celular personal nunca descansa. Si no respondes rápido, el paciente busca a otro profesional.',
    },
    {
        title: 'Inasistencias de último minuto ("se me olvidó")',
        desc: 'El paciente no llega, perdiste 1 hora de tu día y dejaste a otro cliente sin poder atenderse.',
    },
    {
        title: 'Perseguir comprobantes de transferencia',
        desc: 'Tener que pedir el comprobante por WhatsApp, revisar tu cuenta bancaria y marcar pagos a mano.',
    },
];

const SIMPLE_BENEFITS = [
    {
        title: 'Un solo link en tu bio o estado',
        desc: 'Pones simpleagenda.app/tu-nombre en tu Instagram o WhatsApp. Tu cliente entra y ve tus horas reales.',
    },
    {
        title: 'Disponibilidad sincronizada en tiempo real',
        desc: 'Bloquea pausas y almuerzos. Si tienes Google Calendar conectado, evita automáticamente cualquier tope.',
    },
    {
        title: 'Tu agenda recibe reservas 24/7 mientras descansas',
        desc: 'El 65% de las reservas se hacen fuera del horario laboral. Tu consulta sigue facturando mientras duermes.',
    },
    {
        title: 'Recordatorios automáticos por email',
        desc: 'Tus pacientes reciben confirmación inmediata y recordatorios antes de su cita. Inasistencias reducidas en 90%.',
    },
    {
        title: 'Cobro garantizado al reservar',
        desc: 'Recibe pagos con Mercado Pago o transferencia bancaria directamente a tu cuenta, con 0% de comisión.',
    },
];

export function PainComparisonSection() {
    return (
        <section className="py-16 sm:py-24" style={{ background: 'var(--bg)' }}>
            <div className="container-app">
                <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--accent)]">
                        El cambio real en tu día a día
                    </p>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--fg)]">
                        ¿Cuánto tiempo pierdes hoy coordinando citas?
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed">
                        Atender bien a tus pacientes ya es demandante. Gestionar tus horas no debería ser un segundo trabajo.
                    </p>
                </div>

                <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2 items-stretch">
                    {/* The Chaos of WhatsApp */}
                    <div
                        className="rounded-2xl sm:rounded-3xl border p-6 sm:p-8 flex flex-col justify-between"
                        style={{
                            borderColor: 'color-mix(in oklab, #ef4444 30%, var(--border))',
                            background: 'color-mix(in oklab, #ef4444 3%, var(--surface))',
                        }}
                    >
                        <div>
                            <div className="flex items-center justify-between pb-5 border-b border-[var(--border)]">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                        <IconBrandWhatsapp size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base sm:text-lg text-[var(--fg)]">
                                            Coordinar por WhatsApp
                                        </h3>
                                        <p className="text-xs text-red-500 font-medium">Caos, fricción y horas perdidas</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-red-500/10 text-red-600 px-2.5 py-1 text-[11px] font-semibold">
                                    Agotador
                                </span>
                            </div>

                            <ul className="mt-6 space-y-4">
                                {WHATSAPP_PAINS.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                                        <div className="size-5 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                                            <IconX size={13} stroke={2.5} />
                                        </div>
                                        <div>
                                            <strong className="text-[var(--fg)] font-semibold block">{item.title}</strong>
                                            <span className="text-[var(--fg-muted)] leading-relaxed">{item.desc}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8 pt-5 border-t border-[var(--border)] text-xs text-[var(--fg-muted)] flex items-center gap-2">
                            <IconAlertCircle size={16} className="text-red-500 shrink-0" />
                            <span>Resultado: Pierdes entre 6 y 10 horas semanales solo respondiendo mensajes.</span>
                        </div>
                    </div>

                    {/* With SimpleAgenda */}
                    <div
                        className="rounded-2xl sm:rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative"
                        style={{
                            borderColor: 'var(--accent)',
                            background: 'var(--surface)',
                        }}
                    >
                        <div className="absolute -top-3 right-6 bg-[var(--accent)] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
                            Tu consulta en piloto automático
                        </div>

                        <div>
                            <div className="flex items-center justify-between pb-5 border-b border-[var(--border)]">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
                                        <IconSparkles size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base sm:text-lg text-[var(--fg)]">
                                            Con SimpleAgenda
                                        </h3>
                                        <p className="text-xs text-[var(--accent)] font-semibold">Orden, tranquilidad y más reservas</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] px-2.5 py-1 text-[11px] font-bold">
                                    Eficiente
                                </span>
                            </div>

                            <ul className="mt-6 space-y-4">
                                {SIMPLE_BENEFITS.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                                        <div className="size-5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                                            <IconCheck size={13} stroke={2.5} />
                                        </div>
                                        <div>
                                            <strong className="text-[var(--fg)] font-semibold block">{item.title}</strong>
                                            <span className="text-[var(--fg-muted)] leading-relaxed">{item.desc}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8 pt-5 border-t border-[var(--border)] text-xs text-[var(--accent)] font-medium flex items-center gap-2">
                            <IconTrendingUp size={16} className="shrink-0" />
                            <span>Resultado: Clientes felices agendando solos y tú enfocado 100% en atender.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
