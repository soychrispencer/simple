'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PanelShell } from '@/components/panel/panel-shell';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <PanelShell>{children}</PanelShell>
        </AuthGuard>
    );
}
