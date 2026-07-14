'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { groupSlugFromPanelPath, isPanelSection, panelSectionHref, sectionFromPanelPath } from '@/lib/panel-routes';
import { resolvePanelRedirect } from '@/lib/panel-redirects';
import { publicMariachiPath } from '@/lib/public-mariachi-routes';
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
import { unlockSolicitudesAlertSound } from '@/lib/solicitudes-alert-sound';
import { useOwnerSolicitudesAlerts } from '@/hooks/use-owner-solicitudes-alerts';

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
    | 'contactos'
    | 'mi-negocio'
    | 'servicios'
    | 'groups'
    | 'invitations'
    | 'agenda'
    | 'map'
    | 'finanzas'
    | 'estadisticas'
    | 'publicidad'
    | 'profile'
    | 'mensajes';
export type LoadState = 'idle' | 'loading' | 'error' | 'ready';

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

    solicitudesPendingCount: number;
    solicitudesSoundMuted: boolean;
    toggleSolicitudesSound: () => void;
    solicitudesNotificationPermission: NotificationPermission | 'unsupported';
    solicitudesBrowserNotificationsEnabled: boolean;
    solicitudesBrowserNotificationsSupported: boolean;
    requestSolicitudesBrowserNotifications: () => Promise<NotificationPermission | 'unsupported'>;
}

const SerenataContext = createContext<SerenataContextType | undefined>(undefined);

export function SerenataProvider({ children }: { children: ReactNode }) {
    const { user, isLoggedIn, authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const searchParams = useSearchParams();

    const [section, setSection] = useState<Section>('home');
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
                    accountUser: user ? { ...profileResponse.user, ...user } : profileResponse.user,
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
                accountUser: user ? { ...profileResponse.user, ...user } : profileResponse.user,
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
        [isLoggedIn, user],
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

    const loadState: LoadState = isLoading && !data ? 'loading' : swrError && !data ? 'error' : data ? 'ready' : 'idle';
    const error = swrError?.message || null;
    const ownerSerenatasList = data?.ownerSerenatas ?? [];

    const refreshPanelData = useCallback(async () => {
        await Promise.all([swrMutate(), mutateAgenda(), mutateRoute(), globalMutate(providerGroupsSwrKey())]);
    }, [mutateAgenda, mutateRoute, swrMutate]);

    const {
        pendingCount: solicitudesPendingCount,
        soundMuted: solicitudesSoundMuted,
        toggleSoundMuted: toggleSolicitudesSound,
        notificationPermission: solicitudesNotificationPermission,
        requestBrowserNotifications: requestSolicitudesBrowserNotifications,
        browserNotificationsEnabled: solicitudesBrowserNotificationsEnabled,
        browserNotificationsSupported: solicitudesBrowserNotificationsSupported,
    } = useOwnerSolicitudesAlerts({
        serenatas: ownerSerenatasList,
        enabled: ownerFeatures,
        onRefresh: refreshPanelData,
    });

    useEffect(() => {
        if (!ownerFeatures) return;
        const unlock = () => unlockSolicitudesAlertSound();
        window.addEventListener('pointerdown', unlock, { once: true });
        return () => window.removeEventListener('pointerdown', unlock);
    }, [ownerFeatures]);

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
        const legacyGrupoSlug = groupSlugFromPanelPath(pathname);
        if (legacyGrupoSlug) {
            const qs = searchParams.toString();
            const target = qs
                ? `${publicMariachiPath(legacyGrupoSlug)}?${qs}`
                : publicMariachiPath(legacyGrupoSlug);
            router.replace(target, { scroll: false });
            return;
        }

        const preferOwnerSolicitudes = mode === 'work' && ownerFeatures;
        const redirectTarget = resolvePanelRedirect(pathname, searchParams.toString(), {
            preferOwnerSolicitudes,
        });
        if (redirectTarget) {
            router.replace(redirectTarget, { scroll: false });
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
    }, [mode, ownerFeatures, pathname, router, searchParams]);

    const changeSection = (
        next: Section,
        query?: Record<string, string | null | undefined>,
    ) => {
        const normalized =
            next === 'groups'
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
        accountUser: user ? { ...(data?.accountUser ?? {}), ...user } as SerenatasUser : data?.accountUser ?? null,
        mode,
        ownerFeaturesEnabled: ownerFeatures,
        profiles,
        section,
        setSection,
        changeSection,
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
        refresh: refreshPanelData,
        refreshAgenda,
        checkoutStatus,
        setCheckoutStatus,
        solicitudesPendingCount,
        solicitudesSoundMuted,
        toggleSolicitudesSound,
        solicitudesNotificationPermission,
        solicitudesBrowserNotificationsEnabled,
        solicitudesBrowserNotificationsSupported,
        requestSolicitudesBrowserNotifications,
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

/** Contexto del panel cuando está montado; `undefined` en rutas públicas sin provider. */
export function useSerenataOptional() {
    return useContext(SerenataContext);
}
