import { redirect, notFound } from 'next/navigation';
import { PANEL_SLUG_TO_SECTION, panelSectionHref } from '@/lib/panel-routes';
import { marketplaceCatalogHref, parseMarketplaceSearchParams } from '@/lib/marketplace-search';

type PanelCatchAllProps = {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MARKETPLACE_SLUGS = new Set(['grupos', 'contratar', 'mariachis', 'marketplace', 'explorar', 'nuevo-evento']);

function searchRecord(query: Record<string, string | string[] | undefined>): Record<string, string | null | undefined> {
    const record: Record<string, string | null | undefined> = {};
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            record[key] = value[0] ?? null;
            continue;
        }
        record[key] = value ?? null;
    }
    return record;
}

/**
 * Catch-all para slugs legacy del panel (`/panel/perfil`, `/panel/map`, …).
 * Las rutas canónicas tienen `page.tsx` propio con el mismo espaciado que el resto de verticales.
 */
export default async function PanelLegacyCatchAllPage({ params, searchParams }: PanelCatchAllProps) {
    const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
    const sectionSlug = slug[0];

    if (!sectionSlug) {
        redirect('/panel');
    }

    if (MARKETPLACE_SLUGS.has(sectionSlug)) {
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

    const section = PANEL_SLUG_TO_SECTION[sectionSlug];
    if (!section) {
        notFound();
    }

    redirect(panelSectionHref(section, searchRecord(query)));
}
