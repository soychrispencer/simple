'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PanelQueryRedirect } from '@/components/panel/panel-query-redirect';
import { Inter } from 'next/font/google';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

/** Rutas legacy bajo /panel: auth + redirecciones en cada page. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={(inter as { variable: string }).variable}>
            <Suspense fallback={null}>
                <PanelQueryRedirect />
            </Suspense>
            <AuthGuard>{children}</AuthGuard>
        </div>
    );
}
