'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconHome } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell } from '@simple/ui/panel';
import { fetchCurrentAccountContext } from '@simple/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

const STORAGE_COLLAPSED = 'simpleagenda:panel:collapsed';

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const vocab = useAgendaVocab();
    const [accountContext, setAccountContext] = useState<{
        userId: string;
        role: string | null;
        isPersonal: boolean;
    } | null>(null);
    const accountContextIsCurrent = Boolean(user?.id && accountContext?.userId === user.id);
    const accountRole = accountContextIsCurrent ? accountContext?.role ?? null : null;
    const isPersonalAccount = accountContextIsCurrent ? accountContext?.isPersonal ?? true : true;

    usePushNotifications(!!user);

    const pathname = usePathname() ?? '';

    const handleAccountContext = useCallback((context: {
        account: { isPersonal: boolean } | null;
        memberships: Array<{ role: string; isDefault: boolean }>;
    }) => {
        if (!user?.id) return;
        const activeMembership = context.memberships.find((membership) => membership.isDefault);
        setAccountContext({
            userId: user.id,
            role: activeMembership?.role ?? null,
            isPersonal: context.account?.isPersonal ?? true,
        });
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        let active = true;
        void fetchCurrentAccountContext().then((context) => {
            if (active && context) handleAccountContext(context);
        }).catch(() => {});
        return () => { active = false; };
    }, [handleAccountContext, user?.id]);

    const navItems = useMemo(
        () => getPanelNavItems(vocab.Clients, accountRole, isPersonalAccount),
        [accountRole, isPersonalAccount, vocab.Clients],
    );
    const activeHref = useMemo(
        () => navItems.find((item) => isPanelNavActive(pathname, item.href))?.href ?? null,
        [navItems, pathname],
    );

    const userName = user?.name?.trim() || 'Usuario';
    const roleLabel = isPersonalAccount
        ? 'Cuenta personal'
        : accountRole === 'owner'
            ? 'Dueño del espacio'
            : accountRole === 'admin'
                ? 'Administrador'
                : accountRole === 'agent'
                    ? 'Agente'
                    : 'Integrante';

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: roleLabel, avatar: user?.avatar }}
            roleLabel={roleLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/"
            footerLabel="Ir al inicio"
            footerIcon={IconHome}
            bottomNav={<PanelBottomNav />}
            chromeEnabled
            isVerified={user?.status === 'verified'}
            activeHref={activeHref}
        >
            {children}
        </SharedPanelShell>
    );
}
