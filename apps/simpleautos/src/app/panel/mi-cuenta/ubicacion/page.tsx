'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountLocationContent,
    PanelAccountShell,
    ACCOUNT_LOCATION_PAGE,
    MARKETPLACE_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function UbicacionPage() {
    const { user, refreshSession, requireAuth } = useAuth();

    return (
        <PanelAccountShell
            activeKey="ubicacion"
            tabs={MARKETPLACE_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_LOCATION_PAGE.title}
            description={ACCOUNT_LOCATION_PAGE.description}
        >
            <PanelAccountLocationContent
                user={user}
                appLabel="Simple Autos"
                onSaved={refreshSession}
                onUnauthorized={requireAuth}
            />
        </PanelAccountShell>
    );
}
