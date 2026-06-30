'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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
import { detectBrowserTimezone, timezoneShortLabel, resolveBookingModality, bookingTermsFromRecord } from '@simple/utils';

type PreconsultField = { id: string; label: string; type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number'; required: boolean; placeholder?: string; options?: string[] };

type Service = {
    id: string;
    name: string;
    description?: string | null;
    durationMinutes: number;
    price: string | null;
    currency: string;
    isOnline: boolean;
    isPresential: boolean;
    preconsultFields?: PreconsultField[];
};

export type BookingFlowHandle = {
    openService: (serviceId: string) => void;
};

type BookingFlowProps = {
    profile: PublicProfile;
    /** En operator site: oculta lista plana y usa tarjetas externas. */
    embedded?: boolean;
};

type PublicProfile = {
    slug: string;
    displayName: string;
    profession: string | null;
    timezone: string;
    bookingWindowDays: number;
    allowsRecurrentBooking: boolean;
    encuadre?: string | null;
    bookingTermsText?: string | null;
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

export default forwardRef<BookingFlowHandle, BookingFlowProps>(function BookingFlow({ profile, embedded = false }, ref) {
    const searchParams = useSearchParams();
    const isReschedule = searchParams.get('reprogramar') === '1';
    const clientTz = useMemo(() => detectBrowserTimezone(), []);
    const professionalTz = profile.timezone;
    const bookingTermsText = bookingTermsFromRecord(profile);
    const showDualTimezone = clientTz !== professionalTz;
    const [step, setStep] = useState<Step>('idle');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [bookingModality, setBookingModality] = useState<'online' | 'presential'>('online');

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

    const openBooking = useCallback((service: Service) => {
        setSelectedService(service);
        const modality = resolveBookingModality(service);
        setBookingModality(modality ?? 'online');
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
    }, []);

    useImperativeHandle(ref, () => ({
        openService(serviceId: string) {
            const service = profile.services.find((item) => item.id === serviceId);
            if (service) openBooking(service);
        },
    }), [openBooking, profile.services]);

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
        } else if (bookingTermsText) {
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
        if (bookingTermsText) {
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
            policyAgreed: !!bookingTermsText && policyAgreed,
            recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
            recurrenceCount: isRecurring ? recurrenceCount : undefined,
            preconsultResponses: (selectedService?.preconsultFields?.length ?? 0) > 0 ? preconsultValues : undefined,
            promotionCode: appliedPromo?.code,
            modality: bookingModality,
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
            policyAgreed: !!bookingTermsText && policyAgreed,
            recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
            recurrenceCount: isRecurring ? recurrenceCount : undefined,
            preconsultResponses: (selectedService?.preconsultFields?.length ?? 0) > 0 ? preconsultValues : undefined,
            promotionCode: appliedPromo?.code,
            modality: bookingModality,
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
        if (embedded) {
            return (
                <p className="text-sm text-center py-3 booking-muted">
                    Selecciona un servicio arriba para elegir fecha y horario.
                </p>
            );
        }

        return (
            <div className="flex flex-col gap-3">
                {isReschedule && (
                    <div
                        role="status"
                        className="rounded-2xl border p-4 flex items-center gap-3 booking-accent-banner"
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
                        className="p-4 rounded-2xl border booking-surface"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm booking-fg">{service.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                    <span className="flex items-center gap-1 text-xs booking-muted">
                                        <IconClock size={11} />{service.durationMinutes} min
                                    </span>
                                    {service.isOnline && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md booking-badge-online">Online</span>
                                    )}
                                    {service.isPresential && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md booking-badge-presential">Presencial</span>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="font-bold text-sm booking-fg">{formattedPrice(service.price, service.currency)}</p>
                                <button
                                    onClick={() => openBooking(service)}
                                    className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 booking-btn-primary"
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
            {!embedded ? (
                <div className="flex flex-col gap-3">
                    {profile.services.map((service) => (
                        <div key={service.id} className="p-4 rounded-2xl border booking-surface">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm booking-fg">{service.name}</h3>
                                </div>
                                <p className="font-bold text-sm shrink-0 booking-fg">{formattedPrice(service.price, service.currency)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Booking modal */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="booking-step-title">
                <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={close} />
                <div
                    className="relative w-full max-w-md rounded-2xl border overflow-hidden booking-modal booking-modal-scroll"
                >
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
                        <div>
                            <p className="text-xs booking-muted">{selectedService?.name}</p>
                            <p id="booking-step-title" className="text-sm font-semibold booking-fg">
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
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle) booking-btn-outline"
                        >
                            <IconX size={14} />
                        </button>
                    </div>

                    <div className="p-5">
                        {/* Step: Date picker */}
                        {step === 'date' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <button type="button" aria-label="Mes anterior" onClick={prevMonth} className="w-8 h-8 rounded-button flex items-center justify-center border hover:bg-(--bg-subtle) transition-colors booking-btn-outline">
                                        <IconChevronLeft size={16} />
                                    </button>
                                    <p className="text-sm font-semibold booking-fg">
                                        {MONTHS_ES[viewMonth]} {viewYear}
                                    </p>
                                    <button type="button" aria-label="Mes siguiente" onClick={nextMonth} className="w-8 h-8 rounded-button flex items-center justify-center border hover:bg-(--bg-subtle) transition-colors booking-btn-outline">
                                        <IconChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {DAYS_ES.map((d) => (
                                        <p key={d} className="text-center text-xs font-medium booking-muted">{d}</p>
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
                                                className={`h-9 w-full rounded-xl text-sm transition-colors booking-day ${isSelected ? 'booking-day--selected' : ''} ${!available ? 'booking-day--disabled' : ''}`}
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
                                    className="flex items-center gap-1 text-xs mb-4 hover:underline booking-muted"
                                >
                                    <IconChevronLeft size={12} />
                                    {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                                </button>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-sm booking-muted">
                                        <IconLoader2 size={16} className="animate-spin" /> Buscando horarios disponibles...
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <p className="text-sm font-medium mb-1 booking-fg">Sin horarios disponibles</p>
                                        <p className="text-xs booking-muted">Elige otra fecha.</p>
                                        <button onClick={() => setStep('date')} className="mt-4 px-4 py-2 rounded-button border text-sm transition-colors hover:bg-(--bg-subtle) booking-btn-secondary">
                                            Volver al calendario
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {showDualTimezone ? (
                                            <p className="text-xs booking-muted mb-3">
                                                Horarios en tu zona ({timezoneShortLabel(clientTz)}). El profesional opera en {timezoneShortLabel(professionalTz)}.
                                            </p>
                                        ) : null}
                                        <div className="grid grid-cols-3 gap-2">
                                        {slots.map((slot) => (
                                            <button
                                                key={slot.startsAt}
                                                onClick={() => handleSlotSelect(slot)}
                                                className={`py-2.5 rounded-xl border text-sm font-medium transition-colors booking-slot ${selectedSlot?.startsAt === slot.startsAt ? 'booking-slot--selected' : ''}`}
                                            >
                                                {formatTime(slot.startsAt, clientTz)}
                                            </button>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step: Patient info */}
                        {step === 'info' && (
                            <div>
                                {selectedSlot && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl mb-5 booking-badge-online">
                                        <IconCalendar size={14} />
                                        <span className="text-xs font-medium">
                                            {formatDate(selectedSlot.startsAt, clientTz)} — {formatTime(selectedSlot.startsAt, clientTz)}
                                            {showDualTimezone ? (
                                                <span className="block text-[11px] font-normal booking-muted mt-0.5">
                                                    {formatTime(selectedSlot.startsAt, professionalTz)} hora del profesional
                                                </span>
                                            ) : null}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium block mb-1.5 booking-muted">
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
                                            <label className="text-xs font-medium block mb-1.5 booking-muted">Apellido *</label>
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
                                        <label className="text-xs font-medium block mb-1.5 booking-muted">
                                            <IconMail size={11} className="inline mr-1" />Email
                                        </label>
                                        <input type="email" value={clientEmail} onChange={(e) => { setClientEmail(e.target.value); setInfoError(''); }} placeholder="tu@email.com" className="booking-input" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium block mb-1.5 booking-muted">
                                            <IconPhone size={11} className="inline mr-1" />Teléfono
                                        </label>
                                        <input type="tel" value={clientPhone} onChange={(e) => { setClientPhone(e.target.value); setInfoError(''); }} placeholder="+56 9 1234 5678" className="booking-input" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium block mb-1.5 booking-muted">Mensaje (opcional)</label>
                                        <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="¿Hay algo que quieras comentarle al profesional?" rows={3} className="booking-input resize-none" />
                                    </div>

                                    {selectedService?.isOnline && selectedService?.isPresential ? (
                                        <div>
                                            <label className="text-xs font-medium block mb-1.5 booking-muted">Modalidad de la cita</label>
                                            <div className="flex gap-2">
                                                {([['online', 'Online'], ['presential', 'Presencial']] as const).map(([value, label]) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setBookingModality(value)}
                                                        className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${bookingModality === value ? 'booking-badge-online font-semibold' : 'booking-subtle'}`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Recurrencia */}
                                    {profile.allowsRecurrentBooking && (
                                    <div className="rounded-xl border p-3 booking-subtle">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <button
                                                type="button"
                                                onClick={() => setIsRecurring((v) => !v)}
                                                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors booking-checkbox ${isRecurring ? 'booking-checkbox--checked' : ''}`}
                                                aria-label="Reservar varias sesiones"
                                            >
                                                {isRecurring && <IconCheck size={10} color="#fff" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium booking-fg">Quiero reservar varias sesiones</p>
                                                <p className="text-xs mt-0.5 booking-muted">Se reservarán todas en el mismo horario del día elegido.</p>
                                            </div>
                                        </label>

                                        {isRecurring && (
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs font-medium block mb-1.5 booking-muted">Frecuencia</label>
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
                                                    <label className="text-xs font-medium block mb-1.5 booking-muted">Sesiones</label>
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
                                        <div className="rounded-xl border p-3 booking-subtle">
                                            <label className="text-xs font-medium block mb-1.5 booking-muted">
                                                ¿Tienes un cupón de descuento?
                                            </label>
                                            {appliedPromo ? (
                                                <div className="flex items-center gap-2 p-2 rounded-lg booking-badge-online">
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
                                                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 booking-btn-primary"
                                                    >
                                                        {promoChecking ? <IconLoader2 size={13} className="animate-spin" /> : 'Aplicar'}
                                                    </button>
                                                </div>
                                            )}
                                            {promoError && (
                                                <p className="flex items-center gap-1 text-[11px] mt-1.5 booking-error">
                                                    <IconAlertCircle size={11} /> {promoError}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {infoError && (
                                        <p className="flex items-center gap-1.5 text-xs booking-error">
                                            <IconAlertCircle size={13} />{infoError}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleInfoNext}
                                        disabled={!clientName.trim() || !clientLastName.trim()}
                                        className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 booking-btn-primary"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Preconsult */}
                        {step === 'preconsult' && selectedService && (selectedService.preconsultFields?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-4">
                                <p className="text-xs booking-muted">
                                    El profesional quiere conocer algunos detalles antes de tu cita. Tus respuestas son privadas.
                                </p>
                                {(selectedService.preconsultFields ?? []).map((field) => {
                                    const val = preconsultValues[field.id];
                                    const setVal = (v: string | boolean) => setPreconsultValues((prev) => ({ ...prev, [field.id]: v }));
                                    return (
                                        <div key={field.id} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium booking-fg">
                                                {field.label}{field.required && <span className="booking-required"> *</span>}
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
                                                    <span className="text-sm booking-muted">Sí</span>
                                                </label>
                                            )}
                                        </div>
                                    );
                                })}
                                {preconsultError && <p className="text-xs booking-error">{preconsultError}</p>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep('info')}
                                        className="px-4 py-2.5 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle) booking-btn-secondary"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePreconsultNext}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 booking-btn-primary"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Encuadre */}
                        {step === 'encuadre' && (
                            <div>
                                <p className="text-xs mb-3 booking-muted">
                                    Lee las condiciones de atención del profesional antes de confirmar tu cita.
                                </p>
                                <div className="rounded-xl border p-4 mb-5 text-sm leading-relaxed booking-encuadre-box">
                                    {bookingTermsText}
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer mb-5">
                                    <button
                                        onClick={() => setPolicyAgreed(!policyAgreed)}
                                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors booking-checkbox ${policyAgreed ? 'booking-checkbox--checked' : ''}`}
                                    >
                                        {policyAgreed && <IconCheck size={12} color="#fff" />}
                                    </button>
                                    <span className="text-sm booking-fg">
                                        He leído y acepto las condiciones de atención.
                                    </span>
                                </label>
                                <button
                                    onClick={handleEncuadreNext}
                                    disabled={!policyAgreed || submitting}
                                    className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 booking-btn-primary"
                                >
                                    {submitting ? <IconLoader2 size={16} className="animate-spin inline" /> : 'Confirmar reserva'}
                                </button>
                            </div>
                        )}

                        {/* Step: Payment instructions */}
                        {step === 'payment' && (
                            <div>
                                <p className="text-sm font-semibold mb-1 booking-fg">Pago anticipado</p>
                                <p className="text-xs mb-5 booking-muted">
                                    Esta sesión requiere pago anticipado. Elige tu método de pago preferido.
                                </p>

                                <div className="flex flex-col gap-3 mb-5">
                                    {/* MercadoPago automatic checkout */}
                                    {profile.paymentMethods.mpConnected && selectedService?.price && (
                                        <div className="rounded-xl border p-4 booking-subtle">
                                            <p className="text-xs font-semibold mb-1 booking-fg">MercadoPago</p>
                                            <p className="text-xs mb-3 booking-muted">
                                                Paga de forma segura con tarjeta, débito o efectivo.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmitAndRedirect('mp')}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-mercadopago"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Pagar con MercadoPago
                                            </button>
                                        </div>
                                    )}

                                    {/* Payment link */}
                                    {profile.paymentMethods.paymentLinkUrl && (
                                        <div className="rounded-xl border p-4 booking-subtle">
                                            <p className="text-xs font-semibold mb-1 booking-fg">Link de pago</p>
                                            <p className="text-xs mb-3 booking-muted">
                                                Paga a través del link del profesional.
                                            </p>
                                            <a
                                                href={profile.paymentMethods.paymentLinkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 block text-center booking-btn-primary"
                                                onClick={() => void handleSubmit()}
                                            >
                                                Ir a pagar
                                            </a>
                                        </div>
                                    )}

                                    {/* Bank transfer */}
                                    {profile.paymentMethods.bankTransferData && (
                                        <div className="rounded-xl border p-4 booking-subtle">
                                            <p className="text-xs font-semibold mb-2 booking-fg">Transferencia bancaria</p>
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
                                                        <span className="booking-muted">{label}</span>
                                                        <span className="font-medium booking-fg">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => void handleSubmit()}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-btn-primary"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Confirmar reserva
                                            </button>
                                        </div>
                                    )}

                                    {/* Fallback: no methods configured but requiresAdvancePayment */}
                                    {!profile.paymentMethods.mpConnected && !profile.paymentMethods.paymentLinkUrl && !profile.paymentMethods.bankTransferData && (
                                        <div className="rounded-xl border p-4 border-(--border)">
                                            <p className="text-xs mb-3 booking-muted">
                                                El profesional confirmará los detalles de pago contigo directamente.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmit()}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-btn-primary"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Confirmar reserva
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {submitError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm booking-error-banner">
                                        <IconAlertCircle size={14} /> {submitError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step: Confirmed */}
                        {step === 'confirmed' && (
                            <div className="text-center py-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 booking-badge-online"
                                >
                                    <IconCheck size={32} />
                                </div>
                                <h3 className="text-lg font-bold mb-1 booking-fg">
                                    {confirmedAppt?.status === 'confirmed' ? '¡Cita confirmada!' : 'Solicitud enviada'}
                                </h3>
                                <p className="text-sm mb-2 booking-muted">
                                    {confirmedAppt?.status === 'confirmed'
                                        ? 'Tu cita ha sido confirmada automáticamente.'
                                        : 'El profesional revisará tu solicitud y te contactará pronto.'}
                                </p>
                                {selectedSlot && (
                                    <p className="text-sm font-medium mb-4 booking-fg">
                                        {formatDate(selectedSlot.startsAt, clientTz)}<br />
                                        {formatTime(selectedSlot.startsAt, clientTz)} — {formatTime(selectedSlot.endsAt, clientTz)}
                                        {showDualTimezone ? (
                                            <span className="block text-xs font-normal booking-muted mt-1">
                                                {formatTime(selectedSlot.startsAt, professionalTz)} — {formatTime(selectedSlot.endsAt, professionalTz)} hora del profesional
                                            </span>
                                        ) : null}
                                    </p>
                                )}
                                {confirmedSeries && confirmedSeries.length > 1 && (
                                    <div className="rounded-xl border p-3 mb-4 text-left booking-confirmed-box">
                                        <p className="text-xs font-semibold mb-2 booking-video-label">
                                            Reservaste {confirmedSeries.length} sesiones
                                        </p>
                                        <ul className="flex flex-col gap-1 text-xs booking-fg">
                                            {confirmedSeries.map((a, i) => (
                                                <li key={a.id} className="flex items-center gap-2">
                                                    <span className="w-4 text-right booking-muted">{i + 1}.</span>
                                                    <span>{formatDate(a.startsAt, clientTz)} — {formatTime(a.startsAt, clientTz)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {confirmedAppt?.modality === 'online' && confirmedAppt?.meetingUrl && (
                                    <div className="rounded-xl border p-3 mb-3 text-left booking-video-box">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <IconVideo size={14} className="booking-video-label" />
                                            <span className="text-xs font-semibold uppercase tracking-wide booking-video-label">
                                                Google Meet
                                            </span>
                                        </div>
                                        <a
                                            href={confirmedAppt.meetingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-xs break-all font-mono booking-fg"
                                        >
                                            {confirmedAppt.meetingUrl}
                                        </a>
                                        <p className="text-[11px] mt-1.5 booking-muted">
                                            Guarda este enlace. Te lo reenviaremos por correo y WhatsApp.
                                        </p>
                                    </div>
                                )}
                                {confirmedAppt?.modality === 'online' && !confirmedAppt?.meetingUrl && (
                                    <div className="rounded-xl border p-3 mb-3 text-left text-xs booking-muted-box">
                                        El profesional te compartirá el enlace de la videollamada por correo o WhatsApp.
                                    </div>
                                )}
                                {confirmedAppt?.paymentStatus === 'pending' && checkoutUrl && (
                                    <a
                                        href={checkoutUrl}
                                        className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90 mb-3 booking-mercadopago"
                                    >
                                        Completar pago en MercadoPago
                                    </a>
                                )}
                                {confirmedAppt?.paymentStatus === 'pending' && !checkoutUrl && (
                                    <div className="rounded-xl border p-3 mb-4 text-xs text-left booking-muted-box">
                                        Recuerda realizar el pago anticipado según las instrucciones recibidas para asegurar tu cita.
                                    </div>
                                )}
                                <button
                                    onClick={close}
                                    className="px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-(--bg-subtle) booking-btn-secondary"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}

                        {/* Error banner for non-payment steps */}
                        {submitError && step !== 'payment' && (
                            <div className="flex items-center gap-2 p-3 rounded-xl text-sm mt-4 booking-error-banner">
                                <IconAlertCircle size={14} /> {submitError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
});
