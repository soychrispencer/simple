'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PanelQueryRedirect } from '@/components/panel/panel-query-redirect';
import { PanelLoadingFallback } from '@/components/panel/panel-loading-fallback';

/** Rutas legacy bajo /panel: auth + redirecciones en cada page. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Suspense fallback={<PanelLoadingFallback />}>
                <PanelQueryRedirect />
            </Suspense>
            <AuthGuard>{children}</AuthGuard>
        </>
    );
}
