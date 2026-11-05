'use client';

import Image from 'next/image';
import { BookingConfirmation } from '@/components/landing/booking-confirmation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { IconBell, IconCalendar, IconChevronDown, IconCreditCard, IconUser } from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, AGENDA_PRICING, formatAgendaProAnnualTotalPrice, isPlatformLaunchActive } from '@simple/utils';
import { InteractiveBookingDemo } from '@/components/landing/interactive-booking-demo';
import { PlanComparisonTable } from '@/components/landing/plan-comparison-table';
import { MobileStickyCTA } from '@/components/landing/mobile-sticky-cta';

const questions = [
    ['¿Qué pasa cuando termina la prueba?', `Pasas automáticamente a Gratis, con hasta ${AGENDA_PRICING.free.monthlyBookings} reservas nuevas al mes. Solo pagas si eliges activar Pro.`],
    ['¿Mis pacientes necesitan una cuenta?', 'No. Pueden elegir un horario y reservar directamente desde tu link.'],
    ['¿Cómo puedo cobrar por una cita?', 'Puedes configurar Mercado Pago, transferencia bancaria o un link de pago personalizado.'],
];

export default function HomePage() {
    const { isLoggedIn, openAuth } = useAuth();
    const router = useRouter();
    const showPlans = !isPlatformLaunchActive('agenda');
    const start = () => isLoggedIn ? router.push('/panel') : openAuth('register');
    const cta = isLoggedIn ? 'Ir a mi agenda' : 'Regístrate gratis';

    return (
        <div>
            <section id="portada" className="border-b border-[var(--border)] bg-[var(--agenda-hero)]">
                <div className="container-app grid items-center gap-7 py-8 sm:gap-10 sm:py-14 md:grid-cols-2 lg:gap-14 lg:py-20">
                    <div className="min-w-0">
                        <p className="agenda-eyebrow mb-3 sm:mb-4">Agenda online para profesionales</p>
                        <h1 className="agenda-display">
                            Mientras atiendes, tu agenda <span className="text-[var(--agenda-link)]">sigue atendiendo.</span>
                        </h1>
                        <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--fg-secondary)] sm:mt-5 sm:text-lg">Comparte tu link. Tus pacientes reservan según tu disponibilidad, a cualquier hora.</p>
                        <div className="mt-5 sm:mt-6">
                            <button type="button" onClick={start} className="agenda-button w-full sm:w-auto">{cta}</button>
                            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fg-secondary)]">Prueba Pro por {AGENDA_PRICING.trialDays} días. Después sigues en Gratis. Sin tarjeta.</p>
                            <a href="#demo-interactiva" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--agenda-link)] underline underline-offset-4 sm:mt-1">Ver cómo se reserva</a>
                        </div>
                    </div>
                    <figure className="relative min-w-0">
                        <Image src="/hero/consulta-campana.png" alt="Profesional conversando con una paciente durante una consulta" width={1536} height={1024} priority sizes="(min-width: 1328px) 576px, (min-width: 768px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-[var(--agenda-radius-panel)] border border-[var(--border)] object-cover object-[62%_center] lg:aspect-[5/4]" />
                        <figcaption className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                            <BookingConfirmation time="10:30" label="Martes · Consulta" compact />
                        </figcaption>
                    </figure>
                </div>
            </section>

            <div id="como-funciona" className="scroll-mt-20">
                <InteractiveBookingDemo onStartFree={start} />
            </div>

            <section id="funciones" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="container-app grid items-center gap-6 py-10 sm:gap-10 sm:py-16 md:grid-cols-2 lg:py-20">
                    <div>
                        <p className="agenda-eyebrow mb-3">Herramientas</p>
                        <h2 className="agenda-heading">Tu próxima cita, de principio a fin</h2>
                        <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--fg-secondary)] sm:text-lg">
                            Revisa la ficha antes de atender, envía recordatorios por correo y lleva el registro de los cobros en SimpleAgenda.
                        </p>
                    </div>
                    <figure className="agenda-panel p-4 shadow-[var(--agenda-shadow)] sm:p-5">
                        <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                            <span className="inline-flex items-center gap-2"><IconCalendar size={18} aria-hidden="true" /> Agenda del martes</span>
                            <span className="text-xs text-[var(--fg-muted)]">Ejemplo de atención</span>
                        </figcaption>
                        <BookingConfirmation time="10:30" label="Martes · Consulta" compact />
                        <dl className="mt-3 divide-y divide-[var(--border)] text-sm">
                            {[
                                { icon: IconUser, label: 'Ficha de cliente', detail: 'Historial y notas de atención' },
                                { icon: IconBell, label: 'Recordatorio', detail: 'Aviso por correo antes de la cita' },
                                { icon: IconCreditCard, label: 'Pago', detail: 'Cobro registrado en el panel' },
                            ].map(({ icon: Icon, label, detail }) => (
                                <div key={label} className="grid grid-cols-[auto_1fr] items-start gap-x-3 py-3">
                                    <Icon size={18} className="row-span-2 mt-0.5 text-[var(--agenda-link)]" aria-hidden="true" />
                                    <dt className="font-semibold">{label}</dt>
                                    <dd className="text-[var(--fg-secondary)]">{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </figure>
                </div>
            </section>

            {showPlans && (
                <section id="planes" className="container-app scroll-mt-20 py-10 sm:py-16 lg:py-20">
                    <h2 className="agenda-heading">Planes</h2>
                    <p className="mt-3 text-[var(--fg-secondary)]">Prueba Pro por {AGENDA_PRICING.trialDays} días. Después puedes seguir en Gratis.</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
                        {[AGENDA_PLAN_CATALOG.free, AGENDA_PLAN_CATALOG.pro].map((plan) => (
                            <article key={plan.id} className={`agenda-panel flex min-w-0 flex-col p-5 sm:p-7 ${plan.id === 'pro' ? '[--border:var(--agenda-brand-border)] [--surface:var(--agenda-tint)]' : ''}`}>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="mt-2 sm:min-h-16">
                                    <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                                        <span className="type-detail-price text-4xl tabular-nums">${plan.priceMonthlyNetClp.toLocaleString('es-CL')}</span>
                                        <span className="text-sm text-[var(--fg-secondary)]">{plan.id === 'pro' ? '+ IVA / mes' : '/ mes'}</span>
                                    </p>
                                    {plan.id === 'pro' && <p className="mt-1 text-sm text-[var(--fg-secondary)]">O {formatAgendaProAnnualTotalPrice()}</p>}
                                </div>
                                <p className="mt-3 text-sm text-[var(--fg-secondary)]">
                                    {plan.id === 'free'
                                        ? 'Para empezar a recibir reservas.'
                                        : 'Para gestionar más citas y automatizar recordatorios.'}
                                </p>
                                <p className="mt-4 border-t border-[var(--border)] pt-4 font-bold text-[var(--agenda-link)]">{plan.id === 'free' ? plan.features[0] : 'Reservas sin límite'}</p>
                                <ul className="mb-5 mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--fg-secondary)]">
                                    {plan.features.slice(1, 4).map((feature) => <li key={feature}>{feature}</li>)}
                                </ul>
                                <button type="button" className={`agenda-button mt-auto w-full ${plan.id === 'free' ? 'agenda-button--secondary' : ''}`} onClick={plan.id === 'pro' && isLoggedIn ? () => router.push('/panel/mi-cuenta/suscripcion') : start}>
                                    {plan.id === 'pro' ? (isLoggedIn ? 'Ver suscripción' : 'Probar Pro gratis') : cta}
                                </button>
                            </article>
                        ))}
                    </div>
                    <div className="mt-4 grid gap-2 border-b border-[var(--border)] pb-4 text-sm text-[var(--fg-secondary)] sm:grid-cols-2 sm:gap-4">
                        <p><strong>Pro+ · Próximamente.</strong> WhatsApp y automatizaciones avanzadas.</p>
                        <p><strong>Empresa · Próximamente.</strong> Agendas para equipos, consultas y sucursales.</p>
                    </div>
                    <details className="agenda-panel group mt-4 min-w-0 p-3 sm:p-4">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-1 font-semibold marker:content-none">
                            Comparar todas las funciones
                            <IconChevronDown size={18} className="shrink-0 text-[var(--agenda-link)] group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="mt-4"><PlanComparisonTable /></div>
                    </details>
                </section>
            )}

            <section className="border-y border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="container-app grid gap-4 py-10 sm:py-16 md:grid-cols-[1fr_1.35fr] md:gap-10">
                    <h2 className="agenda-heading">Preguntas frecuentes</h2>
                    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                        {questions.map(([question, answer]) => (
                            <details key={question} className="group">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold marker:content-none">
                                    {question}
                                    <IconChevronDown size={18} className="shrink-0 text-[var(--agenda-link)] group-open:rotate-180" aria-hidden="true" />
                                </summary>
                                <p className="pb-4 text-[var(--fg-secondary)]">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section id="empezar" className="bg-[var(--agenda-green)] px-4 py-10 text-center text-[var(--agenda-on-green)] sm:py-16">
                <h2 className="agenda-heading">Recibe tu próxima reserva online</h2>
                <button type="button" onClick={start} className="agenda-button agenda-button--inverse mt-5">{cta}</button>
            </section>
            <MobileStickyCTA label={cta} onStartFree={start} />
        </div>
    );
}
