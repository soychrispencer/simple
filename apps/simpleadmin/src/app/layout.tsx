import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ClientProviders } from '@/components/client-providers';
import { buildSimpleAppMetadata } from '@simple/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = buildSimpleAppMetadata('simpleadmin');

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
