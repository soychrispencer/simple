'use client';

import { Suspense } from 'react';
import { SerenatasApp } from '@/components/serenatas-app';
import { SerenataProvider } from '@/context/serenata-context';
import { ErrorBoundary } from '@/components/error-boundary';

/** Panel operativo en rutas `/panel/*` (slug → sección vía `panel-routes.ts`). */
export default function PanelPage() {
    return (
        <ErrorBoundary>
            <Suspense fallback={null}>
                <SerenataProvider>
                    <SerenatasApp />
                </SerenataProvider>
            </Suspense>
        </ErrorBoundary>
    );
}
