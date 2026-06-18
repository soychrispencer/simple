'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountPersonalDataSection,
    PanelAccountShell,
    bindAccountProfileSection,
    DEFAULT_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function CuentaPage() {
    const auth = useAuth();

    return (
        <PanelAccountShell activeKey="datos" tabs={DEFAULT_ACCOUNT_SECTION_TABS}>
            <PanelAccountPersonalDataSection
                {...bindAccountProfileSection({
                    user: auth.user,
                    appLabel: 'Simple Propiedades',
                    activeSection: 'personal',
                    refreshSession: auth.refreshSession,
                    logout: auth.logout,
                    requireAuth: auth.requireAuth,
                })}
            />
        </PanelAccountShell>
    );
}
