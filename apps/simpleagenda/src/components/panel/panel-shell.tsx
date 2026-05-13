'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconHome } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell } from '@simple/ui';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, panelRoleLabel, type PanelRole } from '@/components/panel/panel-nav-config';

const STORAGE_COLLAPSED = 'simpleagenda:panel:collapsed';

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const role: PanelRole = user?.role ?? 'user';

    usePushNotifications(!!user);

    const pathname = usePathname() ?? '';
    const isFullscreenFlow = pathname.startsWith('/panel/onboarding');

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
            footerHref="/"
            footerLabel="Ir al inicio"
            footerIcon={IconHome}
            bottomNav={<PanelBottomNav />}
            chromeEnabled={!isFullscreenFlow}
            isVerified={user?.status === 'verified'}
        >
            {children}
        </SharedPanelShell>
    );
}
