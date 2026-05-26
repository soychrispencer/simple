import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SerenatasApp } from '@/components/serenatas-app';
import { SerenataProvider } from '@/context/serenata-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { PanelLoadingFallback } from '@/components/panel/panel-loading-fallback';
import { marketplaceCatalogHref, parseMarketplaceSearchParams } from '@/lib/marketplace-search';

type PanelPageProps = {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function serializeSearchParams(params: Record<string, string | string[] | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            for (const item of value) search.append(key, item);
            continue;
        }
        if (value != null) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

/** Panel operativo en rutas `/panel/*` (slug → sección vía `panel-routes.ts`). */
export default async function PanelPage({ params, searchParams }: PanelPageProps) {
    const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
    const sectionSlug = slug[0];
    const marketplaceSlugs = new Set(['grupos', 'contratar', 'mariachis', 'marketplace', 'explorar', 'nuevo-evento']);
    if (sectionSlug && marketplaceSlugs.has(sectionSlug)) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (Array.isArray(value)) {
                for (const item of value) params.append(key, item);
            } else if (value != null) {
                params.set(key, value);
            }
        }
        redirect(marketplaceCatalogHref(parseMarketplaceSearchParams(params)));
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
                <SerenataProvider>
                    <SerenatasApp />
                </SerenataProvider>
            </Suspense>
        </ErrorBoundary>
    );
}
