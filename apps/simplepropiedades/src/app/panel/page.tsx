'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IconChevronRight, IconHome, IconShoppingBag, IconUsers } from '@tabler/icons-react';
import { fetchMyPanelListings, type PanelListing } from '@/lib/panel-listings';
import { getListingCoverUrl } from '@/lib/listing-media';
import { PanelRoleWorkspace } from '@/components/panel/panel-role-workspace';
import { PanelIntentSelector } from '@/components/panel/panel-intent-selector';
import {
    fetchAccountWorkspace,
    fetchCurrentAccountContext,
    fetchMarketplaceOperatorAnalytics,
    type AccountWorkspaceState,
    type MarketplaceOperatorAnalytics,
} from '@simple/utils';
import {
    PanelBlockHeader, PanelButton, PanelCard, PanelList, PanelListRow, PanelNotice, PanelPageHeader, PanelStatCard,
    AccountWorkspaceSetup,
    announceMarketplaceWorkspaceReady,
} from '@simple/ui/panel';

const WORKSPACE_SETUP_DISMISSED_PREFIX = 'simplepropiedades:workspace-setup-dismissed-session';
const WORKSPACE_INTENT_DISMISSED_PREFIX = 'simplepropiedades-panel-intent-dismissed-v1';

function formatAgo(updatedAt: number): string {
    const diffMs = Date.now() - updatedAt;
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${Math.floor(diffHours / 24)}d`;
}

export default function PanelHomePage() {
    const [items, setItems] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [operatorAnalytics, setOperatorAnalytics] = useState<MarketplaceOperatorAnalytics | null>(null);
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(true);
    const [workspaceAccountIsPersonal, setWorkspaceAccountIsPersonal] = useState<boolean | null>(null);
    const [workspaceAccountId, setWorkspaceAccountId] = useState('');
    const [workspaceSetupDismissed, setWorkspaceSetupDismissed] = useState(false);
    const [workspaceIntentDismissed, setWorkspaceIntentDismissed] = useState(false);

    useEffect(() => {
        void fetchMyPanelListings().then((result) => {
            setItems(result.items);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        void fetchMarketplaceOperatorAnalytics('propiedades').then(setOperatorAnalytics);
    }, []);

    useEffect(() => {
        void Promise.all([
            fetchAccountWorkspace('propiedades'),
            fetchCurrentAccountContext(),
        ]).then(([workspace, context]) => {
            const accountId = context?.account?.id ?? workspace?.workspace?.accountId ?? '';
            setWorkspaceAccountId(accountId);
            setWorkspaceAccountIsPersonal(context?.account?.isPersonal ?? null);
            setWorkspaceState(workspace ?? { workspace: null, canManage: true, memberRole: null });
            const activityKey = workspace?.workspace?.operatorSubtype?.trim() || 'default';
            try {
                setWorkspaceSetupDismissed(Boolean(accountId && sessionStorage.getItem(`${WORKSPACE_SETUP_DISMISSED_PREFIX}:${accountId}`) === '1'));
            } catch {
                setWorkspaceSetupDismissed(false);
            }
            try {
                setWorkspaceIntentDismissed(Boolean(accountId && (
                    localStorage.getItem(`${WORKSPACE_INTENT_DISMISSED_PREFIX}:${accountId}:${activityKey}`) === '1'
                    || localStorage.getItem(`${WORKSPACE_INTENT_DISMISSED_PREFIX}:${accountId}`) === '1'
                )));
            } catch {
                setWorkspaceIntentDismissed(false);
            }
        }).catch(() => {
            setWorkspaceState({ workspace: null, canManage: true, memberRole: null });
            setWorkspaceAccountIsPersonal(null);
            setWorkspaceSetupDismissed(false);
            setWorkspaceIntentDismissed(false);
        }).finally(() => setWorkspaceLoading(false));
    }, []);

    function dismissWorkspaceSetup() {
        try {
            if (workspaceAccountId) sessionStorage.setItem(`${WORKSPACE_SETUP_DISMISSED_PREFIX}:${workspaceAccountId}`, '1');
        } catch {
            // La configuración sigue disponible desde Mi negocio.
        }
        setWorkspaceSetupDismissed(true);
        announceMarketplaceWorkspaceReady();
    }

    const activeItems = useMemo(
        () => items.filter((item) => item.status === 'active' || item.status === 'paused').sort((a, b) => b.updatedAt - a.updatedAt),
        [items]
    );
    const workspaceReady = Boolean(
        workspaceState?.memberRole === 'agent'
        || workspaceState?.workspace?.onboardingCompletedAt
        || workspaceSetupDismissed
    );
    const panelDescription = workspaceState?.memberRole === 'agent'
        ? 'Tu cartera, conversaciones y próximos pasos en un solo lugar.'
        : workspaceReady
            ? 'Resumen de publicaciones, alcance y contactos.'
            : 'Configura cómo trabajas para ver primero las herramientas que necesitas.';
    const firstPublishHref = workspaceState?.workspace?.operatorSubtype === 'developer'
        ? '/panel/publicar?op=project'
        : '/panel/publicar';

    const stats = useMemo(() => {
        const totalViews = items.reduce((sum, item) => sum + item.views, 0);
        const totalFavs = items.reduce((sum, item) => sum + item.favs, 0);
        const totalLeads = items.reduce((sum, item) => sum + item.leads, 0);
        return [
            { label: 'Publicaciones', value: String(items.length), sub: `${activeItems.length} activas o pausadas` },
            { label: 'Vistas', value: totalViews.toLocaleString('es-CL'), sub: 'A tus publicaciones' },
            { label: 'Favoritos', value: totalFavs.toLocaleString('es-CL'), sub: 'Propiedades guardadas' },
            { label: 'Contactos', value: totalLeads.toLocaleString('es-CL'), sub: 'Consultas recibidas' },
        ];
    }, [activeItems.length, items]);

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader title="Mi panel" description={panelDescription} />

            <div className="grid gap-4">
                <AccountWorkspaceSetup
                    vertical="propiedades"
                    state={workspaceState}
                    loading={workspaceLoading}
                    dismissed={workspaceSetupDismissed}
                    isPersonalAccount={workspaceAccountIsPersonal}
                    onSaved={(nextState, accountChanged) => {
                        setWorkspaceState(nextState);
                        announceMarketplaceWorkspaceReady();
                        if (accountChanged) window.location.reload();
                    }}
                    onDismiss={dismissWorkspaceSetup}
                />
                <PanelIntentSelector
                    hidden={loading || workspaceLoading || items.length > 0 || !workspaceReady}
                    accountId={workspaceAccountId}
                    operatorSubtype={workspaceState?.workspace?.operatorSubtype}
                    onDismiss={() => setWorkspaceIntentDismissed(true)}
                />
                {!workspaceLoading && (
                    (
                        workspaceState?.memberRole === 'agent'
                        || Boolean(workspaceState?.workspace?.onboardingCompletedAt)
                        || workspaceSetupDismissed
                        || workspaceState?.canManage === false
                    )
                    && (items.length > 0 || workspaceIntentDismissed)
                ) ? (
                    <PanelRoleWorkspace
                        analytics={operatorAnalytics}
                        workspace={workspaceState?.workspace}
                        memberRole={workspaceState?.memberRole}
                    />
                ) : null}
                {workspaceReady ? (
                    <div className="grid gap-4">
                        {workspaceState?.workspace?.accountKind === 'company'
                            && workspaceState.workspace.onboardingCompletedAt
                            && workspaceState.canManage ? (
                            <Link href="/panel/equipo" className="block">
                                <PanelCard size="md" className="flex items-center justify-between gap-4 transition-opacity hover:opacity-95">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                            <IconUsers size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>Equipo</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Invita a tu equipo y define qué puede gestionar cada persona.</p>
                                        </div>
                                    </div>
                                    <IconChevronRight size={14} style={{ color: 'var(--fg-faint)' }} />
                                </PanelCard>
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
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Publícalos y adminístralos desde Publicaciones.</p>
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
                                        <Link href={firstPublishHref}>
                                            <PanelButton type="button" className="w-full">
                                                {workspaceState?.workspace?.operatorSubtype === 'developer'
                                                    ? 'Publicar mi primer proyecto'
                                                    : 'Publicar mi primera propiedad'}
                                            </PanelButton>
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
                                                        <IconHome size={14} />
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
                                        <Link href={firstPublishHref}>
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
                    </div>
                ) : null}
            </div>
        </div>
    );
}
