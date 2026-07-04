'use client';

import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { SerenataProvider } from '@/context/serenata-context';
import { PanelLayoutShell } from '@/components/panel/panel-layout-shell';
import { PanelConfirmProvider } from '@simple/ui/panel';

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
    return (
        <SubscriptionGate>
            <SerenataProvider>
                <PanelConfirmProvider>
                    <PanelLayoutShell>{children}</PanelLayoutShell>
                </PanelConfirmProvider>
            </SerenataProvider>
        </SubscriptionGate>
    );
}
