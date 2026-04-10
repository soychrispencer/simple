'use client';

import { Suspense, useEffect, useState } from 'react';
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
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
} from '@simple/ui';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    fetchGoogleCalendarStatus,
    getGoogleCalendarAuthUrl,
    disconnectGoogleCalendar,
    sendWhatsAppTest,
    type AgendaProfile,
} from '@/lib/agenda-api';

function IntegracionesPageInner() {
    const searchParams = useSearchParams();
    const gcParam = searchParams.get('gc');

    const [loading, setLoading] = useState(true);

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
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Integraciones"
                description="Conecta tus herramientas y configura las notificaciones."
            />

            {flash && (
                <div className="mb-6">
                    <PanelNotice tone={flash.type === 'success' ? 'success' : 'error'}>
                        <span className="flex items-center gap-2">
                            {flash.type === 'success' ? <IconCheck size={15} /> : <IconX size={15} />}
                            {flash.message}
                        </span>
                    </PanelNotice>
                </div>
            )}

            <div className="flex flex-col gap-4">

                {/* WhatsApp */}
                <PanelCard size="md">
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
                                <PanelSwitch
                                    checked={waEnabled}
                                    onChange={setWaEnabled}
                                    ariaLabel="Activar notificaciones de WhatsApp"
                                />
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

                                    {/* Notificaciones a pacientes */}
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

                                    <div style={{ height: 1, background: 'var(--border)' }} />

                                    {/* Alertas para el profesional */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Alertas para ti</p>
                                            <PanelSwitch
                                                checked={waNotifyProf}
                                                onChange={setWaNotifyProf}
                                                size="sm"
                                                ariaLabel="Recibir alertas por WhatsApp"
                                            />
                                        </div>
                                        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                            Recibe un WhatsApp cada vez que un paciente reserve una cita nueva.
                                        </p>
                                        {waNotifyProf && (
                                            <PanelField
                                                label="Tu número de WhatsApp para alertas"
                                                hint="Si lo dejas vacío se usará el WhatsApp de tu perfil público."
                                            >
                                                <input
                                                    type="tel"
                                                    value={waProfPhone}
                                                    onChange={(e) => setWaProfPhone(e.target.value)}
                                                    placeholder="+56 9 1234 5678"
                                                    className="form-input"
                                                />
                                            </PanelField>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                                        <PanelButton
                                            variant="accent"
                                            size="sm"
                                            onClick={() => void handleSaveWa()}
                                            disabled={waSaving}
                                        >
                                            {waSaving
                                                ? <IconLoader2 size={13} className="animate-spin" />
                                                : waSaved
                                                    ? <IconCheck size={13} />
                                                    : null}
                                            {waSaving ? 'Guardando...' : waSaved ? 'Guardado' : 'Guardar'}
                                        </PanelButton>

                                        <PanelButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => void handleTest()}
                                            disabled={waTesting}
                                        >
                                            {waTesting
                                                ? <IconLoader2 size={13} className="animate-spin" />
                                                : <IconSend size={13} />}
                                            Enviar prueba
                                        </PanelButton>

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
                </PanelCard>

                {/* Google Calendar */}
                <PanelCard size="md">
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
                                    <div>
                                        <PanelButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => void handleDisconnectGc()}
                                            disabled={disconnecting}
                                        >
                                            {disconnecting ? <IconLoader2 size={14} className="animate-spin" /> : <IconX size={14} />}
                                            Desconectar
                                        </PanelButton>
                                    </div>
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
                </PanelCard>

            </div>
        </div>
    );
}

export default function IntegracionesPage() {
    return (
        <Suspense fallback={
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        }>
            <IntegracionesPageInner />
        </Suspense>
    );
}
