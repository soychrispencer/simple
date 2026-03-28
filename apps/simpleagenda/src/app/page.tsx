import Link from 'next/link';
import {
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconBell,
    IconChartBar,
    IconArrowRight,
    IconCheck,
} from '@tabler/icons-react';

const FEATURES = [
    {
        icon: IconCalendar,
        title: 'Agenda inteligente',
        description: 'Gestiona tus citas con un calendario visual. Tus pacientes reservan en línea según tu disponibilidad real.',
    },
    {
        icon: IconUsers,
        title: 'Ficha de pacientes',
        description: 'Centraliza la información de cada paciente, su historial de sesiones y notas clínicas en un solo lugar.',
    },
    {
        icon: IconCreditCard,
        title: 'Control de pagos',
        description: 'Registra cobros, marca sesiones como pagadas y lleva un historial claro de tus ingresos.',
    },
    {
        icon: IconBell,
        title: 'Recordatorios automáticos',
        description: 'Reduce las inasistencias con recordatorios por email antes de cada sesión.',
    },
    {
        icon: IconChartBar,
        title: 'Resumen de tu consulta',
        description: 'Visualiza tus sesiones, ingresos y pacientes activos de un vistazo desde tu dashboard.',
    },
];

const PLANS = [
    {
        name: 'Gratis',
        price: '$0',
        period: '',
        description: 'Para empezar a ordenar tu consulta.',
        features: [
            'Hasta 20 citas al mes',
            'Hasta 10 pacientes',
            'Página de reserva pública',
            'Recordatorios por email',
        ],
        cta: 'Comenzar gratis',
        href: '/auth/registro',
        highlighted: false,
    },
    {
        name: 'Profesional',
        price: '$12.990',
        period: '/mes',
        description: 'Para profesionales con práctica activa.',
        features: [
            'Citas y pacientes ilimitados',
            'Notas clínicas por sesión',
            'Control de pagos y cobros',
            'Recordatorios por email',
            'Estadísticas de consulta',
        ],
        cta: 'Probar 14 días gratis',
        href: '/auth/registro?plan=pro',
        highlighted: true,
    },
];

export default function HomePage() {
    return (
        <div className="flex flex-col">
            {/* Hero */}
            <section className="px-4 pt-20 pb-16 text-center max-w-3xl mx-auto w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6 bg-[--accent-subtle] text-[--accent] border border-[--accent-border]">
                    <IconCalendar size={14} />
                    Para psicólogos, terapeutas y más
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                    Tu agenda profesional,<br />
                    <span className="text-[--accent]">sin complicaciones</span>
                </h1>
                <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
                    SimpleAgenda te ayuda a gestionar citas, pacientes y pagos en un solo lugar.
                    Más tiempo para lo que importa: tus pacientes.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/auth/registro"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-[--accent-contrast] bg-[--accent] hover:opacity-90 transition-opacity"
                    >
                        Comenzar gratis
                        <IconArrowRight size={16} />
                    </Link>
                    <Link
                        href="#como-funciona"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-zinc-700 hover:border-zinc-500 transition-colors"
                    >
                        Ver cómo funciona
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section id="como-funciona" className="px-4 py-16 max-w-5xl mx-auto w-full">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-3">Todo lo que necesitas</h2>
                    <p className="text-zinc-400">Una plataforma pensada para profesionales de la salud y servicios.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-[--accent-border] transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[--accent-soft] text-[--accent]">
                                <feature.icon size={20} />
                            </div>
                            <h3 className="font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-zinc-400">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="planes" className="px-4 py-16 max-w-3xl mx-auto w-full">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-3">Planes simples</h2>
                    <p className="text-zinc-400">Sin letra chica. Cancela cuando quieras.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={`p-6 rounded-2xl border flex flex-col gap-4 ${
                                plan.highlighted
                                    ? 'border-[--accent] bg-[--accent-soft]'
                                    : 'border-zinc-800 bg-zinc-900/50'
                            }`}
                        >
                            {plan.highlighted && (
                                <span className="text-xs font-semibold uppercase tracking-widest text-[--accent]">
                                    Más popular
                                </span>
                            )}
                            <div>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold">{plan.price}</span>
                                    <span className="text-zinc-400 text-sm">{plan.period}</span>
                                </div>
                                <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                            </div>
                            <ul className="flex flex-col gap-2 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm">
                                        <IconCheck size={14} className="text-[--accent] shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={plan.href}
                                className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-opacity ${
                                    plan.highlighted
                                        ? 'bg-[--accent] text-[--accent-contrast] hover:opacity-90'
                                        : 'bg-zinc-800 hover:bg-zinc-700'
                                }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA footer */}
            <section className="px-4 py-16 text-center max-w-xl mx-auto w-full">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                    Empieza hoy, sin costo
                </h2>
                <p className="text-zinc-400 mb-8">
                    Configura tu agenda en menos de 5 minutos y comparte tu link de reservas con tus pacientes.
                </p>
                <Link
                    href="/auth/registro"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[--accent-contrast] bg-[--accent] hover:opacity-90 transition-opacity"
                >
                    Crear mi cuenta gratis
                    <IconArrowRight size={16} />
                </Link>
            </section>
        </div>
    );
}
