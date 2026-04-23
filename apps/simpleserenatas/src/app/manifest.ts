import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SimpleSerenatas',
    short_name: 'Serenatas',
    description: 'Sistema operativo para músicos de mariachis',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#E11D48',
    lang: 'es-CL',
    categories: ['music', 'entertainment', 'business'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Disponible Ahora',
        short_name: 'Disponible',
        description: 'Marcarse como disponible para serenatas',
        url: '/inicio?available=true',
        icons: [{ src: '/icon', sizes: '96x96' }],
      },
      {
        name: 'Agenda',
        short_name: 'Agenda',
        description: 'Ver serenatas programadas',
        url: '/agenda',
        icons: [{ src: '/icon', sizes: '96x96' }],
      },
    ],
  };
}
