'use client';

import { AuthModal, AuthProvider } from '@simple/auth';
import { NavigationProvider } from '@simple/ui/navigation';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <NavigationProvider>
                {children}
                <AuthModal allowRegister={false} />
            </NavigationProvider>
        </AuthProvider>
    );
}
