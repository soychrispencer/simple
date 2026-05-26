'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    isPanelSection,
    legacyQueryToPanelPath,
    panelSectionHref,
    resolveGrupoQueryRedirect,
    resolveCanonicalMarketplaceRedirect,
    resolveCanonicalMiNegocioRedirect,
    resolveNestedPanelRedirect,
    sectionFromPanelPath,
} from '@/lib/panel-routes';
import useSWR, { mutate as globalMutate } from 'swr';
import { providerGroupsSwrKey } from '@/hooks/use-provider-groups';
import { useAuth } from '@simple/auth';
import {
    type Profiles,
    type Invitation,
    type MusicianDirectoryItem,
    type Serenata,
    type SerenataGroup,
    type SerenataPackage,
    type SerenatasUser,
    serenatasApi,
} from '@/lib/serenatas-api';
import {
    type AppMode,
    ownerFeaturesEnabled,
    clearLegacyAppModeStorage,
    resolveAppModeFromProfiles,
    workApiAs,
} from '@/lib/app-mode';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';
import { today, type FormStatus } from '@/components/panel/shared';
import { confirmCheckout } from '@/lib/payments';

/** Secciones del panel; sincronizadas con rutas `/panel/*` (ver `changeSection`). */
export type Section =
    | 'home'
    | 'mariachis'
    | 'grupos'
    | 'grupo'
    | 'solicitar'
    | 'contratar'
    | 'serenatas'
    | 'guardados'
    | 'solicitudes'
    | 'mi-negocio'
    | 'servicios'
    | 'groups'
    | 'invitations'
    | 'agenda'
    | 'map'
    | 'profile';
export type LoadState = 'idle' | 'loading' | 'error' | 'ready';

const SIDEBAR_COLLAPSED_KEY = 'serenatas-sidebar-collapsed';

interface SerenataContextType {
    user: ReturnType<typeof useAuth>['user'];
    isLoggedIn: boolean;
    authLoading: boolean;
    accountUser: SerenatasUser | null;

    mode: AppMode;
    ownerFeaturesEnabled: boolean;

    profiles: Profiles;

    section: Section;
    setSection: (next: Section) => void;
    changeSection: (next: Section, query?: Record<string, string | null | undefined>) => void;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (value: boolean) => void;

    /** Serenatas del cliente o del músico (modo trabajo). */
    serenatas: Serenata[];
    /** Bandeja dueño (`GET /serenatas?as=owner`): solicitudes y cierre, sin programadas. */
    ownerSerenatas: Serenata[];
    /** Serenatas que requieren cierre manual (`needsClosure=1`). */
    ownerClosureSerenatas: Serenata[];
    groups: SerenataGroup[];
    packages: SerenataPackage[];
    musicians: MusicianDirectoryItem[];
    invitations: Invitation[];
    agendaDate: string;
    setAgendaDate: (date: string) => void;
    agendaItems: Serenata[];
    routeItems: Serenata[];
    agendaLoading: boolean;

    loadState: LoadState;
    error: string | null;
    refresh: () => Promise<void>;
    /** Recarga solo agenda y ruta (sin refetch global). */
    refreshAgenda: () => Promise<void>;

    checkoutStatus: FormStatus;
    setCheckoutStatus: (status: FormStatus) => void;
}

const SerenataContext = createContext<SerenataContextType | undefined>(undefined);

export function SerenataProvider({ children }: { children: ReactNode }) {
    const { user, isLoggedIn, authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const searchParams = useSearchParams();

    const [section, setSection] = useState<Section>('home');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [agendaDate, setAgendaDate] = useState(today);
    const [checkoutStatus, setCheckoutStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [handledSerenataPurchaseId, setHandledSerenataPurchaseId] = useState<string | null>(null);

    const fetcher = useCallback(async () => {
            if (!isLoggedIn) return null;

            const [profileResponse, packagesResponse, musicianResponse] = await Promise.all([
                serenatasApi.profiles(),
                serenatasApi.packages(),
                serenatasApi.musicians(),
            ]);

            if (!profileResponse.ok) throw new Error(profileResponse.error || 'No pudimos cargar tu perfil.');

            const nextProfiles = profileResponse.profiles;
            clearLegacyAppModeStorage();
            const effectiveMode = resolveAppModeFromProfiles(nextProfiles);

            const ownerActive = ownerFeaturesEnabled(nextProfiles);

            if (effectiveMode === 'client') {
                const serenataResponse = await serenatasApi.clientSerenatas();

                return {
                    accountUser: profileResponse.user,
                    profiles: nextProfiles,
                    effectiveMode,
                    ownerFeaturesEnabled: ownerActive,
                    serenatas: serenataResponse.ok ? serenataResponse.items : [],
                    ownerSerenatas: [] as Serenata[],
                    ownerClosureSerenatas: [] as Serenata[],
                    groups: [] as SerenataGroup[],
                    packages: packagesResponse.ok ? packagesResponse.items : [],
                    musicians: musicianResponse.ok ? musicianResponse.items : [],
                    invitations: [] as Invitation[],
                };
            }

            const [
                musicianSerenataResponse,
                ownerSerenataResponse,
                ownerClosureResponse,
                groupResponse,
                invitationResponse,
            ] = await Promise.all([
                nextProfiles.musician
                    ? serenatasApi.serenatas(undefined, 'musician')
                    : Promise.resolve({ ok: true, items: [] as Serenata[] }),
                ownerActive
                    ? serenatasApi.serenatas(undefined, 'owner')
                    : Promise.resolve({ ok: true, items: [] as Serenata[] }),
                ownerActive
                    ? serenatasApi.serenatas(undefined, 'owner', { needsClosure: true })
                    : Promise.resolve({ ok: true, items: [] as Serenata[] }),
                ownerActive
                    ? serenatasApi.groups()
                    : Promise.resolve({ ok: true, items: [] as SerenataGroup[] }),
                nextProfiles.musician
                    ? serenatasApi.invitations()
                    : Promise.resolve({ ok: true, items: [] as Invitation[] }),
            ]);

            const ownerItems = ownerSerenataResponse.ok ? ownerSerenataResponse.items : [];
            const ownerClosureItems = ownerClosureResponse.ok ? ownerClosureResponse.items : [];

            return {
                accountUser: profileResponse.user,
                profiles: nextProfiles,
                effectiveMode,
                ownerFeaturesEnabled: ownerActive,
                serenatas: musicianSerenataResponse.ok ? musicianSerenataResponse.items : [],
                ownerSerenatas: ownerActive ? ownerItems : [],
                ownerClosureSerenatas: ownerActive ? ownerClosureItems : [],
                groups: groupResponse.ok ? groupResponse.items : [],
                packages: packagesResponse.ok ? packagesResponse.items : [],
                musicians: musicianResponse.ok ? musicianResponse.items : [],
                invitations: invitationResponse.ok ? invitationResponse.items : [],
            };
        },
        [isLoggedIn],
    );

    const { data, error: swrError, isLoading, mutate: swrMutate } = useSWR(
        isLoggedIn ? 'serenatas-data' : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 15_000,
        },
    );

    const profiles = data?.profiles ?? { client: null, musician: null, owner: null };
    const mode: AppMode = data?.effectiveMode ?? 'client';
    const ownerFeatures = data?.ownerFeaturesEnabled ?? false;
    const agendaApiAs = mode === 'work' ? workApiAs(profiles) : null;

    const agendaSwrKey =
        isLoggedIn && data
            ? `serenatas-agenda-${mode}-${agendaDate}-${agendaApiAs ?? 'client'}`
            : null;

    const {
        data: agendaData,
        isLoading: agendaLoading,
        mutate: mutateAgenda,
    } = useSWR(
        agendaSwrKey,
        async () => {
            if (mode === 'client') {
                const response = await serenatasApi.clientSerenatas(agendaDate);
                return response.ok ? response.items : [];
            }
            const response = await serenatasApi.agenda(agendaDate, agendaApiAs ?? undefined);
            return response.ok ? response.items : [];
        },
        { revalidateOnFocus: false, dedupingInterval: 10_000 },
    );

    const routeSwrKey =
        isLoggedIn && data?.ownerFeaturesEnabled
            ? `serenatas-route-${agendaDate}`
            : null;

    const { data: routeData, mutate: mutateRoute } = useSWR(
        routeSwrKey,
        async () => {
            const response = await serenatasApi.route(agendaDate, 'owner');
            return response.ok ? response.items : [];
        },
        { revalidateOnFocus: false, dedupingInterval: 10_000 },
    );

    const loadState: LoadState = isLoading && !data ? 'loading' : swrError ? 'error' : data ? 'ready' : 'idle';
    const error = swrError?.message || null;

    const refreshAgenda = useCallback(async () => {
        await Promise.all([mutateAgenda(), mutateRoute()]);
    }, [mutateAgenda, mutateRoute]);

    const clearCheckoutParams = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('purchaseId');
        params.delete('kind');
        params.delete('payment_id');
        params.delete('collection_id');
        params.delete('status');
        const query = params.toString();
        const base = pathname.startsWith('/panel') ? panelSectionHref(section) : '/';
        router.replace(query ? `${base}?${query}` : base, { scroll: false });
    }, [pathname, router, searchParams, section]);

    useEffect(() => {
        const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (stored === '1') setSidebarCollapsed(true);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    }, [sidebarCollapsed]);

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
                setCheckoutStatus({
                    loading: false,
                    error: result.error ?? 'No pudimos confirmar el pago.',
                    ok: null,
                });
                clearCheckoutParams();
                return;
            }

            if (result.status === 'approved' || result.status === 'authorized') {
                setCheckoutStatus({
                    loading: false,
                    error: null,
                    ok: 'Pago confirmado. Tu solicitud fue enviada al grupo que elegiste.',
                });
            } else {
                setCheckoutStatus({ loading: false, error: 'El pago no fue aprobado.', ok: null });
            }
            clearCheckoutParams();
            await swrMutate();
            await refreshAgenda();
        })();
    }, [clearCheckoutParams, handledSerenataPurchaseId, refreshAgenda, swrMutate, searchParams]);

    useEffect(() => {
        const nestedTarget = resolveNestedPanelRedirect(pathname);
        if (nestedTarget) {
            router.replace(nestedTarget, { scroll: false });
            return;
        }

        const marketplaceTarget = resolveCanonicalMarketplaceRedirect(pathname, searchParams.toString());
        if (marketplaceTarget) {
            router.replace(marketplaceTarget, { scroll: false });
            return;
        }

        const miNegocioTarget = resolveCanonicalMiNegocioRedirect(pathname, searchParams.toString());
        if (miNegocioTarget) {
            router.replace(miNegocioTarget, { scroll: false });
            return;
        }

        const grupoTarget = resolveGrupoQueryRedirect(pathname, searchParams.toString());
        if (grupoTarget) {
            router.replace(grupoTarget, { scroll: false });
            return;
        }

        const legacyTarget = legacyQueryToPanelPath(searchParams.toString());
        if (legacyTarget && !pathname.startsWith('/panel')) {
            router.replace(legacyTarget, { scroll: false });
            return;
        }

        const fromPath = sectionFromPanelPath(pathname);
        if (fromPath) {
            setSection(fromPath);
            return;
        }

        const nextSection = searchParams.get('section');
        if (isPanelSection(nextSection)) {
            setSection(nextSection);
        }
    }, [pathname, router, searchParams]);

    const changeSection = (
        next: Section,
        query?: Record<string, string | null | undefined>,
    ) => {
        const normalized =
            next === 'servicios' || next === 'groups'
                ? 'mi-negocio'
                : next === 'grupos'
                  ? 'mariachis'
                  : next;

        const clientBrowsingMarketplace =
            mode === 'client'
            && (next === 'mariachis' || next === 'grupos' || next === 'contratar');
        if (clientBrowsingMarketplace) {
            router.push(CLIENT_MARKETPLACE_HREF);
            return;
        }

        setSection(normalized);
        router.replace(panelSectionHref(next, query), { scroll: false });
    };

    const value: SerenataContextType = {
        user,
        isLoggedIn,
        authLoading,
        accountUser: data?.accountUser ?? null,
        mode,
        ownerFeaturesEnabled: ownerFeatures,
        profiles,
        section,
        setSection,
        changeSection,
        sidebarCollapsed,
        setSidebarCollapsed,
        serenatas: data?.serenatas ?? [],
        ownerSerenatas: data?.ownerSerenatas ?? [],
        ownerClosureSerenatas: data?.ownerClosureSerenatas ?? [],
        groups: data?.groups ?? [],
        packages: data?.packages ?? [],
        musicians: data?.musicians ?? [],
        invitations: data?.invitations ?? [],
        agendaDate,
        setAgendaDate,
        agendaItems: agendaData ?? [],
        routeItems: routeData ?? [],
        agendaLoading: Boolean(agendaSwrKey) && agendaLoading && !agendaData,
        loadState,
        error,
        refresh: async () => {
            await Promise.all([swrMutate(), refreshAgenda(), globalMutate(providerGroupsSwrKey())]);
        },
        refreshAgenda,
        checkoutStatus,
        setCheckoutStatus,
    };

    return <SerenataContext.Provider value={value}>{children}</SerenataContext.Provider>;
}

export function useSerenata() {
    const context = useContext(SerenataContext);
    if (context === undefined) {
        throw new Error('useSerenata must be used within a SerenataProvider');
    }
    return context;
}
