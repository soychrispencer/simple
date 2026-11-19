'use client';

import { useState } from 'react';
import { IconCalendar } from '@tabler/icons-react';
import { AGENDA_PRICING } from '@simple/utils';
import { AgendaCta } from './agenda-cta';
import { InteractiveBookingDemo } from './interactive-booking-demo';
import { INDUSTRY_SITE_DEMOS } from '@/lib/industry-site-demos';

const sampleAppointments = [
    { time: '09:30', client: 'Daniela Rivas', status: 'Completada' },
    { time: '11:00', client: 'Sebastián Muñoz', status: 'Confirmada' },
    { time: '12:30', client: 'Paula López', status: 'Confirmada' },
];

export function AgendaHomepageExperience() {
    const [industryId, setIndustryId] = useState('barber');
    const industry = INDUSTRY_SITE_DEMOS.find((item) => item.id === industryId) ?? INDUSTRY_SITE_DEMOS[0]!;
    const appointments = industry.catalog.services.slice(0, sampleAppointments.length).map((service, index) => ({
        ...sampleAppointments[index]!,
        service: service.name,
    }));

    return (
        <>
            <section id="como-funciona" className="agenda-demo-band scroll-mt-24">
                <div className="container-app">
                    <InteractiveBookingDemo industryId={industry.id} onIndustryChange={setIndustryId} />
                    <div className="agenda-experience-cta">
                        <div>
                            <p className="agenda-experience-cta__title">¿Te gustaría tener una página así?</p>
                            <p className="agenda-experience-cta__detail">Crea tu cuenta gratis y prueba Pro por {AGENDA_PRICING.trialDays} días, sin tarjeta ni cobro automático.</p>
                        </div>
                        <AgendaCta location="demo" className="agenda-button agenda-button--signal" />
                    </div>
                </div>
            </section>

            <ol className="container-app agenda-booking-steps" aria-label="Cómo funciona">
                <li><span className="agenda-booking-step__number" aria-hidden="true">1</span><span>Compartes tu enlace</span></li>
                <li><span className="agenda-booking-step__number" aria-hidden="true">2</span><span>Eligen un servicio, fecha y horario</span></li>
                <li><span className="agenda-booking-step__number" aria-hidden="true">3</span><span>La agenda confirma automáticamente por defecto</span></li>
            </ol>

            <section id="funciones" className="agenda-content-band scroll-mt-24">
                <div className="container-app">
                    <div className="agenda-landing-grid">
                        <div>
                            <p className="agenda-eyebrow mb-3">Tu trabajo diario</p>
                            <h2 className="agenda-heading">Tus próximas citas, a la vista.</h2>
                            <p className="agenda-section-description">
                                Las reservas de tu página aparecen en la agenda con su horario, servicio y estado. Revisa los datos y marca cada atención como completada al terminar.
                            </p>
                            <p className="agenda-function-note">
                                La confirmación automática viene activada por defecto. Puedes ajustar el flujo desde Configuraciones.
                            </p>
                        </div>

                        <figure className="agenda-function-snapshot p-4 sm:p-5" aria-label={`Ejemplo de agenda para ${industry.label}`}>
                            <figcaption className="agenda-function-snapshot__heading mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                                <span className="inline-flex items-center gap-2"><IconCalendar size={18} aria-hidden="true" /> Agenda · {industry.label}</span>
                                <span className="agenda-function-snapshot__note text-xs">Vista de ejemplo</span>
                            </figcaption>
                            <p className="agenda-function-snapshot__profession">{industry.profession}</p>
                            <ol className="agenda-function-snapshot__list divide-y text-sm">
                                {appointments.map(({ time, client, service, status }) => (
                                    <li key={time} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-3 sm:gap-x-4">
                                        <time dateTime={time} className="pt-0.5 font-semibold tabular-nums">{time}</time>
                                        <div className="agenda-function-snapshot__appointment">
                                            <div>
                                                <p className="font-semibold">{client}</p>
                                                <p className="agenda-function-snapshot__detail mt-0.5 text-xs">{service}</p>
                                            </div>
                                            <span className="agenda-function-snapshot__tag" data-confirmed={status === 'Confirmada'}>{status}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <p className="agenda-function-snapshot__note mt-3 text-xs">Nombres ilustrativos; los servicios cambian según el rubro seleccionado.</p>
                        </figure>
                    </div>
                </div>
            </section>
        </>
    );
}
