'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { Header } from '@/components/layout/header';
import { PanelShell } from '@/components/panel/panel-shell';
import { PanelQueryRedirect } from '@/components/panel/panel-query-redirect';
import { SerenataProvider } from '@/context/serenata-context';
import { useSerenata } from '@/context/serenata-context';
import { PanelConfirmProvider, PostRegistrationRoleWizardGate } from '@simple/ui/panel';

function SerenatasPostRegistrationGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const isInvitationRoute =
        pathname === '/panel/invitaciones'
        || pathname.startsWith('/panel/invitaciones/')
        || pathname === '/panel/invitations'
        || pathname.startsWith('/panel/invitations/');
    const { setActiveRole, profiles } = useSerenata();
    return (
        <PostRegistrationRoleWizardGate
            vertical="serenatas"
            enabled={!isInvitationRoute}
            onSerenatasRoleSelected={(role) => {
                setActiveRole(role);
                return Boolean(profiles[role]);
            }}
        >
            {children}
        </PostRegistrationRoleWizardGate>
    );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Suspense fallback={null}>
                <PanelQueryRedirect />
            </Suspense>
            <AuthGuard>
                <SerenataProvider>
                    <PanelConfirmProvider>
                        <SerenatasPostRegistrationGate>
                            <div className="flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
                                <div className="shrink-0">
                                    <Header />
                                </div>
                                <PanelShell>
                                    <SubscriptionGate>{children}</SubscriptionGate>
                                </PanelShell>
                            </div>
                        </SerenatasPostRegistrationGate>
                    </PanelConfirmProvider>
                </SerenataProvider>
            </AuthGuard>
        </>
    );
}
