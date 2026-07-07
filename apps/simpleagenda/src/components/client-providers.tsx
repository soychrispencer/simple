'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider, AuthModal } from '@simple/auth';
import { shouldShowMarketplaceSiteChrome } from '@simple/ui/layout';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isAgendaOperatorSitePath } from '@/lib/operator-site-path';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const showSiteChrome =
        shouldShowMarketplaceSiteChrome(pathname) && !isAgendaOperatorSitePath(pathname);

    return (
        <AuthProvider appId="simpleagenda">
            {showSiteChrome ? (
                <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </div>
            ) : (
                <>{children}</>
            )}
            <AuthModal />
        </AuthProvider>
    );
}
