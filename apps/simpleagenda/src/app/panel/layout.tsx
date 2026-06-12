'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { PanelShell } from '@/components/panel/panel-shell';
import { Inter } from 'next/font/google'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={(inter as any).variable}>
            <AuthGuard>
                <SubscriptionGate>
                    <PanelShell>{children}</PanelShell>
                </SubscriptionGate>
            </AuthGuard>
        </div>
    );
}
