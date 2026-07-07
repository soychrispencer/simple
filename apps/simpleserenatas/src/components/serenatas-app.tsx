'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { panelPathFromSection, usesOwnPanelPageShell } from '@/lib/panel-routes';
import { PanelButton, PanelConfirmProvider, PanelNotice } from '@simple/ui/panel';

import { useAuth, EmailVerificationGate } from '@simple/auth';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { useSerenata, type Section } from '@/context/serenata-context';
import { ScreenShell } from '@/components/layout/screen-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { PublicLanding } from '@/components/auth/public-landing';
import { PanelContent } from '@/components/panel/panel-content';
import { SerenatasPanelChrome } from '@/components/panel/serenatas-panel-chrome';

import { suspendedAccountNotice } from '@/lib/suspended-notice';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';

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

    useEffect(() => {
        if (panelAction !== 'create' || section !== 'solicitudes' || !ownerFeatures) return;
        changeSection('agenda', { action: 'create' });
    }, [changeSection, ownerFeatures, panelAction, section]);

    useEffect(() => {
        if (authLoading || isLoggedIn) return;
        const authAction = searchParams.get('auth');
        if (authAction !== 'register' && authAction !== 'login') return;
        openAuth(authAction);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('auth');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [authLoading, isLoggedIn, openAuth, pathname, router, searchParams]);

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
    const usesOwnPageShell = usesOwnPanelPageShell(section);
    const hasPanelNotices =
        isSuspended || checkoutStatus.loading || checkoutStatus.ok || checkoutStatus.error;

    const panelNotices = (
        <>
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
        </>
    );

    const panelContent = (
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
    );

    if (!isLoggedIn) {
        return (
            <ScreenShell>
                <PublicLanding
                    onLogin={() => openAuth('login')}
                    onRegister={() => openAuth('register')}
                />
            </ScreenShell>
        );
    }

    if (user && user.status !== 'verified') {
        return (
            <ScreenShell>
                <EmailVerificationGate
                    appLabel="SimpleSerenatas"
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
                        <SerenatasChromeHeader mode={mode} profiles={profiles} />
                    }
                    onLogin={() => openAuth('login')}
                    onRegister={() => openAuth('register')}
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
            <SerenatasPanelChrome
                section={section}
                onSectionChange={changeSection}
                shellOwned={usesOwnPageShell}
                notices={hasPanelNotices ? panelNotices : undefined}
            >
                {panelContent}
            </SerenatasPanelChrome>
        </PanelConfirmProvider>
    );
}
