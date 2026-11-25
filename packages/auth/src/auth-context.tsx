'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE } from '@simple/config';

import type { VerticalType } from '@simple/types';

type SimplePlatformApp =
    | 'simpleagenda'
    | 'simpleautos'
    | 'simpleplataforma'
    | 'simplepropiedades'
    | 'simpleserenatas'
    | 'simpleadmin'
    | 'simpletickets'
    | 'simpleresto';

type PlatformAccess = {
    app: SimplePlatformApp;
    label: string;
    status: 'active' | 'inactive' | 'suspended' | string;
    role: string;
    origin?: string | null;
    firstSeenAt?: string | null;
    activatedAt?: string | null;
    lastLoginAt?: string | null;
};

type User = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: 'user' | 'admin' | 'superadmin';
    status: 'active' | 'verified' | 'suspended';
    primaryVertical?: VerticalType | null;
    avatar?: string;
    pendingEmail?: string | null;
    provider?: string | null;
    hasPassword?: boolean;
    lastLoginAt?: string | null;
    timezone?: string;
    residence?: {
        countryCode: string;
        regionId: string | null;
        regionName: string | null;
        localityId: string | null;
        localityName: string | null;
    };
    residenceCountryCode?: string;
    residenceRegionId?: string | null;
    residenceRegionName?: string | null;
    residenceLocalityId?: string | null;
    residenceLocalityName?: string | null;
    currentApp?: SimplePlatformApp | null;
    platformAccesses?: PlatformAccess[];
} | null;

type AuthActionResult = {
    ok: boolean;
    user?: NonNullable<User>;
    error?: string;
    code?: string;
    status?: number;
};

type AuthOpenOptions = {
    returnTo?: string;
    contextLabel?: string;
};

type AuthContextType = {
    user: User;
    currentApp: SimplePlatformApp | null;
    isLoggedIn: boolean;
    authLoading: boolean;
    refreshSession: () => Promise<User>;
    login: (email: string, password: string) => Promise<AuthActionResult>;
    register: (input: { name: string; phone: string; email: string; password: string; termsAccepted: boolean; captchaToken?: string | null; returnTo?: string }) => Promise<AuthActionResult>;
    activatePlatform: (app?: SimplePlatformApp) => Promise<AuthActionResult>;
    logout: () => Promise<void>;
    requireAuth: (callback?: () => void) => boolean;
    openAuth: (mode?: 'login' | 'register', options?: AuthOpenOptions) => void;
    closeAuth: () => void;
    authOpen: boolean;
    authInitialMode: 'login' | 'register';
    authOpenOptions: AuthOpenOptions | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

type AuthApiResponse = {
    ok?: boolean;
    error?: string;
    code?: string;
    user?: NonNullable<User>;
};

function sameUser(a: User, b: User): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.id === b.id
        && a.email === b.email
        && a.name === b.name
        && a.phone === b.phone
        && a.role === b.role
        && a.status === b.status
        && a.primaryVertical === b.primaryVertical
        && a.avatar === b.avatar
        && a.pendingEmail === b.pendingEmail
        && a.provider === b.provider
        && a.hasPassword === b.hasPassword
        && a.lastLoginAt === b.lastLoginAt
        && a.timezone === b.timezone
        && a.currentApp === b.currentApp
        && a.residence === b.residence
        && a.residenceCountryCode === b.residenceCountryCode
        && a.residenceRegionId === b.residenceRegionId
        && a.residenceRegionName === b.residenceRegionName
        && a.residenceLocalityId === b.residenceLocalityId
        && a.residenceLocalityName === b.residenceLocalityName
        && JSON.stringify(a.platformAccesses ?? []) === JSON.stringify(b.platformAccesses ?? []);
}

function resolveAppFromBrowser(): SimplePlatformApp | null {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname.toLowerCase();
    const port = window.location.port;
    if (hostname.includes('simpleagenda') || port === '3004') return 'simpleagenda';
    if (hostname.includes('simpleautos') || port === '3002') return 'simpleautos';
    if (hostname.includes('simplepropiedades') || port === '3003') return 'simplepropiedades';
    if (hostname.includes('simpleserenatas') || port === '3005') return 'simpleserenatas';
    if (hostname.includes('simpletickets') || port === '3006') return 'simpletickets';
    if (hostname.includes('simpleresto') || port === '3007') return 'simpleresto';
    if (hostname.includes('simpleadmin') || port === '3000') return 'simpleadmin';
    return null;
}

async function authRequest(path: string, init?: RequestInit, appId?: SimplePlatformApp | null): Promise<{ status: number; data: AuthApiResponse | null }> {
    try {
        const currentApp = appId ?? resolveAppFromBrowser();
        const response = await fetch(`${API_BASE}${path}`, {
            ...init,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(currentApp ? { 'X-Simple-App': currentApp } : {}),
                ...(init?.headers ?? {}),
            },
        });

        let data: AuthApiResponse | null = null;
        try {
            const contentType = response.headers.get('content-type') ?? '';
            const expectsJson = contentType.includes('application/json');
            const text = await response.text();
            if (text && expectsJson) {
                data = JSON.parse(text) as AuthApiResponse;
            }
        } catch (parseError) {
            console.warn('[AUTH] Ignoring non-JSON auth response:', { path, status: response.status, parseError });
        }
        
        return { status: response.status, data };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[AUTH] Fetch error:', path, message);
        return { status: 0, data: null };
    }
}

export function AuthProvider({ children, appId }: { children: ReactNode; appId?: SimplePlatformApp }) {
    const [user, setUser] = useState<User>(null);
    const [authOpen, setAuthOpen] = useState(false);
    const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
    const [authOpenOptions, setAuthOpenOptions] = useState<AuthOpenOptions | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
    const sessionRequestId = useRef(0);
    const sessionUser = useRef<User>(null);
    const currentApp = appId ?? resolveAppFromBrowser();

    const commitUser = useCallback((nextUser: User) => {
        sessionUser.current = nextUser;
        setUser(nextUser);
    }, []);

    const consumePendingCallback = useCallback(() => {
        if (!pendingCallback) return;
        pendingCallback();
        setPendingCallback(null);
    }, [pendingCallback]);

    const refreshSession = useCallback(async (): Promise<User> => {
        const requestId = ++sessionRequestId.current;
        const { data } = await authRequest('/api/auth/me', { method: 'GET' }, appId);
        const nextUser = data?.user ?? null;
        if (sessionRequestId.current !== requestId) return sessionUser.current;
        const currentUser = sessionUser.current;
        const resolvedUser = sameUser(currentUser, nextUser) ? currentUser : nextUser;
        commitUser(resolvedUser);
        setAuthLoading(false);
        return resolvedUser;
    }, [appId, commitUser]);

    useEffect(() => {
        let mounted = true;
        const requestId = ++sessionRequestId.current;

        const bootstrapSession = async () => {
            const { data } = await authRequest('/api/auth/me', { method: 'GET' }, appId);
            if (!mounted || sessionRequestId.current !== requestId) return;
            const nextUser = data?.user ?? null;
            const currentUser = sessionUser.current;
            commitUser(sameUser(currentUser, nextUser) ? currentUser : nextUser);
            setAuthLoading(false);
        };

        bootstrapSession();

        return () => {
            mounted = false;
        };
    }, [appId, commitUser]);

    const login = useCallback(
        async (email: string, password: string): Promise<AuthActionResult> => {
            const requestId = ++sessionRequestId.current;
            const { status, data } = await authRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            }, appId);

            if (sessionRequestId.current !== requestId) {
                return { ok: false, error: 'La sesión cambió mientras iniciabas sesión. Inténtalo nuevamente.', status };
            }
            if (!data?.user) {
                setAuthLoading(false);
                const errorMsg = data?.error || (status === 0 ? 'Error de conexión con el servidor' : 'Error de inicio de sesión');
                return { ok: false, error: errorMsg, code: data?.code, status };
            }
            commitUser(data.user);
            setAuthLoading(false);
            if (data.user.status === 'verified') {
                setAuthOpen(false);
                setAuthOpenOptions(null);
                consumePendingCallback();
            }
            return { ok: true, user: data.user, status };
        },
        [appId, commitUser, consumePendingCallback]
    );

    const register = useCallback(
        async (input: { name: string; phone: string; email: string; password: string; termsAccepted: boolean; captchaToken?: string | null; returnTo?: string }): Promise<AuthActionResult> => {
            const requestId = ++sessionRequestId.current;
            const { status, data } = await authRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(input),
            }, appId);

            if (sessionRequestId.current !== requestId) {
                return { ok: false, error: 'La sesión cambió mientras creabas tu cuenta. Inténtalo nuevamente.', status };
            }
            if (!data?.user) {
                setAuthLoading(false);
                return { ok: false, error: data?.error, status };
            }
            commitUser(data.user);
            setAuthLoading(false);
            return { ok: true, user: data.user, status };
        },
        [appId, commitUser]
    );

    const activatePlatform = useCallback(async (app?: SimplePlatformApp): Promise<AuthActionResult> => {
        const requestId = ++sessionRequestId.current;
        const targetApp = app ?? appId ?? resolveAppFromBrowser();
        const { status, data } = await authRequest('/api/auth/platform-access/activate', {
            method: 'POST',
            body: JSON.stringify(targetApp ? { app: targetApp } : {}),
        }, appId);

        if (sessionRequestId.current !== requestId) {
            return { ok: false, error: 'La sesión cambió durante la activación. Inténtalo nuevamente.', status };
        }
        if (!data?.user) {
            setAuthLoading(false);
            return {
                ok: false,
                error: data?.error || (status === 0 ? 'Error de conexión con el servidor' : 'No pudimos activar esta plataforma.'),
                status,
            };
        }
        commitUser(data.user);
        setAuthLoading(false);
        return { ok: true, user: data.user, status };
    }, [appId, commitUser]);

    const logout = useCallback(async () => {
        ++sessionRequestId.current;
        commitUser(null);
        setAuthLoading(false);
        setAuthOpen(false);
        setAuthOpenOptions(null);
        setPendingCallback(null);
        await authRequest('/api/auth/logout', { method: 'POST' }, appId);
    }, [appId, commitUser]);

    const requireAuth = useCallback(
        (callback?: () => void): boolean => {
            if (user) return true;
            if (callback) setPendingCallback(() => callback);
            setAuthOpenOptions(null);
            setAuthOpen(true);
            return false;
        },
        [user]
    );

    const openAuth = useCallback((mode: 'login' | 'register' = 'login', options?: AuthOpenOptions) => {
        setAuthInitialMode(mode);
        setAuthOpenOptions(options ?? null);
        setAuthOpen(true);
    }, []);
    const closeAuth = useCallback(() => {
        setAuthOpen(false);
        setAuthOpenOptions(null);
        setPendingCallback(null);
    }, []);

    const value = useMemo<AuthContextType>(
        () => ({
            user,
            currentApp,
            isLoggedIn: !!user,
            authLoading,
            refreshSession,
            login,
            register,
            activatePlatform,
            logout,
            requireAuth,
            openAuth,
            closeAuth,
            authOpen,
            authInitialMode,
            authOpenOptions,
        }),
        [activatePlatform, authInitialMode, authLoading, authOpen, authOpenOptions, closeAuth, currentApp, login, logout, openAuth, refreshSession, register, requireAuth, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
