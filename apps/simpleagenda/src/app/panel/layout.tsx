'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { PanelShell } from '@/components/panel/panel-shell';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <SubscriptionGate>
                <PanelShell>{children}</PanelShell>
            </SubscriptionGate>
        </AuthGuard>
    );
}
