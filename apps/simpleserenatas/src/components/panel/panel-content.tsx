'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    type Profiles, type Serenata, type SerenataGroup, type SerenataPackage, type MusicianDirectoryItem, type Invitation, type SerenatasUser,
} from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { appearsInOwnerSolicitudes } from '@/lib/serenata-pending';
import { miNegocioTabFromPanelPath } from '@/lib/panel-routes';
import { PanelNotice } from '@simple/ui/panel';
import { PanelPageHeader } from '@simple/ui/panel';

const AgendaView = dynamic(() => import('@/components/panel/agenda-view').then((mod) => mod.AgendaView));
const ProfileView = dynamic(() => import('@/components/panel/account-view').then((mod) => mod.ProfileView));
const HomeView = dynamic(() => import('@/components/panel/home-view').then((mod) => mod.HomeView));
const InvitationsView = dynamic(() => import('@/components/panel/invitations-view').then((mod) => mod.InvitationsView));
const MapView = dynamic(() => import('@/components/panel/map-view').then((mod) => mod.MapView));
const ClientSerenatasView = dynamic(() =>
    import('@/components/panel/serenatas-view').then((mod) => mod.ClientSerenatasView),
);
const MusicianSerenatasView = dynamic(() =>
    import('@/components/panel/serenatas-view').then((mod) => mod.MusicianSerenatasView),
);
const SerenatasView = dynamic(() => import('@/components/panel/serenatas-view').then((mod) => mod.SerenatasView));
const ClientMarketplaceRedirect = dynamic(() =>
    import('@/components/panel/client-marketplace-redirect').then((mod) => mod.ClientMarketplaceRedirect),
);
const MiNegocioView = dynamic(() =>
    import('@/components/panel/mi-negocio-view').then((mod) => mod.MiNegocioView),
);
const GuardadosView = dynamic(() =>
    import('@/components/panel/guardados-view').then((mod) => mod.GuardadosView),
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
    router: ReturnType<typeof import('next/navigation').useRouter>;
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

    if (props.section === 'mariachis' || props.section === 'grupos' || props.section === 'contratar') {
        if (props.mode === 'client') {
            return <ClientMarketplaceRedirect />;
        }
        return (
            <PanelSectionPage title="Mariachis" description="Disponible para cuentas cliente.">
                <PanelNotice tone="warning">
                    <strong>Explorar mariachis requiere una cuenta cliente</strong>
                </PanelNotice>
            </PanelSectionPage>
        );
    }

    if (props.section === 'grupo' || props.section === 'solicitar') {
        return null;
    }

    if (props.section === 'mi-negocio' || props.section === 'servicios' || props.section === 'groups') {
        const tab = miNegocioTabFromPanelPath(pathname, searchParams.toString());
        return props.mode === 'work' && props.ownerFeaturesEnabled ? (
            <PanelSectionPage
                title="Mi negocio"
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

    if (props.section === 'guardados') {
        if (props.mode !== 'client') {
            return (
                <PanelSectionPage title="Guardados" description="Disponible para cuentas cliente.">
                    <PanelNotice tone="warning">
                        <strong>Los mariachis guardados están disponibles en el perfil de cliente.</strong>
                    </PanelNotice>
                </PanelSectionPage>
            );
        }
        return (
            <PanelSectionPage title="Guardados" description="Mariachis que marcaste desde el catálogo.">
                <div className="-mt-2 mb-1 flex justify-end">
                    <Link href="/mariachis" className="text-sm font-medium text-accent hover:underline">
                        Explorar catálogo
                    </Link>
                </div>
                <GuardadosView />
            </PanelSectionPage>
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
            <PanelSectionPage title="Mis serenatas" description="Historial y seguimiento de las serenatas que contrataste.">
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
            : 'Seguimiento de tus serenatas contratadas y acceso al marketplace.';

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
