import type { MetadataRoute } from 'next';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/panel', '/panel/', '/api/', '/auth/'],
        },
        sitemap: `${APP_URL}/sitemap.xml`,
        host: APP_URL,
    };
}
