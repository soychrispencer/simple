'use client';

import { IconBell, IconBrowser } from '@tabler/icons-react';
import {
    BusinessOperationalAlertSettingRow,
    PanelButton,
    PanelNotice,
    PanelSwitch,
} from '@simple/ui/panel';
import { useSerenata } from '@/context/serenata-context';

export function SolicitudesInboxAlertsSettings() {
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
        <>
            <BusinessOperationalAlertSettingRow
                icon={IconBell}
                title="Sonido al llegar solicitud"
                description="Campana breve cuando entra una solicitud pagada que requiere tu acción (responder, coordinar horario o asignar grupo)."
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
                    <BusinessOperationalAlertSettingRow
                        icon={IconBrowser}
                        title="Avisos del navegador"
                        description="Notificación del sistema si la pestaña no está activa y llega una solicitud nueva."
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
                        <p className="px-1 text-xs text-fg-muted">Activado en este navegador.</p>
                    ) : null}
                    {browserDenied ? (
                        <PanelNotice tone="warning" className="text-xs">
                            Los avisos están bloqueados. Actívalos en la configuración de sitios de tu navegador para
                            simpleserenatas.app.
                        </PanelNotice>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
