"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useToast } from '@/components/ui/toast/ToastProvider';


export interface NotificationItem {
  id: string;
  type: 'message' | 'sale' | 'system' | 'marketing' | 'alert';
  title?: string | null;
  body?: string | null;
  data?: any;
  read: boolean;
  createdAt: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export type NotificationType = 'message' | 'sale' | 'system' | 'marketing' | 'alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationConfig {
  color: string;
  bgColor: string;
  icon: string;
  priority: NotificationPriority;
  showToast: boolean;
  actions?: string[];
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  message: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    icon: '💬',
    priority: 'high',
    showToast: true,
    actions: ['reply', 'view']
  },
  sale: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    icon: '💰',
    priority: 'high',
    showToast: true,
    actions: ['view', 'contact']
  },
  system: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    icon: '⚙️',
    priority: 'normal',
    showToast: false,
    actions: ['view']
  },
  marketing: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    icon: '📢',
    priority: 'low',
    showToast: false,
    actions: ['view', 'unsubscribe']
  },
  alert: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    icon: '🚨',
    priority: 'urgent',
    showToast: true,
    actions: ['view', 'dismiss']
  }
};

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAll: () => Promise<void>;
  markIds: (ids: string[]) => Promise<void>;
  pushLocal: (n: NotificationItem) => void;
  createNotification: (type: NotificationType, title: string, body?: string, data?: any) => Promise<void>;
}

const Ctx = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<any>(null);
  const { user } = useAuth();
  const supabase = useSupabase();
  const { addToast } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error obteniendo notificaciones:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: NotificationItem) => !n.read).length);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    }
  }, [user]);

  const refresh = fetchAll;

  const markAll = useCallback(async () => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marcando todas como leídas:', error);
        return;
      }

      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  }, [user]);

  const markIds = useCallback(async (ids: string[]) => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) {
        console.error('Error marcando notificaciones como leídas:', error);
        return;
      }

      setNotifications(ns => ns.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - ids.filter(id => notifications.find(n => n.id === id && !n.read)).length));
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error);
    }
  }, [user, notifications]);

  const createNotification = useCallback(async (type: NotificationType, title: string, body?: string, data?: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type,
          title,
          body,
          data,
          priority: NOTIFICATION_CONFIGS[type].priority
        });

      if (error) {
        console.error('Error creando notificación:', error);
      }
      // La notificación se agregará automáticamente via realtime
    } catch (error) {
      console.error('Error creando notificación:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      // Limpiar subscription si no hay usuario
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Obtener notificaciones iniciales
    fetchAll();

    // Configurar subscription realtime
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('Realtime notification:', payload);

          if (payload.eventType === 'INSERT') {
            // Nueva notificación
            const newNotification = payload.new as NotificationItem;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }

            // Mostrar toast si la notificación lo requiere
            const config = NOTIFICATION_CONFIGS[newNotification.type];
            if (config?.showToast) {
              addToast(
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <div>
                    <div className="font-medium">{newNotification.title}</div>
                    <div className="text-sm opacity-90">{newNotification.body}</div>
                  </div>
                </div>,
                { type: newNotification.priority === 'urgent' ? 'error' : 'info' }
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            // Notificación actualizada (marcada como leída)
            const updatedNotification = payload.new as NotificationItem;
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            // Recalcular unread count
            setNotifications(current => {
              setUnreadCount(current.filter((n: NotificationItem) => !n.read).length);
              return current;
            });
          } else if (payload.eventType === 'DELETE') {
            // Notificación eliminada
            const deletedId = payload.old.id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchAll]);

  const pushLocal = useCallback((n: NotificationItem) => {
    setNotifications(ns => [n, ...ns]);
    if (!n.read) setUnreadCount(c => c + 1);
  }, []);

  return (
    <Ctx.Provider value={{ notifications, unreadCount, refresh, markAll, markIds, pushLocal, createNotification }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('NotificationsProvider missing');
  return ctx;
}
