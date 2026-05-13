'use client';

import { useMemo, type ReactNode } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell } from '@simple/ui';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, panelRoleLabel, type PanelRole } from '@/components/panel/panel-nav-config';

const STORAGE_COLLAPSED = 'simpleautos:panel:collapsed';

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const role: PanelRole = user?.role ?? 'user';

    const navItems = useMemo(
        () => getPanelNavItems(role).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })),
        [role]
    );

    const userName = user?.name?.trim() || 'Usuario';
    const roleLabel = panelRoleLabel(role);

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: roleLabel }}
            roleLabel={roleLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/ventas"
            footerLabel="Ir al marketplace"
            footerIcon={IconArrowLeft}
            bottomNav={<PanelBottomNav />}
            isVerified={user?.status === 'verified'}
        >
            {children}
        </SharedPanelShell>
    );
}
