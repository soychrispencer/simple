'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PanelShell } from '@/components/panel/panel-shell';
import { simpleFontClassName } from '@simple/ui/fonts';
import { usePathname } from 'next/navigation';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const isPublishFlow = pathname.startsWith('/panel/publicar');

    return (
        <div className={simpleFontClassName}>
            <AuthGuard>
                {isPublishFlow ? children : <PanelShell>{children}</PanelShell>}
            </AuthGuard>
        </div>
    );
}
