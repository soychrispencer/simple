'use client';

import { useState, useEffect } from 'react';
import { 
    IconBell,
    IconConfetti,
    IconCreditCard,
    IconMessageCircle,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useSerenatasNotificationBadge } from '@/context/SerenatasNotificationBadgeContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Notification {
    id: string;
    type: 'serenata' | 'payment' | 'message' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export default function NotificacionesPage() {
    useAuth();
    const { refresh: refreshBadge } = useSerenatasNotificationBadge();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/notifications`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                void refreshBadge();
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/notifications/${id}/read`, {
                method: 'PATCH',
                credentials: 'include',
            });
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
                void refreshBadge();
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/notifications/read-all`, {
                method: 'POST',
                credentials: 'include',
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                void refreshBadge();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'serenata': return <IconConfetti size={20} style={{ color: 'var(--accent)' }} />;
            case 'payment': return <IconCreditCard size={20} style={{ color: 'var(--success)' }} />;
            case 'message': return <IconMessageCircle size={20} style={{ color: 'var(--info)' }} />;
            default: return <IconBell size={20} style={{ color: 'var(--fg-muted)' }} />;
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="pb-6">
            <SerenatasPageShell width="default">
                <SerenatasPageHeader
                    title="Notificaciones"
                    description={unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
                    trailing={
                        unreadCount > 0 ? (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-sm font-medium"
                                style={{ color: 'var(--accent)' }}
                            >
                                Marcar todas
                            </button>
                        ) : undefined
                    }
                />
            </SerenatasPageShell>

            <div className="divide-y border-t" style={{ borderColor: 'var(--border)' }}>
                {notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <IconBell size={48} className="mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
                        <p style={{ color: 'var(--fg-secondary)' }}>No tienes notificaciones</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => !notification.isRead && markAsRead(notification.id)}
                            className="p-4 flex items-start gap-3 cursor-pointer transition-colors"
                            style={{ background: notification.isRead ? 'var(--surface)' : 'var(--accent-subtle)' }}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface)' }}>
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>{notification.title}</p>
                                <p className="text-sm mt-0.5" style={{ color: 'var(--fg-secondary)' }}>{notification.message}</p>
                                <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                                    {new Date(notification.createdAt).toLocaleString('es-CL')}
                                </p>
                            </div>
                            {!notification.isRead && (
                                <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: 'var(--accent)' }} />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
