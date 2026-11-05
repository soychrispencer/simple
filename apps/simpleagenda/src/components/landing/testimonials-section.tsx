'use client';

import { IconStar, IconShieldCheck } from '@tabler/icons-react';
import { SectionHeader } from './section-header';

type Testimonial = {
    name: string;
    profession: string;
    location: string;
    avatarInitials: string;
    avatarGradient: string;
    quote: string;
    highlight: string;
    verifiedMetric: string;
};

const TESTIMONIALS: Testimonial[] = [
    {
        name: 'Dra. Valentina Muñoz',
        profession: 'Psicóloga Clínica & Terapeuta',
        location: 'Providencia, Santiago',
        avatarInitials: 'VM',
        avatarGradient: 'from-emerald-600 to-teal-800',
        quote:
            'Antes perdía entre 1 y 2 horas diarias entre sesiones respondiendo WhatsApps para coordinar turnos. Puse mi link de SimpleAgenda en mi biografía de Instagram y mi agenda se llena sola. El 70% de mis pacientes agenda de noche o fin de semana sin que yo tenga que hacer nada.',
        highlight: 'Ahorro de 8 horas semanales en coordinación',
        verifiedMetric: '24 citas/semana gestionadas',
    },
    {
        name: 'Esteban Carrasco',
        profession: 'Fundador de BarberStudio Viña',
        location: 'Viña del Mar, Región de Valparaíso',
        avatarInitials: 'EC',
        avatarGradient: 'from-blue-600 to-indigo-800',
        quote:
            'Los recordatorios automáticos por correo cambiaron todo. Pasamos de tener 4 o 5 clientes que no llegaban por semana a casi cero inasistencias. Y si alguien cancela, el horario se libera en la web al segundo y otro cliente lo toma de inmediato.',
        highlight: 'Reducción de inasistencias del 95%',
        verifiedMetric: '90+ reservas mensuales',
    },
    {
        name: 'Camila Silva',
        profession: 'Nutricionista Deportiva',
        location: 'Las Condes (Atención Online y Presencial)',
        avatarInitials: 'CS',
        avatarGradient: 'from-amber-600 to-orange-800',
        quote:
            'Cobrar por adelantado con Mercado Pago al momento de reservar me ordenó por completo el flujo del mes. Mis pacientes ya asumen que reservar es confirmar y pagar de inmediato. Nunca más perseguí un comprobante de transferencia.',
        highlight: 'Cobro asegurado antes de cada sesión',
        verifiedMetric: '100% citas pagadas por adelantado',
    },
    {
        name: 'Dr. Rodrigo Valenzuela',
        profession: 'Kinesiólogo Traumatológico',
        location: 'Concepción, Región del Biobío',
        avatarInitials: 'RV',
        avatarGradient: 'from-teal-600 to-cyan-800',
        quote:
            'Tener la agenda sincronizada con mi Google Calendar personal evitó los topes de horario con mis turnos en el hospital. Es una plataforma limpia, rápida de usar para los pacientes y sin cobros abusivos de comisión por cita.',
        highlight: 'Sincronización total con Google Calendar',
        verifiedMetric: '0 topes de horario',
    },
];

const METRICS = [
    { value: '+500', label: 'Horas agendadas cada mes' },
    { value: '98.4%', label: 'Asistencia con recordatorios' },
    { value: '0%', label: 'Comisión por reserva' },
    { value: '4.9/5', label: 'Satisfacción de profesionales' },
];

export function TestimonialsSection() {
    return (
        <section className="py-14 sm:py-20 border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <div className="container-app">
                <SectionHeader
                    badgeIcon={<IconStar size={14} className="fill-[var(--accent)] text-[var(--accent)]" />}
                    badgeLabel="Casos de éxito reales"
                    title="Profesionales en Chile que ya ordenaron su consulta"
                    subtitle="Desde psicólogos y kinesiólogos hasta centros de estética y barberías. Así transformaron su rutina diaria."
                />

                {/* Testimonial Cards Grid */}
                <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {TESTIMONIALS.map((t) => (
                        <article
                            key={t.name}
                            className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs hover:shadow-sm transition-shadow relative"
                        >
                            <div>
                                {/* Rating Stars & Verified badge */}
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <IconStar
                                                key={s}
                                                size={15}
                                                className="fill-amber-400 text-amber-400"
                                            />
                                        ))}
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                                        <IconShieldCheck size={13} />
                                        {t.verifiedMetric}
                                    </span>
                                </div>

                                {/* Highlight Tag */}
                                <p className="text-xs font-bold text-[var(--accent)] mb-3 uppercase tracking-wide">
                                    {t.highlight}
                                </p>

                                {/* Quote */}
                                <p className="text-xs sm:text-sm leading-relaxed text-[var(--fg-secondary)] italic">
                                    "{t.quote}"
                                </p>
                            </div>

                            {/* Author details */}
                            <div className="mt-6 pt-5 border-t border-[var(--border)] flex items-center gap-3.5">
                                <div
                                    className={`size-11 rounded-xl bg-gradient-to-br ${t.avatarGradient} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                                >
                                    {t.avatarInitials}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-[var(--fg)] truncate">{t.name}</h4>
                                    <p className="text-xs text-[var(--fg-muted)] truncate">{t.profession}</p>
                                    <p className="text-[11px] text-[var(--fg-muted)] truncate">{t.location}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Metrics Bar */}
                <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                        {METRICS.map((m) => (
                            <div key={m.label} className="space-y-1">
                                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--accent)] tracking-tight">
                                    {m.value}
                                </p>
                                <p className="text-xs font-medium text-[var(--fg-secondary)]">
                                    {m.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
