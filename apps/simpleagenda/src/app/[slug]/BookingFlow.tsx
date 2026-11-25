'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
    IconBrandWhatsapp,
    IconMapPin,
} from '@tabler/icons-react';
import { fetchPublicSlots, bookAppointment, retryPublicBookingCheckout, fetchPublicBookingPaymentStatus, validatePublicPromo, type TimeSlot, type PaymentMethods, type RecurrenceFrequency } from '@/lib/agenda-api';
import { track } from '@/lib/analytics';
import { PanelScrollModal } from '@simple/ui/panel';
import { ReservationTicket } from '@/components/agenda/reservation-ticket';
import { detectBrowserTimezone, timezoneShortLabel, resolveBookingModality, bookingTermsFromRecord } from '@simple/utils';
import {
    buildBookingShareWaMessage,
    buildWhatsAppClickUrl,
    formatAppointmentWhenLabel,
} from '@/lib/whatsapp-click';

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
    hasCustomAccent?: boolean;
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
    locations?: Array<{ id: string; name: string; addressLine?: string | null }>;
    schedule?: {
        alwaysOpen?: boolean;
        rules?: Array<{ dayOfWeek: number; isActive: boolean }>;
    };
};

type Step = 'idle' | 'date' | 'info' | 'preconsult' | 'encuadre' | 'payment' | 'confirmed';
type BookingPaymentMethod = 'mp' | 'link' | 'transfer' | 'manual';
type BookingResult = {
    id: string;
    status: string;
    paymentStatus: string;
    modality?: string | null;
    meetingUrl?: string | null;
    location?: string | null;
};

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DEMO_PROFILES = new Set(['dra-valentina', 'esteban-carrasco', 'camila-silva', 'demo-plataforma-agenda']);

function calendarDate(value: string) {
    return new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function calendarText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\r\n|\n|\r/g, '\\n').replace(/[,;]/g, '\\$&');
}

function downloadCalendarEvent(booking: BookingResult, slot: TimeSlot, summary: string) {
    const event = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SimpleAgenda//Cita//ES',
        'BEGIN:VEVENT',
        `UID:${booking.id}@simpleagenda.app`,
        `DTSTAMP:${calendarDate(new Date().toISOString())}`,
        `DTSTART:${calendarDate(slot.startsAt)}`,
        `DTEND:${calendarDate(slot.endsAt)}`,
        `SUMMARY:${calendarText(summary)}`,
        booking.location ? `LOCATION:${calendarText(booking.location)}` : '',
        booking.meetingUrl ? `DESCRIPTION:${calendarText(booking.meetingUrl)}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean).join('\r\n') + '\r\n';
    const fileUrl = URL.createObjectURL(new Blob([event], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.download = 'cita-simpleagenda.ics';
    link.href = fileUrl;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 2000);
}

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

export default forwardRef<BookingFlowHandle, BookingFlowProps>(function BookingFlow({ profile, embedded = false, hasCustomAccent = false }, ref) {
    const searchParams = useSearchParams();
    const returnedPayment = searchParams.get('payment');
    const returnedAppointmentId = ['success', 'pending', 'failure'].includes(returnedPayment ?? '') ? searchParams.get('appt') : null;
    const isDemo = DEMO_PROFILES.has(profile.slug);
    const clientTz = useMemo(() => detectBrowserTimezone(), []);
    const professionalTz = profile.timezone;
    const bookingTermsText = bookingTermsFromRecord(profile);
    const showDualTimezone = clientTz !== professionalTz;
    const [step, setStep] = useState<Step>('idle');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [bookingModality, setBookingModality] = useState<'online' | 'presential'>('online');

    // Date picker state
    const todayYmd = (() => {
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: professionalTz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());
        } catch {
            return new Date().toISOString().slice(0, 10);
        }
    })();
    const [todayY, todayM, todayD] = todayYmd.split('-').map(Number);
    const [viewYear, setViewYear] = useState(todayY);
    const [viewMonth, setViewMonth] = useState(todayM - 1);
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD

    // Time slots
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState(false);
    const [slotsRetry, setSlotsRetry] = useState(0);
    const slotsCacheRef = useRef<Map<string, TimeSlot[]>>(new Map());
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string>(profile.locations?.[0]?.id ?? '');
    const [copiedBank, setCopiedBank] = useState(false);
    const slotsHeading = useRef<HTMLHeadingElement>(null);
    const nameInputId = 'agenda-booking-name';

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
    const submissionInProgress = useRef(false);
    const [submitError, setSubmitError] = useState('');
    const [confirmedAppt, setConfirmedAppt] = useState<BookingResult | null>(null);
    const [confirmedSeries, setConfirmedSeries] = useState<Array<{ id: string; startsAt: string }> | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>();
    const [checkingPayment, setCheckingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentRefresh, setPaymentRefresh] = useState(0);
    const paymentPending = confirmedAppt?.paymentStatus === 'pending';
    const cancelled = confirmedAppt?.status === 'cancelled';
    const isConfirmed = confirmedAppt?.status === 'confirmed' && !paymentPending;
    const resultTitle = checkingPayment ? 'Verificando pago'
        : paymentError && !confirmedAppt ? 'Estado del pago'
            : isConfirmed ? 'Cita confirmada'
            : cancelled ? 'Cita cancelada'
                : paymentPending ? 'Pago pendiente' : 'Solicitud enviada';

    useEffect(() => {
        if (!selectedDate || !selectedService || step !== 'date') return;
        let active = true;
        const date = selectedDate;
        const cacheKey = `${selectedService.id}:${date}`;
        if (slotsRetry === 0 && slotsCacheRef.current.has(cacheKey)) {
            setSlots(slotsCacheRef.current.get(cacheKey) ?? []);
            setLoadingSlots(false);
            setSlotsError(false);
            return;
        }
        setLoadingSlots(true);
        setSlots([]);
        setSlotsError(false);
        const request = isDemo
            ? Promise.resolve([
                { startsAt: date + 'T14:00:00.000Z', endsAt: date + 'T14:50:00.000Z' },
                { startsAt: date + 'T15:30:00.000Z', endsAt: date + 'T16:20:00.000Z' },
                { startsAt: date + 'T18:00:00.000Z', endsAt: date + 'T18:50:00.000Z' },
            ])
            : fetchPublicSlots(profile.slug, date, selectedService.id);
        void request.then((data) => {
            if (!active) return;
            slotsCacheRef.current.set(cacheKey, data);
            setSlots(data);
        })
            .catch(() => { if (active) setSlotsError(true); })
            .finally(() => { if (active) setLoadingSlots(false); });
        return () => { active = false; };
    }, [selectedDate, selectedService, step, profile.slug, isDemo, slotsRetry]);

    useEffect(() => {
        if (isDemo || !returnedAppointmentId) return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const verify = async (attempt: number) => {
            try {
                const result = await fetchPublicBookingPaymentStatus(profile.slug, returnedAppointmentId);
                if (!active) return;
                if (!result.ok || !result.status || !result.paymentStatus) {
                    setPaymentError(result.error ?? 'No pudimos verificar tu cita. Inténtalo de nuevo.');
                } else {
                    setConfirmedAppt({
                        id: returnedAppointmentId,
                        status: result.status,
                        paymentStatus: result.paymentStatus,
                        modality: result.modality ?? null,
                        meetingUrl: result.meetingUrl ?? null,
                        location: result.location ?? null,
                    });
                    if (result.startsAt && result.endsAt) {
                        setSelectedSlot({ startsAt: result.startsAt, endsAt: result.endsAt });
                    }
                    if (returnedPayment === 'success' && result.paymentStatus === 'pending' && attempt < 3) {
                        timer = setTimeout(() => void verify(attempt + 1), 1400);
                        return;
                    }
                }
            } catch {
                if (active) setPaymentError('No pudimos verificar el pago. Inténtalo de nuevo.');
            }
            if (active) setCheckingPayment(false);
        };
        setStep('confirmed');
        setPaymentMethod('mp');
        setPaymentError('');
        setCheckingPayment(true);
        void verify(0);
        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [returnedAppointmentId, returnedPayment, paymentRefresh, profile.slug, isDemo]);

    const openBooking = useCallback((service: Service) => {
        slotsCacheRef.current.clear();
        setSelectedService(service);
        const modality = resolveBookingModality(service);
        setBookingModality(modality ?? 'online');
        setSelectedLocationId(profile.locations?.[0]?.id ?? '');
        setCopiedBank(false);
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
        setConfirmedSeries(null);
        setPaymentMethod(undefined);
        setPaymentError('');
        setPreconsultValues({});
        setPreconsultError('');
        setInfoError('');
        setPromoCode('');
        setPromoError(null);
        setAppliedPromo(null);
        if (!isDemo) track('public_booking_start');
    }, [isDemo]);

    useImperativeHandle(ref, () => ({
        openService(serviceId: string) {
            const service = profile.services.find((item) => item.id === serviceId);
            if (service) openBooking(service);
        },
    }), [openBooking, profile.services]);

    const close = () => {
        if (submitting) return;
        if (returnedAppointmentId) {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            url.searchParams.delete('appt');
            window.history.replaceState(null, '', url);
        }
        setCheckingPayment(false);
        setStep('idle');
    };

    const bookingStepTitle = (() => {
        switch (step) {
            case 'date': return 'Elige día y hora';
            case 'info': return 'Tus datos';
            case 'preconsult': return 'Antes de tu cita';
            case 'encuadre': return 'Condiciones de atención';
            case 'payment': return 'Pago anticipado';
            case 'confirmed': return resultTitle;
            default: return '';
        }
    })();

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

    const effectiveSessionPrice = appliedPromo
        ? appliedPromo.finalPrice
        : Number(selectedService?.price ?? 0);
    const needsAdvancePaymentStep = profile.requiresAdvancePayment && effectiveSessionPrice > 0;

    // Calendar grid helpers (aligned with professional timezone & active rules)
    const todayUtcMidnight = Date.UTC(todayY, todayM - 1, todayD);
    const maxDateUtcMidnight = todayUtcMidnight + profile.bookingWindowDays * 86_400_000;
    const activeWeekdays = useMemo(() => {
        if (profile.schedule?.alwaysOpen) return null;
        const active = (profile.schedule?.rules ?? []).filter((r) => r.isActive).map((r) => r.dayOfWeek);
        return active.length > 0 ? new Set(active) : null;
    }, [profile.schedule]);

    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const isDateAvailable = (y: number, m: number, d: number) => {
        const dateUtc = Date.UTC(y, m, d);
        if (dateUtc < todayUtcMidnight || dateUtc > maxDateUtcMidnight) return false;
        if (activeWeekdays) {
            const dow = new Date(dateUtc).getUTCDay();
            if (!activeWeekdays.has(dow)) return false;
        }
        return true;
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
        if (dateStr !== selectedDate) {
            setSelectedDate(dateStr);
            setSelectedSlot(null);
            setLoadingSlots(true);
        }
        requestAnimationFrame(() => slotsHeading.current?.focus());
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
        setStep('info');
        requestAnimationFrame(() => document.getElementById(nameInputId)?.focus());
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
        if (clientPhone.trim() && clientPhone.trim().replace(/\D/g, '').length < 7) {
            setInfoError('Ingresa un número de teléfono válido.');
            return;
        }
        if (!clientEmail.trim() && !clientPhone.trim()) {
            setInfoError('Ingresa al menos un correo o teléfono de contacto. Si dejas un correo, te enviaremos el estado de tu cita.');
            return;
        }
        const hasPreconsult = (selectedService?.preconsultFields?.length ?? 0) > 0;
        if (hasPreconsult) {
            setStep('preconsult');
        } else if (bookingTermsText) {
            setStep('encuadre');
        } else if (needsAdvancePaymentStep) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handlePreconsultNext = () => {
        const fields = selectedService?.preconsultFields ?? [];
        for (const f of fields) {
            const v = preconsultValues[f.id];
            if (f.required) {
                const empty = f.type === 'checkbox' ? v !== true : !(typeof v === 'string' && v.trim());
                if (empty) {
                    setPreconsultError(`Falta responder: ${f.label}`);
                    return;
                }
            }
            if (f.type === 'number' && typeof v === 'string' && v.trim() && !Number.isFinite(Number(v))) {
                setPreconsultError(`Ingresa un número válido en: ${f.label}`);
                return;
            }
        }
        setPreconsultError('');
        if (bookingTermsText) {
            setStep('encuadre');
        } else if (needsAdvancePaymentStep) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handleEncuadreNext = () => {
        if (!policyAgreed) return;
        if (needsAdvancePaymentStep) {
            setStep('payment');
        } else {
            void handleSubmit();
        }
    };

    const handleSubmit = async (method?: BookingPaymentMethod) => {
        if (submissionInProgress.current || !selectedService || !selectedSlot || !clientName.trim() || !clientLastName.trim()) return;
        setPaymentMethod(method);
        if (isDemo) {
            setConfirmedAppt({
                id: 'demo-confirmed-appt',
                status: 'confirmed',
                paymentStatus: profile.requiresAdvancePayment ? 'pending' : 'not_required',
                modality: bookingModality,
                meetingUrl: 'https://meet.google.com/demo-simpleagenda',
            });
            setStep('confirmed');
            return;
        }
        submissionInProgress.current = true;
        setSubmitting(true);
        setSubmitError('');
        try {
            const result = await bookAppointment(profile.slug, {
                serviceId: selectedService.id,
                clientName: `${clientName.trim()} ${clientLastName.trim()}`,
                clientEmail: clientEmail.trim() || undefined,
                clientPhone: clientPhone.trim() || undefined,
                clientNotes: clientNotes.trim() || undefined,
                startsAt: selectedSlot.startsAt,
                policyAgreed: !!bookingTermsText && policyAgreed,
                recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
                recurrenceCount: isRecurring ? recurrenceCount : undefined,
                preconsultResponses: selectedService.preconsultFields?.length ? preconsultValues : undefined,
                promotionCode: appliedPromo?.code,
                modality: bookingModality,
                locationId: bookingModality === 'presential' ? (selectedLocationId || undefined) : undefined,
                paymentMethod: method,
            });
            if (!result.ok || !result.appointment) {
                setSubmitError(result.error ?? 'No pudimos registrar la cita. Inténtalo de nuevo.');
                return;
            }
            setConfirmedAppt(result.appointment);
            setConfirmedSeries(result.appointments && result.appointments.length > 1 ? result.appointments : null);
            track('public_booking_submitted', {
                status: result.appointment.status,
                payment_status: result.appointment.paymentStatus,
            });
            setStep('confirmed');
            if (method === 'mp' && result.checkoutUrl) {
                window.location.assign(result.checkoutUrl);
            } else if (method === 'link' && profile.paymentMethods.paymentLinkUrl) {
                window.location.assign(profile.paymentMethods.paymentLinkUrl);
            }
        } catch {
            setSubmitError('No pudimos comprobar si la cita se registró. Revisa tu correo antes de volver a intentarlo.');
        } finally {
            submissionInProgress.current = false;
            setSubmitting(false);
        }
    };

    const reopenCheckout = async () => {
        if (!confirmedAppt || submissionInProgress.current) return;
        submissionInProgress.current = true;
        setSubmitting(true);
        setPaymentError('');
        try {
            const result = await retryPublicBookingCheckout(profile.slug, confirmedAppt.id);
            if (result.ok && result.checkoutUrl) window.location.assign(result.checkoutUrl);
            else setPaymentError(result.error ?? 'No pudimos abrir Mercado Pago.');
        } catch {
            setPaymentError('No pudimos abrir Mercado Pago. Inténtalo de nuevo.');
        } finally {
            submissionInProgress.current = false;
            setSubmitting(false);
        }
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

            <PanelScrollModal
                onClose={close}
                size={step === 'date' ? '3xl' : 'md'}
                zIndexClass="z-[80]"
                overlayClassName="bg-black/40 backdrop-blur-[2px]"
                panelClassName={hasCustomAccent ? 'booking-modal booking-modal--custom-accent' : 'booking-modal'}
                titleId="booking-step-title"
                headerContent={(
                    <>
                        <p className="text-xs booking-muted">
                            {selectedService?.name}
                            {selectedService ? ` · ${selectedService.durationMinutes} min` : ''}
                            {selectedService?.price ? ` · ${formattedPrice(String(effectiveSessionPrice), selectedService.currency)}` : ''}
                        </p>
                        <p id="booking-step-title" className="text-sm font-semibold booking-fg">
                            {bookingStepTitle}
                        </p>
                    </>
                )}
            >
                        {step === 'date' && (
                            <div className="grid gap-6 sm:grid-cols-2">
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
                                                type="button"
                                                disabled={!available}
                                                aria-label={formatDate(`${dateStr}T12:00:00`, professionalTz)}
                                                aria-pressed={isSelected}
                                                onClick={() => available && handleDateSelect(dateStr)}
                                                className={`h-11 w-full rounded-xl text-sm transition-colors booking-day ${isSelected ? 'booking-day--selected' : ''} ${!available ? 'booking-day--disabled' : ''}`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                                </div>
                                <div className="min-w-0 border-t border-(--border) pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
                                <h3 ref={slotsHeading} tabIndex={-1} className="mb-3 text-sm font-semibold booking-fg">
                                    {selectedDate
                                        ? new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
                                        : 'Horarios disponibles'}
                                </h3>
                                {!selectedDate ? (
                                    <p className="text-sm booking-muted">Selecciona un día para ver las horas.</p>
                                ) : loadingSlots ? (
                                    <div role="status" className="flex items-center py-5 gap-2 text-sm booking-muted">
                                        <IconLoader2 size={16} className="animate-spin" /> Buscando horarios disponibles...
                                    </div>
                                ) : slotsError ? (
                                    <div role="alert" className="py-3 text-sm booking-fg">
                                        No pudimos consultar los horarios.
                                        <button type="button" onClick={() => setSlotsRetry((attempt) => attempt + 1)} className="mt-2 block underline underline-offset-4">
                                            Reintentar
                                        </button>
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="py-3" role="status">
                                        <p className="text-sm font-medium mb-1 booking-fg">Sin horarios disponibles</p>
                                        <p className="text-xs booking-muted">Elige otra fecha.</p>
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
                                                type="button"
                                                aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                                                onClick={() => handleSlotSelect(slot)}
                                                className="booking-slot agenda-time-option rounded-button border py-2.5 text-sm font-medium tabular-nums"
                                            >
                                                {formatTime(slot.startsAt, clientTz)}
                                            </button>
                                        ))}
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>
                        )}

                        {/* Step: Patient info */}
                        {step === 'info' && (
                            <div>
                                {selectedSlot && (
                                    <div className="booking-subtle mb-5 flex items-center gap-3 rounded-card border p-3">
                                        <span className="agenda-time-option--selected shrink-0 rounded-button px-2.5 py-1.5 text-sm font-bold tabular-nums">
                                            {formatTime(selectedSlot.startsAt, clientTz)}
                                        </span>
                                        <span className="booking-fg min-w-0 text-xs font-medium">
                                            {formatDate(selectedSlot.startsAt, clientTz)}
                                            {showDualTimezone ? (
                                                <span className="block text-[11px] font-normal booking-muted mt-0.5">
                                                    {formatTime(selectedSlot.startsAt, professionalTz)} hora del profesional
                                                </span>
                                            ) : null}
                                        </span>
                                        <button type="button" onClick={() => setStep('date')} className="ml-auto shrink-0 text-xs font-semibold underline underline-offset-4 booking-fg">
                                            Cambiar hora
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor={nameInputId} className="text-xs font-medium block mb-1.5 booking-muted">
                                                <IconUser size={11} className="inline mr-1" />Nombre *
                                            </label>
                                            <input
                                                id={nameInputId}
                                                type="text"
                                                autoComplete="given-name"
                                                value={clientName}
                                                onChange={(e) => { setClientName(e.target.value); setInfoError(''); }}
                                                placeholder="Tu nombre"
                                                className="booking-input"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="agenda-booking-lastname" className="text-xs font-medium block mb-1.5 booking-muted">Apellido *</label>
                                            <input
                                                id="agenda-booking-lastname"
                                                type="text"
                                                value={clientLastName}
                                                onChange={(e) => { setClientLastName(e.target.value); setInfoError(''); }}
                                                placeholder="Tu apellido"
                                                className="booking-input"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="agenda-booking-email" className="text-xs font-medium block mb-1.5 booking-muted">
                                            <IconMail size={11} className="inline mr-1" />Email
                                        </label>
                                        <input id="agenda-booking-email" type="email" value={clientEmail} onChange={(e) => { setClientEmail(e.target.value); setInfoError(''); }} placeholder="tu@email.com" className="booking-input" />
                                    </div>
                                    <div>
                                        <label htmlFor="agenda-booking-phone" className="text-xs font-medium block mb-1.5 booking-muted">
                                            <IconPhone size={11} className="inline mr-1" />Teléfono
                                        </label>
                                        <input id="agenda-booking-phone" type="tel" value={clientPhone} onChange={(e) => { setClientPhone(e.target.value); setInfoError(''); }} placeholder="+56 9 1234 5678" className="booking-input" />
                                    </div>
                                    <div>
                                        <label htmlFor="agenda-booking-notes" className="text-xs font-medium block mb-1.5 booking-muted">Mensaje (opcional)</label>
                                        <textarea id="agenda-booking-notes" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="¿Hay algo que quieras comentarle al profesional?" rows={3} className="booking-input resize-none" />
                                    </div>

                                    {selectedService?.isOnline && selectedService?.isPresential ? (
                                        <div>
                                            <p className="text-xs font-medium block mb-1.5 booking-muted">Modalidad de la cita</p>
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

                                    {bookingModality === 'presential' && (profile.locations?.length ?? 0) > 1 ? (
                                        <div>
                                            <label htmlFor="agenda-booking-location" className="text-xs font-medium block mb-1.5 booking-muted">Ubicación de atención</label>
                                            <select
                                                id="agenda-booking-location"
                                                value={selectedLocationId}
                                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                                className="booking-input"
                                            >
                                                {(profile.locations ?? []).map((loc) => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name}{loc.addressLine ? ` — ${loc.addressLine}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}

                                    {/* Recurrencia */}
                                    {profile.allowsRecurrentBooking && (
                                    <div className="rounded-xl border p-3 booking-subtle">
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={isRecurring}
                                            onClick={() => setIsRecurring((v) => !v)}
                                            className="flex items-start gap-3 cursor-pointer text-left w-full"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors booking-checkbox ${isRecurring ? 'booking-checkbox--checked' : ''}`}
                                            >
                                                {isRecurring && <IconCheck size={10} color="var(--accent-contrast)" />}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium booking-fg">Quiero reservar varias sesiones</p>
                                                <p className="text-xs mt-0.5 booking-muted">Se reservarán todas en el mismo horario del día elegido.</p>
                                            </div>
                                        </button>

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
                                        type="button"
                                        onClick={handleInfoNext}
                                        disabled={submitting}
                                        className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 booking-btn-primary"
                                    >
                                        {submitting ? 'Registrando…' : needsAdvancePaymentStep || bookingTermsText || selectedService?.preconsultFields?.length ? 'Continuar' : 'Confirmar cita'}
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
                                            <label htmlFor={`preconsult-${field.id}`} className="text-xs font-medium booking-fg">
                                                {field.label}{field.required && <span className="booking-required"> *</span>}
                                            </label>
                                            {field.type === 'textarea' && (
                                                <textarea
                                                    id={`preconsult-${field.id}`}
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) => setVal(e.target.value)}
                                                    placeholder={field.placeholder ?? ''}
                                                    rows={3}
                                                    className="field-input resize-none"
                                                />
                                            )}
                                            {(field.type === 'text' || field.type === 'number') && (
                                                <input
                                                    id={`preconsult-${field.id}`}
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) => setVal(e.target.value)}
                                                    placeholder={field.placeholder ?? ''}
                                                    className="field-input"
                                                />
                                            )}
                                            {field.type === 'select' && (
                                                <select
                                                    id={`preconsult-${field.id}`}
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
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={policyAgreed}
                                    onClick={() => setPolicyAgreed((v) => !v)}
                                    className="flex items-start gap-3 cursor-pointer mb-5 text-left w-full"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors booking-checkbox ${policyAgreed ? 'booking-checkbox--checked' : ''}`}
                                    >
                                        {policyAgreed && <IconCheck size={12} color="var(--accent-contrast)" />}
                                    </span>
                                    <span className="text-sm booking-fg">
                                        He leído y acepto las condiciones de atención.
                                    </span>
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep((selectedService?.preconsultFields?.length ?? 0) > 0 ? 'preconsult' : 'info')}
                                        className="px-4 py-3 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle) booking-btn-secondary"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEncuadreNext}
                                        disabled={!policyAgreed || submitting}
                                        className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 booking-btn-primary"
                                    >
                                        {submitting ? <IconLoader2 size={16} className="animate-spin inline" /> : needsAdvancePaymentStep ? 'Continuar al pago' : 'Confirmar cita'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Payment instructions */}
                        {step === 'payment' && (
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="text-sm font-semibold booking-fg">Pago anticipado</p>
                                    {selectedService?.price ? (
                                        <span className="text-sm font-bold booking-fg">
                                            {formattedPrice(String(effectiveSessionPrice), selectedService.currency)}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-xs mb-4 booking-muted">
                                    {isRecurring
                                        ? `El pago inicial cubre la 1.ª sesión (${recurrenceCount} reservadas); las siguientes se coordinan con el profesional.`
                                        : 'Esta sesión requiere pago anticipado. Elige tu método de pago preferido.'}
                                </p>

                                {profile.advancePaymentInstructions ? (
                                    <div className="mb-4 rounded-xl border border-(--border) bg-(--bg-subtle) px-3.5 py-2.5 text-xs leading-relaxed booking-fg whitespace-pre-line">
                                        {profile.advancePaymentInstructions}
                                    </div>
                                ) : null}
                                <div className="flex flex-col gap-3 mb-5">
                                    {/* MercadoPago automatic checkout */}
                                    {profile.paymentMethods.mpConnected && effectiveSessionPrice > 0 && (
                                        <div className="rounded-xl border p-4 booking-subtle">
                                            <p className="text-xs font-semibold mb-1 booking-fg">MercadoPago</p>
                                            <p className="text-xs mb-3 booking-muted">
                                                Paga de forma segura con tarjeta, débito o efectivo. Tienes 30 minutos para completar el pago antes de que la hora se libere.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmit('mp')}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-mercadopago"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Pagar con Mercado Pago
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
                                            <button
                                                type="button"
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 booking-btn-primary"
                                                onClick={() => void handleSubmit('link')}
                                            >
                                                Ir a pagar
                                            </button>
                                        </div>
                                    )}

                                    {/* Bank transfer */}
                                    {(profile.paymentMethods.acceptsTransfer || profile.paymentMethods.bankTransferData) && (
                                        <div className="rounded-xl border p-4 booking-subtle">
                                            <p className="text-xs font-semibold mb-2 booking-fg">Transferencia bancaria</p>
                                            {profile.paymentMethods.bankTransferData ? (
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
                                            ) : (
                                                <p className="text-xs mb-3 booking-muted">
                                                    Al confirmar tu cita te enviaremos los datos de transferencia por correo.
                                                </p>
                                            )}
                                            <button
                                                onClick={() => void handleSubmit('transfer')}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-btn-primary"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Registrar cita pendiente de pago
                                            </button>
                                        </div>
                                    )}

                                    {/* Fallback: no methods configured but requiresAdvancePayment */}
                                    {!(profile.paymentMethods.mpConnected && effectiveSessionPrice > 0) && !profile.paymentMethods.paymentLinkUrl && !(profile.paymentMethods.acceptsTransfer || profile.paymentMethods.bankTransferData) && (
                                        <div className="rounded-xl border p-4 border-(--border)">
                                            <p className="text-xs mb-3 booking-muted">
                                                El profesional confirmará los detalles de pago contigo directamente.
                                            </p>
                                            <button
                                                onClick={() => void handleSubmit('manual')}
                                                disabled={submitting}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 booking-btn-primary"
                                            >
                                                {submitting ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                                Enviar solicitud
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {submitError && (
                                    <div className="mb-3 flex items-center gap-2 p-3 rounded-xl text-sm booking-error-banner">
                                        <IconAlertCircle size={14} /> {submitError}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setStep(bookingTermsText ? 'encuadre' : (selectedService?.preconsultFields?.length ?? 0) > 0 ? 'preconsult' : 'info')}
                                    className="w-full py-2.5 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle) booking-btn-secondary"
                                >
                                    Atrás
                                </button>
                            </div>
                        )}

                        {/* Step: Confirmed */}
                        {step === 'confirmed' && (
                            <div className="text-center py-4">
                                {isConfirmed && selectedSlot ? (
                                    <ReservationTicket
                                        time={formatTime(selectedSlot.startsAt, clientTz)}
                                        label={formatDate(selectedSlot.startsAt, clientTz)}
                                        className="agenda-ticket--wide mb-3 text-left"
                                    />
                                ) : checkingPayment ? (
                                    <p role="status" className="mb-4 booking-muted">Estamos consultando el estado del pago.</p>
                                ) : !isConfirmed && confirmedAppt ? (
                                    <div className="mb-4 flex items-start gap-3 rounded-card border border-(--color-warning-border) bg-(--color-warning-subtle) p-4 text-left">
                                        <IconClock size={20} className="mt-0.5 shrink-0 text-(--color-warning)" aria-hidden="true" />
                                        <div>
                                            <h3 className="booking-fg font-bold">{resultTitle}</h3>
                                            <p className="booking-secondary mt-1 text-sm">
                                                {cancelled
                                                    ? 'La cita fue cancelada. Puedes consultar al profesional si necesitas más detalles.'
                                                    : paymentPending
                                                        ? 'Tu cita quedó registrada. Se confirmará cuando se acredite el pago y se cumplan las condiciones de reserva.'
                                                        : 'El profesional revisará tu solicitud y te contactará pronto.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : isConfirmed ? (
                                    <p role="status" className="mb-4 booking-fg">El pago está registrado y tu cita quedó confirmada.</p>
                                ) : null}
                                {selectedSlot ? (
                                    <p className="booking-secondary mb-4 text-sm">
                                        {!isConfirmed ? <span className="booking-fg block font-semibold">{formatDate(selectedSlot.startsAt, clientTz)}</span> : null}
                                        {isConfirmed ? 'Hasta las ' : `${formatTime(selectedSlot.startsAt, clientTz)} — `}
                                        {formatTime(selectedSlot.endsAt, clientTz)}
                                        {showDualTimezone ? (
                                            <span className="block text-xs font-normal booking-muted mt-1">
                                                {formatTime(selectedSlot.startsAt, professionalTz)} — {formatTime(selectedSlot.endsAt, professionalTz)} hora del profesional
                                            </span>
                                        ) : null}
                                    </p>
                                ) : null}
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
                                            Guarda este enlace. También te lo enviamos por correo con la confirmación.
                                        </p>
                                    </div>
                                )}
                                {confirmedAppt?.modality === 'online' && !confirmedAppt?.meetingUrl && (
                                    <div className="rounded-xl border p-3 mb-3 text-left text-xs booking-muted-box">
                                        El profesional te compartirá el enlace de la videollamada por correo.
                                    </div>
                                )}
                                {paymentError && <p role="alert" className="mb-3 rounded-xl px-3 py-2 text-sm booking-error-banner">{paymentError}</p>}
                                {paymentPending && paymentMethod === 'transfer' && profile.paymentMethods.bankTransferData && !cancelled && (
                                    <div className="mb-3 rounded-xl border p-3 text-left booking-subtle">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-semibold booking-fg">Datos para transferir</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const d = profile.paymentMethods.bankTransferData!;
                                                    const text = `${d.bank}\n${d.accountType}: ${d.accountNumber}\nTitular: ${d.holderName}\nRUT: ${d.holderRut}\nEmail: ${d.holderEmail}`;
                                                    void navigator.clipboard.writeText(text).then(() => {
                                                        setCopiedBank(true);
                                                        setTimeout(() => setCopiedBank(false), 1800);
                                                    }).catch(() => {});
                                                }}
                                                className="text-xs font-semibold underline underline-offset-2 booking-fg"
                                            >
                                                {copiedBank ? 'Copiado' : 'Copiar datos'}
                                            </button>
                                        </div>
                                        <p className="text-xs booking-muted">
                                            {profile.paymentMethods.bankTransferData.bank} · {profile.paymentMethods.bankTransferData.accountType} {profile.paymentMethods.bankTransferData.accountNumber} · {profile.paymentMethods.bankTransferData.holderName}
                                        </p>
                                    </div>
                                )}
                                {paymentPending && paymentMethod === 'mp' && !isDemo && !cancelled && !checkingPayment && (
                                    <button type="button" onClick={() => void reopenCheckout()} disabled={submitting}
                                        className="mb-3 min-h-11 w-full rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 booking-mercadopago">
                                        {submitting ? 'Abriendo Mercado Pago…' : 'Completar pago en Mercado Pago'}
                                    </button>
                                )}
                                {returnedAppointmentId && !checkingPayment && (paymentPending || paymentError) && (
                                    <button type="button" onClick={() => setPaymentRefresh((attempt) => attempt + 1)}
                                        className="mb-3 min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-semibold booking-btn-secondary">
                                        Verificar nuevamente
                                    </button>
                                )}
                                {isConfirmed && confirmedAppt && selectedSlot && !isDemo && (
                                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                        <button type="button"
                                            onClick={() => downloadCalendarEvent(confirmedAppt, selectedSlot, selectedService?.name ?? 'Cita de SimpleAgenda')}
                                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold booking-btn-secondary">
                                            <IconCalendarEvent size={16} aria-hidden /> Guardar en calendario
                                        </button>
                                        {confirmedAppt.modality === 'presential' && confirmedAppt.location?.trim() && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(confirmedAppt.location)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold booking-btn-secondary">
                                                <IconMapPin size={16} aria-hidden /> Cómo llegar
                                            </a>
                                        )}
                                    </div>
                                )}
                                {confirmedAppt && selectedSlot && !isDemo && !cancelled ? (
                                    <a
                                        href={buildWhatsAppClickUrl(
                                            null,
                                            buildBookingShareWaMessage({
                                                professionalName: profile.displayName,
                                                whenLabel: formatAppointmentWhenLabel(selectedSlot.startsAt, clientTz),
                                                serviceName: selectedService?.name,
                                                meetingUrl: confirmedAppt.meetingUrl,
                                                location: confirmedAppt.location,
                                                cancelUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/cancelar?appt=${encodeURIComponent(confirmedAppt.id)}&slug=${encodeURIComponent(profile.slug)}`,
                                            }),
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mb-3 inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                                        style={{ background: 'var(--brand-whatsapp)', color: 'var(--agenda-ink)' }}
                                    >
                                        <IconBrandWhatsapp size={16} />
                                        Guardar o compartir por WhatsApp
                                    </a>
                                ) : null}
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
            </PanelScrollModal>

        </>
    );
});
