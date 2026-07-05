'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PanelShell } from '@/components/panel/panel-shell';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const isPublishFlow = pathname.startsWith('/panel/publicar');

    return (
        <div className={(inter as any).variable}>
            <AuthGuard>
                {isPublishFlow ? children : <PanelShell>{children}</PanelShell>}
            </AuthGuard>
        </div>
    );
}
