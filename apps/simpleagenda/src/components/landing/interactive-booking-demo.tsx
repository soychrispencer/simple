'use client';

import { useState } from 'react';
import {
    IconCalendar,
    IconClockHour4,
    IconCheck,
    IconSparkles,
    IconArrowRight,
    IconRotateClockwise,
    IconCreditCard,
    IconUser,
    IconShieldCheck,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';

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
        <section id="demo-interactiva" className="scroll-mt-20 py-16 sm:py-24" style={{ background: 'var(--bg-subtle)' }}>
            <div className="container-app">
                <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <IconSparkles size={13} />
                        Demostración interactiva
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--fg)]">
                        Pruébalo exactamente como lo verá tu paciente
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed">
                        Tus clientes no tienen que descargar ninguna aplicación ni crearse una cuenta. Hacen clic en tu link, eligen su hora en 30 segundos y la cita queda confirmada.
                    </p>
                </div>

                <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                    {/* Fake Browser / Link Bar */}
                    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 sm:px-6">
                        <div className="flex gap-1.5">
                            <span className="size-3 rounded-full bg-red-400/80" />
                            <span className="size-3 rounded-full bg-amber-400/80" />
                            <span className="size-3 rounded-full bg-emerald-400/80" />
                        </div>
                        <div className="flex flex-1 items-center justify-center">
                            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--fg-muted)] shadow-xs">
                                <IconShieldCheck size={14} className="text-emerald-500" />
                                <span className="font-mono text-[11px] sm:text-xs">
                                    simpleagenda.app/<strong className="text-[var(--accent)]">dra-valentina</strong>
                                </span>
                            </div>
                        </div>
                        <div className="hidden text-xs font-medium text-[var(--fg-muted)] sm:block">
                            Simulación en vivo
                        </div>
                    </div>

                    {/* Content inside the mock booking profile */}
                    <div className="p-5 sm:p-8 lg:p-10">
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
                            <div className="flex items-center gap-3.5">
                                <div className="size-14 sm:size-16 rounded-2xl bg-[linear-gradient(135deg,var(--accent)_0%,#047857_100%)] text-white font-bold flex items-center justify-center text-xl shadow-md shrink-0">
                                    VM
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base sm:text-lg font-bold text-[var(--fg)]">
                                            Dra. Valentina Muñoz
                                        </h3>
                                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                                            Verificada ✓
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--fg-muted)]">
                                        Psicóloga Clínica · Providencia, Santiago · Atención Online y Presencial
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                Horas disponibles hoy
                            </div>
                        </div>

                        {!isConfirmed ? (
                            <div className="mt-8 grid gap-8 lg:grid-cols-12">
                                {/* Left column: Select Service */}
                                <div className="lg:col-span-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-secondary)]">
                                            1. Selecciona un servicio
                                        </p>
                                        <span className="text-xs text-[var(--fg-muted)]">
                                            {DEMO_SERVICES.length} opciones
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {DEMO_SERVICES.map((service) => {
                                            const isSelected = selectedService.id === service.id;
                                            return (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => setSelectedService(service)}
                                                    className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all ${
                                                        isSelected
                                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/40 shadow-xs ring-1 ring-[var(--accent)]'
                                                            : 'border-[var(--border)] hover:border-[var(--accent-border)] bg-[var(--surface)]'
                                                    }`}
                                                >
                                                    <div className="min-w-0 pr-3">
                                                        <p className="text-sm font-semibold text-[var(--fg)] truncate">
                                                            {service.name}
                                                        </p>
                                                        <p className="text-xs text-[var(--fg-muted)] mt-0.5 flex items-center gap-2">
                                                            <span>{service.duration}</span>
                                                            <span>•</span>
                                                            <span>{service.category}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-sm font-bold text-[var(--accent)]">
                                                            {service.price}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right column: Date and Time selection */}
                                <div className="lg:col-span-6 space-y-6">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-secondary)] mb-3">
                                            2. Selecciona día
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {DEMO_DAYS.map((day) => {
                                                const isSelected = selectedDay.dayNum === day.dayNum;
                                                return (
                                                    <button
                                                        key={day.dayNum}
                                                        type="button"
                                                        onClick={() => handleSelectDay(day)}
                                                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                                                            isSelected
                                                                ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm'
                                                                : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] hover:border-[var(--accent-border)]'
                                                        }`}
                                                    >
                                                        <span className="text-[10px] uppercase font-semibold opacity-80">
                                                            {day.label}
                                                        </span>
                                                        <span className="text-sm font-bold mt-0.5">
                                                            {day.date}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-secondary)] mb-3">
                                            3. Selecciona horario disponible
                                        </p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {availableTimes.map((time) => {
                                                const isSelected = selectedTime === time;
                                                return (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => setSelectedTime(time)}
                                                        className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                                                            isSelected
                                                                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-[var(--accent)] font-bold'
                                                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg-secondary)] hover:border-[var(--accent-border)]'
                                                        }`}
                                                    >
                                                        <IconClockHour4 size={13} className="mr-1.5 opacity-70" />
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="pt-2">
                                        <PanelButton
                                            type="button"
                                            variant="accent"
                                            className="w-full h-12 text-sm font-semibold shadow-md gap-2"
                                            onClick={handleConfirm}
                                        >
                                            Confirmar cita de prueba ({selectedService.price})
                                            <IconArrowRight size={16} />
                                        </PanelButton>
                                        <p className="text-[11px] text-center text-[var(--fg-muted)] mt-2">
                                            * Esta es una simulación libre. No se realizará ningún cobro ni registro.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Instant confirmation screen */
                            <div className="mt-8 py-8 px-4 text-center max-w-lg mx-auto animate-scale-in">
                                <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                    <IconCheck size={32} stroke={3} />
                                </div>
                                <h4 className="text-xl sm:text-2xl font-bold text-[var(--fg)]">
                                    ¡Cita reservada y confirmada!
                                </h4>
                                <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1.5">
                                    El paciente recibió de inmediato su comprobante por email con el link de acceso y detalles de la consulta.
                                </p>

                                {/* Ticket Details */}
                                <div className="my-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-subtle)] p-5 text-left text-xs space-y-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fg-muted)]">Servicio:</span>
                                        <span className="font-semibold text-[var(--fg)]">{selectedService.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fg-muted)]">Fecha y hora:</span>
                                        <span className="font-semibold text-[var(--fg)]">{selectedDay.label} {selectedDay.date} a las {selectedTime} hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fg-muted)]">Modalidad:</span>
                                        <span className="font-semibold text-[var(--fg)]">Consulta Online (Enlace Google Meet adjunto)</span>
                                    </div>
                                    <div className="flex justify-between border-t border-[var(--border)] pt-2.5">
                                        <span className="text-[var(--fg-muted)]">Total abonado:</span>
                                        <span className="font-bold text-emerald-600">{selectedService.price} CLP (Mercado Pago ✓)</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <PanelButton
                                        type="button"
                                        variant="accent"
                                        className="w-full h-12 text-sm font-semibold shadow-md gap-2"
                                        onClick={() => onStartFree ? onStartFree() : (window.location.hash = '#planes')}
                                    >
                                        Crear mi cuenta gratis y tener mi link
                                        <IconArrowRight size={16} />
                                    </PanelButton>

                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
                                    >
                                        <IconRotateClockwise size={13} />
                                        Probar otra fecha o servicio
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
