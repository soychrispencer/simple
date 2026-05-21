'use client';

import { ReactNode, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    type Profiles,
    type Serenata,
    type SerenataGroup,
    type SerenataPackage,
    type MusicianDirectoryItem,
    type Invitation,
    type SerenatasUser,
    type ProviderGroup,
    type ProviderGroupService,
} from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { appearsInOwnerSolicitudes } from '@/lib/serenata-pending';
import {
    groupSlugFromPanelPath,
    miNegocioTabFromPanelPath,
    panelSectionHref,
} from '@/lib/panel-routes';
import { publicMariachiPath } from '@/lib/public-mariachi-routes';
import { useSerenataRequestModal } from '@/components/serenata-request/serenata-request-modal-context';
import { PanelNotice, PanelPageHeader } from '@simple/ui';

const AgendaView = dynamic(() => import('@/components/panel/agenda-view').then((mod) => mod.AgendaView));
const ProfileView = dynamic(() => import('@/components/panel/account-view').then((mod) => mod.ProfileView));
const HomeView = dynamic(() => import('@/components/panel/home-view').then((mod) => mod.HomeView));
const InvitationsView = dynamic(() => import('@/components/panel/invitations-view').then((mod) => mod.InvitationsView));
const MapView = dynamic(() => import('@/components/panel/map-view').then((mod) => mod.MapView));
const ClientSerenatasView = dynamic(() =>
    import('@/components/panel/serenatas-view').then((mod) => mod.ClientSerenatasView),
);
const ContractSerenataView = dynamic(() =>
    import('@/components/panel/serenatas-view').then((mod) => mod.ContractSerenataView),
);
const MusicianSerenatasView = dynamic(() =>
    import('@/components/panel/serenatas-view').then((mod) => mod.MusicianSerenatasView),
);
const SerenatasView = dynamic(() => import('@/components/panel/serenatas-view').then((mod) => mod.SerenatasView));
const GroupsMarketplaceView = dynamic(() =>
    import('@/components/panel/groups-marketplace-view').then((mod) => mod.GroupsMarketplaceView),
);
const GroupDetailView = dynamic(() =>
    import('@/components/panel/group-detail-view').then((mod) => mod.GroupDetailView),
);
const MiNegocioView = dynamic(() =>
    import('@/components/panel/mi-negocio-view').then((mod) => mod.MiNegocioView),
);

export type PanelContentProps = {
    section: Section;
    mode: AppMode;
    ownerFeaturesEnabled: boolean;
    profiles: Profiles;
    accountUser: SerenatasUser | null;
    serenatas: Serenata[];
    ownerSerenatas: Serenata[];
    ownerClosureSerenatas: Serenata[];
    groups: SerenataGroup[];
    packages: SerenataPackage[];
    musicians: MusicianDirectoryItem[];
    invitations: Invitation[];
    agendaDate: string;
    agendaItems: Serenata[];
    routeItems: Serenata[];
    setAgendaDate: (date: string) => void;
    setSection: (section: Section, query?: Record<string, string | null | undefined>) => void;
    router: ReturnType<typeof useRouter>;
    selectedSerenataId: string | null;
    panelAction: string | null;
    clearPanelAction: () => void;
    openClientRequest: () => void;
    refresh: () => Promise<void>;
    refreshAgenda: () => Promise<void>;
    agendaLoading?: boolean;
    accountSuspended?: boolean;
};

export function PanelContent(props: PanelContentProps) {
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const { openRequest } = useSerenataRequestModal();

    const grupoSlug = groupSlugFromPanelPath(pathname) || searchParams.get('grupo') || '';

    const openGroupDetail = useCallback(
        (slug: string) => {
            props.router.push(publicMariachiPath(slug));
        },
        [props.router],
    );

    const openRequestFromPanel = useCallback(
        (group: ProviderGroup, service: ProviderGroupService) => {
            openRequest({ group, service });
        },
        [openRequest],
    );

    const backToGrupos = useCallback(() => {
        props.setSection('mariachis');
    }, [props]);

    const needsGrupoSlug = props.section === 'grupo' && !grupoSlug;

    useEffect(() => {
        if (needsGrupoSlug) {
            backToGrupos();
        }
    }, [needsGrupoSlug, backToGrupos]);

    if (props.section === 'profile') {
        return (
            <ProfileView
                profiles={props.profiles}
                mode={props.mode}
                accountUser={props.accountUser}
                refresh={props.refresh}
                setSection={props.setSection}
            />
        );
    }

    if (props.section === 'contratar') {
        return (
            <PanelSectionPage title="Contratar serenata" description="Marketplace de mariachis.">
                <ContractSerenataView onExploreGroups={props.openClientRequest} />
            </PanelSectionPage>
        );
    }

    if (props.section === 'mariachis' || props.section === 'grupos') {
        if (props.mode !== 'client') {
            return (
                <PanelSectionPage title="Explorar Mariachis" description="Disponible en modo Cliente.">
                    <PanelNotice tone="warning">
                        <strong>Explorar mariachis requiere modo Cliente</strong>
                    </PanelNotice>
                </PanelSectionPage>
            );
        }
        return (
            <PanelSectionPage title="Explorar Mariachis" description="">
                <GroupsMarketplaceView onOpenGroup={openGroupDetail} />
            </PanelSectionPage>
        );
    }

    if (props.section === 'grupo') {
        if (!grupoSlug) {
            return null;
        }
        return (
            <PanelSectionPage title="Mariachi" description="Servicios y solicitud directa.">
                <GroupDetailView
                    slug={grupoSlug}
                    onBack={backToGrupos}
                    onRequest={openRequestFromPanel}
                />
            </PanelSectionPage>
        );
    }

    if (props.section === 'solicitar') {
        return null;
    }

    if (props.section === 'mi-negocio' || props.section === 'servicios' || props.section === 'groups') {
        const tab = miNegocioTabFromPanelPath(pathname, searchParams.toString());
        return props.mode === 'work' && props.ownerFeaturesEnabled ? (
            <PanelSectionPage
                title="Mi Negocio"
                description="Marca comercial (mariachi), servicios y grupos de músicos."
            >
                <MiNegocioView
                    tab={tab}
                    musicians={props.musicians}
                    refresh={props.refresh}
                />
            </PanelSectionPage>
        ) : (
            <PanelHomePage {...props} />
        );
    }

    if (props.section === 'solicitudes') {
        return props.mode === 'work' && props.ownerFeaturesEnabled ? (
            <PanelSectionPage
                title="Solicitudes"
                description="Revisa nuevas solicitudes, acepta y organiza el equipo que tocará."
            >
                <SerenatasView
                    serenatas={props.ownerSerenatas.filter(appearsInOwnerSolicitudes)}
                    groups={props.groups}
                    musicians={props.musicians}
                    selectedSerenataId={props.selectedSerenataId}
                    action={props.accountSuspended ? null : props.panelAction}
                    clearAction={props.clearPanelAction}
                    refresh={props.refresh}
                    isSolicitudesMode
                    onAgendaDeepLink={(serenataId) => {
                        props.setSection('agenda', { serenata: serenataId });
                    }}
                />
            </PanelSectionPage>
        ) : (
            <PanelHomePage {...props} />
        );
    }

    if (props.section === 'serenatas') {
        if (props.mode === 'work') {
            return (
                <PanelSectionPage title="Mis serenatas" description="Serenatas de los grupos donde participas.">
                    <MusicianSerenatasView serenatas={props.serenatas} />
                </PanelSectionPage>
            );
        }
        return (
            <PanelSectionPage title="Mis Serenatas" description="Historial y seguimiento de las serenatas que contrataste.">
                <ClientSerenatasView
                    serenatas={props.serenatas}
                    action={props.panelAction}
                    clearAction={props.clearPanelAction}
                    onContract={props.openClientRequest}
                    refresh={props.refresh}
                />
            </PanelSectionPage>
        );
    }

    if (props.section === 'invitations') {
        return props.mode === 'work' ? (
            <PanelSectionPage title="Invitaciones" description="Acepta o rechaza invitaciones de grupos.">
                <InvitationsView profiles={props.profiles} invitations={props.invitations} refresh={props.refresh} />
            </PanelSectionPage>
        ) : (
            <PanelHomePage {...props} />
        );
    }

    if (props.section === 'agenda') {
        return (
            <PanelSectionPage title="Agenda" description="Resumen de tus serenatas programadas y ganancias.">
                <AgendaView
                    mode={props.mode}
                    ownerFeaturesEnabled={props.ownerFeaturesEnabled}
                    profiles={props.profiles}
                    date={props.agendaDate}
                    setDate={props.setAgendaDate}
                    items={props.agendaItems}
                    groups={props.groups}
                    packages={props.packages}
                    refresh={props.refresh}
                    refreshAgenda={props.refreshAgenda}
                    agendaLoading={props.agendaLoading}
                    closurePendingTotal={
                        props.ownerFeaturesEnabled ? props.ownerClosureSerenatas.length : 0
                    }
                />
            </PanelSectionPage>
        );
    }

    if (props.section === 'map') {
        return props.mode === 'work' && props.ownerFeaturesEnabled ? (
            <PanelSectionPage
                title="Mapa y rutas"
                description="Visualiza la ruta sugerida y los puntos de encuentro del día."
            >
                <MapView
                    date={props.agendaDate}
                    setDate={props.setAgendaDate}
                    items={props.routeItems}
                />
            </PanelSectionPage>
        ) : (
            <PanelHomePage {...props} />
        );
    }

    return <PanelHomePage {...props} />;
}

function PanelHomePage(props: PanelContentProps) {
    const title = 'Mi panel';
    const description =
        props.mode === 'work'
            ? 'Resumen de invitaciones, serenatas y operación.'
            : 'Resumen de tus serenatas y datos de cuenta.';

    return (
        <PanelSectionPage title={title} description={description}>
            <HomeView
                mode={props.mode}
                ownerFeaturesEnabled={props.ownerFeaturesEnabled}
                profiles={props.profiles}
                serenatas={props.serenatas}
                ownerSerenatas={props.ownerSerenatas}
                ownerClosureSerenatas={props.ownerClosureSerenatas}
                agendaItems={props.agendaItems}
                groups={props.groups}
                invitations={props.invitations}
                setSection={props.setSection}
                openClientRequest={props.accountSuspended ? undefined : props.openClientRequest}
                accountSuspended={props.accountSuspended}
                refresh={props.refresh}
            />
        </PanelSectionPage>
    );
}

function PanelSectionPage({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="grid w-full min-w-0 max-w-full gap-5 lg:gap-6">
            <PanelPageHeader title={title} description={description} />
            {children}
        </div>
    );
}
