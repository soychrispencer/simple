'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    IconBrandWhatsapp,
    IconCheck,
    IconRefresh,
    IconShieldCheck,
    IconAlertTriangle,
} from '@tabler/icons-react';
import {
    PanelButton,
    PanelCard,
    PanelNotice,
    PanelPageHeader,
    PanelStatusBadge,
} from '@simple/ui/panel';
import {
    completeAdminWhatsAppCoexistence,
    fetchAdminWhatsAppConnectionStatus,
    type AdminSessionUser,
    type AdminWhatsAppConnectionStatus,
} from '@/lib/api';

// These are public Meta identifiers. Environment overrides are useful for a separate staging app.
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID?.trim() || '1220805133562499';
const META_CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || '2002982174471698';
const META_SDK_VERSION = 'v27.0';

type WhatsAppEmbeddedSignupSession = {
    wabaId: string;
    phoneNumberId?: string;
};

type FacebookLoginResponse = {
    authResponse?: { code?: string };
    status?: string;
};

type FacebookSdk = {
    init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
    login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
            config_id: string;
            response_type: 'code';
            override_default_response_type: true;
            extras: { setup: Record<string, never>; featureType: 'whatsapp_business_app_onboarding'; sessionInfoVersion: '3' };
        },
    ) => void;
};

declare global {
    interface Window {
        FB?: FacebookSdk;
        fbAsyncInit?: () => void;
    }
}

function connectionLabel(status: AdminWhatsAppConnectionStatus | null) {
    if (!status) return { label: 'Comprobando', tone: 'neutral' as const };
    if (status.connected) return { label: 'Conectado', tone: 'success' as const };
    if (status.error === 'meta_unavailable') return { label: 'No verificado', tone: 'warning' as const };
    if (!status.configured) return { label: 'Requiere configuración', tone: 'warning' as const };
    return { label: 'Pendiente de coexistencia', tone: 'info' as const };
}

function statusValue(value: string | boolean | null | undefined) {
    if (value === true) return 'Sí';
    if (value === false) return 'No';
    if (typeof value === 'string' && value) return value.replaceAll('_', ' ');
    return 'Sin dato';
}

export function AdminWhatsAppSetup({ user }: { user: AdminSessionUser }) {
    const [status, setStatus] = useState<AdminWhatsAppConnectionStatus | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const codeRef = useRef('');
    const sessionRef = useRef<WhatsAppEmbeddedSignupSession | null>(null);
    const finishingRef = useRef(false);
    const finishRef = useRef<() => Promise<void>>(async () => undefined);

    const refreshStatus = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setStatus(await fetchAdminWhatsAppConnectionStatus());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo consultar el estado real del número.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void refreshStatus(); }, [refreshStatus]);

    useEffect(() => {
        let cancelled = false;
        const initialize = () => {
            if (cancelled || !window.FB) return;
            window.FB.init({ appId: META_APP_ID, cookie: false, xfbml: false, version: META_SDK_VERSION });
            setSdkReady(true);
        };

        window.fbAsyncInit = initialize;
        if (window.FB) {
            initialize();
        } else if (!document.querySelector('script[data-simple-meta-sdk="true"]')) {
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/es_LA/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.dataset.simpleMetaSdk = 'true';
            script.onerror = () => setError('No se pudo cargar el inicio de sesión seguro de Meta. Revisa la conexión e inténtalo de nuevo.');
            document.head.appendChild(script);
        }

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return;
            let payload = event.data as Record<string, unknown> | null;
            if (typeof event.data === 'string') {
                try { payload = JSON.parse(event.data) as Record<string, unknown>; } catch { return; }
            }
            if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

            const eventName = typeof payload.event === 'string' ? payload.event : '';
            const data = payload.data && typeof payload.data === 'object'
                ? payload.data as Record<string, unknown>
                : {};
            if (eventName === 'FINISH' || eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
                const wabaId = String(data.waba_id ?? data.wabaId ?? '');
                const rawPhoneNumberId = data.phone_number_id ?? data.phoneNumberId;
                const phoneNumberId = typeof rawPhoneNumberId === 'string' ? rawPhoneNumberId : undefined;
                if (!/^\d{5,30}$/.test(wabaId) || (phoneNumberId && !/^\d{5,30}$/.test(phoneNumberId))) {
                    setError('Meta terminó el registro, pero no entregó un identificador válido de la cuenta. Actualiza el estado y vuelve a conectar.');
                    return;
                }
                sessionRef.current = { wabaId, phoneNumberId };
                setMessage('Cuenta autorizada. Finalizando la conexión de WhatsApp…');
                void finishRef.current();
            } else if (eventName === 'CANCEL') {
                codeRef.current = '';
                sessionRef.current = null;
                setConnecting(false);
                setMessage('El registro se canceló antes de terminar.');
            } else if (eventName === 'ERROR') {
                codeRef.current = '';
                sessionRef.current = null;
                finishingRef.current = false;
                setConnecting(false);
                setError('Meta informó un error durante el registro. Vuelve a intentarlo y confirma que elegiste el número de SimplePlataforma.');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    finishRef.current = async () => {
        const code = codeRef.current;
        const session = sessionRef.current;
        if (!code || !session || finishingRef.current) return;
        finishingRef.current = true;
        codeRef.current = '';
        sessionRef.current = null;
        setConnecting(true);
        setError('');
        try {
            const result = await completeAdminWhatsAppCoexistence({
                code,
                wabaId: session.wabaId,
                phoneNumberId: session.phoneNumberId,
            });
            setStatus(result.connection);
            setMessage(result.connection.connected
                ? 'WhatsApp Business quedó conectado a Cloud API y el webhook está suscrito.'
                : 'Meta aceptó la suscripción del webhook. El número todavía no aparece conectado a Cloud API; actualiza el estado después de confirmar el paso pendiente en WhatsApp Business.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo completar la conexión con Meta.');
        } finally {
            finishingRef.current = false;
            setConnecting(false);
        }
    };

    const beginSignup = () => {
        if (!window.FB || !sdkReady) {
            setError('El inicio de sesión de Meta todavía está cargando. Espera un momento y vuelve a intentarlo.');
            return;
        }
        codeRef.current = '';
        sessionRef.current = null;
        setMessage('Se abrirá el flujo oficial de Meta. Selecciona la cuenta de SimplePlataforma y confirma el número en WhatsApp Business.');
        setError('');
        setConnecting(true);
        window.FB.login((response) => {
            const code = response.authResponse?.code;
            if (code) {
                codeRef.current = code;
                setMessage('Meta recibió la autorización. Revisa el mensaje oficial de Facebook Business en WhatsApp Business y confirma la conexión.');
                void finishRef.current();
            } else if (response.status !== 'connected') {
                setConnecting(false);
                setMessage('Meta cerró el flujo sin autorizar la conexión.');
            }
        }, {
            config_id: META_CONFIG_ID,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
                setup: {},
                featureType: 'whatsapp_business_app_onboarding',
                sessionInfoVersion: '3',
            },
        });
    };

    if (user.role !== 'superadmin') {
        return (
            <div className="container-app panel-page py-6">
                <PanelNotice tone="warning">La conexión del emisor de WhatsApp está disponible solo para superadministradores.</PanelNotice>
            </div>
        );
    }

    const connection = connectionLabel(status);

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="WhatsApp Cloud de SimpleAgenda"
                description="Administra el número emisor de Simple y verifica su conexión real con Meta."
                actions={<PanelButton variant="secondary" onClick={() => void refreshStatus()} disabled={loading || connecting}><IconRefresh size={16} /> Actualizar estado</PanelButton>}
            />

            {error ? <PanelNotice tone="error" className="mb-5">{error}</PanelNotice> : null}
            {message ? <PanelNotice tone={status?.connected ? 'success' : 'info'} className="mb-5">{message}</PanelNotice> : null}

            <PanelCard className="mb-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-subtle)] text-[#168c63]">
                            <IconBrandWhatsapp size={27} stroke={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-lg font-semibold text-[var(--fg)]">Emisor de SimplePlataforma</h2>
                                <PanelStatusBadge label={connection.label} tone={connection.tone} />
                            </div>
                            <p className="mt-1 text-sm text-[var(--fg-muted)]">
                                {status?.phoneNumber || '+56 9 7862 3828'}{status?.verifiedName ? ` · ${status.verifiedName}` : ''}
                            </p>
                        </div>
                    </div>
                    {status?.connected ? <IconCheck className="text-emerald-600" size={22} /> : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatusTile label="Modo de la cuenta" value={statusValue(status?.accountMode)} />
                    <StatusTile label="Plataforma" value={statusValue(status?.platformType)} />
                    <StatusTile label="WhatsApp Business App" value={statusValue(status?.businessAppConnected)} />
                    <StatusTile label="Webhook" value={status?.webhookConfigured ? 'Verificado y configurado' : 'Requiere configuración'} />
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--fg-muted)]">
                    <span>Recordatorios activos: {status?.remindersEnabled ? 'Sí' : 'No'}</span>
                    <span>Calidad del número: {statusValue(status?.qualityRating)}</span>
                    {status?.checkedAt ? <span>Revisado: {new Date(status.checkedAt).toLocaleString('es-CL')}</span> : null}
                </div>
            </PanelCard>

            <PanelCard className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-[var(--fg-secondary)]"><IconShieldCheck size={21} /></div>
                    <div>
                        <h2 className="text-base font-semibold text-[var(--fg)]">Conectar por coexistencia</h2>
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--fg-muted)]">
                            Este flujo oficial enlaza el número que ya usas en WhatsApp Business con Cloud API, sin registrar otro número. No importa contactos ni historial. La conexión no enviará mensajes mientras los recordatorios sigan desactivados.
                        </p>
                    </div>
                </div>

                {!status?.connected ? (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <PanelButton onClick={beginSignup} disabled={!sdkReady || connecting || loading || !status?.configured}>
                            <IconBrandWhatsapp size={17} />
                            {connecting ? 'Conectando…' : 'Conectar WhatsApp Business'}
                        </PanelButton>
                        {!sdkReady ? <span className="text-xs text-[var(--fg-muted)]">Cargando inicio seguro de Meta…</span> : null}
                    </div>
                ) : (
                    <PanelNotice tone="success" className="mt-5">
                        El número aparece en Cloud API y mantiene su conexión con WhatsApp Business App. El envío de recordatorios sigue apagado hasta activar el servicio.
                    </PanelNotice>
                )}

                {status?.error === 'meta_unavailable' ? (
                    <PanelNotice tone="warning" className="mt-4"><IconAlertTriangle size={16} /> Meta no respondió al chequeo. La integración no se considera lista y los recordatorios no se enviarán.</PanelNotice>
                ) : null}
                {status?.error === 'missing_configuration' ? (
                    <PanelNotice tone="warning" className="mt-4"><IconAlertTriangle size={16} /> Faltan credenciales o identificadores en el servicio de API; el alta está pausada para evitar enlazar una cuenta incorrecta.</PanelNotice>
                ) : null}
            </PanelCard>
        </div>
    );
}

function StatusTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">{label}</p>
            <p className="mt-1 text-sm font-medium capitalize text-[var(--fg)]">{value}</p>
        </div>
    );
}
