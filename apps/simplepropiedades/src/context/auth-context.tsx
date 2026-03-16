'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type User = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: 'user' | 'admin' | 'superadmin';
    avatar?: string;
} | null;

type AuthContextType = {
    user: User;
    isLoggedIn: boolean;
    authLoading: boolean;
    refreshSession: () => Promise<User>;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    requireAuth: (callback?: () => void) => boolean;
    openAuth: () => void;
    closeAuth: () => void;
    authOpen: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type AuthApiResponse = {
    ok: boolean;
    user?: NonNullable<User>;
};

function sameUser(a: User, b: User): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.id === b.id && a.email === b.email && a.name === b.name && a.phone === b.phone && a.role === b.role && a.avatar === b.avatar;
}

async function authRequest(path: string, init?: RequestInit): Promise<AuthApiResponse | null> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        const data = (await response.json().catch(() => null)) as AuthApiResponse | null;
        if (!response.ok || !data) return null;
        return data;
    } catch {
        return null;
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
        const data = await authRequest('/api/auth/me', { method: 'GET' });
        const nextUser = data?.user ?? null;
        setUser((current) => (sameUser(current, nextUser) ? current : nextUser));
        return nextUser;
    }, []);

    useEffect(() => {
        let mounted = true;

        const bootstrapSession = async () => {
            const data = await authRequest('/api/auth/me', { method: 'GET' });
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
        async (email: string, password: string): Promise<boolean> => {
            const data = await authRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (!data?.user) return false;
            setUser(data.user);
            setAuthOpen(false);
            consumePendingCallback();
            return true;
        },
        [consumePendingCallback]
    );

    const register = useCallback(
        async (name: string, email: string, password: string): Promise<boolean> => {
            const data = await authRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
            });

            if (!data?.user) return false;
            setUser(data.user);
            setAuthOpen(false);
            consumePendingCallback();
            return true;
        },
        [consumePendingCallback]
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
