'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconBrandGoogle,
    IconCheck,
    IconLoader2,
    IconX,
    IconCalendar,
    IconBrandWhatsapp,
    IconSend,
    IconAlertCircle,
} from '@tabler/icons-react';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    fetchGoogleCalendarStatus,
    getGoogleCalendarAuthUrl,
    disconnectGoogleCalendar,
    sendWhatsAppTest,
    type AgendaProfile,
} from '@/lib/agenda-api';

export default function IntegracionesPage() {
    const searchParams = useSearchParams();
    const gcParam = searchParams.get('gc');

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);

    // Google Calendar
    const [gcConnected, setGcConnected] = useState(false);
    const [gcCalendarId, setGcCalendarId] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);

    // WhatsApp prefs (local form state)
    const [waEnabled, setWaEnabled] = useState(true);
    const [waNotifyProf, setWaNotifyProf] = useState(true);
    const [waProfPhone, setWaProfPhone] = useState('');
    const [waSaving, setWaSaving] = useState(false);
    const [waSaved, setWaSaved] = useState(false);
    const [waTesting, setWaTesting] = useState(false);
    const [waTestResult, setWaTestResult] = useState<'ok' | 'error' | null>(null);

    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (gcParam === 'connected') setFlash({ type: 'success', message: 'Google Calendar conectado correctamente.' });
        else if (gcParam === 'error') setFlash({ type: 'error', message: 'Error al conectar con Google Calendar.' });

        const load = async () => {
            const [prof, gcStatus] = await Promise.all([
                fetchAgendaProfile(),
                fetchGoogleCalendarStatus(),
            ]);
            if (prof) {
                setProfile(prof);
                setWaEnabled(prof.waNotificationsEnabled ?? true);
                setWaNotifyProf(prof.waNotifyProfessional ?? true);
                setWaProfPhone(prof.waProfessionalPhone ?? '');
            }
            setGcConnected(gcStatus.connected);
            setGcCalendarId(gcStatus.calendarId);
            setLoading(false);
        };
        void load();
    }, [gcParam]);

    const handleSaveWa = async () => {
        setWaSaving(true);
        setWaSaved(false);
        await saveAgendaProfile({
            waNotificationsEnabled: waEnabled,
            waNotifyProfessional: waNotifyProf,
            waProfessionalPhone: waProfPhone || null,
        } as Partial<AgendaProfile>);
        setWaSaving(false);
        setWaSaved(true);
        setTimeout(() => setWaSaved(false), 2500);
    };

    const handleTest = async () => {
        setWaTesting(true);
        setWaTestResult(null);
        const result = await sendWhatsAppTest();
        setWaTesting(false);
        setWaTestResult(result.ok ? 'ok' : 'error');
        setTimeout(() => setWaTestResult(null), 4000);
    };

    const handleDisconnectGc = async () => {
        setDisconnecting(true);
        await disconnectGoogleCalendar();
        setGcConnected(false);
        setGcCalendarId(null);
        setDisconnecting(false);
        setFlash({ type: 'success', message: 'Google Calendar desconectado.' });
    };

    return (
        <div className="p-6 max-w-2xl">
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Integraciones</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Conecta tus herramientas y configura las notificaciones.
            </p>

            {flash && (
                <div
                    className="flex items-center gap-2 p-3 rounded-xl text-sm mb-6"
                    style={{
                        background: flash.type === 'success' ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.1)',
                        color: flash.type === 'success' ? 'var(--accent)' : '#dc2626',
                    }}
                >
                    {flash.type === 'success' ? <IconCheck size={15} /> : <IconX size={15} />}
                    {flash.message}
                </div>
            )}

            <div className="flex flex-col gap-4">

                {/* WhatsApp */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}
                        >
                            <IconBrandWhatsapp size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>WhatsApp</h2>
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                                    >
                                        <IconCheck size={10} /> Activo
                                    </span>
                                </div>
                                {/* Global toggle */}
                                <button
                                    onClick={() => setWaEnabled(!waEnabled)}
                                    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                                    style={{ background: waEnabled ? 'var(--accent)' : 'var(--border)' }}
                                >
                                    <span
                                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                                        style={{ transform: waEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                                    />
                                </button>
                            </div>
                            <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                                Los mensajes salen desde <strong>SimplePlataforma</strong>. Los pacientes los reciben en su WhatsApp personal.
                            </p>

                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Cargando configuración...
                                </div>
                            ) : (
                                <div className={`flex flex-col gap-5 transition-opacity ${!waEnabled ? 'opacity-40 pointer-events-none' : ''}`}>

                                    {/* Notifications to patients — always on, informational */}
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Notificaciones a pacientes</p>
                                        <div className="flex flex-col gap-1.5">
                                            {[
                                                'Confirmación de cita',
                                                'Recordatorio 24 horas antes',
                                                'Recordatorio 30 minutos antes',
                                                'Aviso de cancelación',
                                            ].map((label) => (
                                                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                    <IconCheck size={12} style={{ color: 'var(--accent)' }} />
                                                    {label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: 1, background: 'var(--border)' }} />

                                    {/* Notifications to professional */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Alertas para ti</p>
                                            <button
                                                onClick={() => setWaNotifyProf(!waNotifyProf)}
                                                className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                                                style={{ background: waNotifyProf ? 'var(--accent)' : 'var(--border)' }}
                                            >
                                                <span
                                                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                                                    style={{ transform: waNotifyProf ? 'translateX(16px)' : 'translateX(0)' }}
                                                />
                                            </button>
                                        </div>
                                        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                            Recibe un WhatsApp cada vez que un paciente reserve una cita nueva.
                                        </p>
                                        {waNotifyProf && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                                    Tu número de WhatsApp para alertas
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={waProfPhone}
                                                    onChange={(e) => setWaProfPhone(e.target.value)}
                                                    placeholder="+56 9 1234 5678"
                                                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                                                    style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                                                />
                                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                    Si lo dejas vacío se usará el WhatsApp de tu perfil público.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            onClick={() => void handleSaveWa()}
                                            disabled={waSaving}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                            style={{ background: 'var(--accent)', color: '#fff' }}
                                        >
                                            {waSaving
                                                ? <IconLoader2 size={13} className="animate-spin" />
                                                : waSaved
                                                    ? <IconCheck size={13} />
                                                    : null}
                                            {waSaving ? 'Guardando...' : waSaved ? 'Guardado' : 'Guardar'}
                                        </button>

                                        <button
                                            onClick={() => void handleTest()}
                                            disabled={waTesting}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            {waTesting
                                                ? <IconLoader2 size={13} className="animate-spin" />
                                                : <IconSend size={13} />}
                                            Enviar prueba
                                        </button>

                                        {waTestResult === 'ok' && (
                                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                                                <IconCheck size={13} /> Mensaje enviado
                                            </span>
                                        )}
                                        {waTestResult === 'error' && (
                                            <span className="flex items-center gap-1 text-xs" style={{ color: '#dc2626' }}>
                                                <IconAlertCircle size={13} /> Error al enviar
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Google Calendar */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(66,133,244,0.1)', color: '#4285F4' }}
                        >
                            <IconCalendar size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Google Calendar</h2>
                                {!loading && gcConnected && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                                    >
                                        <IconCheck size={10} /> Conectado
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Sincroniza tus citas automáticamente. Cada reserva o cancelación se refleja en tu calendario.
                            </p>

                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Verificando conexión...
                                </div>
                            ) : gcConnected ? (
                                <div className="flex flex-col gap-3">
                                    {gcCalendarId && (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            Calendario: <span style={{ color: 'var(--fg)' }}>{gcCalendarId}</span>
                                        </p>
                                    )}
                                    <button
                                        onClick={() => void handleDisconnectGc()}
                                        disabled={disconnecting}
                                        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        {disconnecting ? <IconLoader2 size={14} className="animate-spin" /> : <IconX size={14} />}
                                        Desconectar
                                    </button>
                                </div>
                            ) : (
                                <a
                                    href={getGoogleCalendarAuthUrl()}
                                    className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                                    style={{ background: '#4285F4', color: '#fff' }}
                                >
                                    <IconBrandGoogle size={15} />
                                    Conectar con Google
                                </a>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
