'use client';

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { panelPathFromSection } from '@/lib/panel-routes';
import { PanelButton, PanelConfirmProvider, PanelNotice } from '@simple/ui/panel';

import { useAuth } from '@simple/auth';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { useSerenata, type Section } from '@/context/serenata-context';
import { ScreenShell } from '@/components/layout/screen-shell';
import { PublicLanding } from '@/components/auth/public-landing';
import { defaultPublicLinks } from '@/components/layout/landing-header';
import { EmailVerificationGate } from '@/components/auth/email-verification-gate';

// Modular Panel Parts
import { PanelContent } from '@/components/panel/panel-content';
import { SerenataPanelShell } from '@/components/panel/panel-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';

import { suspendedAccountNotice } from '@/lib/suspended-notice';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';
import { persistSignupProfile } from '@/lib/signup-profile';

/**
 * Panel de trabajo: rutas `/panel/*` + compat `/?section=` → redirect en `LegacySectionRedirect`.
 * Chrome: header compacto + `SerenataPanelShell` (sidebar / bottom nav).
 */
export function SerenatasApp() {
    const {
        user,
        isLoggedIn,
        authLoading,
        accountUser,
        mode,
        profiles,
        ownerFeaturesEnabled: ownerFeatures,
        section,
        changeSection,
        serenatas,
        ownerSerenatas,
        ownerClosureSerenatas,
        groups,
        packages,
        musicians,
        invitations,
        agendaDate,
        setAgendaDate,
        agendaItems,
        routeItems,
        agendaLoading,
        loadState,
        refresh,
        refreshAgenda,
        checkoutStatus,
        setCheckoutStatus,
    } = useSerenata();

    const { openAuth, refreshSession } = useAuth();
    const logoutAndGoHome = useLogoutAndGoHome();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const searchParams = useSearchParams();

    const selectedSerenataId = searchParams.get('serenata');
    const panelAction = searchParams.get('action');

    const clearPanelAction = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        const query = params.toString();
        const base = pathname.startsWith('/panel') ? panelPathFromSection(section) : '/';
        router.replace(query ? `${base}?${query}` : base, { scroll: false });
    }, [pathname, router, searchParams, section]);

    const openClientRequest = useCallback(() => {
        router.push(CLIENT_MARKETPLACE_HREF);
    }, [router]);

    const isSuspended = user?.status === 'suspended';
    const isPanelRoute = pathname.startsWith('/panel');

    const openRegisterAs = useCallback(
        (profile: 'client' | 'musician') => {
            persistSignupProfile(profile);
            openAuth('register');
        },
        [openAuth],
    );

    if (!isLoggedIn) {
        return (
            <ScreenShell>
                <PublicLanding
                    onLogin={() => openAuth('login')}
                    onRegisterClient={() => openRegisterAs('client')}
                    onRegisterMusician={() => openRegisterAs('musician')}
                />
            </ScreenShell>
        );
    }

    if (user && user.status !== 'verified') {
        return (
            <ScreenShell>
                <EmailVerificationGate
                    email={user.email}
                    logout={logoutAndGoHome}
                    refreshSession={refreshSession}
                />
            </ScreenShell>
        );
    }

    if (!isPanelRoute) {
        return (
            <ScreenShell>
                <PublicLanding
                    isLoggedIn
                    header={
                        <SerenatasChromeHeader
                            mode={mode}
                            profiles={profiles}
                            publicLinks={defaultPublicLinks}
                        />
                    }
                    onLogin={() => openAuth('login')}
                    onRegisterClient={() => openRegisterAs('client')}
                    onRegisterMusician={() => openRegisterAs('musician')}
                />
            </ScreenShell>
        );
    }

    if (loadState === 'error') {
        return (
            <ScreenShell>
                <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
                    <h2 className="text-xl font-bold">Ocurrió un error al cargar tus datos</h2>
                    <PanelButton onClick={() => void refresh()}>Reintentar</PanelButton>
                    <PanelButton variant="secondary" onClick={() => void logoutAndGoHome()}>Cerrar sesión</PanelButton>
                </div>
            </ScreenShell>
        );
    }


    return (
        <PanelConfirmProvider>
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--fg)]">
            <SerenatasChromeHeader mode={mode} profiles={profiles} />

            <SerenataPanelShell section={section} onSectionChange={changeSection}>
                <div className="panel-page container-app mx-auto min-w-0 max-w-7xl py-4 lg:py-8">
                        {isSuspended ? (
                            <PanelNotice tone="error" className="mb-4">
                                {suspendedAccountNotice(mode)}
                            </PanelNotice>
                        ) : null}
                        {checkoutStatus.loading ? (
                            <PanelNotice className="mb-4">Confirmando tu pago…</PanelNotice>
                        ) : null}
                        {checkoutStatus.ok ? (
                            <PanelNotice tone="success" className="mb-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{checkoutStatus.ok}</span>
                                    <button
                                        type="button"
                                        className="text-xs font-medium underline"
                                        onClick={() => setCheckoutStatus({ loading: false, error: null, ok: null })}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </PanelNotice>
                        ) : null}
                        {checkoutStatus.error ? (
                            <PanelNotice tone="error" className="mb-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{checkoutStatus.error}</span>
                                    <button
                                        type="button"
                                        className="text-xs font-medium underline"
                                        onClick={() => setCheckoutStatus({ loading: false, error: null, ok: null })}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </PanelNotice>
                        ) : null}
                        <PanelContent
                            section={section}
                            mode={mode}
                            ownerFeaturesEnabled={ownerFeatures}
                            profiles={profiles}
                            accountSuspended={isSuspended}
                            accountUser={accountUser}
                            serenatas={serenatas}
                            ownerSerenatas={ownerSerenatas}
                            ownerClosureSerenatas={ownerClosureSerenatas}
                            groups={groups}
                            packages={packages}
                            musicians={musicians}
                            invitations={invitations}
                            agendaDate={agendaDate}
                            agendaItems={agendaItems}
                            routeItems={routeItems}
                            setAgendaDate={setAgendaDate}
                            setSection={changeSection}
                            router={router}
                            selectedSerenataId={selectedSerenataId}
                            panelAction={panelAction}
                            clearPanelAction={clearPanelAction}
                            openClientRequest={openClientRequest}
                            refresh={refresh}
                            refreshAgenda={refreshAgenda}
                            agendaLoading={agendaLoading}
                        />
                </div>
            </SerenataPanelShell>
        </div>
        </PanelConfirmProvider>
    );
}
