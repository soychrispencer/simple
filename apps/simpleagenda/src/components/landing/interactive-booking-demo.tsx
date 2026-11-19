'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IconArrowRight, IconArrowUpRight } from '@tabler/icons-react';
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

type InteractiveBookingDemoProps = {
    industryId: string;
    onIndustryChange: (industryId: string) => void;
};

export function InteractiveBookingDemo({ industryId, onIndustryChange }: InteractiveBookingDemoProps) {
    const { label, start } = useAgendaSignup();
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [days, setDays] = useState<ReturnType<typeof getDemoDays>>([]);
    const [dayIndex, setDayIndex] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const confirmation = useRef<HTMLDivElement>(null);
    const firstService = useRef<HTMLInputElement>(null);
    const industry = INDUSTRY_SITE_DEMOS.find((item) => item.id === industryId) ?? INDUSTRY_SITE_DEMOS[0]!;
    const service = industry.catalog.services.find((item) => item.id === serviceId);
    const day = days[dayIndex];
    const cover = industry.profile.coverUrl;

    useEffect(() => {
        setDays(getDemoDays());
    }, []);

    useEffect(() => {
        if (confirmed) confirmation.current?.focus();
    }, [confirmed]);

    function reset() {
        setServiceId(null);
        setDayIndex(0);
        setTime(null);
        setConfirmed(false);
    }

    function selectService(id: string) {
        track('demo_start', { industry: industry.id, service: id });
        setServiceId(id);
    }

    return (
        <section
            id="demo-interactiva"
            aria-labelledby="demo-title"
            className="agenda-live-demo"
            style={{
                '--demo-accent': industry.appearance.accentColor,
                '--demo-cover-position-mobile': industry.coverPosition.mobile,
                '--demo-cover-position-desktop': industry.coverPosition.desktop,
            } as CSSProperties}
        >
            <div className="agenda-live-demo__intro">
                <h2 id="demo-title" className="agenda-live-demo__title">Así se adapta a tu rubro</h2>
            </div>
            <fieldset className="agenda-live-demo__industries min-w-0">
                <legend className="sr-only">Elige un rubro</legend>
                {INDUSTRY_SITE_DEMOS.map((item) => (
                    <label key={item.id} className="agenda-live-demo__radio">
                        <input
                            type="radio"
                            name="demo-industry"
                            checked={item.id === industry.id}
                            onChange={() => {
                                onIndustryChange(item.id);
                                reset();
                            }}
                            className="sr-only"
                        />
                        <span>{item.label}</span>
                    </label>
                ))}
            </fieldset>

            <div className="agenda-live-demo__sample">
                <div className="agenda-live-demo__profile">
                    {cover ? (
                        <Image
                            src={cover}
                            fill
                            sizes="(min-width: 1120px) 520px, (min-width: 800px) 46vw, 92vw"
                            alt=""
                            className="agenda-live-demo__cover object-cover"
                            loading="eager"
                        />
                    ) : null}
                </div>
                <div className="agenda-live-demo__body">
                    <div className="agenda-live-demo__header">
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
                    {confirmed && service && day ? (
                        <div ref={confirmation} role="status" tabIndex={-1} className="scroll-mt-24">
                            <BookingConfirmation time={time!} label={`${day.weekday} ${day.date} · ${service.name}`} variant="ticket" />
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                <button className="agenda-button agenda-button--signal" type="button" onClick={() => start('demo')}>{label}</button>
                                <button className="agenda-live-demo__back" type="button" onClick={() => {
                                    reset();
                                    requestAnimationFrame(() => firstService.current?.focus());
                                }}>Volver a probar</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="agenda-live-demo__choices">
                                <fieldset className="agenda-live-demo__services min-w-0">
                                    <legend>Elige un servicio</legend>
                                    {industry.catalog.services.map((item, index) => (
                                        <label key={item.id} className="agenda-live-demo__service">
                                            <input ref={index === 0 ? firstService : undefined} type="radio" name="demo-service" checked={serviceId === item.id} onChange={() => selectService(item.id)} />
                                            <span>
                                                <strong>{item.name}</strong>
                                                <small>{item.durationMinutes} min{item.price ? ` · ${moneyFormatter.format(Number(item.price))}` : ''}</small>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                                <div className="agenda-live-demo__availability">
                                    <label className="agenda-live-demo__date">
                                        Elige una fecha
                                        <select value={dayIndex} disabled={!days.length} onChange={(event) => {
                                            setDayIndex(Number(event.target.value));
                                            setTime(null);
                                        }}>
                                            {days.map((item, index) => <option key={item.key} value={index}>{item.weekday} {item.date}</option>)}
                                        </select>
                                    </label>
                                    <fieldset className="agenda-live-demo__slots min-w-0">
                                        <legend>Elige una hora</legend>
                                        {day?.times.map((item) => (
                                            <button key={item} type="button" aria-pressed={item === time} onClick={() => setTime(item)}>{item}</button>
                                        ))}
                                    </fieldset>
                                </div>
                            </div>
                            <button
                                className="agenda-button agenda-live-demo__confirm mt-4 w-full"
                                type="button"
                                disabled={!service || !day || !time}
                                onClick={() => {
                                    if (!service || !day || !time) return;
                                    track('demo_confirm', { industry: industry.id, service: service.id, day: day.date, time });
                                    setConfirmed(true);
                                }}
                            >
                                Confirmar cita de prueba <IconArrowRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <p className="agenda-live-demo__note">Demostración sin cobro ni registro. Personaliza tu página con Pro.</p>
        </section>
    );
}
