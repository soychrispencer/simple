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
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body ?? row.content,
    data: row.data,
    read: row.read ?? row.is_read ?? false,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    priority: (row.priority || NOTIFICATION_CONFIGS[row.type as NotificationType]?.priority || "normal") as NotificationPriority,
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<any>(null);
  const { user, supabase } = useAuth();
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

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Notifications] fetch error", error);
      return;
    }

    const next = (data || []).map(normalizeNotificationRow);
    setNotifications(next);
    setUnreadCount(computeUnread(next));
  }, [computeUnread, supabase, user]);

  const markAll = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("[Notifications] markAll error", error);
      return;
    }

    setNotifications((list) => {
      const next = list.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      return next;
    });
  }, [supabase, user]);

  const markIds = useCallback(
    async (ids: string[]) => {
      if (!user || ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("id", ids);

      if (error) {
        console.error("[Notifications] markIds error", error);
        return;
      }

      setNotifications((list) => {
        const next = list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n));
        setUnreadCount(computeUnread(next));
        return next;
      });
    },
    [computeUnread, supabase, user]
  );

  const createNotification = useCallback(
    async (type: NotificationType, title: string, body?: string, data?: any) => {
      if (!user) return;

      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        type,
        title,
        content: body,
        data,
        is_read: false,
      });

      if (error) {
        console.error("[Notifications] create error", error);
      }
    },
    [supabase, user]
  );

  const pushLocal = useCallback(
    (notification: NotificationItem) => {
      setNotifications((list) => {
        const next = [notification, ...list];
        setUnreadCount(computeUnread(next));
        return next;
      });
    },
    [computeUnread]
  );

  useEffect(() => {
    let mounted = true;

    const disposeChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    if (!user) {
      disposeChannel();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (!mounted) return;

          if (payload.eventType === "INSERT") {
            const newNotification = normalizeNotificationRow(payload.new);
            setNotifications((prev) => {
              const next = [newNotification, ...prev];
              setUnreadCount(computeUnread(next));
              return next;
            });

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
                { type: newNotification.priority === "urgent" ? "error" : "info" }
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = normalizeNotificationRow(payload.new);
            setNotifications((prev) => {
              const next = prev.map((n) => (n.id === updated.id ? updated : n));
              setUnreadCount(computeUnread(next));
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setNotifications((prev) => {
              const next = prev.filter((n) => n.id !== deletedId);
              setUnreadCount(computeUnread(next));
              return next;
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    fetchAll();

    return () => {
      mounted = false;
      disposeChannel();
    };
  }, [addToast, computeUnread, fetchAll, supabase, user]);

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
