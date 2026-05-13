'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import { useAuth } from '@simple/auth';
import { API_BASE } from '@simple/config';
import { MarketplaceHeader } from '@simple/marketplace-header';
import {
    Sidebar,
    BrandLogo,
    PanelBottomNav,
    PanelButton,
    PanelCard,
    PanelField,
    PanelNotice,
    PanelBlockHeader,
    PanelPageHeader,
    PanelSegmentedToggle,
    PanelStatusBadge,
} from '@simple/ui';
import { getCommunesForRegion, LOCATION_REGIONS, resolveLocationNames } from '@simple/utils';
import {
    IconArrowRight,
    IconBell,
    IconBrandGoogle,
    IconCamera,
    IconCalendar,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconClipboardList,
    IconHome,
    IconMap2,
    IconMapPin,
    IconMoon,
    IconMusic,
    IconRoute2,
    IconRoute,
    IconSparkles,
    IconSun,
    IconUser,
    IconUsersGroup,
    IconX,
    IconHeart,
    IconMailCheck,
    IconLogout,
    IconMessageCircle,
    IconClock,
    IconShield,
    IconTrophy,
    IconTrendingUp,
    IconPhone,
    IconLoader2,
    IconCreditCard,
    IconKey,
    IconPlug,
    IconPlus,
    IconPencil,
} from '@tabler/icons-react';
import { useTheme } from 'next-themes';
import { AgendaView } from '@/components/panel/agenda-view';
import { ProfileView } from '@/components/panel/account-view';
import { GroupsView } from '@/components/panel/groups-view';
import { HomeView } from '@/components/panel/home-view';
import { InvitationsView } from '@/components/panel/invitations-view';
import { MapView } from '@/components/panel/map-view';
import { ClientSerenatasView, ContractSerenataView, SerenatasView } from '@/components/panel/serenatas-view';
import {
    EmptyBlock,
    FieldInput,
    FieldSelect,
    FieldTextarea,
    FormFeedback,
    InstrumentSelect,
    today,
    type FormStatus,
} from '@/components/panel/shared';
import { type ActiveProfile, type ClientProfile, type CoordinatorProfile, type Invitation, type MusicianDirectoryItem, type MusicianProfile, type Serenata, type SerenataGroup, type SerenatasUser, serenatasApi } from '@/lib/serenatas-api';
import { confirmCheckout } from '@/lib/payments';

type Section = 'home' | 'contratar' | 'serenatas' | 'groups' | 'invitations' | 'agenda' | 'map' | 'profile';
type LoadState = 'idle' | 'loading' | 'error' | 'ready';
type SignupKind = 'client' | 'musician';
type NavItem = { id: Section; label: string; icon: ComponentType<{ size?: number; stroke?: number; style?: React.CSSProperties }> };

type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    coordinator: CoordinatorProfile | null;
};

const ACTIVE_PROFILE_KEY = 'serenatas-active-profile';
const SIDEBAR_COLLAPSED_KEY = 'serenatas-sidebar-collapsed';
const SIGNUP_PROFILE_KEY = 'serenatas-signup-profile';

const clientTabs = [
    { id: 'home', label: 'Inicio', icon: IconHome },
    { id: 'contratar', label: 'Contratar', icon: IconPlus },
    { id: 'serenatas', label: 'Mis Serenatas', icon: IconMusic },
    { id: 'profile', label: 'Cuenta', icon: IconUser },
] satisfies NavItem[];

const musicianTabs = [
    { id: 'home', label: 'Inicio', icon: IconHome },
    { id: 'invitations', label: 'Invitaciones', icon: IconClipboardList },
    { id: 'agenda', label: 'Agenda', icon: IconCalendar },
    { id: 'profile', label: 'Perfil', icon: IconUser },
] satisfies NavItem[];

const coordinatorTabs = [
    { id: 'home', label: 'Inicio', icon: IconHome },
    { id: 'serenatas', label: 'Solicitudes', icon: IconBell },
    { id: 'groups', label: 'Grupos', icon: IconUsersGroup },
    { id: 'agenda', label: 'Agenda', icon: IconCalendar },
] satisfies NavItem[];

const coordinatorDesktopTabs = [
    ...coordinatorTabs,
    { id: 'map', label: 'Mapa', icon: IconMap2 },
    { id: 'profile', label: 'Mi Cuenta', icon: IconUser },
] satisfies NavItem[];

function sectionTitle(section: Section, profile: ActiveProfile) {
    if (section === 'home' && profile === 'client') return 'Mis Serenatas';
    if (section === 'home') return profile === 'coordinator' ? 'Operación de hoy' : 'Inicio';
    if (section === 'contratar') return 'Contratar serenata';
    if (section === 'serenatas') return profile === 'client' ? 'Mis Serenatas' : 'Solicitudes';
    if (section === 'groups') return 'Grupos';
    if (section === 'invitations') return 'Invitaciones';
    if (section === 'agenda') return 'Agenda';
    if (section === 'map') return 'Mapa y rutas';
    return 'Mi Cuenta';
}

export function SerenatasApp() {
    const { user, isLoggedIn, authLoading, openAuth, logout, refreshSession } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [section, setSection] = useState<Section>('home');
    const [profile, setProfile] = useState<ActiveProfile>('client');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profiles, setProfiles] = useState<Profiles>({ client: null, musician: null, coordinator: null });
    const [accountUser, setAccountUser] = useState<SerenatasUser | null>(null);
    const [loadState, setLoadState] = useState<LoadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [groups, setGroups] = useState<SerenataGroup[]>([]);
    const [packages, setPackages] = useState<SerenataPackage[]>([]);
    const [musicians, setMusicians] = useState<MusicianDirectoryItem[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [agendaDate, setAgendaDate] = useState(today);
    const [agendaItems, setAgendaItems] = useState<Serenata[]>([]);
    const [routeItems, setRouteItems] = useState<Serenata[]>([]);
    const [checkoutStatus, setCheckoutStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [handledSerenataPurchaseId, setHandledSerenataPurchaseId] = useState<string | null>(null);
    const selectedSerenataId = searchParams.get('serenata');
    const panelAction = searchParams.get('action');

    const switchItems = useMemo(() => {
        const items = [];
        if (profiles.client) items.push({ key: 'client', label: 'Cliente' });
        if (profiles.musician) items.push({ key: 'musician', label: 'Músico' });
        if (profiles.coordinator) items.push({ key: 'coordinator', label: 'Coordinador' });
        return items;
    }, [profiles.client, profiles.coordinator, profiles.musician]);

    const sectionHref = useCallback((nextSection: Section) => `/?section=${nextSection}`, []);
    const actionHref = useCallback((nextSection: Section, action?: string) => {
        const params = new URLSearchParams();
        params.set('section', nextSection);
        if (action) params.set('action', action);
        return `/?${params.toString()}`;
    }, []);

    useEffect(() => {
        const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (stored === '1') setSidebarCollapsed(true);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    }, [sidebarCollapsed]);

    const refresh = useCallback(async () => {
        if (!isLoggedIn) return;
        setLoadState('loading');
        setError(null);
        const profileResponse = await serenatasApi.profiles();
        if (!profileResponse.ok) {
            setLoadState('error');
            setError(profileResponse.error ?? 'No pudimos cargar tus perfiles.');
            return;
        }

        const nextProfiles = profileResponse.profiles;
        setAccountUser(profileResponse.user);
        setProfiles(nextProfiles);
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_PROFILE_KEY) : null;
        const nextProfile: ActiveProfile = stored === 'coordinator' && nextProfiles.coordinator
            ? 'coordinator'
            : stored === 'musician' && nextProfiles.musician
                ? 'musician'
                : nextProfiles.client
                    ? 'client'
                    : nextProfiles.musician
                        ? 'musician'
                        : 'client';
        setProfile(nextProfile);

        const [serenataResponse, groupResponse, musicianResponse, invitationResponse, agendaResponse, routeResponse, packagesResponse] = await Promise.all([
            nextProfile === 'client' ? serenatasApi.clientSerenatas() : serenatasApi.serenatas(),
            nextProfiles.coordinator ? serenatasApi.groups() : Promise.resolve({ ok: true, items: [] as SerenataGroup[] }),
            serenatasApi.musicians(),
            nextProfiles.musician ? serenatasApi.invitations() : Promise.resolve({ ok: true, items: [] as Invitation[] }),
            nextProfile === 'client' ? serenatasApi.clientSerenatas(agendaDate) : serenatasApi.agenda(agendaDate),
            nextProfiles.coordinator ? serenatasApi.route(agendaDate) : Promise.resolve({ ok: true, items: [] as Serenata[] }),
            serenatasApi.packages(),
        ]);

        if (!serenataResponse.ok || !groupResponse.ok || !musicianResponse.ok || !invitationResponse.ok || !agendaResponse.ok || !routeResponse.ok || !packagesResponse.ok) {
            setLoadState('error');
            setError('No pudimos cargar toda la información. Intenta nuevamente.');
            return;
        }

        const filteredSerenatas = nextProfile === 'coordinator'
            ? serenataResponse.items.filter((s) => ['payment_pending', 'pending', 'accepted_pending_group'].includes(s.status))
            : serenataResponse.items;

        setSerenatas(filteredSerenatas);
        setGroups(groupResponse.items);
        setPackages(packagesResponse.items);
        setMusicians(musicianResponse.items);
        setInvitations(invitationResponse.items);
        setAgendaItems(agendaResponse.items);
        setRouteItems(routeResponse.items);
        setLoadState('ready');
    }, [agendaDate, isLoggedIn]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        const purchaseId = searchParams.get('purchaseId');
        const kind = searchParams.get('kind');
        if (kind !== 'serenata_booking' || !purchaseId || handledSerenataPurchaseId === purchaseId) return;
        setHandledSerenataPurchaseId(purchaseId);
        setCheckoutStatus({ loading: true, error: null, ok: null });
        void (async () => {
            const result = await confirmCheckout({
                orderId: purchaseId,
                paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id'),
            });
            if (!result.ok) {
                setCheckoutStatus({ loading: false, error: result.error ?? 'No pudimos confirmar el pago.', ok: null });
                return;
            }
            if (result.status === 'approved' || result.status === 'authorized') {
                setCheckoutStatus({ loading: false, error: null, ok: 'Pago confirmado. Estamos buscando coordinador para tu serenata.' });
            } else if (result.status === 'pending') {
                setCheckoutStatus({ loading: false, error: null, ok: 'Tu pago quedó pendiente de validación.' });
            } else {
                setCheckoutStatus({ loading: false, error: 'El pago no fue aprobado.', ok: null });
            }
            await refresh();
        })();
    }, [handledSerenataPurchaseId, refresh, searchParams]);

    useEffect(() => {
        const nextSection = searchParams.get('section') as Section | null;
        if (!nextSection) return;
        if (['home', 'contratar', 'serenatas', 'groups', 'invitations', 'agenda', 'map', 'profile'].includes(nextSection) && nextSection !== section) {
            setSection(nextSection);
        }
    }, [searchParams, section]);

    function changeProfile(next: ActiveProfile) {
        setProfile(next);
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, next);
        setSection('home');
    }

    function changeSection(next: Section) {
        setSection(next);
        router.replace(sectionHref(next), { scroll: false });
    }

    const clearPanelAction = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        const query = params.toString();
        router.replace(query ? `/?${query}` : '/', { scroll: false });
    }, [router, searchParams]);
    const openClientRequest = useCallback(() => {
        router.push(sectionHref('contratar'), { scroll: false });
    }, [router, sectionHref]);

    const fetchPanelNotifications = useCallback(async () => {
        const response = await serenatasApi.notifications();
        return response.ok ? response.items : [];
    }, []);

    const visibleTabs = profile === 'coordinator' ? coordinatorTabs : profile === 'musician' ? musicianTabs : clientTabs;
    const desktopTabs = profile === 'coordinator'
        ? coordinatorDesktopTabs
        : profile === 'musician'
            ? musicianTabs.map((item) => item.id === 'profile' ? { ...item, label: 'Mi Cuenta' } : item)
            : clientTabs.map((item) => item.id === 'profile' ? { ...item, label: 'Mi Cuenta' } : item);
    const pendingInvitationCount = invitations.filter((item) => item.status === 'invited').length;
    const primaryCta = useMemo(() => {
        if (profile === 'client') {
            return {
                label: 'Contratar serenata',
                mobileLabel: 'Contratar',
                href: sectionHref('contratar'),
                icon: IconPlus,
                showFab: true,
            };
        }
        if (profile === 'coordinator') {
            return {
                label: 'Nueva serenata',
                mobileLabel: 'Nueva',
                href: actionHref('serenatas', 'create'),
                icon: IconPlus,
                showFab: true,
            };
        }
        if (pendingInvitationCount > 0) {
            return {
                label: 'Ver solicitudes',
                mobileLabel: 'Solicitudes',
                href: sectionHref('invitations'),
                icon: IconClipboardList,
                showFab: true,
            };
        }
        return {
            label: 'Ver agenda',
            mobileLabel: 'Agenda',
            href: sectionHref('agenda'),
            icon: IconCalendar,
            showFab: false,
        };
    }, [actionHref, pendingInvitationCount, profile, sectionHref]);
    const PrimaryCtaIcon = primaryCta.icon;

    if (authLoading) {
        return <ScreenShell><EmptyBlock title="Cargando sesión" description="Estamos preparando tu espacio de trabajo." /></ScreenShell>;
    }

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

    if (user?.status !== 'verified') {
        return (
            <ScreenShell>
                <EmailVerificationGate logout={logout} refreshSession={refreshSession} />
            </ScreenShell>
        );
    }

    if (loadState === 'ready' && !profiles.client && !profiles.musician) {
        return (
            <ScreenShell>
                <OnboardingView refresh={refresh} logout={logout} />
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <MarketplaceHeader
                brandAppId="simpleserenatas"
                publicLinks={[]}
                getPanelNavItems={() => desktopTabs.map((item) => ({ href: sectionHref(item.id), label: item.label, icon: item.icon }))}
                isPanelNavActive={(_, href) => href === sectionHref(section)}
                fetchPanelNotifications={fetchPanelNotifications}
                homeHref="/"
                centerSlot={
                    <div className="hidden items-center gap-3 min-w-0 md:flex">
                        <h1 className="hidden text-sm font-semibold md:block" style={{ color: 'var(--fg)' }}>
                            {sectionTitle(section, profile)}
                        </h1>
                        {switchItems.length > 1 ? (
                            <PanelSegmentedToggle
                                activeKey={profile}
                                onChange={(value) => changeProfile(value as ActiveProfile)}
                                items={switchItems}
                            />
                        ) : null}
                    </div>
                }
                renderMobileMenu={(closeMenu) => (
                    <div className="space-y-3">
                        <PanelButton
                            className="min-h-10 w-full justify-center whitespace-nowrap px-3 py-2 text-sm"
                            onClick={() => {
                                closeMenu();
                                router.push(primaryCta.href, { scroll: false });
                            }}
                        >
                            <PrimaryCtaIcon size={14} className="shrink-0" />
                            {primaryCta.mobileLabel}
                        </PanelButton>
                        {switchItems.length > 1 ? (
                            <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                <p className="px-1 text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    Cambiar modo
                                </p>
                                <PanelSegmentedToggle
                                    activeKey={profile}
                                    onChange={(value) => {
                                        changeProfile(value as ActiveProfile);
                                        closeMenu();
                                    }}
                                    items={switchItems}
                                />
                            </div>
                        ) : (
                            <p className="px-1 py-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                No hay otros modos disponibles.
                            </p>
                        )}
                    </div>
                )}
                primaryActionLabel={primaryCta.label}
                primaryActionHref={primaryCta.href}
                primaryActionIcon={primaryCta.icon}
                showPrimaryAction
            />

            <div className="flex min-h-[calc(100vh-64px)] w-full">
                <Sidebar
                    fixed={false}
                    navItems={desktopTabs.map((item) => ({ href: sectionHref(item.id), label: item.label, icon: item.icon }))}
                    user={{ name: accountUser?.name || user?.name || 'Usuario', role: profile === 'coordinator' ? 'Coordinador' : profile === 'musician' ? 'Músico' : 'Cliente' }}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((current) => !current)}
                    activeHref={sectionHref(section)}
                    footerHref={null}
                />

                <main className="panel-content-frame flex min-w-0 flex-1 flex-col">
                    <div className="container-app panel-page py-4 lg:py-8">
                        {loadState === 'loading' ? <PanelNotice tone="neutral">Cargando: actualizando serenatas, grupos e invitaciones.</PanelNotice> : null}
                        {loadState === 'error' ? <PanelNotice tone="error">Error: {error ?? 'No pudimos cargar la información.'}</PanelNotice> : null}
                        {checkoutStatus.loading ? <PanelNotice tone="neutral">Validando pago de serenata...</PanelNotice> : null}
                        {checkoutStatus.error ? <PanelNotice tone="error">Error: {checkoutStatus.error}</PanelNotice> : null}
                        {checkoutStatus.ok ? <PanelNotice tone="success">{checkoutStatus.ok}</PanelNotice> : null}
                        <Content
                            section={section}
                            profile={profile}
                            profiles={profiles}
                            accountUser={accountUser}
                            serenatas={serenatas}
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
                        />
                    </div>
                </main>
            </div>

            {primaryCta.showFab ? (
                <button
                    type="button"
                    className="fixed bottom-20 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-lg md:hidden"
                    style={{
                        background: 'var(--button-primary-bg)',
                        borderColor: 'var(--button-primary-border)',
                        color: 'var(--button-primary-color)',
                    }}
                    onClick={() => router.push(primaryCta.href, { scroll: false })}
                >
                    <PrimaryCtaIcon size={16} />
                    {primaryCta.mobileLabel}
                </button>
            ) : null}

            <PanelBottomNav
                items={visibleTabs.map((item) => ({ href: item.id, label: item.label, icon: item.icon, active: section === item.id }))}
                LinkComponent={({ href, className, children, 'aria-current': ariaCurrent }) => (
                    <button className={className} aria-current={ariaCurrent} onClick={() => changeSection(href as Section)}>
                        {children}
                    </button>
                )}
            />
        </ScreenShell>
    );
}

function ScreenShell({ children }: { children: ReactNode }) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>{children}</div>;
}

function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch by rendering a placeholder during SSR
    if (!mounted) {
        return (
            <button 
                className="header-icon-chip" 
                aria-label="Cambiar tema" 
                suppressHydrationWarning
            >
                <IconSun size={16} />
            </button>
        );
    }

    const isDark = resolvedTheme === 'dark';

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="header-icon-chip"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
    );
}

function PublicLanding({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
    const clientFeatures = [
        { icon: IconHeart, text: 'Ordena fecha, dirección, horario y datos del homenaje.' },
        { icon: IconShield, text: 'Mantén la información importante en un solo lugar.' },
        { icon: IconMessageCircle, text: 'Evita perder detalles en conversaciones desordenadas.' },
        { icon: IconPhone, text: 'Ten a mano los datos de contacto del evento.' },
    ];
    const musicianFeatures = [
        { icon: IconUser, text: 'Crea tu perfil con instrumento, comuna y disponibilidad.' },
        { icon: IconClipboardList, text: 'Recibe invitaciones claras y responde rápido.' },
        { icon: IconCalendar, text: 'Revisa tu agenda aceptada desde el celular.' },
        { icon: IconTrendingUp, text: 'Mantén tu información lista para coordinadores.' },
    ];
    const coordinatorFeatures = [
        { icon: IconSparkles, title: 'Activa como coordinador', text: 'Desde tu cuenta de músico. 30 días de prueba gratuita para organizar grupos y crear serenatas.' },
        { icon: IconMusic, title: 'Gestiona serenatas', text: 'Registra eventos de tus clientes y coordina cada detalle sin complicaciones.' },
        { icon: IconUsersGroup, title: 'Organiza grupos', text: 'Crea grupos por fecha, invita músicos y visualiza el lineup del día.' },
        { icon: IconRoute2, title: 'Mapa y rutas', text: 'Visualiza puntos del día, abre Google Maps y optimiza recorridos.' },
    ];
    const howItWorksSteps = [
        { role: 'Cliente', icon: IconHeart, title: 'Contrata tu serenata', desc: 'Elige paquete, fecha, lugar y datos del evento. Guarda todos los detalles importantes.' },
        { role: 'Coordinador', icon: IconUsersGroup, title: 'Organiza el grupo', desc: 'Invita músicos disponibles, arma el lineup y confirma horarios.' },
        { role: 'Músico', icon: IconMusic, title: 'Toca y celebra', desc: 'Recibe invitaciones, confirma tu participación y consulta la agenda.' },
    ];
    const productPreviewItems = [
        { title: 'Cumpleaños', place: 'Las Condes', time: '20:30', status: 'Confirmada' },
        { title: 'Aniversario', place: 'Providencia', time: '21:45', status: 'Grupo listo' },
        { title: 'Sorpresa', place: 'Ñuñoa', time: '23:00', status: 'En ruta' },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            {/* Header */}
            <header className="relative z-40 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="container-app flex items-center justify-between h-16 px-4">
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        <BrandLogo appId="simpleserenatas" />
                    </Link>
                    
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button className="btn btn-ghost h-10 rounded-xl px-4 hidden sm:inline-flex text-sm" onClick={onLogin}>
                            Iniciar sesión
                        </button>
                        <button className="btn btn-primary h-10 rounded-xl px-4 text-sm font-medium" onClick={() => onRegister()}>
                            Crear cuenta
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden">
                    <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-20 lg:py-24">
                        {/* Trust badge */}
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm" style={{ 
                                background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))',
                                border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--border))',
                                color: 'var(--accent)'
                            }}>
                                <IconCheck size={14} />
                                <span>Sistema inteligente para serenatas</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <div className="text-center max-w-4xl mx-auto">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1]" style={{ color: 'var(--fg)' }}>
                                Contrata y organiza serenatas fácilmente
                            </h1>
                            <p className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                SimpleSerenatas conecta clientes, músicos y coordinadores con flujos claros para contratar, confirmar y ejecutar cada serenata.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button 
                                className="btn btn-primary h-14 rounded-2xl px-8 text-base font-medium w-full sm:w-auto transition-all" 
                                style={{ boxShadow: 'var(--button-primary-shadow)' }}
                                onClick={onRegister}
                            >
                                <IconHeart size={18} className="mr-2" />
                                Soy cliente
                            </button>
                            <button 
                                className="btn btn-secondary h-14 rounded-2xl px-8 text-base font-medium w-full sm:w-auto" 
                                onClick={onRegister}
                            >
                                <IconMusic size={18} className="mr-2" />
                                Soy músico
                            </button>
                        </div>
                        
                        {/* Product preview */}
                        <div className="mx-auto mt-14 max-w-4xl rounded-3xl border p-4 shadow-xl sm:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Agenda de hoy</p>
                                            <h3 className="mt-1 text-lg font-semibold" style={{ color: 'var(--fg)' }}>3 serenatas programadas</h3>
                                        </div>
                                        <PanelStatusBadge tone="success" label="Operación" />
                                    </div>
                                    <div className="mt-4 grid gap-3">
                                        {productPreviewItems.map((item) => (
                                            <div key={item.title} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                                        <IconMapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.place} · {item.status}</p>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                                    <IconClock size={15} />
                                                    {item.time}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Grupo del día</p>
                                        <h3 className="mt-1 text-lg font-semibold" style={{ color: 'var(--fg)' }}>Lineup confirmado</h3>
                                        <div className="mt-4 grid gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            <p className="flex items-center gap-2"><IconCheck size={16} style={{ color: 'var(--accent)' }} /> Trompeta · aceptado</p>
                                            <p className="flex items-center gap-2"><IconCheck size={16} style={{ color: 'var(--accent)' }} /> Violín · aceptado</p>
                                            <p className="flex items-center gap-2"><IconCheck size={16} style={{ color: 'var(--accent)' }} /> Guitarrón · aceptado</p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ruta sugerida</p>
                                        <h3 className="mt-1 text-lg font-semibold" style={{ color: 'var(--fg)' }}>Las Condes → Providencia → Ñuñoa</h3>
                                        <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>Lista para abrir en Google Maps desde el celular.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="border-t px-4 py-16 md:py-24" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="mx-auto max-w-6xl">
                        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                ¿Cómo funciona?
                            </h2>
                            <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                                Tres pasos simples para conectar todos los roles
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {howItWorksSteps.map((step, index) => (
                                <div 
                                    key={step.title}
                                    className="relative p-6 sm:p-8 rounded-3xl border text-center transition-all"
                                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    {/* Step number */}
                                    <div 
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                    >
                                        {index + 1}
                                    </div>
                                    
                                    <div 
                                        className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                        style={{ background: 'color-mix(in oklab, var(--accent) 15%, var(--surface))', color: 'var(--accent)' }}
                                    >
                                        <step.icon size={28} />
                                    </div>
                                    
                                    <div 
                                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                                    >
                                        {step.role}
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                                        {step.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                        {step.desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Arrow connectors for desktop */}
                        <div className="hidden md:flex justify-center gap-8 mt-8" style={{ color: 'var(--fg-muted)' }}>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Cliente contrata</span>
                                <IconArrowRight size={16} />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Coordinador organiza</span>
                                <IconArrowRight size={16} />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Músico confirma</span>
                                <IconCheck size={16} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Profiles Section */}
                <section className="px-4 py-16 md:py-24">
                    <div className="mx-auto max-w-6xl">
                        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                ¿Cómo quieres usar SimpleSerenatas?
                            </h2>
                            <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                                Elige el perfil que mejor se adapte a ti
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Client Card */}
                            <div 
                                className="group p-6 sm:p-8 rounded-3xl border transition-all hover:shadow-xl"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div 
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                        style={{ background: 'color-mix(in oklab, var(--accent) 15%, var(--bg))', color: 'var(--accent)' }}
                                    >
                                        <IconHeart size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Clientes</h3>
                                        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                            Para quienes quieren contratar una serenata inolvidable
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {clientFeatures.map((feature) => (
                                        <div key={feature.text} className="flex items-start gap-3">
                                            <div 
                                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                                            >
                                                <feature.icon size={14} />
                                            </div>
                                            <span className="text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>{feature.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    className="btn btn-primary w-full h-12 rounded-xl text-base font-medium group-hover:shadow-lg transition-all"
                                    onClick={onRegister}
                                >
                                    Soy cliente
                                    <IconArrowRight size={18} className="ml-2" />
                                </button>
                            </div>

                            {/* Musician Card */}
                            <div 
                                className="group p-6 sm:p-8 rounded-3xl border transition-all hover:shadow-xl"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div 
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                        style={{ background: 'color-mix(in oklab, var(--accent) 15%, var(--bg))', color: 'var(--accent)' }}
                                    >
                                        <IconMusic size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Músicos</h3>
                                        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                            Para quienes quieren más oportunidades de trabajo
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {musicianFeatures.map((feature) => (
                                        <div key={feature.text} className="flex items-start gap-3">
                                            <div 
                                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                                            >
                                                <feature.icon size={14} />
                                            </div>
                                            <span className="text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>{feature.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    className="btn btn-secondary w-full h-12 rounded-xl text-base font-medium group-hover:shadow-lg transition-all"
                                    onClick={onRegister}
                                >
                                    Soy músico
                                    <IconArrowRight size={18} className="ml-2" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Coordinators Section */}
                <section className="border-t px-4 py-16 md:py-24" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="mx-auto max-w-6xl">
                        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
                            <div 
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-4"
                                style={{ background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}
                            >
                                <IconTrophy size={16} />
                                Para músicos profesionales
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                Activate como coordinador
                            </h2>
                            <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                                Los coordinadores se activan desde una cuenta de músico. Incluye 30 días de prueba gratuita.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {coordinatorFeatures.map((item) => (
                                <div 
                                    key={item.title}
                                    className="p-6 rounded-2xl border transition-all hover:scale-[1.02]"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                        style={{ background: 'color-mix(in oklab, var(--accent) 15%, var(--bg))', color: 'var(--accent)' }}
                                    >
                                        <item.icon size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>{item.title}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{item.text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 text-center">
                            <button 
                                className="btn btn-secondary h-12 rounded-xl px-8 text-base font-medium"
                                onClick={onRegister}
                            >
                                <IconUsersGroup size={18} className="mr-2" />
                                Comienza como músico y activate como coordinador
                            </button>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="px-4 py-16 md:py-24">
                    <div className="mx-auto max-w-4xl">
                        <div 
                            className="rounded-3xl p-8 text-center sm:p-12"
                            style={{ 
                                background: 'var(--accent)',
                            }}
                        >
                            <div>
                            <h2 className="text-3xl font-semibold sm:text-4xl" style={{ color: 'var(--accent-contrast)' }}>
                                Empieza con el perfil que corresponde
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: 'var(--accent-contrast)', opacity: 0.84 }}>
                                Cliente para contratar o revisar serenatas. Músico para recibir invitaciones y, si lo necesitas, activar coordinación.
                            </p>
                            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <button
                                    className="h-14 w-full rounded-2xl px-8 text-base font-medium shadow-lg transition-all sm:w-auto"
                                    style={{ background: 'var(--accent-contrast)', color: 'var(--accent)' }}
                                    onClick={onRegister}
                                >
                                    <IconHeart size={18} className="mr-2 inline" />
                                    Soy cliente
                                </button>
                                <button
                                    className="h-14 w-full rounded-2xl px-8 text-base font-medium transition-all sm:w-auto"
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--accent-contrast)',
                                        border: '1px solid color-mix(in oklab, var(--accent-contrast) 28%, transparent)'
                                    }}
                                    onClick={onRegister}
                                >
                                    <IconMusic size={18} className="mr-2 inline" />
                                    Soy músico
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t px-4 py-12" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <BrandLogo appId="simpleserenatas" />
                        </div>
                        
                        <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
                            Parte del ecosistema{' '}
                            <a
                                href="https://simpleplataforma.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline"
                                style={{ color: 'var(--accent)' }}
                            >
                                Simple Plataforma
                            </a>
                        </p>
                        
                        <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                            © {new Date().getFullYear()} Simple Plataforma. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function EmailVerificationGate({ logout, refreshSession }: { logout: () => Promise<void>; refreshSession: () => Promise<unknown> }) {
    const { user } = useAuth();
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function resend() {
        if (!user?.email) return;
        setStatus({ loading: true, error: null, ok: null });
        try {
            const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (!response.ok || !data?.ok) {
                setStatus({ loading: false, error: data?.error ?? 'No pudimos reenviar el correo.', ok: null });
                return;
            }
            setStatus({ loading: false, error: null, ok: 'Correo reenviado. Revisa tu bandeja de entrada.' });
        } catch {
            setStatus({ loading: false, error: 'No pudimos reenviar el correo.', ok: null });
        }
    }

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-8">
            <div className="flex items-center justify-between gap-3">
                <BrandLogo appId="simpleserenatas" size="md" />
                <button className="btn btn-ghost h-10 rounded-xl px-4" onClick={() => void logout()}>Salir</button>
            </div>
            <PanelCard className="mt-6 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <IconMailCheck size={28} />
                </div>
                <h1 className="mt-5 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Verifica tu correo</h1>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    Enviamos un enlace de verificación a {user?.email ? <span className="font-medium" style={{ color: 'var(--fg)' }}>{user.email}</span> : 'tu correo'}. Después podrás completar tu perfil de SimpleSerenatas.
                </p>
                <FormFeedback status={status} />
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <PanelButton variant="secondary" disabled={status.loading} onClick={() => void resend()}>
                        Reenviar correo
                    </PanelButton>
                    <PanelButton disabled={status.loading} onClick={() => void refreshSession()}>
                        Ya verifiqué
                    </PanelButton>
                </div>
            </PanelCard>
        </div>
    );
}

function OnboardingView({ refresh, logout }: { refresh: () => Promise<void>; logout: () => Promise<void> }) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [kind, setKind] = useState<SignupKind | null>(null);
    const [step, setStep] = useState(0);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? '');
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [bio, setBio] = useState('');
    const [instrument, setInstrument] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const communes = useMemo(() => getCommunesForRegion(region), [region]);

    useEffect(() => {
        const stored = window.localStorage.getItem(SIGNUP_PROFILE_KEY);
        if (stored === 'client' || stored === 'musician') {
            setKind(stored);
            setStep(0);
        }
    }, []);

    useEffect(() => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setAvatarUrl(user?.avatar ?? '');
    }, [user?.avatar, user?.name, user?.phone]);

    function chooseKind(next: SignupKind) {
        setKind(next);
        setStep(0);
        setStatus({ loading: false, error: null, ok: null });
    }

    async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        const response = await serenatasApi.uploadAvatar(file);
        setAvatarUploading(false);
        if (!response.ok || !response.url) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos subir tu foto.', ok: null });
            return;
        }
        setAvatarUrl(response.url);
        setStatus({ loading: false, error: null, ok: null });
    }

    const inputSteps = kind === 'client'
        ? [
            { title: 'Tus datos de contacto', description: 'Estos datos se usarán para coordinar tus serenatas.' },
            { title: 'Tu ubicación base', description: 'Nos ayuda a ordenar futuras contrataciones y datos del evento.' },
        ]
        : [
            { title: 'Tu perfil musical', description: 'Esta información ayuda a coordinadores a identificar tu rol.' },
            { title: 'Tu ubicación base', description: 'Define dónde trabajas normalmente para futuras invitaciones.' },
            { title: 'Presentación', description: 'Agrega una descripción breve para invitaciones y coordinación.' },
        ];
    const doneStep = inputSteps.length;
    function validateStep(): string | null {
        if (!kind) return 'Elige si usarás SimpleSerenatas como cliente o músico.';
        if (step === 0) {
            if (!name.trim()) return 'Ingresa tu nombre.';
            if (!phone.trim()) return 'Ingresa tu WhatsApp.';
            if (kind === 'musician' && !instrument) return 'Selecciona tu instrumento principal.';
        }
        if (step === 1 && (!region || !comuna)) return 'Selecciona región y comuna.';
        return null;
    }

    async function finish() {
        if (!kind) return;
        const errorMessage = validateStep();
        if (errorMessage) {
            setStatus({ loading: false, error: errorMessage, ok: null });
            return;
        }

        setStatus({ loading: true, error: null, ok: null });
        const names = resolveLocationNames(region, comuna);
        const userResponse = await serenatasApi.updateUser({
            name: name.trim(),
            phone: phone.trim(),
            avatarUrl: avatarUrl || null,
        });
        if (!userResponse.ok) {
            setStatus({ loading: false, error: userResponse.error ?? 'No pudimos guardar tus datos de contacto.', ok: null });
            return;
        }

        const profileResponse = kind === 'client'
            ? await serenatasApi.saveClientProfile({ phone: phone.trim(), region: names.regionName, comuna: names.communeName })
            : await serenatasApi.saveMusicianProfile({
                instrument,
                instruments: instrument ? [instrument] : [],
                bio,
                region: names.regionName,
                comuna: names.communeName,
                experienceYears,
                isAvailable: true,
                availableNow: false,
            });

        if (!profileResponse.ok) {
            setStatus({ loading: false, error: profileResponse.error ?? 'No pudimos completar el registro.', ok: null });
            return;
        }

        window.localStorage.setItem(ACTIVE_PROFILE_KEY, kind);
        window.localStorage.removeItem(SIGNUP_PROFILE_KEY);
        setStatus({ loading: false, error: null, ok: 'Cuenta configurada.' });
        setStep(doneStep);
    }

    async function nextStep() {
        const errorMessage = validateStep();
        if (errorMessage) {
            setStatus({ loading: false, error: errorMessage, ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: null });
        if (step >= inputSteps.length - 1) {
            await finish();
            return;
        }
        setStep((current) => current + 1);
    }

    const cards = [
        {
            key: 'client' as const,
            icon: IconHeart,
            title: 'Quiero contratar serenatas',
            description: 'Contrata, revisa y organiza tus serenatas desde una cuenta simple.',
            items: ['Mis Serenatas', 'Datos de contacto', 'Ubicación base'],
        },
        {
            key: 'musician' as const,
            icon: IconMusic,
            title: 'Soy músico',
            description: 'Recibe invitaciones, gestiona disponibilidad y luego activa coordinación.',
            items: ['Perfil musical', 'Disponibilidad', 'Agenda'],
        },
    ];

    if (!kind) {
        return (
            <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
                <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="container-app flex h-16 items-center justify-between px-4">
                        <BrandLogo appId="simpleserenatas" size="md" />
                        <button className="btn btn-ghost h-10 rounded-xl px-4" onClick={() => void logout()}>Salir</button>
                    </div>
                </header>
                <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-4 py-8">
                    <div className="max-w-2xl">
                        <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Configura tu perfil</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--fg)' }}>
                            Elige cómo usarás SimpleSerenatas
                        </h1>
                        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                            Activaremos solo el perfil que necesitas ahora. Coordinador se activa después desde la cuenta músico.
                        </p>
                    </div>
                    <div className="mt-7 grid gap-4 md:grid-cols-2">
                        {cards.map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                className="rounded-2xl border p-6 text-left transition hover:shadow-lg"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                                onClick={() => chooseKind(card.key)}
                            >
                                <div className="flex items-start gap-4">
                                    <span className="flex size-12 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                        <card.icon size={24} />
                                    </span>
                                    <span>
                                        <span className="block text-lg font-semibold" style={{ color: 'var(--fg)' }}>{card.title}</span>
                                        <span className="mt-1 block text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{card.description}</span>
                                    </span>
                                </div>
                                <div className="mt-5 grid gap-2">
                                    {card.items.map((item) => (
                                        <span key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            <IconCheck size={15} style={{ color: 'var(--accent)' }} />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                    Continuar
                                    <IconArrowRight size={16} />
                                </span>
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    const currentMeta = inputSteps[Math.min(step, inputSteps.length - 1)];
    const isDone = step === doneStep;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="container-app flex h-16 items-center justify-between px-4">
                    <BrandLogo appId="simpleserenatas" size="md" />
                    <button className="btn btn-ghost h-10 rounded-xl px-4" onClick={() => void logout()}>Salir</button>
                </div>
            </header>

            <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center px-4 py-6 sm:py-10">
                {!isDone ? (
                    <div className="mb-6 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                            Paso {step + 1} de {inputSteps.length}
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                            {currentMeta.title}
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {currentMeta.description}
                        </p>
                        <div className="mx-auto mt-5 flex items-center justify-center gap-2">
                            {inputSteps.map((item, index) => (
                                <span
                                    key={item.title}
                                    className="h-1.5 rounded-full transition-all"
                                    style={{
                                        width: index === step ? 32 : 20,
                                        background: index <= step ? 'var(--accent)' : 'var(--border)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : null}

                <PanelCard className="p-5 sm:p-6">
                    {!isDone && step === 0 ? (
                        <div className="grid gap-5">
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    type="button"
                                    className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 transition-opacity hover:opacity-85"
                                    style={{ borderColor: 'var(--accent)', background: 'var(--bg-muted)' }}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarUploading}
                                >
                                    {avatarUploading ? (
                                        <IconLoader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                    ) : avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex flex-col items-center gap-1">
                                            <IconCamera size={22} style={{ color: 'var(--fg-muted)' }} />
                                            <span className="text-[10px] font-medium" style={{ color: 'var(--fg-muted)' }}>Foto</span>
                                        </span>
                                    )}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleAvatarChange(event)} />
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Opcional, pero recomendado para tu perfil.</p>
                            </div>

                            <PanelField label="Nombre">
                                <FieldInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre completo" />
                            </PanelField>
                            <PanelField label="Correo">
                                <FieldInput value={user?.email ?? ''} readOnly />
                            </PanelField>
                            <PanelField label="WhatsApp">
                                <FieldInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9..." />
                            </PanelField>
                            {kind === 'musician' ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <PanelField label="Instrumento principal">
                                        <InstrumentSelect value={instrument} onChange={setInstrument} />
                                    </PanelField>
                                    <PanelField label="Experiencia">
                                        <FieldInput type="number" min={0} value={experienceYears} onChange={(event) => setExperienceYears(Number(event.target.value))} />
                                    </PanelField>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {!isDone && step === 1 ? (
                        <div className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PanelField label="Región">
                                    <FieldSelect value={region} onChange={(event) => { setRegion(event.target.value); setComuna(''); }}>
                                        <option value="">Seleccionar</option>
                                        {LOCATION_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </FieldSelect>
                                </PanelField>
                                <PanelField label="Comuna">
                                    <FieldSelect value={comuna} onChange={(event) => setComuna(event.target.value)}>
                                        <option value="">Seleccionar</option>
                                        {communes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </FieldSelect>
                                </PanelField>
                            </div>
                            {kind === 'musician' ? (
                                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}>
                                    Tu perfil quedará activo para recibir invitaciones. La disponibilidad inmediata la podrás cambiar desde tu panel cuando empieces a trabajar.
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {!isDone && kind === 'musician' && step === 2 ? (
                        <div className="grid gap-4">
                            <PanelField label="Bio breve">
                                <FieldTextarea rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Describe tu experiencia, estilo o disponibilidad para coordinadores." />
                            </PanelField>
                            <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}>
                                Después podrás activar coordinación con 30 días de prueba, serenatas propias costo 0 y serenatas de la app con comisión de 8% + IVA.
                            </div>
                        </div>
                    ) : null}

                    {isDone ? (
                        <div className="flex flex-col items-center gap-5 py-4 text-center">
                            <span className="flex size-20 items-center justify-center rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                                <IconCheck size={36} stroke={3} />
                            </span>
                            <div>
                                <h2 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                                    {kind === 'client' ? 'Tu perfil cliente está listo' : 'Tu perfil músico está listo'}
                                </h2>
                                <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Ya puedes entrar al panel correspondiente.
                                </p>
                            </div>
                            <PanelButton className="w-full" onClick={() => void refresh()}>
                                Ir al panel
                            </PanelButton>
                        </div>
                    ) : null}

                    <FormFeedback status={status} />
                </PanelCard>

                {!isDone ? (
                    <div className="mt-6 flex items-center justify-between">
                        {step > 0 ? (
                            <button
                                type="button"
                                onClick={() => { setStatus({ loading: false, error: null, ok: null }); setStep((current) => current - 1); }}
                                className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'transparent' }}
                            >
                                <IconChevronLeft size={15} />
                                Atrás
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setKind(null); setStatus({ loading: false, error: null, ok: null }); }}
                                className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'transparent' }}
                            >
                                Cambiar perfil
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void nextStep()}
                            disabled={status.loading || avatarUploading}
                            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors"
                            style={{ background: 'var(--accent)', color: '#fff', opacity: status.loading || avatarUploading ? 0.7 : 1 }}
                        >
                            {status.loading ? (
                                <IconLoader2 size={16} className="animate-spin" />
                            ) : step >= inputSteps.length - 1 ? (
                                <>
                                    Completar perfil
                                    <IconCheck size={15} />
                                </>
                            ) : (
                                <>
                                    Continuar
                                    <IconChevronRight size={15} />
                                </>
                            )}
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    );
}

function Content(props: {
    section: Section;
    profile: ActiveProfile;
    profiles: Profiles;
    accountUser: SerenatasUser | null;
    serenatas: Serenata[];
    groups: SerenataGroup[];
    packages: SerenataPackage[];
    musicians: MusicianDirectoryItem[];
    invitations: Invitation[];
    agendaDate: string;
    agendaItems: Serenata[];
    routeItems: Serenata[];
    setAgendaDate: (date: string) => void;
    setSection: (section: Section) => void;
    router: ReturnType<typeof useRouter>;
    selectedSerenataId: string | null;
    panelAction: string | null;
    clearPanelAction: () => void;
    openClientRequest: () => void;
    refresh: () => Promise<void>;
}) {
    const contactPhone = props.accountUser?.phone?.trim() || props.profiles.client?.phone?.trim() || '';

    if (props.section === 'profile') return <ProfileView profiles={props.profiles} profile={props.profile} accountUser={props.accountUser} refresh={props.refresh} />;
    if (props.section === 'contratar') {
        return props.profile === 'client' ? (
            <PanelSectionPage title="Contratar serenata" description="Elige un paquete con precio definido por la plataforma.">
                <ContractSerenataView contactPhone={contactPhone} refresh={props.refresh} />
            </PanelSectionPage>
        ) : <PanelHomePage {...props} />;
    }
    if (props.section === 'serenatas') {
        return props.profile === 'coordinator'
            ? (
                <PanelSectionPage title="Solicitudes" description="Revisa las nuevas solicitudes de serenatas, acepta y asigna grupos.">
                    <SerenatasView
                        serenatas={props.serenatas}
                        groups={props.groups}
                        musicians={props.musicians}
                        selectedSerenataId={props.selectedSerenataId}
                        action={props.panelAction}
                        clearAction={props.clearPanelAction}
                        refresh={props.refresh}
                        isSolicitudesMode
                    />
                </PanelSectionPage>
            )
            : (
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
    if (props.section === 'groups') {
        return props.profile === 'coordinator' ? (
            <PanelSectionPage title="Grupos" description="Organiza músicos, invitaciones y lineups por jornada.">
                <GroupsView groups={props.groups} musicians={props.musicians} refresh={props.refresh} />
            </PanelSectionPage>
        ) : <PanelHomePage {...props} />;
    }
    if (props.section === 'invitations') {
        return props.profile === 'musician' ? (
            <PanelSectionPage title="Invitaciones" description="Acepta o rechaza invitaciones de coordinadores.">
                <InvitationsView invitations={props.invitations} refresh={props.refresh} />
            </PanelSectionPage>
        ) : <PanelHomePage {...props} />;
    }
    if (props.section === 'agenda') {
        return (
            <AgendaView
                date={props.agendaDate}
                setDate={props.setAgendaDate}
                items={props.agendaItems}
                groups={props.groups}
                packages={props.packages}
                refresh={props.refresh}
            />
        );
    }
    if (props.section === 'map') {
        return props.profile === 'coordinator'
            ? <MapView date={props.agendaDate} setDate={props.setAgendaDate} items={props.routeItems} refresh={props.refresh} />
            : <PanelHomePage {...props} />;
    }
    return <PanelHomePage {...props} />;
}

function PanelHomePage(props: Parameters<typeof HomeView>[0]) {
    const title = props.profile === 'coordinator' ? 'Inicio' : props.profile === 'musician' ? 'Inicio' : 'Inicio';
    const description = props.profile === 'coordinator'
        ? 'Resumen de serenatas, grupos e invitaciones.'
        : props.profile === 'musician'
            ? 'Resumen de tus invitaciones y agenda.'
            : 'Resumen de tus serenatas y datos de cuenta.';

    return (
        <PanelSectionPage title={title} description={description}>
            <HomeView {...props} />
        </PanelSectionPage>
    );
}

function PanelSectionPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <div className="grid w-full gap-5 lg:gap-6">
            <PanelPageHeader title={title} description={description} />
            {children}
        </div>
    );
}
