import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { buildSimpleAppMetadata } from '@simple/config';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/hooks';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  ...buildSimpleAppMetadata('simpleserenatas'),
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: 'rgb(225, 29, 72)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <ToastProvider>
              <ServiceWorker />
              <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
                {children}
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
