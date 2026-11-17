'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconHome, IconMapPin } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelAccountSwitcher, PanelShell as SharedPanelShell } from '@simple/ui/panel';
import { fetchAgendaAccountVisitContext } from '@simple/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

const STORAGE_COLLAPSED = 'simpleagenda:panel:collapsed';

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const vocab = useAgendaVocab();
    const [teamVisitsContext, setTeamVisitsContext] = useState<{
        userId: string;
        enabled: boolean;
        teamMode: boolean;
    } | null>(null);
    const [accountContext, setAccountContext] = useState<{
        userId: string;
        role: string | null;
        isPersonal: boolean;
    } | null>(null);
    const teamVisitsContextIsCurrent = Boolean(user?.id && teamVisitsContext?.userId === user.id);
    const teamVisitsEnabled = teamVisitsContextIsCurrent && Boolean(teamVisitsContext?.enabled);
    const teamVisitsTeamMode = teamVisitsContextIsCurrent && Boolean(teamVisitsContext?.teamMode);
    const accountContextIsCurrent = Boolean(user?.id && accountContext?.userId === user.id);
    const accountRole = accountContextIsCurrent ? accountContext?.role ?? null : null;
    const isPersonalAccount = accountContextIsCurrent ? accountContext?.isPersonal ?? true : true;

    usePushNotifications(!!user);

    const pathname = usePathname() ?? '';

    useEffect(() => {
        let cancelled = false;
        if (!user) {
            setTeamVisitsContext(null);
            return;
        }
        void fetchAgendaAccountVisitContext()
            .then((context) => {
                if (!cancelled) {
                    setTeamVisitsContext({
                        userId: user.id,
                        enabled: Boolean(context?.enabled),
                        teamMode: Boolean(context?.teamMode),
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTeamVisitsContext({ userId: user.id, enabled: false, teamMode: false });
                }
            });
        return () => { cancelled = true; };
    }, [user?.id]);

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

    const navItems = useMemo(
        () => {
            const isCompanyAgent = !isPersonalAccount && accountRole === 'agent';
            const items = getPanelNavItems(vocab.Clients, accountRole, isPersonalAccount)
                .map(({ href, label, icon, badge }) => ({
                    href: teamVisitsEnabled && href === '/panel/clientes' ? '/panel/contactos' : href,
                    label: teamVisitsEnabled && href === '/panel/clientes' ? 'Contactos' : label,
                    icon,
                    badge,
                }));
            if (teamVisitsEnabled) {
                const agendaIndex = items.findIndex((item) => item.href === '/panel/agenda');
                items.splice(agendaIndex + 1, 0, {
                    href: '/panel/visitas-equipo',
                    label: isCompanyAgent ? 'Mis visitas' : teamVisitsTeamMode ? 'Visitas del equipo' : 'Mis visitas',
                    icon: IconMapPin,
                    badge: undefined,
                });
            }
            return items;
        },
        [accountRole, isPersonalAccount, teamVisitsEnabled, teamVisitsTeamMode, vocab.Clients],
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
            bottomNav={<PanelBottomNav propertyWorkspace={teamVisitsEnabled} />}
            chromeEnabled
            isVerified={user?.status === 'verified'}
            activeHref={activeHref}
        >
            <>
                <PanelAccountSwitcher userId={user?.id} onContextLoaded={handleAccountContext} />
                {children}
            </>
        </SharedPanelShell>
    );
}
