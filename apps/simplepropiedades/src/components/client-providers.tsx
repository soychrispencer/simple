'use client';

import { AuthProvider } from '@/context/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ScrollTopButton } from '@/components/layout/scroll-top-button';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
            <MobileNav />
            <AuthModal />
            <ScrollTopButton />
        </AuthProvider>
    );
}
