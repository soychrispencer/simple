'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBell, IconBrowser, IconCalendarEvent, IconUserX } from '@tabler/icons-react';
import {
    BusinessOperationalAlertSettingRow,
    BusinessOperationalAlertsSubsection,
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelNotice,
    PanelSwitch,
    BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION,
    BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION,
    BUSINESS_OPERATIONAL_ALERTS_SECTION,
} from '@simple/ui/panel';
import {
    accountNotificationPrefsFromUser,
    fetchAccountUser,
    saveAccountNotificationPrefs,
    type AccountNotificationPrefs,
} from '@simple/utils';
import { useAgendaBookingAlerts } from '@/hooks/use-agenda-booking-alerts';

const AGENDA_EMAIL_ROWS = [
    {
        key: 'emailNotifyRequests' as const,
        icon: IconCalendarEvent,
        title: 'Nuevas reservas online',
        description: 'Correo cuando un paciente reserva desde tu perfil público (pendiente o confirmada).',
    },
    {
        key: 'emailNotifyAgenda' as const,
        icon: IconUserX,
        title: 'Cancelaciones de pacientes',
        description: 'Correo cuando un paciente cancela o reprograma una cita.',
    },
];

export function useAgendaProfessionalNotificationPrefs() {
    const [phone, setPhone] = useState('');
    const [prefs, setPrefs] = useState<AccountNotificationPrefs>(() => accountNotificationPrefsFromUser(null));
    const [loading, setLoading] = useState(true);
    const [touched, setTouched] = useState(false);
    const baselineRef = useRef<AccountNotificationPrefs | null>(null);

    useEffect(() => {
        void fetchAccountUser().then((response) => {
            const user = response.ok ? response.user ?? null : null;
            const snapshot = accountNotificationPrefsFromUser(user);
            setPrefs(snapshot);
            setPhone(user?.phone?.trim() ?? '');
            baselineRef.current = snapshot;
            setLoading(false);
        });
    }, []);

    const dirty = touched || (baselineRef.current
        ? JSON.stringify(prefs) !== JSON.stringify(baselineRef.current)
        : false);

    const updatePrefs = (next: AccountNotificationPrefs) => {
        setTouched(true);
        setPrefs(next);
    };

    const save = async (): Promise<string | null> => {
        if (!baselineRef.current || !dirty) return null;
        const response = await saveAccountNotificationPrefs(prefs, phone);
        if (!response.ok || !response.user) {
            return response.error ?? 'No pudimos guardar tus preferencias.';
        }
        const snapshot = accountNotificationPrefsFromUser(response.user);
        setPrefs(snapshot);
        baselineRef.current = snapshot;
        setTouched(false);
        return null;
    };

    return { prefs, loading, dirty, updatePrefs, save };
}

function AgendaInboxAlertsSettings() {
    const alerts = useAgendaBookingAlerts({ enabled: true });
    const browserDenied = alerts.notificationPermission === 'denied';
    const browserGranted = alerts.browserNotificationsEnabled;

    return (
        <>
            <BusinessOperationalAlertSettingRow
                icon={IconBell}
                title="Sonido al llegar reserva"
                description="Campana breve cuando entra una reserva online pendiente de confirmación."
                action={
                    <PanelSwitch
                        checked={!alerts.soundMuted}
                        onChange={() => alerts.toggleSoundMuted()}
                        ariaLabel="Sonido al llegar reserva"
                    />
                }
            />
            {alerts.browserNotificationsSupported ? (
                <div className="space-y-2">
                    <BusinessOperationalAlertSettingRow
                        icon={IconBrowser}
                        title="Avisos del navegador"
                        description="Notificación del sistema si la pestaña no está activa y llega una reserva nueva."
                        action={
                            !browserGranted && !browserDenied ? (
                                <PanelButton
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="shrink-0"
                                    onClick={() => void alerts.requestBrowserNotifications()}
                                >
                                    Activar avisos
                                </PanelButton>
                            ) : (
                                <PanelSwitch
                                    checked={browserGranted}
                                    onChange={() => {
                                        if (!browserGranted) void alerts.requestBrowserNotifications();
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
                            Los avisos están bloqueados. Actívalos en la configuración de sitios de tu navegador.
                        </PanelNotice>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}

export function AgendaOperationalAlertsSettings({
    prefs,
    onPrefsChange,
    disabled = false,
}: {
    prefs: AccountNotificationPrefs;
    onPrefsChange: (next: AccountNotificationPrefs) => void;
    disabled?: boolean;
}) {
    return (
        <PanelCard size="lg" className="space-y-8">
            <PanelBlockHeader
                title={BUSINESS_OPERATIONAL_ALERTS_SECTION.title}
                description="Alertas cuando llegan reservas online o un paciente cancela."
                className="mb-0"
            />

            <BusinessOperationalAlertsSubsection
                title={BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION.title}
                description={BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION.description}
                withDivider={false}
            >
                <AgendaInboxAlertsSettings />
            </BusinessOperationalAlertsSubsection>

            <BusinessOperationalAlertsSubsection
                title={BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION.title}
                description={BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION.description}
            >
                {AGENDA_EMAIL_ROWS.map(({ key, icon, title, description }) => (
                    <BusinessOperationalAlertSettingRow
                        key={key}
                        icon={icon}
                        title={title}
                        description={description}
                        action={
                            <PanelSwitch
                                checked={prefs[key]}
                                onChange={(checked) => onPrefsChange({ ...prefs, [key]: checked })}
                                size="sm"
                                ariaLabel={`${title} por correo`}
                                disabled={disabled}
                            />
                        }
                    />
                ))}
            </BusinessOperationalAlertsSubsection>
        </PanelCard>
    );
}
