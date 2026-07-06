import type { Metadata } from 'next';
import { buildSimpleAppMetadata } from '@simple/config';
import { simpleFontClassName } from '@simple/ui/fonts';
import { ClientProviders } from '@/components/client-providers';
import { MetaPixel } from '@/components/meta-pixel';
import { ThemeProvider } from '@simple/ui/theme';
import './globals.css';

export const metadata: Metadata = buildSimpleAppMetadata('simpleserenatas');

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={simpleFontClassName}>
                <ThemeProvider>
                    <MetaPixel />
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
