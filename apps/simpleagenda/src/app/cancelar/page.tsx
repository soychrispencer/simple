'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    cancelPublicAppointment,
    fetchPublicRescheduleAvailability,
    reschedulePublicAppointment,
    type PublicRescheduleAvailability,
    type TimeSlot,
} from '@/lib/agenda-api';
import { IconCalendarX, IconCheck, IconLoader2, IconAlertCircle, IconCalendarEvent } from '@tabler/icons-react';

function CancelPage() {
    const params = useSearchParams();
    const appointmentId = params.get('appt') ?? '';
    const slug = params.get('slug') ?? '';

    const [state, setState] = useState<'idle' | 'loading' | 'rescheduling' | 'done' | 'error'>('idle');
    const [reason, setReason] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [appointmentPreview, setAppointmentPreview] = useState<{
        startsAt: string;
        timezone: string;
    } | null>(null);

    useEffect(() => {
        if (!slug || !appointmentId) return;
        let active = true;
        void fetchPublicRescheduleAvailability(slug, appointmentId)
            .then((data) => {
                if (!active || !data.ok || !data.startsAt) return;
                setAppointmentPreview({
                    startsAt: data.startsAt,
                    timezone: data.timezone ?? 'America/Santiago',
                });
            })
            .catch(() => {});
        return () => { active = false; };
    }, [slug, appointmentId]);

    const handleCancel = async () => {
        if (!appointmentId) return;
        setState('loading');
        try {
            const res = await cancelPublicAppointment(appointmentId, reason);
            if (!res.ok) throw new Error(res.error ?? 'No se pudo cancelar la cita.');
            setState('done');
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'No se pudo cancelar la cita.');
            setState('error');
        }
    };

    const [availability, setAvailability] = useState<PublicRescheduleAvailability | null>(null);
    const [date, setDate] = useState('');
    const [slot, setSlot] = useState<TimeSlot | null>(null);
    const [busy, setBusy] = useState(false);
    const [rescheduledAt, setRescheduledAt] = useState('');

    const loadAvailability = async (nextDate?: string) => {
        setDate(nextDate ?? '');
        setSlot(null);
        setErrorMsg('');
        setBusy(true);
        try {
            const result = await fetchPublicRescheduleAvailability(slug, appointmentId, nextDate);
            if (!result.ok) throw new Error(result.error ?? 'No se pudieron consultar los horarios.');
            setAvailability(result);
        } catch (error) {
            setAvailability((previous) => previous && { ...previous, slots: [] });
            const message = error instanceof Error ? error.message : 'No se pudieron consultar los horarios.';
            setErrorMsg(message);
            if (!nextDate) setState('error');
        } finally {
            setBusy(false);
        }
    };

    const handleReschedule = async () => {
        if (!appointmentId || !slug) return;
        setState('rescheduling');
        await loadAvailability();
    };

    const confirmNewSlot = async () => {
        if (!slot || !availability?.startsAt) return;
        setBusy(true);
        setErrorMsg('');
        try {
            const result = await reschedulePublicAppointment(slug, appointmentId, availability.startsAt, slot.startsAt);
            if (!result.ok || !result.startsAt) throw new Error(result.error ?? 'No se pudo confirmar el nuevo horario.');
            setRescheduledAt(result.startsAt);
        } catch (error) {
            setSlot(null);
            setErrorMsg(error instanceof Error ? error.message : 'No se pudo confirmar el nuevo horario.');
        } finally {
            setBusy(false);
        }
    };

    const formatSlot = (startsAt: string, timeOnly = false) => new Intl.DateTimeFormat('es-CL', {
        ...(timeOnly ? { timeStyle: 'short' } : { dateStyle: 'full', timeStyle: 'short' }),
        timeZone: availability?.timezone ?? 'America/Santiago',
    }).format(new Date(startsAt));

    if (!appointmentId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <IconAlertCircle size={48} className="mx-auto mb-4 text-(--color-error)" aria-hidden="true" />
                    <h1 className="text-xl font-bold mb-2">Enlace inválido</h1>
                    <p className="text-sm text-[var(--fg-muted)]">El enlace de cancelación no es válido. Por favor contacta al profesional.</p>
                </div>
            </div>
        );
    }

    if (state === 'rescheduling') {
        return (
            <main className="min-h-screen bg-(--bg) flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--surface) p-6 sm:p-8">
                    {rescheduledAt ? (
                        <>
                            <IconCheck size={32} aria-hidden="true" className="mb-3 text-(--color-success)" />
                            <h1 className="mb-2 text-xl font-bold">Cita reprogramada</h1>
                            <p className="text-sm text-(--fg-muted)">{formatSlot(rescheduledAt)}</p>
                            <a href={`/${encodeURIComponent(slug)}`} className="mt-4 inline-block text-sm font-semibold underline">Volver al perfil</a>
                        </>
                    ) : (
                        <>
                            <h1 className="mb-2 text-xl font-bold">Elige otro horario</h1>
                            <p className="mb-5 text-sm text-(--fg-muted)">Tu cita conserva su horario hasta que confirmes el cambio.</p>
                            {availability?.startsAt && (
                                <p className="mb-5 rounded-xl bg-(--bg-subtle) p-3 text-sm">
                                    <strong className="block">Horario actual</strong>
                                    {formatSlot(availability.startsAt)}
                                </p>
                            )}
                            {errorMsg && <p role="alert" className="mb-4 rounded-xl bg-(--color-error-subtle) p-3 text-sm text-(--color-error)">{errorMsg}</p>}
                            <label htmlFor="next-date" className="mb-1 block text-sm font-medium">Nueva fecha</label>
                            <input id="next-date" type="date" min={availability?.minimumDate} max={availability?.maximumDate}
                                value={date} onChange={(event) => {
                                    if (event.target.value) void loadAvailability(event.target.value);
                                    else { setDate(''); setSlot(null); }
                                }} disabled={busy}
                                className="mb-4 w-full rounded-xl border border-(--border) bg-(--bg) p-3 text-sm" />
                            {busy && <p className="mb-4 text-sm text-(--fg-muted)" role="status">Consultando la agenda…</p>}
                            {!busy && date && !availability?.slots?.length && !errorMsg && (
                                <p className="mb-4 text-sm text-(--fg-muted)">No hay horarios disponibles para esta fecha.</p>
                            )}
                            {date && !!availability?.slots?.length && (
                                <div role="group" aria-label="Horas disponibles" className="mb-5 grid grid-cols-3 gap-2">
                                    {availability.slots.map((candidate) => {
                                        const active = candidate.startsAt === slot?.startsAt;
                                        return (
                                            <button key={candidate.startsAt} onClick={() => setSlot(candidate)} aria-pressed={active}
                                                className={`rounded-xl border p-2.5 text-sm font-semibold ${active ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)' : 'border-(--border)'}`}
                                                disabled={busy}>{formatSlot(candidate.startsAt, true)}</button>
                                        );
                                    })}
                                </div>
                            )}
                            <button onClick={() => void confirmNewSlot()} disabled={busy || !slot}
                                className="w-full rounded-xl bg-(--accent) p-3 text-sm font-semibold text-(--accent-contrast) disabled:opacity-60">
                                Confirmar nuevo horario
                            </button>
                            <button disabled={busy} onClick={() => { setState('idle'); setErrorMsg(''); }}
                                className="mt-3 w-full rounded-xl p-3 text-sm text-(--fg-muted)">
                                Volver sin cambiar la cita
                            </button>
                        </>
                    )}
                </div>
            </main>
        );
    }

    if (state === 'done') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-card bg-(--color-success-subtle) text-(--color-success)">
                        <IconCheck size={32} aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold mb-2">Cita cancelada</h1>
                    <p className="text-sm text-[var(--fg-muted)]">Tu cita ha sido cancelada correctamente. Si tenías un correo de confirmación, ya no aplica.</p>
                    {slug && (
                        <a
                            href={`/${encodeURIComponent(slug)}`}
                            className="mt-6 inline-block px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            Reservar nueva cita
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-md rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: 'var(--color-error-subtle)' }}>
                    <IconCalendarX size={28} className="text-(--color-error)" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--fg)' }}>Cancelar o reprogramar</h1>
                <p className="text-sm text-center mb-5" style={{ color: 'var(--fg-muted)' }}>
                    Elige si quieres cancelar tu cita o cambiar a otra fecha.
                </p>

                {appointmentPreview ? (
                    <div className="mb-5 rounded-xl border p-3.5 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                        <p className="text-xs font-medium capitalize" style={{ color: 'var(--fg)' }}>
                            {new Date(appointmentPreview.startsAt).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: appointmentPreview.timezone })}
                            {' · '}
                            {new Date(appointmentPreview.startsAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: appointmentPreview.timezone })}
                        </p>
                    </div>
                ) : null}

                {state === 'error' && (
                    <div role="alert" className="mb-4 rounded-button border border-(--color-error-border) bg-(--color-error-subtle) p-3 text-sm text-(--color-error)">
                        {errorMsg}
                    </div>
                )}

                <div className="mb-4">
                    <label htmlFor="cancel-reason" className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        Motivo <span style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                    </label>
                    <textarea
                        id="cancel-reason"
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2 text-sm resize-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                        placeholder="Ej: Cambio de horario, enfermedad, etc."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={state === 'loading'}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    {slug ? (
                        <button
                            onClick={() => void handleReschedule()}
                            disabled={state === 'loading'}
                            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            <IconCalendarEvent size={16} aria-hidden="true" />
                            Cambiar a otra fecha
                        </button>
                    ) : (
                        <p className="text-center text-xs py-1" style={{ color: 'var(--fg-muted)' }}>
                            Para reprogramar, abre este enlace desde tu correo de confirmación.
                        </p>
                    )}
                    <button
                        onClick={() => void handleCancel()}
                        disabled={state === 'loading'}
                        className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 border"
                        style={{ borderColor: 'var(--color-error-border)', background: 'transparent', color: 'var(--color-error)' }}
                    >
                        {state === 'loading' && <IconLoader2 size={16} className="animate-spin" />}
                        {state === 'loading' ? 'Cancelando...' : 'Cancelar definitivamente'}
                    </button>
                </div>

                {slug && (
                    <a
                        href={`/${encodeURIComponent(slug)}`}
                        className="mt-4 block text-center text-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Volver sin hacer cambios
                    </a>
                )}
            </div>
        </div>
    );
}

export default function CancelPageWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <IconLoader2 size={32} className="animate-spin text-[var(--fg-faint)]" />
            </div>
        }>
            <CancelPage />
        </Suspense>
    );
}
