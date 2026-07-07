'use client';

import {
    PanelAccountPersonalNotificationsConnected,
    PanelAccountShell,
    ACCOUNT_NOTIFICATIONS_PAGE,
    MARKETPLACE_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function NotificacionesCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="notificaciones"
            tabs={MARKETPLACE_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_NOTIFICATIONS_PAGE.title}
            description={ACCOUNT_NOTIFICATIONS_PAGE.description}
        >
            <PanelAccountPersonalNotificationsConnected appLabel="Simple Autos" />
        </PanelAccountShell>
    );
}
