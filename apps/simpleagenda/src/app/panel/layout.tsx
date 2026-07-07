'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { Header } from '@/components/layout/header';
import { PanelShell } from '@/components/panel/panel-shell';
import { PanelConfirmProvider } from '@simple/ui/panel';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <SubscriptionGate>
                <PanelConfirmProvider>
                    <div className="flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
                        <div className="shrink-0">
                            <Header />
                        </div>
                        <PanelShell>{children}</PanelShell>
                    </div>
                </PanelConfirmProvider>
            </SubscriptionGate>
        </AuthGuard>
    );
}
