import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { buildSimpleAppMetadata } from '@simple/config';
import { ClientProviders } from '@/components/client-providers';
import { MetaPixel } from '@/components/meta-pixel';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = buildSimpleAppMetadata('simpleserenatas');

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={`${inter.variable} overflow-x-hidden font-sans antialiased`}>
                <ThemeProvider>
                    <MetaPixel />
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
