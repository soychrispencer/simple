'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IconCar, IconChevronRight, IconShoppingBag } from '@tabler/icons-react';
import { fetchMyPanelListings, type PanelListing } from '@/lib/panel-listings';
import { getListingCoverUrl } from '@/lib/listing-media';
import { PanelIntentSelector } from '@/components/panel/panel-intent-selector';
import {
    fetchAccountWorkspace,
    fetchCurrentAccountContext,
    fetchVerticalOnboarding,
    type AccountWorkspaceState,
} from '@simple/utils';
import {
    PanelBlockHeader, PanelButton, PanelCard, PanelList, PanelListRow, PanelNotice, PanelPageHeader, PanelStatCard,
} from '@simple/ui/panel';

const WORKSPACE_SETUP_DISMISSED_PREFIX = 'simpleautos:workspace-setup-dismissed-session';

const OPERATOR_PANEL_DESCRIPTIONS: Record<string, string> = {
    owner: 'Tus vehículos publicados y las consultas que recibes para vender o arrendar.',
    independent_seller: 'Tu inventario, conversaciones y seguimiento comercial en un solo panel.',
    buyer_agent: 'Presenta tu asesoría y organiza las consultas de las personas que acompañas.',
    importer: 'Presenta tu oferta de vehículos importados y sigue las consultas que genera.',
    fleet_broker: 'Gestiona tu cartera de arriendo o leasing y las consultas asociadas.',
    dealership: 'Coordina el stock y las consultas de tu automotora desde el mismo espacio.',
    rent_a_car: 'Presenta tu flota de arriendo y revisa las consultas de cada vehículo.',
    consignment: 'Organiza los vehículos en consignación y sigue sus contactos desde el panel.',
    workshop: 'Presenta tus servicios automotrices y atiende las consultas desde el panel.',
};

function formatAgo(updatedAt: number): string {
    const diffMs = Date.now() - updatedAt;
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${Math.floor(diffHours / 24)}d`;
}

export default function PanelHomePage() {
    const [items, setItems] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(true);
    const [workspaceAccountId, setWorkspaceAccountId] = useState('');
    const [workspaceSetupDismissed, setWorkspaceSetupDismissed] = useState(false);
    const [wizardIntentAlreadyHandled, setWizardIntentAlreadyHandled] = useState(false);

    useEffect(() => {
        void fetchMyPanelListings().then((result) => {
            setItems(result.items);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        void Promise.all([
            fetchAccountWorkspace('autos'),
            fetchCurrentAccountContext(),
            fetchVerticalOnboarding('autos'),
        ]).then(([workspace, context, onboarding]) => {
            setWorkspaceState(workspace ?? { workspace: null, canManage: true, memberRole: null });
            const accountId = context?.account?.id ?? workspace?.workspace?.accountId ?? '';
            setWorkspaceAccountId(accountId);
            setWizardIntentAlreadyHandled(Boolean(onboarding && (
                onboarding.shouldShow
                || onboarding.status === 'deferred'
                || (typeof onboarding.answers.firstTask === 'string' && onboarding.answers.firstTask.length > 0)
            )));
            try {
                setWorkspaceSetupDismissed(Boolean(accountId && sessionStorage.getItem(`${WORKSPACE_SETUP_DISMISSED_PREFIX}:${accountId}`) === '1'));
            } catch {
                setWorkspaceSetupDismissed(false);
            }
        }).catch(() => {
            setWorkspaceState({ workspace: null, canManage: true, memberRole: null });
            setWorkspaceSetupDismissed(false);
            setWizardIntentAlreadyHandled(false);
        }).finally(() => setWorkspaceLoading(false));
    }, []);

    useEffect(() => {
        const onWorkspaceReady = () => setWorkspaceSetupDismissed(true);
        window.addEventListener('simple:marketplace-workspace-ready', onWorkspaceReady);
        return () => window.removeEventListener('simple:marketplace-workspace-ready', onWorkspaceReady);
    }, []);

    const activeItems = useMemo(
        () => items.filter((item) => item.status === 'active' || item.status === 'paused').sort((a, b) => b.updatedAt - a.updatedAt),
        [items]
    );

    const stats = useMemo(() => {
        const totalViews = items.reduce((sum, item) => sum + item.views, 0);
        const totalFavs = items.reduce((sum, item) => sum + item.favs, 0);
        const totalLeads = items.reduce((sum, item) => sum + item.leads, 0);
        return [
            { label: 'Publicaciones', value: String(items.length), sub: `${activeItems.length} activas o pausadas` },
            { label: 'Visitas', value: totalViews.toLocaleString('es-CL'), sub: 'Datos reales del panel' },
            { label: 'Favoritos', value: totalFavs.toLocaleString('es-CL'), sub: 'Guardados acumulados' },
            { label: 'Contactos', value: totalLeads.toLocaleString('es-CL'), sub: 'Leads acumulados' },
        ];
    }, [activeItems.length, items]);

    const isAgent = workspaceState?.memberRole === 'agent';
    const isCompany = workspaceState?.workspace?.accountKind === 'company';
    const operatorSubtype = workspaceState?.workspace?.operatorSubtype ?? null;
    const operatorPanelDescription = operatorSubtype
        ? OPERATOR_PANEL_DESCRIPTIONS[operatorSubtype]
        : undefined;
    const workspaceReady = Boolean(
        workspaceState?.workspace?.onboardingCompletedAt
        || workspaceSetupDismissed
        || workspaceState?.canManage === false,
    );
    const panelTitle = !workspaceReady
        ? 'Configura tu espacio'
        : isAgent
            ? 'Mi cartera'
            : isCompany
                ? 'Panel del equipo'
                : workspaceState?.workspace?.accountKind === 'independent'
                    ? 'Mi negocio'
                    : 'Mi panel';
    const panelDescription = !workspaceReady
        ? 'Configura tu actividad para ver primero las herramientas que necesitas.'
        : isAgent
            ? 'Tus vehículos asignados, consultas y actividad reciente.'
            : operatorPanelDescription
                ? operatorPanelDescription
                : isCompany
                    ? 'Publicaciones, consultas y resultados del espacio.'
                    : 'Resumen de tus publicaciones, visitas y contactos.';

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader title={panelTitle} description={panelDescription} />

            <div className="grid gap-4">
                <PanelIntentSelector
                    hidden={loading || items.length > 0 || !workspaceReady || workspaceLoading || wizardIntentAlreadyHandled}
                    accountId={workspaceAccountId}
                    operatorSubtype={operatorSubtype}
                />
                {workspaceReady ? (
                    <>
                        {isCompany && workspaceState?.canManage ? (
                            <Link href="/panel/equipo" className="inline-flex items-center justify-end gap-1 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                Gestionar equipo <IconChevronRight size={14} />
                            </Link>
                        ) : null}

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {stats.map((item) => (
                                <PanelStatCard key={item.label} label={item.label} value={item.value} meta={item.sub} />
                            ))}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Link href="/panel/publicaciones?tab=products" className="block lg:col-span-2">
                                <PanelCard size="md" className="flex items-center justify-between gap-4 transition-opacity hover:opacity-95">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                            <IconShoppingBag size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>Productos</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Publícalos y adminístralos en Mis publicaciones.</p>
                                        </div>
                                    </div>
                                    <IconChevronRight size={14} style={{ color: 'var(--fg-faint)' }} />
                                </PanelCard>
                            </Link>

                            <PanelCard size="md">
                                <PanelBlockHeader
                                    title="Publicaciones activas"
                                    actions={(
                                        <Link href="/panel/publicaciones" className="text-sm flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            Ver todas
                                            <IconChevronRight size={11} />
                                        </Link>
                                    )}
                                />
                                {loading ? null : activeItems.length === 0 ? (
                                    <div className="space-y-3">
                                        <PanelNotice tone="neutral">Aún no tienes publicaciones activas.</PanelNotice>
                                        <Link href="/panel/publicar">
                                            <PanelButton type="button" className="w-full">Publicar mi primer vehículo</PanelButton>
                                        </Link>
                                    </div>
                                ) : (
                                    <PanelList className="border-0 rounded-2xl">
                                        {activeItems.slice(0, 5).map((item, index) => {
                                            const coverUrl = getListingCoverUrl(item);
                                            return (
                                            <PanelListRow key={item.id} divider={index > 0} className="flex items-center gap-3 px-4 py-3">
                                                <div className="w-12 h-9 rounded-md shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }}>
                                                    {coverUrl ? (
                                                        <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <IconCar size={14} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="type-listing-title line-clamp-1" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                                    <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                        {item.price} · {item.views.toLocaleString('es-CL')} visitas · {item.leads.toLocaleString('es-CL')} contactos
                                                    </div>
                                                </div>
                                                <IconChevronRight size={13} style={{ color: 'var(--fg-faint)' }} />
                                            </PanelListRow>
                                            );
                                        })}
                                    </PanelList>
                                )}
                            </PanelCard>

                            <PanelCard size="md">
                                <PanelBlockHeader title="Actividad reciente" />
                                {loading ? null : items.length === 0 ? (
                                    <div className="space-y-3">
                                        <PanelNotice tone="neutral">Cuando publiques avisos aquí verás su actividad reciente.</PanelNotice>
                                        <Link href="/panel/publicar">
                                            <PanelButton type="button" variant="secondary" className="w-full">Crear publicación</PanelButton>
                                        </Link>
                                    </div>
                                ) : (
                                    <PanelList className="border-0 rounded-2xl">
                                        {items
                                            .slice()
                                            .sort((a, b) => b.updatedAt - a.updatedAt)
                                            .slice(0, 4)
                                            .map((item, index) => (
                                                <PanelListRow key={item.id} divider={index > 0} className="flex items-start gap-3 px-4 py-2.5">
                                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--fg-muted)' }} />
                                                    <div>
                                                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                                            {item.title} quedó con estado <strong>{item.status}</strong>.
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{formatAgo(item.updatedAt)}</p>
                                                    </div>
                                                </PanelListRow>
                                            ))}
                                    </PanelList>
                                )}
                            </PanelCard>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
