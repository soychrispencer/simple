'use client';

import { AuthModal, AuthProvider } from '@simple/auth';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <AuthModal allowRegister={false} />
        </AuthProvider>
    );
}
