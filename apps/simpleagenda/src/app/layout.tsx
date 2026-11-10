import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@simple/ui/theme';
import { simpleFontClassName } from '@simple/ui/fonts';
import { ClientProviders } from '@/components/client-providers';
import { buildSimpleAppMetadata } from '@simple/config';
import { isPlatformLaunchActive } from '@simple/utils';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');
const APP_TITLE = 'SimpleAgenda | Agenda online para citas';
const APP_DESCRIPTION = 'Agenda online para profesionales: tus clientes reservan una hora disponible y reciben confirmación automática mientras tú sigues atendiendo.';
const HERO_IMAGE = '/hero/reserva-online-confirmada.png';

export const metadata: Metadata = {
    ...buildSimpleAppMetadata('simpleagenda'),
    metadataBase: new URL(APP_URL),
    title: {
        default: APP_TITLE,
        template: '%s | SimpleAgenda',
    },
    description: APP_DESCRIPTION,
    keywords: [
        'agenda online',
        'agenda digital',
        'sistema de reservas',
        'reservas online',
        'citas online',
        'agenda para barbería',
        'agenda para estética',
        'agenda para profesionales',
        'agenda para salud privada',
        'gestión de clientes',
        'recordatorios de citas',
        'Chile',
    ],
    alternates: {
        canonical: '/',
    },
    openGraph: {
        type: 'website',
        locale: 'es_CL',
        url: APP_URL,
        siteName: 'SimpleAgenda',
        title: APP_TITLE,
        description: APP_DESCRIPTION,
        images: [
            {
                url: `${APP_URL}${HERO_IMAGE}`,
                width: 1754,
                height: 896,
                alt: 'Una profesional atiende a un cliente mientras la agenda muestra una cita confirmada en el teléfono',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: APP_TITLE,
        description: APP_DESCRIPTION,
        images: [`${APP_URL}${HERO_IMAGE}`],
    },
};

const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${APP_URL}/#organization`,
            name: 'SimpleAgenda',
            url: APP_URL,
            logo: {
                '@type': 'ImageObject',
                url: `${APP_URL}/icon-512.png`,
                width: 512,
                height: 512,
            },
        },
        {
            '@type': 'WebSite',
            '@id': `${APP_URL}/#website`,
            url: APP_URL,
            name: 'SimpleAgenda',
            publisher: { '@id': `${APP_URL}/#organization` },
            inLanguage: 'es-CL',
        },
        {
            '@type': 'SoftwareApplication',
            '@id': `${APP_URL}/#software`,
            name: 'SimpleAgenda',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: APP_URL,
            image: `${APP_URL}${HERO_IMAGE}`,
            description: APP_DESCRIPTION,
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CLP',
                availability: 'https://schema.org/InStock',
            },
            audience: {
                '@type': 'Audience',
                audienceType: 'Profesionales y negocios que necesitan una agenda online para sus citas',
            },
        },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
            <body className={`${simpleFontClassName} simpleagenda-root`}>
                <ThemeProvider>
                    <ClientProviders agendaLaunchMode={isPlatformLaunchActive('agenda')}>
                        {children}
                    </ClientProviders>
                </ThemeProvider>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
                />
            </body>
        </html>
    );
}
