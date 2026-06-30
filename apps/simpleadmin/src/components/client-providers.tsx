'use client';

import { AuthModal, AuthProvider } from '@simple/auth';
import { NavigationProvider } from '@simple/ui/navigation';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider appId="simpleadmin">
            <NavigationProvider>
                <div className="flex min-h-screen flex-col">
                    <main className="flex-1">{children}</main>
                </div>
                <AuthModal allowRegister={false} />
            </NavigationProvider>
        </AuthProvider>
    );
}
