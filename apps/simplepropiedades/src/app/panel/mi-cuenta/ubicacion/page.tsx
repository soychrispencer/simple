'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountLocationContent,
    PanelAccountShell,
    ACCOUNT_LOCATION_PAGE,
    DEFAULT_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function UbicacionPage() {
    const { user, refreshSession, requireAuth } = useAuth();

    return (
        <PanelAccountShell
            activeKey="ubicacion"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_LOCATION_PAGE.title}
            description={ACCOUNT_LOCATION_PAGE.description}
        >
            <PanelAccountLocationContent
                user={user}
                appLabel="Simple Propiedades"
                onSaved={refreshSession}
                onUnauthorized={requireAuth}
            />
        </PanelAccountShell>
    );
}
