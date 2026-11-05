'use client';

import { useState } from 'react';
import { IconArrowRight, IconLink, IconRotateClockwise } from '@tabler/icons-react';
import { BookingConfirmation } from './booking-confirmation';

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
        name: 'Consulta Psicológica Individual',
        duration: '50 min',
        price: '$35.000',
        category: 'Atención online o presencial',
    },
    {
        id: '2',
        name: 'Evaluación y Diagnóstico Inicial',
        duration: '60 min',
        price: '$40.000',
        category: 'Primera consulta',
    },
    {
        id: '3',
        name: 'Sesión de Seguimiento',
        duration: '45 min',
        price: '$30.000',
        category: 'Control mensual',
    },
];

const DEMO_DAYS = [
    { label: 'Jueves', date: '7 Nov', dayNum: '07' },
    { label: 'Viernes', date: '8 Nov', dayNum: '08' },
    { label: 'Lunes', date: '11 Nov', dayNum: '11' },
    { label: 'Martes', date: '12 Nov', dayNum: '12' },
];

const DEMO_TIMES: Record<string, string[]> = {
    '07': ['09:30', '11:00', '15:30', '17:00'],
    '08': ['10:00', '12:00', '16:00'],
    '11': ['09:00', '11:30', '14:30', '16:30', '18:00'],
    '12': ['10:30', '15:00', '17:30'],
};

export function InteractiveBookingDemo({ onStartFree }: { onStartFree?: () => void }) {
    const [selectedService, setSelectedService] = useState<ServiceOption>(DEMO_SERVICES[0]!);
    const [selectedDay, setSelectedDay] = useState(DEMO_DAYS[0]!);
    const [selectedTime, setSelectedTime] = useState(DEMO_TIMES['07']![1]!);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const availableTimes = DEMO_TIMES[selectedDay.dayNum] ?? ['10:00', '15:00'];

    const handleSelectDay = (day: typeof DEMO_DAYS[number]) => {
        setSelectedDay(day);
        const times = DEMO_TIMES[day.dayNum] ?? ['10:00'];
        setSelectedTime(times[0]!);
        setIsConfirmed(false);
    };

    const handleConfirm = () => {
        setIsConfirmed(true);
    };

    const handleReset = () => {
        setIsConfirmed(false);
    };

    return (
        <section id="demo-interactiva" className="scroll-mt-20 bg-[var(--bg)]">
            <div className="container-app grid items-start gap-5 py-10 sm:gap-8 sm:py-16 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.6fr)] lg:gap-10 lg:py-20">
                <div className="max-w-md">
                    <p className="agenda-eyebrow mb-3">Demo de reserva</p>
                    <h2 className="agenda-heading">Así reservan tus pacientes</h2>
                    <p className="mt-3 text-base leading-relaxed text-[var(--fg-secondary)]">
                        Elige una hora y confirma. Tus pacientes reservan desde tu link sin crear una cuenta.
                    </p>
                </div>

                <div className="agenda-panel min-w-0 overflow-hidden shadow-[var(--agenda-shadow)]">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5 text-xs sm:px-6">
                        <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[var(--agenda-link)]">
                            <IconLink className="shrink-0" size={15} aria-hidden="true" />
                            <span className="break-all">simpleagenda.app/dra-valentina</span>
                        </span>
                        <span className="font-medium text-[var(--fg-muted)]">Perfil de ejemplo</span>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--agenda-radius-control)] bg-[var(--agenda-tint)] text-sm font-bold text-[var(--agenda-link)]" aria-hidden="true">VM</div>
                            <div>
                                <h3 className="text-lg font-bold">Dra. Valentina Muñoz</h3>
                                <p className="text-xs text-[var(--fg-secondary)]">Psicología clínica · Online y presencial</p>
                            </div>
                        </div>

                        {!isConfirmed ? (
                            <div className="mt-5 space-y-4">
                                <div>
                                    <label htmlFor="demo-servicio" className="mb-2 block text-sm font-semibold">Servicio</label>
                                    <select
                                        id="demo-servicio"
                                        value={selectedService.id}
                                        onChange={(event) => {
                                            const service = DEMO_SERVICES.find((option) => option.id === event.target.value);
                                            if (service) setSelectedService(service);
                                        }}
                                        className="min-h-11 w-full rounded-[var(--agenda-radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                                    >
                                        {DEMO_SERVICES.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                                    </select>
                                    <p className="mt-1.5 text-xs text-[var(--fg-secondary)]">
                                        {selectedService.duration} · {selectedService.category} · {selectedService.price}
                                    </p>
                                </div>

                                <fieldset className="min-w-0">
                                    <legend className="mb-2 text-sm font-semibold">Elige un día</legend>
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                        {DEMO_DAYS.map((day) => (
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
                                    <legend className="mb-2 text-sm font-semibold">Elige una hora</legend>
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
                                        {availableTimes.map((time) => (
                                            <button
                                                key={time}
                                                type="button"
                                                aria-pressed={selectedTime === time}
                                                onClick={() => setSelectedTime(time)}
                                                className="agenda-choice px-2 text-sm font-semibold tabular-nums"
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <div>
                                    <button type="button" className="agenda-button w-full" onClick={handleConfirm}>
                                        Confirmar reserva de prueba
                                        <IconArrowRight size={16} className="shrink-0" aria-hidden="true" />
                                    </button>
                                    <p className="mt-2 text-center text-xs text-[var(--fg-muted)]">Simulación sin cobro ni registro.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4">
                                <div role="status">
                                    <BookingConfirmation time={selectedTime} label={`${selectedDay.label} ${selectedDay.date} · ${selectedService.name}`} />
                                    <p className="mt-2 text-xs text-[var(--fg-muted)]">En la demo no se envían correos ni se realizan cobros.</p>
                                </div>
                                <div>
                                    <p className="mb-3 text-sm font-semibold">Así reservarán tus pacientes. Crea tu agenda y comparte tu propio link.</p>
                                    <button type="button" className="agenda-button w-full" onClick={() => onStartFree ? onStartFree() : (window.location.hash = '#planes')}>
                                        Regístrate gratis
                                        <IconArrowRight size={16} aria-hidden="true" />
                                    </button>
                                    <button type="button" onClick={handleReset} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--agenda-link)] underline underline-offset-4">
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
