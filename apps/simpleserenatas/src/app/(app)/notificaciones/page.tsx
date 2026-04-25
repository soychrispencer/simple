'use client';

import { useState, useEffect } from 'react';
import { 
    IconBell,
    IconCheck,
    IconConfetti,
    IconUser,
    IconCreditCard,
    IconMessageCircle,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface Notification {
    id: string;
    type: 'serenata' | 'payment' | 'message' | 'system';
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export default function NotificacionesPage() {
    const { user } = useAuth();
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
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'serenata': return <IconConfetti size={20} className="text-rose-500" />;
            case 'payment': return <IconCreditCard size={20} className="text-green-500" />;
            case 'message': return <IconMessageCircle size={20} className="text-blue-500" />;
            default: return <IconBell size={20} className="text-zinc-400" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Notificaciones</h1>
                        <p className="text-sm text-zinc-500">{unreadCount} sin leer</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm text-rose-500 font-medium"
                        >
                            Marcar todas
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-zinc-100">
                {notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <IconBell size={48} className="mx-auto text-zinc-300 mb-4" />
                        <p className="text-zinc-500">No tienes notificaciones</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => !notification.isRead && markAsRead(notification.id)}
                            className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                                notification.isRead ? 'bg-white' : 'bg-rose-50'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-zinc-900">{notification.title}</p>
                                <p className="text-sm text-zinc-500 mt-0.5">{notification.body}</p>
                                <p className="text-xs text-zinc-400 mt-2">
                                    {new Date(notification.createdAt).toLocaleString('es-CL')}
                                </p>
                            </div>
                            {!notification.isRead && (
                                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
