'use client';

import type { ReactNode } from 'react';
import { IconBell, IconBrowser } from '@tabler/icons-react';
import { PanelButton, PanelNotice, PanelSwitch } from '@simple/ui/panel';
import { useSerenata } from '@/context/serenata-context';

function AlertSettingRow({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: typeof IconBell;
    title: string;
    description: string;
    action: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{description}</p>
                </div>
            </div>
            <div className="shrink-0 self-center">{action}</div>
        </div>
    );
}

export function SolicitudesInboxAlertsSettings({ embedded = false }: { embedded?: boolean }) {
    const {
        solicitudesSoundMuted,
        toggleSolicitudesSound,
        solicitudesBrowserNotificationsEnabled,
        solicitudesBrowserNotificationsSupported,
        solicitudesNotificationPermission,
        requestSolicitudesBrowserNotifications,
    } = useSerenata();

    const browserDenied = solicitudesNotificationPermission === 'denied';
    const browserGranted = solicitudesBrowserNotificationsEnabled;

    return (
        <div className={`space-y-3 ${embedded ? '' : 'rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/30 p-4'}`}>
            {!embedded ? (
                <div>
                    <p className="text-sm font-medium text-[var(--fg)]">Solicitudes del marketplace</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
                        Alertas en el panel cuando llega una solicitud pagada que debes responder.
                    </p>
                </div>
            ) : null}

            <AlertSettingRow
                icon={IconBell}
                title="Sonido al llegar solicitud"
                description="Campana breve mientras usas el panel (no requiere permiso del navegador)."
                action={
                    <PanelSwitch
                        checked={!solicitudesSoundMuted}
                        onChange={() => toggleSolicitudesSound()}
                        ariaLabel="Sonido al llegar solicitud"
                    />
                }
            />

            {solicitudesBrowserNotificationsSupported ? (
                <div className="space-y-2">
                    <AlertSettingRow
                        icon={IconBrowser}
                        title="Avisos del navegador"
                        description="Notificación del sistema si la pestaña no está activa."
                        action={
                            !browserGranted && !browserDenied ? (
                                <PanelButton
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="shrink-0"
                                    onClick={() => void requestSolicitudesBrowserNotifications()}
                                >
                                    Activar avisos
                                </PanelButton>
                            ) : (
                                <PanelSwitch
                                    checked={browserGranted}
                                    onChange={() => {
                                        if (!browserGranted) {
                                            void requestSolicitudesBrowserNotifications();
                                        }
                                    }}
                                    ariaLabel="Avisos del navegador"
                                    disabled={browserGranted || browserDenied}
                                />
                            )
                        }
                    />
                    {browserGranted ? (
                        <p className="px-1 text-xs text-[var(--fg-muted)]">Activado en este navegador.</p>
                    ) : null}
                    {browserDenied ? (
                        <PanelNotice tone="warning" className="text-xs">
                            Los avisos están bloqueados. Actívalos en la configuración de sitios de tu navegador para
                            simpleserenatas.app.
                        </PanelNotice>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
