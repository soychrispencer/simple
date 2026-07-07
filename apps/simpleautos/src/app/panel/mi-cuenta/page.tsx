'use client';

import { useAuth } from '@simple/auth';
import {
    PanelAccountPersonalDataSection,
    PanelAccountShell,
    bindAccountProfileSection,
    MARKETPLACE_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';

export default function CuentaPage() {
    const auth = useAuth();

    return (
        <PanelAccountShell activeKey="datos" tabs={MARKETPLACE_ACCOUNT_SECTION_TABS}>
            <div className="grid gap-4">
                <PanelAccountPersonalDataSection
                    {...bindAccountProfileSection({
                        user: auth.user,
                        appLabel: 'Simple Autos',
                        activeSection: 'personal',
                        refreshSession: auth.refreshSession,
                        logout: auth.logout,
                        requireAuth: auth.requireAuth,
                    })}
                />
            </div>
        </PanelAccountShell>
    );
}
