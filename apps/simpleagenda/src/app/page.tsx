import Image from 'next/image';
import { BookingConfirmation } from '@/components/landing/booking-confirmation';
import {
    IconApple,
    IconBell,
    IconBrain,
    IconCalendar,
    IconCheck,
    IconChevronDown,
    IconCreditCard,
    IconHeartHandshake,
    IconScissors,
    IconSparkles,
    IconStretching,
    IconUser,
} from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';
import { InteractiveBookingDemo } from '@/components/landing/interactive-booking-demo';
import { PlanComparisonTable } from '@/components/landing/plan-comparison-table';
import { MobileStickyCTA } from '@/components/landing/mobile-sticky-cta';
import { AgendaCta } from '@/components/landing/agenda-cta';
import { AgendaPricingPlans } from '@/components/landing/agenda-pricing-plans';

const questions = [
    ['¿Qué pasa cuando termina la prueba?', `Pasas automáticamente a Gratis, con hasta ${AGENDA_PRICING.free.monthlyBookings} reservas nuevas al mes. Solo pagas si eliges activar Pro.`],
    ['¿Mis clientes necesitan una cuenta?', 'No. Pueden elegir un horario y reservar directamente desde tu link.'],
    ['¿Cómo puedo cobrar por una cita?', 'Puedes configurar Mercado Pago, transferencia bancaria o un link de pago personalizado.'],
];

const businessQuoteMessage = 'Hola, quiero cotizar el plan Empresa de SimpleAgenda. Somos ___ profesionales y tenemos ___ sucursales.';
const businessWhatsAppHref = `https://wa.me/56978623828?text=${encodeURIComponent(businessQuoteMessage)}`;

const industries = [
    { label: 'Psicología', icon: IconBrain },
    { label: 'Barbería', icon: IconScissors },
    { label: 'Estética', icon: IconSparkles },
    { label: 'Kinesiología', icon: IconStretching },
    { label: 'Nutrición', icon: IconApple },
    { label: 'Terapia', icon: IconHeartHandshake },
];

export default function HomePage() {
    const showPlans = !isPlatformLaunchActive('agenda');

    return (
        <div>
            <section id="portada" className="agenda-hero-band">
                <div className="container-app agenda-hero">
                    <div className="agenda-hero__copy min-w-0">
                        <p className="agenda-eyebrow agenda-hero__eyebrow">Agenda online para profesionales</p>
                        <h1 className="agenda-display">
                            <span className="agenda-display__lead">Tus clientes reservan.</span>
                            <span className="agenda-display__signal">Tú sigues atendiendo.</span>
                        </h1>
                        <p className="agenda-hero__description">Comparte tu link y tus clientes eligen una hora disponible con confirmación automática.</p>
                        <div id="prueba" className="mt-6 scroll-mt-24 sm:mt-8">
                            <AgendaCta location="hero" className="agenda-button agenda-button--signal" />
                            <p className="agenda-hero__terms mt-3.5 max-w-sm text-xs leading-relaxed">
                                {AGENDA_PRICING.trialDays} días de Pro. Después sigues en Gratis. Sin tarjeta.
                            </p>
                        </div>
                    </div>
                    <figure className="agenda-hero-visual">
                        <Image src="/hero/reserva-online-confirmada.png" alt="Una profesional atiende a un cliente mientras la agenda muestra una reserva confirmada en el teléfono" width={1754} height={896} priority sizes="(min-width: 1328px) 640px, (min-width: 1100px) 55vw, 100vw" className="agenda-hero-visual__image" />
                    </figure>
                </div>
            </section>

            <div id="como-funciona" className="scroll-mt-20">
                <InteractiveBookingDemo />
            </div>

            <section aria-label="Rubros para los que está diseñado SimpleAgenda" className="agenda-industries">
                <div className="container-app agenda-industries__inner">
                    <p className="agenda-eyebrow shrink-0">Para profesionales que trabajan por hora</p>
                    <ul className="agenda-industries__list">
                        {industries.map(({ label, icon: Icon }) => (
                            <li key={label}>
                                <span className="agenda-industries__icon"><Icon size={16} stroke={1.9} aria-hidden="true" /></span>
                                <span>{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section id="funciones" className="agenda-function-band scroll-mt-20">
                <div className="agenda-function-band__inner container-app grid items-center gap-8 px-5 py-10 sm:gap-10 sm:px-8 sm:py-10 md:grid-cols-2 lg:px-12 lg:py-12">
                    <div>
                        <p className="agenda-eyebrow mb-3">Todo queda en orden</p>
                        <h2 className="agenda-heading">La cita se agenda. <span>El resto fluye.</span></h2>
                        <p className="agenda-function-band__description mt-3 max-w-md text-base leading-relaxed sm:text-lg">
                            Revisa los datos antes de atender, envía recordatorios por correo y lleva el registro de tus cobros en un solo lugar.
                        </p>
                        <div className="agenda-fee-note mt-6 sm:mt-8">
                            <strong className="agenda-numeral">0%</strong>
                            <span>de comisión de SimpleAgenda por reserva</span>
                        </div>
                    </div>
                    <figure className="agenda-function-snapshot p-4 sm:p-5">
                        <figcaption className="agenda-function-snapshot__heading mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                            <span className="inline-flex items-center gap-2"><IconCalendar size={18} aria-hidden="true" /> Agenda del martes</span>
                            <span className="agenda-function-snapshot__note text-xs">Ejemplo de atención</span>
                        </figcaption>
                        <BookingConfirmation time="10:30" label="Martes · Consulta" variant="record" />
                        <ul className="agenda-function-snapshot__list mt-3 divide-y text-sm">
                            {[
                                { icon: IconUser, label: 'Ficha de cliente', detail: 'Historial y notas de atención', tag: 'Guardado' },
                                { icon: IconBell, label: 'Recordatorio', detail: 'Aviso por correo antes de la cita', tag: 'Automático' },
                                { icon: IconCreditCard, label: 'Pago', detail: 'Cobro registrado en el panel', tag: 'Mercado Pago' },
                            ].map(({ icon: Icon, label, detail, tag }) => (
                                <li key={label} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-3">
                                    <div className="agenda-function-snapshot__icon size-8 rounded-[var(--agenda-radius-control)] flex items-center justify-center shrink-0 row-span-2 mt-0.5">
                                        <Icon size={16} stroke={2.5} aria-hidden="true" />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                        <p className="font-semibold text-sm">{label}</p>
                                        <span className="agenda-function-snapshot__tag text-[10px] font-semibold rounded-md px-2 py-0.5 border">{tag}</span>
                                    </div>
                                    <p className="agenda-function-snapshot__detail col-start-2 text-xs mt-1">{detail}</p>
                                </li>
                            ))}
                        </ul>
                    </figure>
                </div>
            </section>

            {showPlans && (
                <section id="planes" className="container-app scroll-mt-20 py-14 sm:py-16 lg:py-20">
                    <p className="agenda-eyebrow mb-3">Planes sin enredos</p>
                    <h2 className="agenda-heading">Empieza gratis. Crece a tu ritmo.</h2>
                    <p className="mt-3 text-[var(--fg-secondary)]">Prueba Pro por {AGENDA_PRICING.trialDays} días. Después puedes seguir en Gratis.</p>
                    <AgendaPricingPlans />
                    <details id="plan-comparison" className="agenda-panel group mt-5 min-w-0 p-4 sm:mt-4 sm:p-4">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-1 font-semibold marker:content-none">
                            Comparar todas las funciones
                            <span className="agenda-accordion-icon group-open:rotate-180"><IconChevronDown size={17} aria-hidden="true" /></span>
                        </summary>
                        <div className="mt-4"><PlanComparisonTable /></div>
                    </details>
                    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-5 sm:p-6">
                        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="agenda-eyebrow mb-2">Para consultas y equipos</p>
                                <h3 className="text-xl font-bold">{AGENDA_PLAN_CATALOG.business.name}</h3>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-secondary)]">{AGENDA_PLAN_CATALOG.business.description}</p>
                                <ul className="mt-4 grid gap-2 text-sm text-[var(--fg-secondary)] sm:grid-cols-2">
                                    {AGENDA_PLAN_CATALOG.business.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2">
                                            <IconCheck size={15} className="mt-0.5 shrink-0 text-[var(--agenda-lime)]" stroke={2.5} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                                <a href={businessWhatsAppHref} target="_blank" rel="noopener noreferrer" className="agenda-button inline-flex min-h-11 items-center justify-center gap-2 px-5">
                                    Cotizar por WhatsApp
                                </a>
                            </div>
                        </div>
                    </section>
                </section>
            )}

            <section className="border-y border-[var(--border)]">
                <div className="container-app grid gap-6 py-14 sm:gap-4 sm:py-16 md:grid-cols-[1fr_1.35fr] md:gap-10">
                    <h2 className="agenda-heading">Preguntas frecuentes</h2>
                    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                        {questions.map(([question, answer]) => (
                            <details key={question} className="group">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold marker:content-none">
                                    {question}
                                    <span className="agenda-accordion-icon group-open:rotate-180"><IconChevronDown size={17} aria-hidden="true" /></span>
                                </summary>
                                <p className="pb-4 text-[var(--fg-secondary)]">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section id="empezar" className="container-app scroll-mt-20 py-14 sm:py-16">
                <div className="agenda-closing">
                    <div>
                        <p className="agenda-eyebrow mb-2">Empieza hoy</p>
                        <h2 className="agenda-heading">Publica tu link. Deja que tu agenda trabaje.</h2>
                    </div>
                    <div className="agenda-closing__action">
                        <AgendaCta location="cierre" className="agenda-button agenda-button--signal" />
                        <p className="text-xs leading-relaxed">Prueba Pro por {AGENDA_PRICING.trialDays} días. Sin tarjeta.</p>
                    </div>
                </div>
            </section>
            <MobileStickyCTA />
        </div>
    );
}
