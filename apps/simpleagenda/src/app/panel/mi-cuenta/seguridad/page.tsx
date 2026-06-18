'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountPersonalDataSection,
    PanelAccountShell,
    bindAccountProfileSection,
    ACCOUNT_SECURITY_PAGE,
} from '@simple/ui/panel';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function SeguridadCuentaPage() {
    const auth = useAuth();

    return (
        <PanelAccountShell
            activeKey="seguridad"
            tabs={accountSectionTabs}
            title={ACCOUNT_SECURITY_PAGE.title}
            description={ACCOUNT_SECURITY_PAGE.description}
        >
            <PanelAccountPersonalDataSection
                {...bindAccountProfileSection({
                    user: auth.user,
                    appLabel: 'Simple Agenda',
                    activeSection: 'security',
                    refreshSession: auth.refreshSession,
                    logout: auth.logout,
                    requireAuth: auth.requireAuth,
                })}
            />
        </PanelAccountShell>
    );
}
