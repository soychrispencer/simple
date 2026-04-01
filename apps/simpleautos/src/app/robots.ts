import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.app';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/panel', '/auth', '/api'],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
