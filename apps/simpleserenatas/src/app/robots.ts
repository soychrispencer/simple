import type { MetadataRoute } from 'next';
import { getSerenatasSiteOrigin } from '@/lib/site-origin';

export default function robots(): MetadataRoute.Robots {
    const base = getSerenatasSiteOrigin();
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/'],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
    };
}
