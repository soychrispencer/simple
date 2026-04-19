'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconCalendar,
    IconClock,
    IconChevronLeft,
    IconChevronRight,
    IconLoader2,
    IconCheck,
    IconX,
    IconAlertCircle,
    IconUser,
    IconMail,
    IconPhone,
    IconCalendarEvent,
    IconVideo,
} from '@tabler/icons-react';
import { fetchPublicSlots, bookAppointment, validatePublicPromo, type TimeSlot, type PaymentMethods, type RecurrenceFrequency } from '@/lib/agenda-api';
import { useEscapeClose } from '@/lib/use-modal-a11y';

type PreconsultField = { id: string; label: string; type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number'; required: boolean; placeholder?: string; options?: string[] };

type Service = {
    id: string;
    name: string;
    durationMinutes: number;
    price: string | null;
    currency: string;
    isOnline: boolean;
    isPresential: boolean;
    preconsultFields?: PreconsultField[];
};

type PublicProfile = {
    slug: string;
    displayName: string;
    profession: string | null;
    timezone: string;
    bookingWindowDays: number;
    allowsRecurrentBooking: boolean;
    encuadre: string | null;
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    paymentMethods: PaymentMethods;
    services: Service[];
};

type Step = 'idle' | 'date' | 'time' | 'info' | 'preconsult' | 'encuadre' | 'payment' | 'confirmed';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function formatDate(iso: string, tz: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: tz,
    });
}

function formatTime(iso: string, tz: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
    });
}

function formattedPrice(price: string | null, currency: string): string {
    if (!price) return 'Consultar precio';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, minimumFractionDigits: 0 }).format(parseFloat(price));
}

export default function BookingFlow({ profile }: { profile: PublicProfile }) {
    const searchParams = useSearchParams();
    const isReschedule = searchParams.get('reprogramar') === '1';
    const [step, setStep] = useState<Step>('idle');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // Date picker state
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD

    // Time slots
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

    // Patient info
    const [clientName, setClientName] = useState('');
    const [clientLastName, setClientLastName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientNotes, setClientNotes] = useState('');

    // Pre-consulta
    const [preconsultValues, setPreconsultValues] = useState<Record<string, string | boolean>>({});
    const [preconsultError, setPreconsultError] = useState('');

    // Encuadre
    const [policyAgreed, setPolicyAgreed] = useState(false);

    // Recurrence
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('biweekly');
    const [recurrenceCount, setRecurrenceCount] = useState(4);

    // Info step validation
    const [infoError, setInfoError] = useState('');

    // Promo / cupón
    const [promoCode, setPromoCode] = useState('');
    const [promoChecking, setPromoChecking] = useState(false);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string;
        label: string;
        discountAmount: number;
        finalPrice: number;
        originalPrice: number;
    } | null>(null);

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [confirmedAppt, setConfirmedAppt] = useState<{ id: string; status: string; paymentStatus: string; modality?: string | null; meetingUrl?: string | null } | null>(null);
    const [confirmedSeries, setConfirmedSeries] = useState<Array<{ id: string; startsAt: string }> | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

    const loadSlots = useCallback(async (date: string, service: Service) => {
        setLoadingSlots(true);
        setSlots([]);
        const data = await fetchPublicSlots(profile.slug, date, service.id);
        setSlots(data);
        setLoadingSlots(false);
    }, [profile.slug]);

    useEffect(() => {
        if (selectedDate && selectedService && step === 'time') {
            void loadSlots(selectedDate, selectedService);
        }
    }, [selectedDate, selectedService, step, loadSlots]);

    const openBooking = (service: Service) => {
        setSelectedService(service);
        setStep('date');
        setSelectedDate(null);
        setSelectedSlot(null);
        setClientName('');
        setClientLastName('');
        setClientEmail('');
        setClientPhone('');
        setClientNotes('');
        setPolicyAgreed(false);
        setIsRecurring(false);
        setRecurrenceFrequency('biweekly');
        setRecurrenceCount(4);
        setSubmitError('');
        setConfirmedAppt(null);
        setPromoCode('');
        setPromoError(null);
        setAppliedPromo(null);
    };

    const close = () => setStep('idle');

    const handleApplyPromo = async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code || !selectedService) return;
        setPromoChecking(true);
        setPromoError(null);
        const result = await validatePublicPromo(profile.slug, {
            code,
            serviceId: selectedService.id,
            basePrice: selectedService.price ? Number(selectedService.price) : null,
        });
        setPromoChecking(false);
        if (!result.ok || !result.promotion || result.discountAmount === undefined || result.finalPrice === undefined || result.originalPrice === undefined) {
            setPromoError(result.error ?? 'Cupón no válido.');
            setAppliedPromo(null);
            return;
        }
        setAppliedPromo({
            code: result.promotion.code ?? code,
            label: result.promotion.label,
            discountAmount: result.discountAmount,
            finalPrice: result.finalPrice,
            originalPrice: result.originalPrice,
        });
    };

    const clearPromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
        setPromoError(null);
    };

    useEscapeClose(step !== 'idle', close);

    // Calendar grid helpers
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + profile.bookingWindowDays);

    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const isDateAvailable = (y: number, m: number, d: number) => {
        const date = new Date(y, m, d);
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return date >= todayMidnight && date <= maxDate;
    };

    const toDateStr = (y: number, m: number, d: number) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    };

    const handleDateSelect = (dateStr: string) => {
        setSelectedDate(dateStr);
        setSelectedSlot(null);
        setStep('time');
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
        setStep('info');
    };

    const handleInfoNext = () => {
        setInfoError('');
        if (!clientName.trim()) {
            setInfoError('El nombre es requerido.');
            return;
        }
        if (!clientLastName.trim()) {
            setInfoError('El apellido es requerido.');
            return;
        }
        if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
            setInfoError('El email no es válido.');
            return;
        }
        if (!clientEmail.trim() && !clientPhone.trim()) {
            setInfoError('Ingresa al menos un email o teléfono para enviarte la confirmación.');
            return;
        }
        const hasPreconsult = (selectedService?.preconsultFields?.length ?? 0) > 0;
        if (hasPreconsult) {
            setStep('preconsult');
        } else if (profile.encuadre) {
            setStep('encuadre');
        } else if (profile.requiresAdvancePayment) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handlePreconsultNext = () => {
        const fields = selectedService?.preconsultFields ?? [];
        for (const f of fields) {
            if (f.required) {
                const v = preconsultValues[f.id];
                const empty = f.type === 'checkbox' ? v !== true : !(typeof v === 'string' && v.trim());
                if (empty) {
                    setPreconsultError(`Falta responder: ${f.label}`);
                    return;
                }
            }
        }
        setPreconsultError('');
        if (profile.encuadre) {
            setStep('encuadre');
        } else if (profile.requiresAdvancePayment) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handleEncuadreNext = () => {
        if (!policyAgreed) return;
        if (profile.requiresAdvancePayment) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!selectedService || !selectedSlot || !clientName.trim() || !clientLastName.trim()) return;
        setSubmitting(true);
        setSubmitError('');
        const result = await bookAppointment(profile.slug, {
            serviceId: selectedService.id,
            clientName: `${clientName.trim()} ${clientLastName.trim()}`.trim(),
            clientEmail: clientEmail || undefined,
            clientPhone: clientPhone || undefined,
            clientNotes: clientNotes || undefined,
            startsAt: selectedSlot.startsAt,
            policyAgreed: !!profile.encuadre && policyAgreed,
            recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
            recurrenceCount: isRecurring ? recurrenceCount : undefined,
            preconsultResponses: (selectedService?.preconsultFields?.length ?? 0) > 0 ? preconsultValues : undefined,
            promotionCode: appliedPromo?.code,
        });
        setSubmitting(false);
        if (!result.ok) {
            setSubmitError(result.error ?? 'Error al reservar. Intenta de nuevo.');
            return;
        }
        setConfirmedAppt(result.appointment ?? null);
        setConfirmedSeries(result.appointments && result.appointments.length > 1 ? result.appointments : null);
        if (result.checkoutUrl) setCheckoutUrl(result.checkoutUrl);
        setStep('confirmed');
    };

    const handleSubmitAndRedirect = async (method: 'mp' | 'link') => {
        if (!selectedService || !selectedSlot || !clientName.trim() || !clientLastName.trim()) return;
        setSubmitting(true);
        setSubmitError('');
        const result = await bookAppointment(profile.slug, {
            serviceId: selectedService.id,
            clientName: `${clientName.trim()} ${clientLastName.trim()}`.trim(),
            clientEmail: clientEmail || undefined,
            clientPhone: clientPhone || undefined,
            clientNotes: clientNotes || undefined,
            startsAt: selectedSlot.startsAt,
            policyAgreed: !!profile.encuadre && policyAgreed,
            recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
            recurrenceCount: isRecurring ? recurrenceCount : undefined,
            preconsultResponses: (selectedService?.preconsultFields?.length ?? 0) > 0 ? preconsultValues : undefined,
            promotionCode: appliedPromo?.code,
        });
        setSubmitting(false);
        if (!result.ok) { setSubmitError(result.error ?? 'Error al reservar.'); return; }
        setConfirmedAppt(result.appointment ?? null);
        setConfirmedSeries(result.appointments && result.appointments.length > 1 ? result.appointments : null);
        if (method === 'mp' && result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
            return;
        }
        setStep('confirmed');
    };

    if (step === 'idle') {
        return (
            <div className="flex flex-col gap-3">
                {isReschedule && (
                    <div
                        role="status"
                        className="rounded-2xl border p-4 flex items-center gap-3"
                        style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <IconCalendarEvent size={18} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Estás reprogramando una cita</p>
                            <p className="text-xs mt-0.5 opacity-90">
                                Tu cita anterior fue liberada. Elige el servicio y nueva fecha disponibles.
                            </p>
                        </div>
                    </div>
                )}
                {profile.services.map((service) => (
                    <div
                        key={service.id}
                        className="p-4 rounded-2xl border"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{service.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        <IconClock size={11} />{service.durationMinutes} min
                                    </span>
                                    {service.isOnline && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Online</span>
                                    )}
                                    {service.isPresential && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>Presencial</span>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>{formattedPrice(service.price, service.currency)}</p>
                                <button
                                    onClick={() => openBooking(service)}
                                    className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
                                    style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                    <IconCalendar size={11} className="inline mr-1" />
                                    Reservar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Modal overlay
    return (
        <>
            {/* Services list (behind modal) */}
            <div className="flex flex-col gap-3">
                {profile.services.map((service) => (
                    <div key={service.id} className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{service.name}</h3>
                            </div>
                            <p className="font-bold text-sm shrink-0" style={{ color: 'var(--fg)' }}>{formattedPrice(service.price, service.currency)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Booking modal */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="booking-step-title">
                <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={close} />
                <div
                    className="relative w-full max-w-md rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)', maxHeight: '90vh', overflowY: 'auto' }}
                >
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{selectedService?.name}</p>
                            <p id="booking-step-title" className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                {step === 'date' && 'Elige una fecha'}
                                {step === 'time' && 'Elige un horario'}
                                {step === 'info' && 'Tus datos'}
                                {step === 'preconsult' && 'Antes de tu cita'}
                                {step === 'encuadre' && 'Condiciones de atención'}
                                {step === 'payment' && 'Pago anticipado'}
                                {step === 'confirmed' && '¡Cita reservada!'}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Cerrar"
                            onClick={close}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                        >
                            <IconX size={14} />
                        </button>
                    </div>

                    <div className="p-5">
                        {/* Step: Date picker */}
                        {step === 'date' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <button type="button" aria-label="Mes anterior" onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-(--bg-subtle) transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                        <IconChevronLeft size={16} />
                                    </button>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        {MONTHS_ES[viewMonth]} {viewYear}
                                    </p>
                                    <button type="button" aria-label="Mes siguiente" onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-(--bg-subtle) transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                        <IconChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {DAYS_ES.map((d) => (
                                        <p key={d} className="text-center text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{d}</p>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
                                        <div key={`e${i}`} />
                                    ))}
                                    {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
                                        const d = i + 1;
                                        const available = isDateAvailable(viewYear, viewMonth, d);
                                        const dateStr = toDateStr(viewYear, viewMonth, d);
                                        const isSelected = selectedDate === dateStr;
                                        return (
                                            <button
                                                key={d}
                                                disabled={!available}
                                                onClick={() => available && handleDateSelect(dateStr)}
                                                className="h-9 w-full rounded-xl text-sm transition-colors"
                                                style={{
                                                    background: isSelected ? 'var(--accent)' : 'transparent',
                                                    color: isSelected ? '#fff' : available ? 'var(--fg)' : 'var(--fg-muted)',
                                                    opacity: available ? 1 : 0.35,
                                                    cursor: available ? 'pointer' : 'not-allowed',
                                                    fontWeight: isSelected ? 600 : 400,
                                                }}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step: Time slots */}
                        {step === 'time' && (
                            <div>
                                <button
                                    onClick={() => setStep('date')}
                                    className="flex items-center gap-1 text-xs mb-4 hover:underline"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    <IconChevronLeft size={12} />
                                    {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                                </button>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        <IconLoader2 size={16} className="animate-spin" /> Buscando horarios disponibles...
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Sin horarios disponibles</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Elige otra fecha.</p>
                                        <button onClick={() => setStep('date')} className="mt-4 px-4 py-2 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                                            Volver al calendario
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {slots.map((slot) => (
                                            <button
                                                key={slot.startsAt}
                                                onClick={() => handleSlotSelect(slot)}
                                                className="py-2.5 rounded-xl border text-sm font-medium transition-colors"
                                                style={{
                                                    borderColor: selectedSlot?.startsAt === slot.startsAt ? 'var(--accent)' : 'var(--border)',
                                                    background: selectedSlot?.startsAt === slot.startsAt ? 'var(--accent-soft)' : 'transparent',
                                                    color: selectedSlot?.startsAt === slot.startsAt ? 'var(--accent)' : 'var(--fg)',
                                                }}
                                            >
                                                {formatTime(slot.startsAt, profile.timezone)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step: Patient info */}
                        {step === 'info' && (
                            <div>
                                {selectedSlot && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                        <IconCalendar size={14} />
                                        <span className="text-xs font-medium">
                                            {formatDate(selectedSlot.startsAt, profile.timezone)} — {formatTime(selectedSlot.startsAt, profile.timezone)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                                                <IconUser size={11} className="inline mr-1" />Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={clientName}
                                                onChange={(e) => { setClientName(e.target.value); setInfoError(''); }}
                                                placeholder="Tu nombre"
                                                className="booking-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Apellido *</label>
                                            <input
                                                type="text"
                                                value={clientLastName}
                                                onChange={(e) => { setClientLastName(e.target.value); setInfoError(''); }}
                                                placeholder="Tu apellido"
                                                className="booking-input"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                                            <IconMail size={11} className="inline mr-1" />Email
                                        </label>
                                        <input type="email" value={clientEmail} onChange={(e) => { setClientEmail(e.target.value); setInfoError(''); }} placeholder="tu@email.com" className="booking-input" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                                            <IconPhone size={11} className="inline mr-1" />Teléfono
                                        </label>
                                        <input type="tel" value={clientPhone} onChange={(e) => { setClientPhone(e.target.value); setInfoError(''); }} placeholder="+56 9 1234 5678" className="booking-input" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Mensaje (opcional)</label>
                                        <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="¿Hay algo que quieras comentarle al profesional?" rows={3} className="booking-input resize-none" />
                                    </div>

                                    {/* Recurrencia */}
                                    {profile.allowsRecurrentBooking && (
                                    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <button
                                                type="button"
                                                onClick={() => setIsRecurring((v) => !v)}
                                                className="mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                                                style={{
                                                    borderColor: isRecurring ? 'var(--accent)' : 'var(--border)',
                                                    background: isRecurring ? 'var(--accent)' : 'transparent',
                                                }}
                                                aria-label="Reservar varias sesiones"
                                            >
                                                {isRecurring && <IconCheck size={10} color="#fff" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Quiero reservar varias sesiones</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Se reservarán todas en el mismo horario del día elegido.</p>
                                            </div>
                                        </label>

                                        {isRecurring && (
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Frecuencia</label>
                                                    <select
                                                        value={recurrenceFrequency}
                                                        onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                                                        className="booking-input"
                                                    >
                                                        <option value="weekly">Cada semana</option>
                                                        <option value="biweekly">Cada dos semanas</option>
                                                        <option value="monthly">Cada mes</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Sesiones</label>
                                                    <input
                                                        type="number"
                                                        min={2}
                                                        max={26}
                                                        value={recurrenceCount}
                                                        onChange={(e) => setRecurrenceCount(Math.max(2, Math.min(26, Number(e.target.value) || 2)))}
                                                        className="booking-input"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {/* Cupón / código de descuento */}
                                    {selectedService?.price && (
                                        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                                                ¿Tienes un cupón de descuento?
                                            </label>
                                            {appliedPromo ? (
                                                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                                    <IconCheck size={14} className="shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold truncate">{appliedPromo.label}</p>
                                                        <p className="text-[11px] opacity-90">
                                                            {formattedPrice(String(appliedPromo.originalPrice), selectedService.currency)} → <strong>{formattedPrice(String(appliedPromo.finalPrice), selectedService.currency)}</strong>
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={clearPromo}
                                                        className="p-1 rounded hover:opacity-70"
                                                        aria-label="Quitar cupón"
                                                    >
                                                        <IconX size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={promoCode}
                                                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                                                        placeholder="CÓDIGO"
                                                        className="booking-input flex-1 font-mono uppercase"
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleApplyPromo(); } }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleApplyPromo()}
                                                        disabled={promoChecking || !promoCode.trim()}
                                                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
                                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                                    >
                                                        {promoChecking ? <IconLoader2 size={13} className="animate-spin" /> : 'Aplicar'}
                                                    </button>
                                                </div>
                                            )}
                                            {promoError && (
                                                <p className="flex items-center gap-1 text-[11px] mt-1.5" style={{ color: '#dc2626' }}>
                                                    <IconAlertCircle size={11} /> {promoError}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {infoError && (
                                        <p className="flex items-center gap-1.5 text-xs" style={{ color: '#dc2626' }}>
                                            <IconAlertCircle size={13} />{infoError}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleInfoNext}
                                        disabled={!clientName.trim() || !clientLastName.trim()}
                                        className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Preconsult */}
                        {step === 'preconsult' && selectedService && (selectedService.preconsultFields?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-4">
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    El profesional quiere conocer algunos detalles antes de tu cita. Tus respuestas son privadas.
                                </p>
                                {(selectedService.preconsultFields ?? []).map((field) => {
                                    const val = preconsultValues[field.id];
                                    const setVal = (v: string | boolean) => setPreconsultValues((prev) => ({ ...prev, [field.id]: v }));
                                    return (
                                        <div key={field.id} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>
                                                {field.label}{field.required && <span style={{ color: 'var(--accent)' }}> *</span>}
                                            </label>
                                            {field.type === 'textarea' && (
                                                <textarea
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) => setVal(e.target.value)}
                                                    placeholder={field.placeholder ?? ''}
                                                    rows={3}
                                                    className="field-input resize-none"
                                                />
                                            )}
                                            {(field.type === 'text' || field.type === 'number') && (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) => setVal(e.target.value)}
                                                    placeholder={field.placeholder ?? ''}
                                                    className="field-input"
                                                />
                                            )}
                                            {field.type === 'select' && (
                                                <select
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) => setVal(e.target.value)}
                                                    className="field-input"
                                                >
                                                    <option value="">—</option>
                                                    {(field.options ?? []).map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {field.type === 'checkbox' && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={val === true}
                                                        onChange={(e) => setVal(e.target.checked)}
                                                    />
                                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sí</span>
                                                </label>
                                            )}
                                        </div>
                                    );
                                })}
                                {preconsultError && <p className="text-xs" style={{ color: '#dc2626' }}>{preconsultError}</p>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep('info')}
                                        className="px-4 py-2.5 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle)"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePreconsultNext}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Encuadre */}
                        {step === 'encuadre' && (
                            <div>
                                <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                    Lee las condiciones de atención del profesional antes de confirmar tu cita.
                                </p>
                                <div className="rounded-xl border p-4 mb-5 text-sm leading-relaxed" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)', whiteSpace: 'pre-wrap' }}>
                                    {profile.encuadre}
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer mb-5">
                                    <button
                                        onClick={() => setPolicyAgreed(!policyAgreed)}
                                        className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                                        style={{
                                            borderColor: policyAgreed ? 'var(--accent)' : 'var(--border)',
                                            background: policyAgreed ? 'var(--accent)' : 'transparent',
                                        }}
                                    >
                                        {policyAgreed && <IconCheck size={12} color="#fff" />}
                                    </button>
                                    <span className="text-sm" style={{ color: 'var(--fg)' }}>
                                        He leído y acepto las condiciones de atención.
                                    </span>
                                </label>
                                <button
                                    onClick={handleEncuadreNext}
                                    disabled={!policyAgreed || submitting}
                                    className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                    style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                    {submitting ? <IconLoader2 size={16} className="animate-spin inline" /> : 'Confirmar reserva'}
                                </button>
                            </div>
                        )}

                        {/* Step: Payment instructions */}
                        {step === 'payment' && (
                            <div>
                                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Pago anticipado</p>
                                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                                    Esta sesión requiere pago anticipado. Elige tu método de pago preferido.
                                </p>

                                <div className="flex flex-col gap-3 mb-5">
                                    {/* MercadoPago automatic checkout */}
                                    {profile.paymentMethods.mpConnected && selectedService?.price && (
                                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>MercadoPago</p>
                                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                                Paga de forma segura con tarjeta, débito o efectivo.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmitAndRedirect('mp')}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                                style={{ background: '#009EE3', color: '#fff' }}
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Pagar con MercadoPago
                                            </button>
                                        </div>
                                    )}

                                    {/* Payment link */}
                                    {profile.paymentMethods.paymentLinkUrl && (
                                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--fg)' }}>Link de pago</p>
                                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                                Paga a través del link del profesional.
                                            </p>
                                            <a
                                                href={profile.paymentMethods.paymentLinkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 block text-center"
                                                style={{ background: 'var(--accent)', color: '#fff' }}
                                                onClick={() => void handleSubmit()}
                                            >
                                                Ir a pagar
                                            </a>
                                        </div>
                                    )}

                                    {/* Bank transfer */}
                                    {profile.paymentMethods.bankTransferData && (
                                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Transferencia bancaria</p>
                                            <div className="flex flex-col gap-1 mb-3">
                                                {[
                                                    ['Banco', profile.paymentMethods.bankTransferData.bank],
                                                    ['Tipo', profile.paymentMethods.bankTransferData.accountType],
                                                    ['N° cuenta', profile.paymentMethods.bankTransferData.accountNumber],
                                                    ['Titular', profile.paymentMethods.bankTransferData.holderName],
                                                    ['RUT', profile.paymentMethods.bankTransferData.holderRut],
                                                    ['Email', profile.paymentMethods.bankTransferData.holderEmail],
                                                    ...(profile.paymentMethods.bankTransferData.alias ? [['Asunto', profile.paymentMethods.bankTransferData.alias]] : []),
                                                ].map(([label, value]) => (
                                                    <div key={label} className="flex items-center justify-between text-xs">
                                                        <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                                                        <span className="font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => void handleSubmit()}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                                style={{ background: 'var(--accent)', color: '#fff' }}
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Confirmar reserva
                                            </button>
                                        </div>
                                    )}

                                    {/* Fallback: no methods configured but requiresAdvancePayment */}
                                    {!profile.paymentMethods.mpConnected && !profile.paymentMethods.paymentLinkUrl && !profile.paymentMethods.bankTransferData && (
                                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                                El profesional confirmará los detalles de pago contigo directamente.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmit()}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                                style={{ background: 'var(--accent)', color: '#fff' }}
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Confirmar reserva
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {submitError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                                        <IconAlertCircle size={14} /> {submitError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step: Confirmed */}
                        {step === 'confirmed' && (
                            <div className="text-center py-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                >
                                    <IconCheck size={32} />
                                </div>
                                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>
                                    {confirmedAppt?.status === 'confirmed' ? '¡Cita confirmada!' : 'Solicitud enviada'}
                                </h3>
                                <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
                                    {confirmedAppt?.status === 'confirmed'
                                        ? 'Tu cita ha sido confirmada automáticamente.'
                                        : 'El profesional revisará tu solicitud y te contactará pronto.'}
                                </p>
                                {selectedSlot && (
                                    <p className="text-sm font-medium mb-4" style={{ color: 'var(--fg)' }}>
                                        {formatDate(selectedSlot.startsAt, profile.timezone)}<br />
                                        {formatTime(selectedSlot.startsAt, profile.timezone)} — {formatTime(selectedSlot.endsAt, profile.timezone)}
                                    </p>
                                )}
                                {confirmedSeries && confirmedSeries.length > 1 && (
                                    <div className="rounded-xl border p-3 mb-4 text-left" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}>
                                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>
                                            Reservaste {confirmedSeries.length} sesiones
                                        </p>
                                        <ul className="flex flex-col gap-1 text-xs" style={{ color: 'var(--fg)' }}>
                                            {confirmedSeries.map((a, i) => (
                                                <li key={a.id} className="flex items-center gap-2">
                                                    <span className="w-4 text-right" style={{ color: 'var(--fg-muted)' }}>{i + 1}.</span>
                                                    <span>{formatDate(a.startsAt, profile.timezone)} — {formatTime(a.startsAt, profile.timezone)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {confirmedAppt?.modality === 'online' && confirmedAppt?.meetingUrl && (
                                    <div
                                        className="rounded-xl border p-3 mb-3 text-left"
                                        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <IconVideo size={14} style={{ color: 'var(--accent)' }} />
                                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                                                Google Meet
                                            </span>
                                        </div>
                                        <a
                                            href={confirmedAppt.meetingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-xs break-all font-mono"
                                            style={{ color: 'var(--fg)' }}
                                        >
                                            {confirmedAppt.meetingUrl}
                                        </a>
                                        <p className="text-[11px] mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                                            Guarda este enlace. Te lo reenviaremos por correo y WhatsApp.
                                        </p>
                                    </div>
                                )}
                                {confirmedAppt?.modality === 'online' && !confirmedAppt?.meetingUrl && (
                                    <div
                                        className="rounded-xl border p-3 mb-3 text-left text-xs"
                                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                                    >
                                        El profesional te compartirá el enlace de la videollamada por correo o WhatsApp.
                                    </div>
                                )}
                                {confirmedAppt?.paymentStatus === 'pending' && checkoutUrl && (
                                    <a
                                        href={checkoutUrl}
                                        className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90 mb-3"
                                        style={{ background: '#009EE3', color: '#fff' }}
                                    >
                                        Completar pago en MercadoPago
                                    </a>
                                )}
                                {confirmedAppt?.paymentStatus === 'pending' && !checkoutUrl && (
                                    <div className="rounded-xl border p-3 mb-4 text-xs text-left" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                                        Recuerda realizar el pago anticipado según las instrucciones recibidas para asegurar tu cita.
                                    </div>
                                )}
                                <button
                                    onClick={close}
                                    className="px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}

                        {/* Error banner for non-payment steps */}
                        {submitError && step !== 'payment' && (
                            <div className="flex items-center gap-2 p-3 rounded-xl text-sm mt-4" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                                <IconAlertCircle size={14} /> {submitError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
}
