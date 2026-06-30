import { Suspense } from 'react';
import { SerenatasApp } from '@/components/serenatas-app';
import { SerenataProvider } from '@/context/serenata-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { LegacySectionRedirect } from '@/components/panel/legacy-section-redirect';

export default function HomePage() {
    return (
        <ErrorBoundary>
            <Suspense fallback={null}>
                <SerenataProvider>
                    <LegacySectionRedirect />
                    <SerenatasApp />
                </SerenataProvider>
            </Suspense>
        </ErrorBoundary>
    );
}
