'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountPersonalDataSection,
    PanelAccountShell,
    bindAccountProfileSection,
} from '@simple/ui/panel';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function CuentaPage() {
    const auth = useAuth();

    return (
        <PanelAccountShell activeKey="datos" tabs={accountSectionTabs}>
            <PanelAccountPersonalDataSection
                {...bindAccountProfileSection({
                    user: auth.user,
                    appLabel: 'Simple Agenda',
                    activeSection: 'personal',
                    refreshSession: auth.refreshSession,
                    logout: auth.logout,
                    requireAuth: auth.requireAuth,
                })}
            />
        </PanelAccountShell>
    );
}
