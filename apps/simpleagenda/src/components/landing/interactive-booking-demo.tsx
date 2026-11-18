'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IconArrowLeft, IconArrowRight, IconArrowUpRight, IconCalendarCheck } from '@tabler/icons-react';
import { BookingConfirmation } from './booking-confirmation';
import { track } from '@/lib/analytics';
import { useAgendaSignup } from './use-agenda-signup';
import { INDUSTRY_SITE_DEMOS } from '@/lib/industry-site-demos';

const DEMO_TIMES: Record<number, string[]> = {
    1: ['09:30', '11:00', '15:30', '17:00'],
    2: ['10:00', '12:00', '16:00'],
    3: ['09:00', '11:30', '14:30', '16:30'],
    4: ['10:30', '15:00', '17:30'],
    5: ['10:00', '12:00', '15:00', '17:30'],
};

const dateFormatter = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const weekdayFormatter = new Intl.DateTimeFormat('es-CL', { weekday: 'short' });
const moneyFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

function getDemoDays() {
    const cursor = new Date();
    const days: { key: string; date: string; weekday: string; times: string[] }[] = [];

    while (days.length < 4) {
        cursor.setDate(cursor.getDate() + 1);
        const times = DEMO_TIMES[cursor.getDay()];
        if (times) {
            days.push({
                key: cursor.toISOString(),
                date: dateFormatter.format(cursor),
                weekday: weekdayFormatter.format(cursor),
                times,
            });
        }
    }

    return days;
}

export function InteractiveBookingDemo() {
    const { label, start } = useAgendaSignup();
    const [industryId, setIndustryId] = useState('barber');
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [days, setDays] = useState<ReturnType<typeof getDemoDays>>([]);
    const [dayIndex, setDayIndex] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const stepHeading = useRef<HTMLHeadingElement>(null);
    const confirmation = useRef<HTMLDivElement>(null);
    const services = useRef<HTMLUListElement>(null);
    const returnToService = useRef<string | null>(null);
    const industry = INDUSTRY_SITE_DEMOS.find((item) => item.id === industryId) ?? INDUSTRY_SITE_DEMOS[0]!;
    const service = industry.catalog.services.find((item) => item.id === serviceId);
    const day = days[dayIndex];
    const cover = industry.profile.coverUrl;

    useEffect(() => {
        const previousService = returnToService.current;
        const target = confirmed
            ? confirmation.current
            : serviceId
                ? stepHeading.current
                : Array.from(services.current?.querySelectorAll('button') ?? [])
                    .find((button) => button.value === previousService);
        returnToService.current = null;
        if (!target) return;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'nearest' });
    }, [serviceId, confirmed]);

    function reset(focusService = false) {
        returnToService.current = focusService ? serviceId : null;
        setServiceId(null);
        setTime(null);
        setConfirmed(false);
    }

    function selectService(id: string) {
        track('demo_start', { industry: industry.id, service: id });
        setDays(getDemoDays());
        setDayIndex(0);
        setTime(null);
        setServiceId(id);
    }

    return (
        <section id="demo-interactiva" aria-labelledby="demo-title" className="agenda-live-demo" style={{ '--demo-accent': industry.appearance.accentColor } as CSSProperties}>
            <h2 id="demo-title" className="agenda-live-demo__title">
                <IconCalendarCheck size={18} aria-hidden="true" />
                Así pueden reservar tus clientes
            </h2>
            <fieldset className="agenda-live-demo__industries min-w-0">
                <legend className="sr-only">Elige un rubro</legend>
                {INDUSTRY_SITE_DEMOS.map((item) => (
                    <label key={item.id} className="agenda-live-demo__radio">
                        <input
                            type="radio"
                            name="demo-industry"
                            checked={item.id === industry.id}
                            onChange={() => {
                                setIndustryId(item.id);
                                reset();
                            }}
                            className="sr-only"
                        />
                        <span>{item.label}</span>
                    </label>
                ))}
            </fieldset>

            <div className="agenda-live-demo__sample">
                <div className={cover ? 'agenda-live-demo__profile agenda-live-demo__profile--photo' : 'agenda-live-demo__profile'}>
                    {cover ? (
                        <Image
                            src={cover}
                            fill
                            sizes="(min-width: 1120px) 520px, (min-width: 800px) 46vw, 92vw"
                            alt=""
                            className="object-cover object-center"
                        />
                    ) : null}
                    <div className="agenda-live-demo__identity">
                        <p>{industry.businessLabel}</p>
                        <h3>{industry.professional}</h3>
                        <span>{industry.profession}</span>
                    </div>
                    <a
                        className="agenda-live-demo__site-link"
                        href={`/demo-rubros/${industry.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ver página <IconArrowUpRight size={14} aria-hidden="true" />
                        <span className="sr-only"> de ejemplo en una pestaña nueva</span>
                    </a>
                </div>

                <div className="agenda-live-demo__body">
                    {confirmed && service && day ? (
                        <div ref={confirmation} role="status" tabIndex={-1} className="scroll-mt-24">
                            <BookingConfirmation time={time!} label={`${day.weekday} ${day.date} · ${service.name}`} variant="ticket" />
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                <button className="agenda-button agenda-button--signal" type="button" onClick={() => start('demo')}>{label}</button>
                                <button className="agenda-live-demo__back" type="button" onClick={() => reset(true)}>Volver a probar</button>
                            </div>
                        </div>
                    ) : service && day ? (
                        <div>
                            <div className="agenda-live-demo__step">
                                <h4 ref={stepHeading} tabIndex={-1} className="scroll-mt-24">{service.name}</h4>
                                <button className="agenda-live-demo__back" type="button" onClick={() => reset(true)}><IconArrowLeft size={14} aria-hidden="true" /> Cambiar servicio</button>
                            </div>
                            <fieldset className="agenda-live-demo__slots min-w-0">
                                <legend>Elige un día</legend>
                                {days.map((item, index) => (
                                    <button key={item.key} type="button" aria-pressed={index === dayIndex} onClick={() => {
                                        setDayIndex(index);
                                        setTime(null);
                                    }}>
                                        {item.weekday} {item.date}
                                    </button>
                                ))}
                            </fieldset>
                            <fieldset className="agenda-live-demo__slots min-w-0">
                                <legend>Elige una hora</legend>
                                {day.times.map((item) => (
                                    <button key={item} type="button" aria-pressed={item === time} onClick={() => setTime(item)}>{item}</button>
                                ))}
                            </fieldset>
                            <button
                                className="agenda-button agenda-button--signal mt-3 w-full"
                                type="button"
                                disabled={!time}
                                onClick={() => {
                                    if (!time) return;
                                    track('demo_confirm', { industry: industry.id, service: service.id, day: day.date, time });
                                    setConfirmed(true);
                                }}
                            >
                                Confirmar cita de prueba <IconArrowRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <ul ref={services} className="agenda-live-demo__services" aria-label={`Servicios de ejemplo de ${industry.label}`}>
                            {industry.catalog.services.map((item) => (
                                <li key={item.id}>
                                    <div>
                                        <p>{item.name}</p>
                                        <span>{item.durationMinutes} min{item.price ? ` · ${moneyFormatter.format(Number(item.price))}` : ''}</span>
                                    </div>
                                    <button type="button" value={item.id} aria-label={`Elegir ${item.name}`} onClick={() => selectService(item.id)}>Elegir</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <p className="agenda-live-demo__note">Demostración sin cobro ni registro.</p>
        </section>
    );
}
