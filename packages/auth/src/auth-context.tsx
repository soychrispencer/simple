'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE } from '@simple/config';

import type { VerticalType } from '@simple/types';

type SimplePlatformApp = 'simpleagenda' | 'simpleautos' | 'simpleplataforma' | 'simplepropiedades' | 'simpleserenatas' | 'simpleadmin';

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

type AuthContextType = {
    user: User;
    isLoggedIn: boolean;
    authLoading: boolean;
    refreshSession: () => Promise<User>;
    login: (email: string, password: string) => Promise<AuthActionResult>;
    register: (input: { name: string; phone: string; email: string; password: string; termsAccepted: boolean; captchaToken?: string | null }) => Promise<AuthActionResult>;
    activatePlatform: (app?: SimplePlatformApp) => Promise<AuthActionResult>;
    logout: () => Promise<void>;
    requireAuth: (callback?: () => void) => boolean;
    openAuth: (mode?: 'login' | 'register') => void;
    closeAuth: () => void;
    authOpen: boolean;
    authInitialMode: 'login' | 'register';
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
    const [authLoading, setAuthLoading] = useState(true);
    const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

    const consumePendingCallback = useCallback(() => {
        if (!pendingCallback) return;
        pendingCallback();
        setPendingCallback(null);
    }, [pendingCallback]);

    const refreshSession = useCallback(async (): Promise<User> => {
        const { data } = await authRequest('/api/auth/me', { method: 'GET' }, appId);
        const nextUser = data?.user ?? null;
        setUser((current) => (sameUser(current, nextUser) ? current : nextUser));
        return nextUser;
    }, [appId]);

    useEffect(() => {
        let mounted = true;

        const bootstrapSession = async () => {
            const { data } = await authRequest('/api/auth/me', { method: 'GET' }, appId);
            if (!mounted) return;
            const nextUser = data?.user ?? null;
            setUser((current) => (sameUser(current, nextUser) ? current : nextUser));
            setAuthLoading(false);
        };

        bootstrapSession();

        return () => {
            mounted = false;
        };
    }, [appId]);

    const login = useCallback(
        async (email: string, password: string): Promise<AuthActionResult> => {
            const { status, data } = await authRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            }, appId);

            if (!data?.user) {
                const errorMsg = data?.error || (status === 0 ? 'Error de conexión con el servidor' : 'Error de inicio de sesión');
                return { ok: false, error: errorMsg, code: data?.code, status };
            }
            setUser(data.user);
            if (data.user.status === 'verified') {
                setAuthOpen(false);
                consumePendingCallback();
            }
            return { ok: true, user: data.user, status };
        },
        [appId, consumePendingCallback]
    );

    const register = useCallback(
        async (input: { name: string; phone: string; email: string; password: string; termsAccepted: boolean; captchaToken?: string | null }): Promise<AuthActionResult> => {
            const { status, data } = await authRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(input),
            }, appId);

            if (!data?.user) {
                return { ok: false, error: data?.error, status };
            }
            setUser(data.user);
            return { ok: true, user: data.user, status };
        },
        [appId]
    );

    const activatePlatform = useCallback(async (app?: SimplePlatformApp): Promise<AuthActionResult> => {
        const targetApp = app ?? appId ?? resolveAppFromBrowser();
        const { status, data } = await authRequest('/api/auth/platform-access/activate', {
            method: 'POST',
            body: JSON.stringify(targetApp ? { app: targetApp } : {}),
        }, appId);

        if (!data?.user) {
            return {
                ok: false,
                error: data?.error || (status === 0 ? 'Error de conexión con el servidor' : 'No pudimos activar esta plataforma.'),
                status,
            };
        }
        setUser(data.user);
        return { ok: true, user: data.user, status };
    }, [appId]);

    const logout = useCallback(async () => {
        await authRequest('/api/auth/logout', { method: 'POST' }, appId);
        setUser(null);
    }, [appId]);

    const requireAuth = useCallback(
        (callback?: () => void): boolean => {
            if (user) return true;
            if (callback) setPendingCallback(() => callback);
            setAuthOpen(true);
            return false;
        },
        [user]
    );

    const openAuth = useCallback((mode: 'login' | 'register' = 'login') => {
        setAuthInitialMode(mode);
        setAuthOpen(true);
    }, []);
    const closeAuth = useCallback(() => {
        setAuthOpen(false);
        setPendingCallback(null);
    }, []);

    const value = useMemo<AuthContextType>(
        () => ({
            user,
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
        }),
        [activatePlatform, authInitialMode, authLoading, authOpen, closeAuth, login, logout, openAuth, refreshSession, register, requireAuth, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
