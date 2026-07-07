'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PanelButton, PanelNotice, PanelPageFrame } from '@simple/ui/panel';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { useSerenata, type Section } from '@/context/serenata-context';
import { panelPathFromSection, skipsPanelPageFrame } from '@/lib/panel-routes';
import { PanelContent } from '@/components/panel/panel-content';
import { suspendedAccountNotice } from '@/lib/suspended-notice';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';

function SerenatasPanelNotices() {
    const { user, mode, checkoutStatus, setCheckoutStatus } = useSerenata();
    const isSuspended = user?.status === 'suspended';

    return (
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
}

function useSerenatasPanelNotices(): { hasPanelNotices: boolean; notices: ReactNode } {
    const { user, checkoutStatus } = useSerenata();
    const isSuspended = user?.status === 'suspended';
    const hasPanelNotices = Boolean(
        isSuspended || checkoutStatus.loading || checkoutStatus.ok || checkoutStatus.error,
    );

    return {
        hasPanelNotices,
        notices: hasPanelNotices ? <SerenatasPanelNotices /> : null,
    };
}

export function SerenatasPanelLoadError() {
    const { refresh } = useSerenata();
    const logoutAndGoHome = useLogoutAndGoHome();

    return (
        <div className="container-app panel-page flex min-h-[50vh] flex-col items-center justify-center gap-4 py-12 text-center">
            <h2 className="text-xl font-bold">Ocurrió un error al cargar tus datos</h2>
            <PanelButton onClick={() => void refresh()}>Reintentar</PanelButton>
            <PanelButton variant="secondary" onClick={() => void logoutAndGoHome()}>Cerrar sesión</PanelButton>
        </div>
    );
}

export function SerenatasPanelSectionPage({ section }: { section: Section }) {
    const {
        user,
        accountUser,
        mode,
        profiles,
        ownerFeaturesEnabled: ownerFeatures,
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
    } = useSerenata();

    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedSerenataId = searchParams.get('serenata');
    const panelAction = searchParams.get('action');
    const { hasPanelNotices, notices } = useSerenatasPanelNotices();

    useEffect(() => {
        if (panelAction !== 'create' || section !== 'solicitudes' || !ownerFeatures) return;
        changeSection('agenda', { action: 'create' });
    }, [changeSection, ownerFeatures, panelAction, section]);

    const clearPanelAction = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        const query = params.toString();
        const base = panelPathFromSection(section);
        router.replace(query ? `${base}?${query}` : base, { scroll: false });
    }, [router, searchParams, section]);

    const openClientRequest = useCallback(() => {
        router.push(CLIENT_MARKETPLACE_HREF);
    }, [router]);

    if (loadState === 'error') {
        return <SerenatasPanelLoadError />;
    }

    const isSuspended = user?.status === 'suspended';

    return (
        <PanelPageFrame shellOwned={skipsPanelPageFrame(section)} notices={hasPanelNotices ? notices : undefined}>
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
        </PanelPageFrame>
    );
}
