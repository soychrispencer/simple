'use client';

import { Suspense } from 'react';
import { AuthModal, AuthProvider } from '@simple/auth';
import { LogoutHomeRedirect } from '@/components/logout-home-redirect';
import { SignupProfileBootstrap } from '@/components/signup-profile-bootstrap';
import { GroupInviteBootstrap } from '@/components/group-invite-bootstrap';
import { SerenataRequestModalProvider } from '@/components/serenata-request/serenata-request-modal-context';
import { SerenataRequestModal } from '@/components/serenata-request/serenata-request-modal';
import { SerenataRequestDeepLink } from '@/components/serenata-request/serenata-request-deep-link';
import { PanelLoadingFallback } from '@/components/panel/panel-loading-fallback';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SerenataRequestModalProvider>
                <LogoutHomeRedirect />
                <SignupProfileBootstrap />
                <Suspense fallback={<PanelLoadingFallback />}>
                    <GroupInviteBootstrap />
                    <SerenataRequestDeepLink />
                </Suspense>
                {children}
                <SerenataRequestModal />
                <AuthModal />
            </SerenataRequestModalProvider>
        </AuthProvider>
    );
}
