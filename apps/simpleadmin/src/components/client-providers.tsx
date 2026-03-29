'use client';

import { AuthProvider } from '@/context/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <main className="flex-1">{children}</main>
            </div>
            <AuthModal />
        </AuthProvider>
    );
}