'use client';

import { useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconLink, IconRotateClockwise, IconShieldCheck } from '@tabler/icons-react';
import { BookingConfirmation } from './booking-confirmation';
import { track } from '@/lib/analytics';
import { useAgendaSignup } from './use-agenda-signup';

type ServiceOption = {
    id: string;
    name: string;
    duration: string;
    price: string;
    category: string;
};

const DEMO_SERVICES: ServiceOption[] = [
    {
        id: '1',
        name: 'Atención individual',
        duration: '50 min',
        price: '$35.000',
        category: 'Online o presencial',
    },
    {
        id: '2',
        name: 'Primera atención',
        duration: '60 min',
        price: '$40.000',
        category: 'Evaluación inicial',
    },
    {
        id: '3',
        name: 'Sesión de seguimiento',
        duration: '45 min',
        price: '$30.000',
        category: 'Atención de seguimiento',
    },
];

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
    const [selectedService, setSelectedService] = useState<ServiceOption>(DEMO_SERVICES[0]!);
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
        track('demo_confirm', { day: selectedDay.dayNum, time: selectedTime });
        setIsConfirmed(true);
    };

    const handleReset = () => {
        setIsConfirmed(false);
    };

    return (
        <section id="demo-interactiva" aria-labelledby="demo-title" className="scroll-mt-20">
            <div className="agenda-demo-layout container-app grid gap-8 py-14 sm:gap-10 sm:py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:py-20">
                <div className="agenda-demo-copy max-w-md">
                    <p className="agenda-eyebrow mb-3">Del link a la cita</p>
                    <h2 id="demo-title" className="agenda-heading agenda-demo-title">Elige una hora. <span>Y queda confirmada.</span></h2>
                    <p className="agenda-demo-description mt-4 max-w-sm text-base leading-relaxed sm:text-lg">
                        Prueba el recorrido: elige un servicio, una hora disponible y confirma. Tus clientes reservan sin crear una cuenta.
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
                            <span className="break-all">simpleagenda.app/valentina</span>
                        </span>
                        <span className="rounded-full border border-[var(--border-strong)] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.09em] text-[var(--fg-secondary)]">Perfil de ejemplo</span>
                    </div>

                    <div className="agenda-demo-body p-4 sm:p-6">
                        <div className="agenda-demo-profile flex items-center gap-3 px-3 py-3 sm:px-4">
                            <div className="agenda-demo-profile__avatar flex size-10 shrink-0 items-center justify-center rounded-[var(--agenda-radius-control)] text-sm font-bold" aria-hidden="true">VM</div>
                            <div>
                                <h3 className="text-lg font-bold">Valentina Muñoz</h3>
                                <p className="agenda-demo-profile__meta text-xs">Profesional independiente · Online y presencial</p>
                            </div>
                        </div>

                        {!isConfirmed ? (
                            <div className="mt-5 space-y-4">
                                <div>
                                    <label htmlFor="demo-servicio" className="mb-2 block text-sm font-semibold"><span aria-hidden="true" className="mr-2 text-xs tabular-nums text-[var(--fg-muted)]">01</span>Servicio</label>
                                    <select
                                        id="demo-servicio"
                                        value={selectedService.id}
                                        onChange={(event) => {
                                            const service = DEMO_SERVICES.find((option) => option.id === event.target.value);
                                            if (service) setSelectedService(service);
                                        }}
                                        className="min-h-11 w-full min-w-0 rounded-[var(--agenda-radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                                    >
                                        {DEMO_SERVICES.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
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
        </section>
    );
}
