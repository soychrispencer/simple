import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@simple/ui/theme';
import { simpleFontClassName } from '@simple/ui/fonts';
import { ClientProviders } from '@/components/client-providers';
import { buildSimpleAppMetadata } from '@simple/config';

export const metadata: Metadata = buildSimpleAppMetadata('simpleplataforma');

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={simpleFontClassName}>
                <ThemeProvider>
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
