import Image from 'next/image';
import { BookingConfirmation } from '@/components/landing/booking-confirmation';
import {
    IconArrowRight,
    IconBell,
    IconBrandWhatsapp,
    IconCalendar,
    IconCheck,
    IconChevronDown,
    IconCreditCard,
    IconUser,
} from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';
import { InteractiveBookingDemo } from '@/components/landing/interactive-booking-demo';
import { PlanComparisonTable } from '@/components/landing/plan-comparison-table';
import { MobileStickyCTA } from '@/components/landing/mobile-sticky-cta';
import { AgendaCta } from '@/components/landing/agenda-cta';
import { AgendaPricingPlans } from '@/components/landing/agenda-pricing-plans';

const questions = [
    ['¿Qué pasa cuando termina la prueba?', `Pasas automáticamente a Gratis, con hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes. Las canceladas también cuentan. Los planes pagados se activan cuando eliges contratarlos.`],
    ['¿Cómo reservan mis clientes?', 'Abren tu enlace, eligen un servicio y una hora disponible y completan sus datos. Tu agenda confirma automáticamente por defecto. Si pides un anticipo o prefieres aprobar a mano, verán el estado de su cita.'],
    ['¿Cómo puedo cobrar por una cita?', 'Con Pro o Pro+ puedes conectar Mercado Pago. También puedes compartir instrucciones de transferencia o un enlace de pago desde tu agenda. SimpleAgenda no cobra comisión por cita. El proveedor de pago puede aplicar sus propias tarifas.'],
    ['¿Cómo se envían los recordatorios?', 'Los recordatorios automáticos llegan por correo cuando tu cliente deja su email. En Agenda puedes abrir un mensaje listo en WhatsApp y enviarlo tú. Con Pro+ puedes además preparar mensajes para clientes que llevan 30, 60 o 90 días sin una atención.'],
];

const businessQuoteMessage = 'Hola, quiero cotizar el plan Empresa de SimpleAgenda. Somos ___ profesionales y tenemos ___ sucursales.';
const businessWhatsAppHref = `https://wa.me/56978623828?text=${encodeURIComponent(businessQuoteMessage)}`;

export default function HomePage() {
    const showPlans = !isPlatformLaunchActive('agenda');

    return (
        <div>
            <section id="portada" className="agenda-hero-band">
                <div className="container-app agenda-hero agenda-hero--with-demo">
                    <div className="agenda-hero__copy min-w-0">
                        <p className="agenda-eyebrow agenda-hero__eyebrow">Agenda online para profesionales</p>
                        <h1 className="agenda-display">
                            <span className="agenda-display__lead">Tus clientes reservan.</span>
                            <span className="agenda-display__signal">Tú sigues atendiendo.</span>
                        </h1>
                        <p className="agenda-hero__description">Comparte tu enlace, muestra tus horarios y recibe citas con confirmación automática.</p>
                        <div id="prueba" className="agenda-hero__actions mt-6 scroll-mt-24 sm:mt-8">
                            <AgendaCta location="hero" className="agenda-button agenda-button--signal" />
                            <a href="#demo-interactiva" className="agenda-button agenda-button--outline-light">
                                Probar una reserva <IconArrowRight size={16} aria-hidden="true" />
                            </a>
                        </div>
                        <p className="agenda-hero__terms mt-4 max-w-sm text-sm">
                            Hasta {AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes en Gratis. Sin tarjeta.
                        </p>
                    </div>
                    <div id="como-funciona" className="min-w-0 scroll-mt-24">
                        <InteractiveBookingDemo />
                    </div>
                </div>
            </section>

            <section className="agenda-content-band">
                <div className="container-app agenda-landing-grid">
                    <div className="min-w-0">
                        <p className="agenda-eyebrow mb-3">Tu página de reservas</p>
                        <h2 className="agenda-heading">Tu marca y tus citas en un solo enlace.</h2>
                        <p className="agenda-section-description">
                            Comparte tu enlace de reservas en redes, WhatsApp o con un código QR. Con Pro, genera y personaliza una página completa con tus servicios, fotos y colores.
                        </p>
                        {showPlans && <a className="agenda-inline-link" href="#planes">Ver planes <IconArrowRight size={16} aria-hidden="true" /></a>}
                    </div>
                    <Image
                        src="/hero/reserva-online-confirmada.png"
                        alt="Una profesional atiende a un cliente mientras otra persona reserva desde su teléfono"
                        width={1754}
                        height={896}
                        sizes="(min-width: 1120px) 560px, (min-width: 800px) 46vw, 92vw"
                        className="agenda-showcase-illustration"
                    />
                </div>
            </section>

            <section id="funciones" className="agenda-content-band agenda-content-band--tint scroll-mt-24">
                <div className="container-app agenda-landing-grid">
                    <div>
                        <p className="agenda-eyebrow mb-3">Tu trabajo diario</p>
                        <h2 className="agenda-heading">Mira qué toca y qué queda pendiente.</h2>
                        <p className="agenda-section-description">
                            Consulta la ficha de tu cliente antes de atender, envía recordatorios por correo automáticamente y revisa los cobros desde tu panel.
                        </p>
                        <div className="agenda-landing-fee mt-6 sm:mt-7">
                            <p><strong className="agenda-numeral">0%</strong> de comisión de SimpleAgenda por cita</p>
                            <p className="mt-1 text-xs text-[var(--fg-secondary)]">Tu proveedor de pago puede aplicar sus propias tarifas.</p>
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
                <section id="planes" className="container-app agenda-content-band scroll-mt-24">
                    <p className="agenda-eyebrow mb-3">Planes</p>
                    <h2 className="agenda-heading">Parte con tu enlace. Crece con tu marca.</h2>
                    <p className="agenda-section-description">Al registrarte, prueba Pro durante {AGENDA_PRICING.trialDays} días. Después puedes seguir en Gratis.</p>
                    <AgendaPricingPlans />
                    <details id="plan-comparison" className="agenda-panel group mt-5 min-w-0 p-4 sm:mt-4 sm:p-4">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-1 font-semibold marker:content-none">
                            Comparar todas las funciones
                            <span className="agenda-accordion-icon group-open:rotate-180"><IconChevronDown size={17} aria-hidden="true" /></span>
                        </summary>
                        <div className="mt-4"><PlanComparisonTable /></div>
                    </details>
                    <section className="agenda-company mt-6">
                        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="agenda-eyebrow mb-2">Para consultas y equipos</p>
                                <h3 className="text-xl font-bold">{AGENDA_PLAN_CATALOG.business.name}</h3>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-secondary)]">{AGENDA_PLAN_CATALOG.business.description}</p>
                                <ul className="mt-4 grid gap-2 text-sm text-[var(--fg-secondary)] sm:grid-cols-2">
                                    {AGENDA_PLAN_CATALOG.business.features.slice(0, 2).map((feature) => (
                                        <li key={feature} className="flex items-start gap-2">
                                            <IconCheck size={15} className="mt-0.5 shrink-0 text-[var(--agenda-lime)]" stroke={2.5} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                                <a href={businessWhatsAppHref} target="_blank" rel="noopener noreferrer" className="agenda-button inline-flex min-h-11 items-center justify-center gap-2 px-5">
                                    <IconBrandWhatsapp size={18} aria-hidden="true" />
                                    Cotizar por WhatsApp
                                </a>
                            </div>
                        </div>
                    </section>
                </section>
            )}

            <section className="agenda-content-band agenda-content-band--tint">
                <div className="container-app grid gap-6 sm:gap-8 md:grid-cols-[1fr_1.35fr] md:gap-10">
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

            <section id="empezar" className="container-app agenda-content-band scroll-mt-24">
                <div className="agenda-closing">
                    <div>
                        <h2 className="agenda-heading">Comparte tu enlace y recibe tu próxima cita.</h2>
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
