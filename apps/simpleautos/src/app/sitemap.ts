import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.app';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${BASE_URL}/ventas`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${BASE_URL}/arriendos`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${BASE_URL}/subastas`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
        { url: `${BASE_URL}/descubre`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
        { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
        { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
        { url: `${BASE_URL}/nosotros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/servicios`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    ];
}
