'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type User = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: 'user' | 'admin' | 'superadmin';
    status: 'active' | 'verified' | 'suspended';
    avatar?: string;
} | null;

type AuthActionResult = {
    ok: boolean;
    user?: NonNullable<User>;
    error?: string;
    status?: number;
};

type AuthContextType = {
    user: User;
    isLoggedIn: boolean;
    authLoading: boolean;
    refreshSession: () => Promise<User>;
    login: (email: string, password: string) => Promise<AuthActionResult>;
    register: (name: string, email: string, password: string) => Promise<AuthActionResult>;
    logout: () => Promise<void>;
    requireAuth: (callback?: () => void) => boolean;
    openAuth: () => void;
    closeAuth: () => void;
    authOpen: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type AuthApiResponse = {
    ok?: boolean;
    error?: string;
    user?: NonNullable<User>;
};

function sameUser(a: User, b: User): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.id === b.id && a.email === b.email && a.name === b.name && a.phone === b.phone && a.role === b.role && a.status === b.status && a.avatar === b.avatar;
}

async function authRequest(path: string, init?: RequestInit): Promise<{ status: number; data: AuthApiResponse | null }> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        let data: AuthApiResponse | null = null;
        try {
            const text = await response.text();
            if (text) {
                data = JSON.parse(text) as AuthApiResponse;
            }
        } catch (parseError) {
            console.error('[AUTH] JSON parse error:', { path, status: response.status, parseError });
        }
        
        return { status: response.status, data };
    } catch (error) {
        console.error('[AUTH] Fetch error:', { path, error });
        return { status: 0, data: null };
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [authOpen, setAuthOpen] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

    const consumePendingCallback = useCallback(() => {
        if (!pendingCallback) return;
        pendingCallback();
        setPendingCallback(null);
    }, [pendingCallback]);

    const refreshSession = useCallback(async (): Promise<User> => {
        const { data } = await authRequest('/api/auth/me', { method: 'GET' });
        const nextUser = data?.user ?? null;
        setUser((current) => (sameUser(current, nextUser) ? current : nextUser));
        return nextUser;
    }, []);

    useEffect(() => {
        let mounted = true;

        const bootstrapSession = async () => {
            const { data } = await authRequest('/api/auth/me', { method: 'GET' });
            if (!mounted) return;
            const nextUser = data?.user ?? null;
            setUser((current) => (sameUser(current, nextUser) ? current : nextUser));
            setAuthLoading(false);
        };

        bootstrapSession();

        return () => {
            mounted = false;
        };
    }, []);

    const login = useCallback(
        async (email: string, password: string): Promise<AuthActionResult> => {
            const { status, data } = await authRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (!data?.user) {
                const errorMsg = data?.error || (status === 0 ? 'Error de conexión con el servidor' : 'Error de inicio de sesión');
                console.error('[AUTH] Login failed:', { status, data, errorMsg });
                return { ok: false, error: errorMsg, status };
            }
            setUser(data.user);
            if (data.user.status === 'verified') {
                setAuthOpen(false);
                consumePendingCallback();
            }
            return { ok: true, user: data.user, status };
        },
        [consumePendingCallback]
    );

    const register = useCallback(
        async (name: string, email: string, password: string): Promise<AuthActionResult> => {
            const { status, data } = await authRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
            });

            if (!data?.user) {
                return { ok: false, error: data?.error, status };
            }
            setUser(data.user);
            return { ok: true, user: data.user, status };
        },
        []
    );

    const logout = useCallback(async () => {
        await authRequest('/api/auth/logout', { method: 'POST' });
        setUser(null);
    }, []);

    const requireAuth = useCallback(
        (callback?: () => void): boolean => {
            if (user) return true;
            if (callback) setPendingCallback(() => callback);
            setAuthOpen(true);
            return false;
        },
        [user]
    );

    const openAuth = useCallback(() => setAuthOpen(true), []);
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
            logout,
            requireAuth,
            openAuth,
            closeAuth,
            authOpen,
        }),
        [authLoading, authOpen, closeAuth, login, logout, openAuth, refreshSession, register, requireAuth, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
