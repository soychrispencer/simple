'use client';

import {
    PanelAccountPersonalNotificationsConnected,
    PanelAccountShell,
    ACCOUNT_NOTIFICATIONS_PAGE,
    DEFAULT_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function NotificacionesCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="notificaciones"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_NOTIFICATIONS_PAGE.title}
            description={ACCOUNT_NOTIFICATIONS_PAGE.description}
        >
            <PanelAccountPersonalNotificationsConnected appLabel="Simple Autos" />
        </PanelAccountShell>
    );
}
