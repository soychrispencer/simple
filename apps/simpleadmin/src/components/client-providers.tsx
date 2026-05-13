'use client';

import { AuthProvider, AuthModal } from '@simple/auth';

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
