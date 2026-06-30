'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider, AuthModal } from '@simple/auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isAgendaOperatorSitePath, shouldShowAgendaMarketplaceChrome } from '@/lib/operator-site-path';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const showMarketplaceChrome = shouldShowAgendaMarketplaceChrome(pathname);

    return (
        <AuthProvider appId="simpleagenda">
            {showMarketplaceChrome ? (
                <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                    <AuthModal />
                </div>
            ) : (
                <>
                    {children}
                    <AuthModal />
                </>
            )}
        </AuthProvider>
    );
}
