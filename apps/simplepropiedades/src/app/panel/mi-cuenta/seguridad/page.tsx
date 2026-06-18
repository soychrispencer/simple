'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountPersonalDataSection,
    PanelAccountShell,
    bindAccountProfileSection,
    DEFAULT_ACCOUNT_SECTION_TABS,
    ACCOUNT_SECURITY_PAGE,
} from '@simple/ui/panel';

export default function SeguridadCuentaPage() {
    const auth = useAuth();

    return (
        <PanelAccountShell
            activeKey="seguridad"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_SECURITY_PAGE.title}
            description={ACCOUNT_SECURITY_PAGE.description}
        >
            <PanelAccountPersonalDataSection
                {...bindAccountProfileSection({
                    user: auth.user,
                    appLabel: 'Simple Propiedades',
                    activeSection: 'security',
                    refreshSession: auth.refreshSession,
                    logout: auth.logout,
                    requireAuth: auth.requireAuth,
                })}
            />
        </PanelAccountShell>
    );
}
