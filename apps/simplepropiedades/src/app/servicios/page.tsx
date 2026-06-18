'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
    IconArrowRight,
    IconBuilding,
    IconCalculator,
    IconCheck,
    IconHome2,
    IconKey,
    IconShieldCheck,
    IconSparkles,
} from '@tabler/icons-react';
import { getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui/panel';

const STEPS = [
    { title: 'Evaluamos', desc: 'Revisamos tu propiedad y objetivo.' },
    { title: 'Publicamos', desc: 'Ficha optimizada y difusión.' },
    { title: 'Cerramos', desc: 'Visitas, negociación y cierre.' },
];

export default function ServiciosPage() {
    return (
        <div className="flex flex-col">
            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:gap-14">
                        <div className="max-w-xl">
                            <div
                                className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                                style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                <IconSparkles size={13} />
                                Gestión inmobiliaria
                            </div>
                            <h1
                                className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl"
                                style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}
                            >
                                Delega tu arriendo o venta
                            </h1>
                            <p className="mb-8 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                                Publicamos, gestionamos interesados y te acompañamos hasta el cierre. Tú mantienes la propiedad.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/servicios/venta-asistida"
                                    className={getPanelButtonClassName({ className: 'h-12 px-7 text-sm gap-2' })}
                                    style={getPanelButtonStyle('primary')}
                                >
                                    Solicitar evaluación
                                    <IconArrowRight size={16} />
                                </Link>
                                <Link
                                    href="/servicios/simulador-hipotecario"
                                    className={getPanelButtonClassName({ className: 'h-12 px-7 text-sm gap-2' })}
                                    style={getPanelButtonStyle('secondary')}
                                >
                                    <IconCalculator size={16} />
                                    Simular crédito
                                </Link>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-2xl">
                            <div
                                className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)' }}
                            >
                                <img
                                    src="/hero/servicios-gestion.svg"
                                    alt="Gestión inmobiliaria con SimplePropiedades"
                                    width={1600}
                                    height={900}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div
                                className="absolute -bottom-4 left-4 right-4 rounded-2xl border p-4 sm:left-auto sm:right-6 sm:w-72"
                                style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--surface) 94%, transparent)', boxShadow: 'var(--shadow-md)' }}
                            >
                                <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Solo pagas si se concreta</p>
                                <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                                    Comisión transparente según tipo de operación.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app py-14 sm:py-16">
                    <div className="mx-auto mb-10 max-w-2xl text-center">
                        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--fg)' }}>Comisiones claras</h2>
                        <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>
                            Sin letra chica. Cobro solo cuando la operación se concreta.
                        </p>
                    </div>
                    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
                        <CommissionCard
                            icon={<IconKey size={22} />}
                            title="Arriendo"
                            rate="25% + IVA"
                            points={['Gestión de arrendatarios', 'Coordinación de visitas', 'Acompañamiento al cierre']}
                        />
                        <CommissionCard
                            icon={<IconHome2 size={22} />}
                            title="Compraventa"
                            rate="2% + IVA"
                            points={['Publicación y difusión', 'Filtrado de interesados', 'Negociación y cierre']}
                        />
                    </div>
                </div>
            </section>

            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app py-14 sm:py-16">
                    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
                        <div
                            className="overflow-hidden rounded-[1.5rem] border"
                            style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
                        >
                            <img
                                src="/hero/servicios-proceso.svg"
                                alt="Proceso de gestión inmobiliaria"
                                width={1200}
                                height={900}
                                className="w-full h-auto"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--fg)' }}>Cómo funciona</h2>
                            <p className="mt-2 mb-8 text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>
                                Tres pasos. Sin trámites innecesarios.
                            </p>
                            <div className="space-y-5">
                                {STEPS.map((step, index) => (
                                    <div key={step.title} className="flex gap-4">
                                        <div
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                                        >
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>{step.title}</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app py-14 sm:py-16">
                    <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
                        {[
                            { icon: <IconShieldCheck size={20} />, title: 'Transparencia', desc: 'Decides con información clara.' },
                            { icon: <IconBuilding size={20} />, title: 'Tu propiedad', desc: 'La mantienes hasta cerrar.' },
                            { icon: <IconCheck size={20} />, title: 'Sin riesgo', desc: 'Sin operación, sin cobro.' },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="rounded-[20px] border p-5"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="mb-3" style={{ color: 'var(--accent)' }}>{item.icon}</div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.title}</h3>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app py-14 sm:pb-20">
                    <div
                        className="mx-auto flex max-w-3xl flex-col items-center rounded-[24px] border px-6 py-10 text-center sm:px-10"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                    >
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>¿Listo para delegar?</h2>
                        <p className="mt-2 max-w-md text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>
                            Cuéntanos sobre tu propiedad y te contactamos para evaluarla.
                        </p>
                        <Link
                            href="/servicios/venta-asistida"
                            className={getPanelButtonClassName({ className: 'mt-6 h-12 px-8 text-sm gap-2' })}
                            style={getPanelButtonStyle('primary')}
                        >
                            Solicitar evaluación
                            <IconArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function CommissionCard({
    icon,
    title,
    rate,
    points,
}: {
    icon: ReactNode;
    title: string;
    rate: string;
    points: string[];
}) {
    return (
        <div
            className="flex flex-col rounded-[24px] border p-6"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}
        >
            <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
                {icon}
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{title}</h3>
            <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{rate}</p>
            <ul className="mt-5 space-y-2">
                {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                        {point}
                    </li>
                ))}
            </ul>
        </div>
    );
}
