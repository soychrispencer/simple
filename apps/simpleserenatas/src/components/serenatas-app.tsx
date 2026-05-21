'use client';

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { panelPathFromSection } from '@/lib/panel-routes';
import { PanelConfirmProvider, PanelNotice } from '@simple/ui';

import { useAuth } from '@simple/auth';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { useSerenata, type Section } from '@/context/serenata-context';
import { ScreenShell } from '@/components/layout/screen-shell';
import { PublicLanding } from '@/components/auth/public-landing';
import { EmailVerificationGate } from '@/components/auth/email-verification-gate';
import { SkeletonCard } from '@/components/panel/skeleton';

// Modular Panel Parts
import { PanelContent } from '@/components/panel/panel-content';
import { SerenataPanelShell } from '@/components/panel/panel-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';

import { suspendedAccountNotice } from '@/lib/suspended-notice';
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
        changeMode,
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
        changeSection('mariachis');
    }, [changeSection]);

    const isSuspended = user?.status === 'suspended';

    const openRegisterAs = useCallback(
        (profile: 'client' | 'musician') => {
            persistSignupProfile(profile);
            openAuth('register');
        },
        [openAuth],
    );

    if (authLoading || loadState === 'loading') {
        return (
            <ScreenShell>
                <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-8">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </ScreenShell>
        );
    }

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

    if (loadState === 'error') {
        return (
            <ScreenShell>
                <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
                    <h2 className="text-xl font-bold">Ocurrió un error al cargar tus datos</h2>
                    <button className="btn btn-primary" onClick={() => void refresh()}>Reintentar</button>
                    <button className="btn btn-ghost" onClick={() => void logoutAndGoHome()}>Cerrar sesión</button>
                </div>
            </ScreenShell>
        );
    }


    return (
        <PanelConfirmProvider>
        <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
            <SerenatasChromeHeader
                mode={mode}
                profiles={profiles}
                onModeChange={changeMode}
            />

            <SerenataPanelShell section={section} onSectionChange={changeSection}>
                <div className="panel-page container-app mx-auto max-w-7xl py-4 lg:py-8">
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
