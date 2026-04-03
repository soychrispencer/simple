'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { cancelPublicAppointment } from '@/lib/agenda-api';
import { IconCalendarX, IconCheck, IconLoader2, IconAlertCircle } from '@tabler/icons-react';

function CancelPage() {
    const params = useSearchParams();
    const appointmentId = params.get('appt') ?? '';
    const slug = params.get('slug') ?? '';

    const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [reason, setReason] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleCancel = async () => {
        if (!appointmentId) return;
        setState('loading');
        const res = await cancelPublicAppointment(appointmentId, reason);
        if (res.ok) {
            setState('done');
        } else {
            setErrorMsg(res.error ?? 'No se pudo cancelar la cita.');
            setState('error');
        }
    };

    if (!appointmentId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <IconAlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h1 className="text-xl font-bold mb-2">Enlace inválido</h1>
                    <p className="text-sm text-gray-500">El enlace de cancelación no es válido. Por favor contacta al profesional.</p>
                </div>
            </div>
        );
    }

    if (state === 'done') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <IconCheck size={32} className="text-green-600" />
                    </div>
                    <h1 className="text-xl font-bold mb-2">Cita cancelada</h1>
                    <p className="text-sm text-gray-500">Tu cita ha sido cancelada correctamente. Recibirás una confirmación por WhatsApp.</p>
                    {slug && (
                        <a
                            href={`/${slug}`}
                            className="mt-6 inline-block px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                            Reservar nueva cita
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-md rounded-2xl border p-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <IconCalendarX size={28} className="text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--fg)' }}>Cancelar cita</h1>
                <p className="text-sm text-center mb-6" style={{ color: 'var(--fg-muted)' }}>
                    ¿Estás seguro que deseas cancelar esta cita? Esta acción no se puede deshacer.
                </p>

                {state === 'error' && (
                    <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        Motivo de cancelación <span style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                    </label>
                    <textarea
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2 text-sm resize-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                        placeholder="Ej: Cambio de horario, enfermedad, etc."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={state === 'loading'}
                    />
                </div>

                <button
                    onClick={() => void handleCancel()}
                    disabled={state === 'loading'}
                    className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: '#ef4444', color: '#fff' }}
                >
                    {state === 'loading' && <IconLoader2 size={16} className="animate-spin" />}
                    Confirmar cancelación
                </button>

                {slug && (
                    <a
                        href={`/${slug}`}
                        className="mt-3 block text-center text-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Volver sin cancelar
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
                <IconLoader2 size={32} className="animate-spin text-gray-400" />
            </div>
        }>
            <CancelPage />
        </Suspense>
    );
}
