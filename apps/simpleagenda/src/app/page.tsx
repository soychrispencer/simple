'use client';

import Image from 'next/image';
import { BookingConfirmation } from '@/components/landing/booking-confirmation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { PanelButton } from '@simple/ui/panel';
import { IconBell, IconCalendar, IconCreditCard, IconUser } from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, AGENDA_PRICING, formatAgendaProMonthlyPrice, formatAgendaProAnnualTotalPrice, isPlatformLaunchActive } from '@simple/utils';
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
            <section className="bg-[#f7f4e9] text-[#16332f]">
                <div className="container-app grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
                    <div>
                        <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#0F766E]">Agenda online para profesionales</p>
                        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                            Mientras atiendes, tu agenda <span className="text-[#0F766E]">sigue atendiendo.</span>
                        </h1>
                        <p className="mt-6 max-w-md text-lg">Comparte tu link. Tus pacientes reservan según tu disponibilidad, a cualquier hora.</p>
                        <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                            <PanelButton type="button" variant="accent" onClick={start} className="min-h-12 w-full bg-[#0F766E] px-6 text-white sm:w-auto">{cta}</PanelButton>
                            <a href="#demo-interactiva" className="font-semibold text-[#0F766E] underline underline-offset-4">Ver cómo se reserva</a>
                        </div>
                        <p className="mt-4 text-sm">Prueba Pro por {AGENDA_PRICING.trialDays} días. Después sigues en Gratis. Sin tarjeta.</p>
                    </div>
                    <figure className="relative pb-8 pl-3 sm:pl-6">
                        <Image src="/hero/consulta-campana.png" alt="Profesional conversando con una paciente durante una consulta" width={1536} height={1024} priority sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[5/4] w-full rounded-xl object-cover" />
                        <figcaption className="absolute bottom-0 left-0">
                            <BookingConfirmation time="10:30" label="Martes · Consulta" compact />
                        </figcaption>
                    </figure>
                </div>
            </section>

            <div id="como-funciona" className="scroll-mt-20">
                <InteractiveBookingDemo onStartFree={start} />
            </div>

            <section id="funciones" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="container-app grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu próxima cita, de principio a fin</h2>
                        <p className="mt-4 max-w-md text-lg text-[var(--fg-secondary)]">
                            Revisa la ficha antes de atender, envía recordatorios por correo y lleva el registro de los cobros en SimpleAgenda.
                        </p>
                    </div>
                    <figure className="rounded-2xl border border-[#0F766E]/20 bg-[#f7f4e9] p-4 text-[#16332f] sm:p-6">
                        <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                            <span className="inline-flex items-center gap-2"><IconCalendar size={18} aria-hidden="true" /> Agenda del martes</span>
                            <span className="text-xs text-[#0F766E]">Ejemplo de atención</span>
                        </figcaption>
                        <BookingConfirmation time="10:30" label="Martes · Consulta" compact />
                        <dl className="mt-4 divide-y divide-[#0F766E]/15 rounded-xl bg-white px-4 text-sm">
                            {[
                                { icon: IconUser, label: 'Ficha de cliente', detail: 'Historial y notas de atención' },
                                { icon: IconBell, label: 'Recordatorio', detail: 'Aviso por correo antes de la cita' },
                                { icon: IconCreditCard, label: 'Pago', detail: 'Cobro registrado en el panel' },
                            ].map(({ icon: Icon, label, detail }) => (
                                <div key={label} className="grid grid-cols-[auto_1fr] items-start gap-x-3 py-3">
                                    <Icon size={18} className="row-span-2 mt-0.5 text-[#0F766E]" aria-hidden="true" />
                                    <dt className="font-semibold">{label}</dt>
                                    <dd>{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </figure>
                </div>
            </section>

            {showPlans && (
                <section id="planes" className="container-app scroll-mt-20 py-14 sm:py-20">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planes</h2>
                    <p className="mt-3 text-[var(--fg-secondary)]">Prueba Pro por {AGENDA_PRICING.trialDays} días. Después puedes seguir en Gratis.</p>
                    <div className="mt-7 grid gap-4 rounded-3xl bg-[#f7f4e9] p-3 text-[#16332f] sm:grid-cols-2 sm:p-4">
                        {[AGENDA_PLAN_CATALOG.free, AGENDA_PLAN_CATALOG.pro].map((plan) => (
                            <article key={plan.id} className={`flex flex-col rounded-2xl p-6 sm:p-8 ${plan.id === 'pro' ? 'bg-[#0F766E] text-white' : 'bg-white'}`}>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <p className="mt-3 text-3xl font-extrabold tracking-tight">{plan.id === 'free' ? '$0 / mes' : formatAgendaProMonthlyPrice()}</p>
                                {plan.id === 'pro' && <p className="mt-1 text-sm">O {formatAgendaProAnnualTotalPrice()}</p>}
                                <p className="mt-3 text-sm">
                                    {plan.id === 'free'
                                        ? 'Para empezar a recibir reservas.'
                                        : 'Para gestionar más citas y automatizar recordatorios.'}
                                </p>
                                <p className="mt-4 font-bold">{plan.id === 'free' ? plan.features[0] : 'Reservas sin límite'}</p>
                                <ul className="my-6 list-disc space-y-2 pl-5 text-sm">
                                    {plan.features.slice(1, 4).map((feature) => <li key={feature}>{feature}</li>)}
                                </ul>
                                <button type="button" className={`mt-auto self-start rounded-lg px-4 py-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${plan.id === 'pro' ? 'bg-white text-[#0F766E] outline-white hover:bg-[#f7f4e9]' : 'border border-[#0F766E] text-[#0F766E] outline-[#0F766E] hover:bg-[#f7f4e9]'}`} onClick={plan.id === 'pro' && isLoggedIn ? () => router.push('/panel/mi-cuenta/suscripcion') : start}>
                                    {plan.id === 'pro' ? (isLoggedIn ? 'Ver suscripción' : 'Probar Pro gratis') : cta}
                                </button>
                            </article>
                        ))}
                    </div>
                    <div className="mt-5 grid gap-4 rounded-xl bg-[var(--bg-subtle)] p-5 text-sm sm:grid-cols-2">
                        <p><strong>Pro+ · Próximamente.</strong> WhatsApp y automatizaciones avanzadas.</p>
                        <p><strong>Empresa · Próximamente.</strong> Agendas para equipos, consultas y sucursales.</p>
                    </div>
                    <details className="mt-5 rounded-xl border border-[var(--border)] p-5">
                        <summary className="cursor-pointer font-semibold">Comparar todas las funciones</summary>
                        <div className="mt-4"><PlanComparisonTable /></div>
                    </details>
                </section>
            )}

            <section className="border-y border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="container-app max-w-3xl py-14 sm:py-20">
                    <h2 className="mb-6 text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
                    {questions.map(([question, answer]) => (
                        <details key={question} className="border-b border-[var(--border)] py-4">
                            <summary className="cursor-pointer font-semibold">{question}</summary>
                            <p className="mt-3 text-[var(--fg-secondary)]">{answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="bg-[#0F766E] px-5 py-14 text-center text-white sm:py-20">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Recibe tu próxima reserva online</h2>
                <button type="button" onClick={start} className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-[#0F766E] hover:bg-[#f7f4e9]">{cta}</button>
            </section>
            <MobileStickyCTA onStartFree={start} />
        </div>
    );
}
