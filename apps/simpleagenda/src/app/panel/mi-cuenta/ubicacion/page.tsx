'use client';

import { useAuth } from '@simple/auth';
import { PanelAccountLocationContent, PanelAccountShell, ACCOUNT_LOCATION_PAGE } from '@simple/ui/panel';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function UbicacionPage() {
    const { user, refreshSession, requireAuth } = useAuth();

    return (
        <PanelAccountShell
            activeKey="ubicacion"
            tabs={accountSectionTabs}
            title={ACCOUNT_LOCATION_PAGE.title}
            description={ACCOUNT_LOCATION_PAGE.description}
        >
            <PanelAccountLocationContent
                user={user}
                appLabel="Simple Agenda"
                onSaved={refreshSession}
                onUnauthorized={requireAuth}
            />
        </PanelAccountShell>
    );
}
