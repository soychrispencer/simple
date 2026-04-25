import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ClientProviders } from '@/components/client-providers';
import { buildSimpleAppMetadata } from '@simple/config';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = buildSimpleAppMetadata('simplepropiedades');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplepropiedades.cl';

const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${APP_URL}/#organization`,
            name: 'SimplePropiedades',
            url: APP_URL,
            logo: {
                '@type': 'ImageObject',
                url: `${APP_URL}/icon.png`,
            },
        },
        {
            '@type': 'WebSite',
            '@id': `${APP_URL}/#website`,
            url: APP_URL,
            name: 'SimplePropiedades',
            publisher: { '@id': `${APP_URL}/#organization` },
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${APP_URL}/ventas?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
            },
            inLanguage: 'es-CL',
        },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <script
                    type="application/ld+json"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
                />
            </head>
            <body className={`${inter.variable} font-sans antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
