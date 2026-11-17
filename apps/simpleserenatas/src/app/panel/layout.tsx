'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { Header } from '@/components/layout/header';
import { PanelShell } from '@/components/panel/panel-shell';
import { PanelQueryRedirect } from '@/components/panel/panel-query-redirect';
import { SerenataProvider } from '@/context/serenata-context';
import { PanelConfirmProvider } from '@simple/ui/panel';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Suspense fallback={null}>
                <PanelQueryRedirect />
            </Suspense>
            <AuthGuard>
                <SerenataProvider>
                    <PanelConfirmProvider>
                        <div className="flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
                            <div className="shrink-0">
                                <Header />
                            </div>
                            <PanelShell>
                                <SubscriptionGate>{children}</SubscriptionGate>
                            </PanelShell>
                        </div>
                    </PanelConfirmProvider>
                </SerenataProvider>
            </AuthGuard>
        </>
    );
}
