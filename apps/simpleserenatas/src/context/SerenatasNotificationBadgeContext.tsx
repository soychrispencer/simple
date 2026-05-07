'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { API_BASE } from '@simple/config';
import { useAuth } from '@/context/AuthContext';

type SerenatasNotificationBadgeContextValue = {
    unreadCount: number;
    refresh: () => Promise<void>;
};

const SerenatasNotificationBadgeContext =
    createContext<SerenatasNotificationBadgeContextValue | null>(null);

export function SerenatasNotificationBadgeProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
            setUnreadCount(0);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/notifications/unread-count`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok && typeof data.count === 'number') {
                setUnreadCount(data.count);
            }
        } catch {
            /* noop */
        }
    }, [isAuthenticated]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            void refresh();
        }, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, refresh]);

    const value = useMemo(
        () => ({
            unreadCount,
            refresh,
        }),
        [unreadCount, refresh]
    );

    return (
        <SerenatasNotificationBadgeContext.Provider value={value}>
            {children}
        </SerenatasNotificationBadgeContext.Provider>
    );
}

export function useSerenatasNotificationBadge() {
    const ctx = useContext(SerenatasNotificationBadgeContext);
    if (!ctx) {
        throw new Error('useSerenatasNotificationBadge debe usarse dentro de SerenatasNotificationBadgeProvider');
    }
    return ctx;
}
