import type { MetadataRoute } from 'next';
import { MARIACHIS_COMUNAS } from '@/lib/mariachis-comunas';
import { getSerenatasSiteOrigin } from '@/lib/site-origin';

export default function sitemap(): MetadataRoute.Sitemap {
    const base = getSerenatasSiteOrigin();
    const lastModified = new Date();

    const core: MetadataRoute.Sitemap = [
        { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: `${base}/profesionales`, lastModified, changeFrequency: 'weekly', priority: 0.85 },
    ];

    const loc: MetadataRoute.Sitemap = MARIACHIS_COMUNAS.map((c) => ({
        url: `${base}/mariachis-${c.pathSegment}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    return [...core, ...loc];
}
