'use client';

import { Suspense } from 'react';
import { AuthModal, AuthProvider } from '@simple/auth';
import { NavigationProvider } from '@simple/ui/navigation';
import { LogoutHomeRedirect } from '@/components/logout-home-redirect';
import { SignupProfileBootstrap } from '@/components/signup-profile-bootstrap';
import { GroupInviteBootstrap } from '@/components/group-invite-bootstrap';
import { SerenataRequestModalProvider } from '@/components/serenata-request/serenata-request-modal-context';
import { SerenataRequestModal } from '@/components/serenata-request/serenata-request-modal';
import { SerenataRequestDeepLink } from '@/components/serenata-request/serenata-request-deep-link';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider appId="simpleserenatas">
            <NavigationProvider>
                <SerenataRequestModalProvider>
                    <LogoutHomeRedirect />
                    <SignupProfileBootstrap />
                    <Suspense fallback={null}>
                        <GroupInviteBootstrap />
                        <SerenataRequestDeepLink />
                    </Suspense>
                    {children}
                    <SerenataRequestModal />
                    <AuthModal />
                </SerenataRequestModalProvider>
            </NavigationProvider>
        </AuthProvider>
    );
}
