'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { Header } from '@/components/layout/header';
import { PanelShell } from '@/components/panel/panel-shell';
import { AgendaVocabProvider } from '@/components/panel/agenda-vocab-context';
import { PanelConfirmProvider } from '@simple/ui/panel';
import './panel-identity.css';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <SubscriptionGate>
                <PanelConfirmProvider>
                    <AgendaVocabProvider>
                        <div className="agenda-panel-workspace flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
                            <div className="agenda-panel-quick-action shrink-0">
                                <Header />
                            </div>
                            <PanelShell>{children}</PanelShell>
                        </div>
                    </AgendaVocabProvider>
                </PanelConfirmProvider>
            </SubscriptionGate>
        </AuthGuard>
    );
}
