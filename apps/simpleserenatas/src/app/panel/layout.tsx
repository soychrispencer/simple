'use client';



import { Suspense } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';

import { SubscriptionGate } from '@/components/auth/subscription-gate';

import { PanelConfirmProvider } from '@simple/ui/panel';

import { PanelQueryRedirect } from '@/components/panel/panel-query-redirect';



/** Rutas legacy bajo /panel: auth + redirecciones en cada page. */

export default function PanelLayout({ children }: { children: React.ReactNode }) {

    return (

        <>

            <Suspense fallback={null}>

                <PanelQueryRedirect />

            </Suspense>

            <AuthGuard>

                <SubscriptionGate>

                    <PanelConfirmProvider>{children}</PanelConfirmProvider>

                </SubscriptionGate>

            </AuthGuard>

        </>

    );

}

