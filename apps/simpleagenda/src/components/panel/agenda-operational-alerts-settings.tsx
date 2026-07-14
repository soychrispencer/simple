'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBell, IconBrowser, IconCalendarEvent, IconUserX } from '@tabler/icons-react';
import {
    BusinessOperationalAlertSettingRow,
    BusinessOperationalAlertsSubsection,
    PanelBlockHeader,
    PanelButton,
    PanelCard,
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
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

export function useAgendaProfessionalNotificationPrefs() {
    const [prefs, setPrefs] = useState<AccountNotificationPrefs>(() => accountNotificationPrefsFromUser(null));
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    const baselineRef = useRef<string>('');

    useEffect(() => {
        let active = true;
        void fetchAccountUser().then((result) => {
            if (!active) return;
            const next = accountNotificationPrefsFromUser(result.user);
            baselineRef.current = JSON.stringify(next);
            setPrefs(next);
            setDirty(false);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    function updatePrefs(next: AccountNotificationPrefs) {
        setPrefs(next);
        setDirty(JSON.stringify(next) !== baselineRef.current);
    }

    async function save(): Promise<string | null> {
        const result = await saveAccountNotificationPrefs(prefs);
        if (!result.ok) {
            return result.error ?? 'No pudimos guardar tus preferencias.';
        }
        baselineRef.current = JSON.stringify(prefs);
        setDirty(false);
        return null;
    }

    return { prefs, updatePrefs, dirty, loading, save };
}

function AgendaInboxAlertsSettings() {
    const alerts = useAgendaBookingAlerts({ enabled: true });
    return (
        <div className="space-y-3">
            <BusinessOperationalAlertSettingRow
                icon={IconBell}
                title="Sonido de nuevas reservas"
                description="Aviso sonoro cuando llega una reserva pendiente en tu agenda."
                action={
                    <PanelSwitch
                        checked={!alerts.soundMuted}
                        onChange={() => alerts.toggleSoundMuted()}
                        ariaLabel="Sonido de nuevas reservas"
                    />
                }
            />
            <BusinessOperationalAlertSettingRow
                icon={IconBrowser}
                title="Notificaciones del navegador"
                description={
                    alerts.notificationPermission === 'granted'
                        ? 'Activas. Te avisamos aunque estés en otra pestaña.'
                        : alerts.notificationPermission === 'denied'
                            ? 'Bloqueadas en este navegador. Actívalas desde la configuración del sitio.'
                            : 'Opcional. Útiles si dejas el panel abierto en segundo plano.'
                }
                action={
                    alerts.notificationPermission === 'granted' ? (
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Activas</span>
                    ) : alerts.notificationPermission === 'denied' ? (
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Bloqueadas</span>
                    ) : (
                        <PanelButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void alerts.requestBrowserNotifications()}
                        >
                            Activar
                        </PanelButton>
                    )
                }
            />
        </div>
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
    const vocab = useAgendaVocab();
    const emailRows = [
        {
            key: 'emailNotifyRequests' as const,
            icon: IconCalendarEvent,
            title: 'Nuevas reservas online',
            description: `Correo cuando un ${vocab.client} reserva desde tu perfil público (pendiente o confirmada).`,
        },
        {
            key: 'emailNotifyAgenda' as const,
            icon: IconUserX,
            title: `Cancelaciones de ${vocab.clients}`,
            description: `Correo cuando un ${vocab.client} cancela o reprograma una cita.`,
        },
    ];

    return (
        <PanelCard size="lg" className="space-y-8">
            <PanelBlockHeader
                title={BUSINESS_OPERATIONAL_ALERTS_SECTION.title}
                description={`Alertas cuando llegan reservas online o un ${vocab.client} cancela.`}
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
                {emailRows.map(({ key, icon, title, description }) => (
                    <BusinessOperationalAlertSettingRow
                        key={key}
                        icon={icon}
                        title={title}
                        description={description}
                        action={
                            <PanelSwitch
                                checked={prefs[key]}
                                disabled={disabled}
                                onChange={(checked) => onPrefsChange({ ...prefs, [key]: checked })}
                                ariaLabel={title}
                            />
                        }
                    />
                ))}
            </BusinessOperationalAlertsSubsection>
        </PanelCard>
    );
}
