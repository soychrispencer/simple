'use client';

import { AuthModal, AuthProvider } from '@simple/auth';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider appId="simpleadmin">
            <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
            </div>
            <AuthModal allowRegister={false} />
        </AuthProvider>
    );
}
