import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SimpleAgenda',
        short_name: 'SimpleAgenda',
        description: 'Agenda online para reservas, citas, clientes y pagos.',
        start_url: '/',
        scope: '/',
        display: 'browser',
        lang: 'es-CL',
        background_color: '#f8fafc',
        theme_color: '#0D9488',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    };
}
