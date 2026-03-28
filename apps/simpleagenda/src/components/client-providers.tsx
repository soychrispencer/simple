'use client';

import { AuthProvider } from '@/context/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
            <AuthModal />
        </AuthProvider>
    );
}
