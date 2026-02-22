"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@simple/auth";
import { useToast } from "../feedback/ToastProvider";
import {
  IconAlertTriangle,
  IconCash,
  IconMessageCircle,
  IconSpeakerphone,
  IconSettings,
} from "@tabler/icons-react";

export type NotificationType = "message" | "sale" | "system" | "marketing" | "alert";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  data?: any;
  read: boolean;
  createdAt: string;
  priority?: NotificationPriority;
}

export interface NotificationConfig {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  priority: NotificationPriority;
  showToast: boolean;
  actions?: string[];
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  message: {
    color: "text-primary",
    bgColor: "bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)]",
    icon: <IconMessageCircle size={18} stroke={1.5} />,
    priority: "high",
    showToast: true,
    actions: ["reply", "view"],
  },
  sale: {
    color: "text-[var(--color-success)]",
    bgColor: "bg-[var(--color-success-subtle-bg)]",
    icon: <IconCash size={18} stroke={1.5} />,
    priority: "high",
    showToast: true,
    actions: ["view", "contact"],
  },
  system: {
    color: "text-[var(--text-secondary)]",
    bgColor: "bg-[var(--field-bg)]",
    icon: <IconSettings size={18} stroke={1.5} />,
    priority: "normal",
    showToast: false,
    actions: ["view"],
  },
  marketing: {
    color: "text-primary",
    bgColor: "bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)]",
    icon: <IconSpeakerphone size={18} stroke={1.5} />,
    priority: "low",
    showToast: false,
    actions: ["view", "unsubscribe"],
  },
  alert: {
    color: "text-[var(--color-danger)]",
    bgColor: "bg-[var(--color-danger-subtle-bg)]",
    icon: <IconAlertTriangle size={18} stroke={1.5} />,
    priority: "urgent",
    showToast: true,
    actions: ["view", "dismiss"],
  },
};

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAll: () => Promise<void>;
  markIds: (ids: string[]) => Promise<void>;
  pushLocal: (notification: NotificationItem) => void;
  createNotification: (
    type: NotificationType,
    title: string,
    body?: string,
    data?: any
  ) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function normalizeNotificationRow(row: any): NotificationItem {
  return {
    id: String(row.id || ""),
    type: (row.type || "system") as NotificationType,
    title: row.title,
    body: row.body ?? row.content,
    data: row.data,
    read: row.read ?? row.is_read ?? false,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    priority: (row.priority || NOTIFICATION_CONFIGS[row.type as NotificationType]?.priority || "normal") as NotificationPriority,
  };
}

async function requestNotificationsApi<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(path, {
      cache: "no-store",
      credentials: "include",
      ...init,
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  const computeUnread = useCallback(
    (items: NotificationItem[]) => items.filter((n) => !n.read).length,
    []
  );

  const fetchAll = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const response = await requestNotificationsApi<{ notifications?: unknown[]; unreadCount?: number }>(
      "/api/notificaciones?limit=50",
      { method: "GET" }
    );

    if (!response.ok) {
      if (response.status === 404 || response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
      }
      return;
    }

    const rows = Array.isArray(response.data?.notifications) ? response.data?.notifications : [];
    const next = rows.map(normalizeNotificationRow);
    setNotifications(next);
    const explicitUnread = Number(response.data?.unreadCount);
    setUnreadCount(Number.isFinite(explicitUnread) ? explicitUnread : computeUnread(next));
  }, [computeUnread, user]);

  const markAll = useCallback(async () => {
    if (!user) return;
    const response = await requestNotificationsApi("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!response.ok) return;

    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  const markIds = useCallback(
    async (ids: string[]) => {
      if (!user || ids.length === 0) return;
      const response = await requestNotificationsApi("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return;

      setNotifications((list) => {
        const next = list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n));
        setUnreadCount(computeUnread(next));
        return next;
      });
    },
    [computeUnread, user]
  );

  const createNotification = useCallback(
    async (type: NotificationType, title: string, body?: string, data?: any) => {
      if (!user) return;
      const response = await requestNotificationsApi<{ notification?: unknown }>("/api/notificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, body, data }),
      });
      if (!response.ok) return;

      const created = response.data?.notification ? normalizeNotificationRow(response.data.notification) : null;
      if (!created) return;

      setNotifications((list) => {
        const next = [created, ...list];
        setUnreadCount(computeUnread(next));
        return next;
      });
    },
    [computeUnread, user]
  );

  const pushLocal = useCallback(
    (notification: NotificationItem) => {
      setNotifications((list) => {
        const next = [notification, ...list];
        setUnreadCount(computeUnread(next));
        return next;
      });

      const config = NOTIFICATION_CONFIGS[notification.type];
      if (config?.showToast) {
        addToast(
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <div>
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm opacity-90">{notification.body}</div>
            </div>
          </div>,
          { type: notification.priority === "urgent" ? "error" : "info" }
        );
      }
    },
    [addToast, computeUnread]
  );

  useEffect(() => {
    if (!user) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void fetchAll();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void fetchAll();
    }, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchAll, user]);

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh: fetchAll, markAll, markIds, pushLocal, createNotification }),
    [createNotification, fetchAll, markAll, markIds, notifications, pushLocal, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("NotificationsProvider missing");
  return ctx;
}

