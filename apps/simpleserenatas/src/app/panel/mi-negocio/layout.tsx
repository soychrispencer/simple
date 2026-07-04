'use client';

import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { SerenataProvider } from '@/context/serenata-context';
import { PanelLayoutShell } from '@/components/panel/panel-layout-shell';

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
    return (
        <SubscriptionGate>
            <SerenataProvider>
                <PanelLayoutShell>{children}</PanelLayoutShell>
            </SerenataProvider>
        </SubscriptionGate>
    );
}
