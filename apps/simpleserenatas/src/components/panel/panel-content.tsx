'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
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
    serenatasApi,
} from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { appearsInOwnerSolicitudes } from '@/lib/serenata-pending';
import {
    groupSlugFromPanelPath,
    miNegocioTabFromPanelPath,
    panelGroupHref,
    panelSectionHref,
    panelSolicitarHref,
} from '@/lib/panel-routes';
import {
    clearMarketplaceRequestDraftRef,
    readMarketplaceRequestDraftFromSearch,
    readMarketplaceRequestDraftRef,
    writeMarketplaceRequestDraftRef,
} from '@/lib/marketplace-request-draft';
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
const MarketplaceRequestView = dynamic(() =>
    import('@/components/panel/marketplace-request-view').then((mod) => mod.MarketplaceRequestView),
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
    const contactPhone = props.accountUser?.phone?.trim() || props.profiles.client?.phone?.trim() || '';
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const [requestDraft, setRequestDraft] = useState<{
        group: ProviderGroup;
        service: ProviderGroupService;
    } | null>(null);
    const [requestDraftRestoring, setRequestDraftRestoring] = useState(false);

    const grupoSlug = groupSlugFromPanelPath(pathname) || searchParams.get('grupo') || '';

    const openGroupDetail = useCallback(
        (slug: string) => {
            props.router.replace(panelGroupHref(slug), { scroll: false });
            props.setSection('grupo');
        },
        [props],
    );

    const openRequest = useCallback(
        (group: ProviderGroup, service: ProviderGroupService) => {
            const ref = { groupSlug: group.slug, serviceId: service.id };
            writeMarketplaceRequestDraftRef(ref);
            setRequestDraft({ group, service });
            props.setSection('solicitar');
            props.router.replace(panelSolicitarHref(ref), { scroll: false });
        },
        [props],
    );

    const backToGrupos = useCallback(() => {
        clearMarketplaceRequestDraftRef();
        setRequestDraft(null);
        props.setSection('grupos');
        props.router.replace(panelSectionHref('grupos'), { scroll: false });
    }, [props]);

    useEffect(() => {
        if (props.section !== 'solicitar' || requestDraft) return;
        const stored =
            readMarketplaceRequestDraftFromSearch(searchParams.toString()) ?? readMarketplaceRequestDraftRef();
        if (!stored) return;

        let cancelled = false;
        setRequestDraftRestoring(true);
        void (async () => {
            const groupResponse = await serenatasApi.marketplaceGroupBySlug(stored.groupSlug);
            if (cancelled || !groupResponse.ok || !groupResponse.item) {
                if (!cancelled) clearMarketplaceRequestDraftRef();
                return;
            }
            const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
            if (cancelled || !servicesResponse.ok) {
                if (!cancelled) clearMarketplaceRequestDraftRef();
                return;
            }
            const service = servicesResponse.items.find((item) => item.id === stored.serviceId);
            if (!service) {
                clearMarketplaceRequestDraftRef();
                return;
            }
            setRequestDraft({ group: groupResponse.item, service });
        })().finally(() => {
            if (!cancelled) setRequestDraftRestoring(false);
        });

        return () => {
            cancelled = true;
        };
    }, [props.section, requestDraft, searchParams]);

    const needsGrupoSlug = props.section === 'grupo' && !grupoSlug;
    const hasStoredRequestDraft =
        props.section === 'solicitar' &&
        !requestDraft &&
        Boolean(
            readMarketplaceRequestDraftFromSearch(searchParams.toString()) ?? readMarketplaceRequestDraftRef(),
        );
    const needsRequestDraft =
        props.section === 'solicitar' && !requestDraft && !requestDraftRestoring && !hasStoredRequestDraft;

    useEffect(() => {
        if (needsGrupoSlug || needsRequestDraft) {
            backToGrupos();
        }
    }, [needsGrupoSlug, needsRequestDraft, backToGrupos]);

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
            <PanelSectionPage title="Contratar serenata" description="Marketplace de grupos de mariachis.">
                <ContractSerenataView onExploreGroups={props.openClientRequest} />
            </PanelSectionPage>
        );
    }

    if (props.section === 'grupos') {
        if (props.mode !== 'client') {
            return (
                <PanelSectionPage title="Mariachis" description="Disponible en modo Cliente.">
                    <PanelNotice tone="warning">
                        <strong>Explorar mariachis requiere modo Cliente</strong>
                    </PanelNotice>
                </PanelSectionPage>
            );
        }
        return (
            <PanelSectionPage
                title="Grupos de mariachis"
                description="Explora grupos de mariachis y solicita el servicio que prefieras."
            >
                <GroupsMarketplaceView setSection={props.setSection} onOpenGroup={openGroupDetail} />
            </PanelSectionPage>
        );
    }

    if (props.section === 'grupo') {
        if (!grupoSlug) {
            return null;
        }
        return (
            <PanelSectionPage title="Grupo de mariachis" description="Servicios y solicitud directa.">
                <GroupDetailView
                    slug={grupoSlug}
                    onBack={backToGrupos}
                    onRequest={openRequest}
                />
            </PanelSectionPage>
        );
    }

    if (props.section === 'solicitar') {
        if (!requestDraft) {
            if (requestDraftRestoring || hasStoredRequestDraft) {
                return <p className="text-sm text-fg-muted">Cargando solicitud…</p>;
            }
            return null;
        }
        return (
            <PanelSectionPage title="Solicitar serenata" description="Completa los datos del evento.">
                <MarketplaceRequestView
                    group={requestDraft.group}
                    service={requestDraft.service}
                    contactPhone={contactPhone}
                    onBack={() => {
                        openGroupDetail(requestDraft.group.slug);
                    }}
                    onSuccess={() => {
                        clearMarketplaceRequestDraftRef();
                        setRequestDraft(null);
                        props.setSection('serenatas');
                        props.router.replace(panelSectionHref('serenatas'), { scroll: false });
                        void props.refresh();
                    }}
                />
            </PanelSectionPage>
        );
    }

    if (props.section === 'mi-negocio' || props.section === 'servicios' || props.section === 'groups') {
        const tab = miNegocioTabFromPanelPath(pathname, searchParams.toString());
        return props.mode === 'work' && props.ownerFeaturesEnabled ? (
            <PanelSectionPage
                title="Mi Negocio"
                description="Perfil público, servicios y grupos con los que operas como dueño."
            >
                <MiNegocioView
                    tab={tab}
                    musicians={props.musicians}
                    refresh={props.refresh}
                    setSection={props.setSection}
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
        <div className="grid w-full gap-5 lg:gap-6">
            <PanelPageHeader title={title} description={description} />
            {children}
        </div>
    );
}
