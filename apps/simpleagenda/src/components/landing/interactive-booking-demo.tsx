'use client';

import { useEffect, useRef, useState } from 'react';
import {
    IconApple,
    IconArrowRight,
    IconBrain,
    IconCheck,
    IconHeartHandshake,
    IconLink,
    IconRotateClockwise,
    IconScissors,
    IconShieldCheck,
    IconSparkles,
    IconStretching,
} from '@tabler/icons-react';
import { BookingConfirmation } from './booking-confirmation';
import { track } from '@/lib/analytics';
import { useAgendaSignup } from './use-agenda-signup';
import { INDUSTRY_SITE_DEMOS } from '@/lib/industry-site-demos';

type ServiceOption = {
    id: string;
    name: string;
    duration: string;
    price: string;
    category: string;
};

type DemoIndustry = {
    id: string;
    label: string;
    detail: string;
    showcase: (typeof INDUSTRY_SITE_DEMOS)[number]['showcase'];
    icon: typeof IconBrain;
    slug: string;
    professional: string;
    initials: string;
    profession: string;
    services: ServiceOption[];
};

const INDUSTRY_ICONS = {
    psychology: IconBrain,
    barber: IconScissors,
    aesthetics: IconSparkles,
    kinesiology: IconStretching,
    nutrition: IconApple,
    therapy: IconHeartHandshake,
} as const;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
});

const DEMO_INDUSTRIES: DemoIndustry[] = INDUSTRY_SITE_DEMOS.map((industry) => ({
    id: industry.id,
    label: industry.label,
    detail: industry.detail,
    showcase: industry.showcase,
    icon: INDUSTRY_ICONS[industry.id as keyof typeof INDUSTRY_ICONS],
    slug: industry.slug,
    professional: industry.professional,
    initials: industry.initials,
    profession: industry.profession,
    services: industry.catalog.services.map((service) => ({
        id: service.id,
        name: service.name,
        duration: `${service.durationMinutes} min`,
        price: service.price ? currencyFormatter.format(Number(service.price)) : 'A consultar',
        category: service.category,
    })),
}));

type DemoDay = {
    label: string;
    date: string;
    dayNum: string;
    weekday: string;
};

const DEMO_DAYS: DemoDay[] = [
    { label: 'lun', date: '9 nov', dayNum: '9', weekday: '1' },
    { label: 'mar', date: '10 nov', dayNum: '10', weekday: '2' },
    { label: 'mié', date: '11 nov', dayNum: '11', weekday: '3' },
    { label: 'jue', date: '12 nov', dayNum: '12', weekday: '4' },
];

const DEMO_TIMES: Record<string, string[]> = {
    '1': ['09:30', '11:00', '15:30', '17:00'],
    '2': ['10:00', '12:00', '16:00'],
    '3': ['09:00', '11:30', '14:30', '16:30', '18:00'],
    '4': ['10:30', '15:00', '17:30'],
    '5': ['10:00', '12:00', '15:00', '17:30'],
};

function getDemoDays(): DemoDay[] {
    const today = new Date();
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const days: DemoDay[] = [];

    while (days.length < 4) {
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) {
            const label = new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(cursor).replace('.', '');
            const date = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(cursor).replace(/\./g, '');
            days.push({
                label,
                date,
                dayNum: String(cursor.getDate()),
                weekday: String(weekday),
            });
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

export function InteractiveBookingDemo() {
    const { label: actionLabel, start } = useAgendaSignup();
    const [selectedIndustryId, setSelectedIndustryId] = useState(DEMO_INDUSTRIES[0]!.id);
    const selectedIndustry = DEMO_INDUSTRIES.find((industry) => industry.id === selectedIndustryId) ?? DEMO_INDUSTRIES[0]!;
    const [viewMode, setViewMode] = useState<'site' | 'booking'>('site');
    const [selectedServiceId, setSelectedServiceId] = useState(DEMO_INDUSTRIES[0]!.services[0]!.id);
    const selectedService = selectedIndustry.services.find((service) => service.id === selectedServiceId) ?? selectedIndustry.services[0]!;
    const [demoDays, setDemoDays] = useState<DemoDay[]>(DEMO_DAYS);
    const [selectedDay, setSelectedDay] = useState(DEMO_DAYS[0]!);
    const [selectedTime, setSelectedTime] = useState(DEMO_TIMES[DEMO_DAYS[0]!.weekday]![1]!);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const confirmationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const days = getDemoDays();
        setDemoDays(days);
        const firstDay = days[0]!;
        setSelectedDay(firstDay);
        setSelectedTime((DEMO_TIMES[firstDay.weekday] ?? ['10:00'])[0]!);
    }, []);

    useEffect(() => {
        const confirmation = confirmationRef.current;
        if (!isConfirmed || !confirmation) return;

        confirmation.focus({ preventScroll: true });
        const bounds = confirmation.getBoundingClientRect();
        const headerBottom = document.querySelector('.marketplace-header')?.getBoundingClientRect().bottom ?? 0;
        if (bounds.top < headerBottom || bounds.bottom > window.innerHeight) {
            confirmation.scrollIntoView({ block: 'start' });
        }
    }, [isConfirmed]);

    const availableTimes = DEMO_TIMES[selectedDay.weekday] ?? ['10:00', '15:00'];

    const handleSelectDay = (day: typeof DEMO_DAYS[number]) => {
        setSelectedDay(day);
        const times = DEMO_TIMES[day.weekday] ?? ['10:00'];
        setSelectedTime(times[0]!);
        setIsConfirmed(false);
    };

    const handleConfirm = () => {
        track('demo_confirm', { industry: selectedIndustry.id, service: selectedService.id, day: selectedDay.dayNum, time: selectedTime });
        setIsConfirmed(true);
    };

    const handleReset = () => {
        setIsConfirmed(false);
    };

    return (
        <section id="demo-interactiva" aria-labelledby="demo-title" className="scroll-mt-20">
            <div className="container-app py-12 sm:py-14 lg:py-20">
                <div className="agenda-demo-intro">
                    <p className="agenda-eyebrow mb-3">Una agenda para tu rubro</p>
                    <h2 id="demo-title" className="agenda-heading agenda-demo-title">Tu página pública, pensada para <span>tu rubro.</span></h2>
                    <p className="agenda-demo-description mt-3 max-w-2xl text-base leading-relaxed sm:text-lg">
                        Explora cómo se presentan los servicios, horarios y estilo de distintos negocios. En Pro puedes generar y editar una página con la información de tu negocio.
                    </p>
                </div>

                <div className="agenda-industry-picker" role="group" aria-label="Elige un rubro para ver un ejemplo">
                    {DEMO_INDUSTRIES.map((industry) => {
                        const IndustryIcon = industry.icon;
                        const selected = selectedIndustry.id === industry.id;
                        return (
                            <button
                                key={industry.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => {
                                    setSelectedIndustryId(industry.id);
                                    setSelectedServiceId(industry.services[0]!.id);
                                    setIsConfirmed(false);
                                    setViewMode('site');
                                }}
                                className="agenda-industry-choice"
                            >
                                <span className="agenda-industry-choice__icon" aria-hidden="true">
                                    <IndustryIcon size={21} stroke={1.8} />
                                </span>
                                <span className="agenda-industry-choice__copy">
                                    <span className="agenda-industry-choice__label">{industry.label}</span>
                                    <span className="agenda-industry-choice__detail">{industry.detail}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="agenda-industry-story mt-6" key={selectedIndustry.id}>
                    <div className="agenda-industry-story__copy">
                        <p className="agenda-industry-story__eyebrow">Una página para {selectedIndustry.label.toLowerCase()}</p>
                        <h3>{selectedIndustry.showcase.headline}</h3>
                        <p className="agenda-industry-story__description">{selectedIndustry.showcase.description}</p>
                        <button type="button" className="agenda-industry-story__cta" onClick={() => start('demo')}>
                            Crear mi agenda gratis
                            <IconArrowRight size={17} aria-hidden="true" />
                        </button>
                    </div>
                    <ul className="agenda-industry-story__highlights" aria-label={`Qué incluye el ejemplo de ${selectedIndustry.label}`}>
                        {selectedIndustry.showcase.highlights.map((highlight) => (
                            <li key={highlight}>
                                <span className="agenda-industry-story__check"><IconCheck size={15} stroke={2.5} aria-hidden="true" /></span>
                                <span>{highlight}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="agenda-preview-heading mt-8 sm:mt-10">
                    <div>
                        <p className="agenda-eyebrow mb-2">Ejemplo · {selectedIndustry.label}</p>
                        <h3 className="agenda-preview-heading__title">Así podría verse tu página</h3>
                        <p className="agenda-preview-heading__description">Explora la vista completa o prueba el flujo de reserva.</p>
                    </div>
                    <div className="agenda-preview-tabs" role="group" aria-label="Elige una vista de ejemplo">
                        <button type="button" aria-pressed={viewMode === 'site'} onClick={() => setViewMode('site')}>Página completa</button>
                        <button type="button" aria-pressed={viewMode === 'booking'} onClick={() => setViewMode('booking')}>Probar reserva</button>
                    </div>
                </div>

                {viewMode === 'site' ? (
                    <div className="agenda-fullpage-preview mt-4">
                        <div className="agenda-fullpage-preview__toolbar" aria-hidden="true">
                            <span className="agenda-fullpage-preview__lights"><i /><i /><i /></span>
                            <span className="agenda-fullpage-preview__address">simpleagenda.app/ejemplo/{selectedIndustry.slug}</span>
                            <span className="agenda-fullpage-preview__badge">Vista de ejemplo</span>
                        </div>
                        <iframe
                            key={selectedIndustry.id}
                            className="agenda-fullpage-preview__frame"
                            title={`Página completa de ejemplo para ${selectedIndustry.label}`}
                            src={`/demo-rubros/${selectedIndustry.id}`}
                            loading="lazy"
                        />
                    </div>
                ) : (
                <div className="agenda-demo-layout mt-6 grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
                <div className="agenda-demo-copy max-w-md">
                    <p className="agenda-eyebrow mb-3">Del link a la cita · {selectedIndustry.label}</p>
                    <h3 className="agenda-demo-step-title agenda-demo-title">Elige una hora. <span>Y queda confirmada.</span></h3>
                    <p className="agenda-demo-description mt-4 max-w-sm text-base leading-relaxed sm:text-lg">
                        Prueba el recorrido como lo vería un cliente de {selectedIndustry.label.toLowerCase()}: elige un servicio, un horario disponible y confirma. No necesita crear una cuenta.
                    </p>
                    <p className="agenda-demo-assurance mt-5 flex items-center gap-2 text-sm sm:mt-7">
                        <IconShieldCheck size={17} stroke={1.8} aria-hidden="true" />
                        Simulación sin cobro ni registro
                    </p>
                </div>

                <div className="agenda-panel agenda-demo-window min-w-0 overflow-hidden shadow-[var(--agenda-shadow)]">
                    <div className="agenda-demo-header flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 text-xs sm:px-6">
                        <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[var(--fg)]">
                            <IconLink className="shrink-0" size={15} aria-hidden="true" />
                            <span className="break-all">simpleagenda.app/{selectedIndustry.slug}</span>
                        </span>
                        <span className="rounded-full border border-[var(--border-strong)] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.09em] text-[var(--fg-secondary)]">Perfil de ejemplo</span>
                    </div>

                    <div className="agenda-demo-body p-4 sm:p-6">
                        <div className="agenda-demo-profile flex items-center gap-3 px-3 py-3 sm:px-4">
                            <div className="agenda-demo-profile__avatar flex size-10 shrink-0 items-center justify-center rounded-[var(--agenda-radius-control)] text-sm font-bold" aria-hidden="true">{selectedIndustry.initials}</div>
                            <div>
                                <h3 className="text-lg font-bold">{selectedIndustry.professional}</h3>
                                <p className="agenda-demo-profile__meta text-xs">{selectedIndustry.profession}</p>
                            </div>
                        </div>

                        {!isConfirmed ? (
                            <div className="mt-5 space-y-4">
                                <div>
                                    <label htmlFor="demo-servicio" className="mb-2 block text-sm font-semibold"><span aria-hidden="true" className="mr-2 text-xs tabular-nums text-[var(--fg-muted)]">01</span>Servicio</label>
                                    <select
                                        id="demo-servicio"
                                        value={selectedServiceId}
                                        onChange={(event) => {
                                            setSelectedServiceId(event.target.value);
                                        }}
                                        className="min-h-11 w-full min-w-0 rounded-[var(--agenda-radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                                    >
                                        {selectedIndustry.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                                    </select>
                                    <p className="mt-1.5 text-xs text-[var(--fg-secondary)]">
                                        {selectedService.duration} · {selectedService.category} · {selectedService.price}
                                    </p>
                                </div>

                                <fieldset className="min-w-0">
                                    <legend className="mb-2 text-sm font-semibold"><span aria-hidden="true" className="mr-2 text-xs tabular-nums text-[var(--fg-muted)]">02</span>Elige un día</legend>
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                        {demoDays.map((day) => (
                                            <button
                                                key={day.dayNum}
                                                type="button"
                                                aria-label={`${day.label} ${day.date}`}
                                                aria-pressed={selectedDay.dayNum === day.dayNum}
                                                onClick={() => handleSelectDay(day)}
                                                className="agenda-choice flex min-w-0 flex-col items-center justify-center px-1 py-1.5"
                                            >
                                                <span className="text-[0.625rem] font-semibold uppercase sm:text-[0.6875rem]">{day.label.slice(0, 3)}</span>
                                                <span className="text-xs font-bold sm:text-sm">{day.date}</span>
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <fieldset className="min-w-0">
                                    <legend className="mb-2 text-sm font-semibold"><span aria-hidden="true" className="mr-2 text-xs tabular-nums text-[var(--fg-muted)]">03</span>Elige una hora</legend>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
                                        {availableTimes.map((time) => (
                                            <button
                                                key={time}
                                                type="button"
                                                aria-pressed={selectedTime === time}
                                                onClick={() => setSelectedTime(time)}
                                                className="agenda-choice agenda-time-option px-2 text-sm font-semibold tabular-nums"
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <button type="button" className="agenda-button w-full" onClick={handleConfirm}>
                                    Confirmar cita de prueba
                                    <IconArrowRight size={16} className="shrink-0" aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4 animate-scale-in">
                                <div ref={confirmationRef} role="status" tabIndex={-1} className="scroll-mt-24">
                                    <BookingConfirmation time={selectedTime} label={`${selectedDay.label} ${selectedDay.date} · ${selectedService.name}`} variant="ticket" />
                                    <p className="mt-2 text-xs text-[var(--fg-muted)]">En la demo no se envían correos ni se realizan cobros.</p>
                                </div>
                                <div className="space-y-2.5">
                                    <p className="mb-2 text-sm font-semibold">Así reservarán tus clientes. Crea tu agenda y comparte tu propio link.</p>
                                    <button type="button" className="agenda-button w-full" onClick={() => start('demo')}>
                                        {actionLabel}
                                        <IconArrowRight size={16} aria-hidden="true" />
                                    </button>
                                    <button type="button" onClick={handleReset} className="agenda-button agenda-button--secondary w-full inline-flex items-center justify-center gap-2">
                                        <IconRotateClockwise size={16} aria-hidden="true" />
                                        Probar otra hora
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
                )}
                <p className="agenda-demo-example-note mt-4 text-center text-xs">Perfiles, horarios y valores ilustrativos. La página real muestra la información que cada profesional configura; aquí no se generan reservas.</p>
            </div>
        </section>
    );
}
