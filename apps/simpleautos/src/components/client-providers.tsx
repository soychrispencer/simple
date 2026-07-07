'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider, AuthModal } from '@simple/auth';
import { NavigationProvider } from '@simple/ui/navigation';
import { shouldShowMarketplaceSiteChrome } from '@simple/ui/layout';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ScrollTopButton } from '@/components/layout/scroll-top-button';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const showSiteChrome = shouldShowMarketplaceSiteChrome(pathname);

    return (
        <AuthProvider appId="simpleautos">
            <NavigationProvider>
                {showSiteChrome ? (
                    <div className="flex flex-col min-h-screen">
                        <Header />
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                ) : (
                    <main className="min-h-screen flex-1">{children}</main>
                )}
                <MobileNav />
                <AuthModal />
                <ScrollTopButton />
            </NavigationProvider>
        </AuthProvider>
    );
}
