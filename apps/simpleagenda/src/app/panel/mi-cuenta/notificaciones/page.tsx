'use client';

import { PanelAccountPersonalNotificationsConnected, PanelAccountShell, ACCOUNT_NOTIFICATIONS_PAGE } from '@simple/ui/panel';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function NotificacionesCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="notificaciones"
            tabs={accountSectionTabs}
            title={ACCOUNT_NOTIFICATIONS_PAGE.title}
            description={ACCOUNT_NOTIFICATIONS_PAGE.description}
        >
            <PanelAccountPersonalNotificationsConnected appLabel="Simple Agenda" />
        </PanelAccountShell>
    );
}
