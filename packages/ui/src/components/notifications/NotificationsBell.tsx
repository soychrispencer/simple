"use client";
import React, { useEffect, useRef, useState } from "react";
import { IconBell } from "@tabler/icons-react";
import { CircleButton, UserAvatar } from "../ui";
import { NOTIFICATION_CONFIGS, NotificationType, useNotifications } from "./NotificationsContext";
import { useAvatarUrl } from "../../lib/storage";

interface NotificationsBellProps {
  panelClassName?: string;
  badgeClassName?: string;
}

export function NotificationsBell({ panelClassName = "", badgeClassName = "" }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAll, markIds } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);
  const resolveAvatarUrl = useAvatarUrl();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAll = async () => {
    await markAll();
  };

  const handleMarkOne = async (id: string) => {
    await markIds([id]);
  };

  const getConfig = (type: string) => NOTIFICATION_CONFIGS[type as NotificationType] || NOTIFICATION_CONFIGS.system;

  const resolveVerticalLabel = (payload?: any) => {
    if (!payload || typeof payload !== "object") return "";
    const key = payload.vertical_key || payload.verticalKey || payload.vertical;
    if (typeof key !== "string" || !key.trim()) return "";
    const normalized = key.trim().toLowerCase();
    const labels: Record<string, string> = {
      autos: "SimpleAutos",
      propiedades: "SimplePropiedades",
      tiendas: "SimpleTiendas",
      food: "SimpleFood",
      global: "Global",
      admin: "Admin",
    };
    return labels[normalized] || key;
  };

  const resolveActorAvatar = (payload?: any) => {
    if (!payload) return "";

    // Try common payload shapes before falling back to the raw object/string.
    const candidate =
      (typeof payload === "object" &&
        (payload.actor ||
          payload.profile ||
          payload.sender ||
          payload.user ||
          payload.owner ||
          payload.contact ||
          payload.customer ||
          payload.author ||
          payload.member ||
          payload.from)) ||
      payload.avatar_url ||
      payload.avatar ||
      payload.actor_avatar ||
      payload.picture ||
      payload.image ||
      payload.photo ||
      payload;

    return resolveAvatarUrl(candidate);
  };

  return (
    <div ref={ref} className="relative flex items-center h-full">
      <CircleButton
        aria-label="Notificaciones"
        onClick={() => setOpen((state) => !state)}
        size={40}
        variant="default"
        className="relative"
      >
        <IconBell size={20} stroke={1} className="align-middle" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 bg-[var(--color-danger)] text-[var(--color-on-primary)] text-xs rounded-full h-5 w-5 flex items-center justify-center ${badgeClassName}`.trim()}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </CircleButton>
      {open && (
        <div
          className={`absolute right-0 top-full w-80 rounded-xl card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-2 z-[9999] animate-fadeInSlide ${panelClassName}`.trim()}
        >
          <div className="px-4 py-3 border-b border-lightborder/10 dark:border-darkborder/10 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-lighttext dark:text-darktext">Notificaciones</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs leading-tight text-primary hover:underline text-right"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-3 text-sm text-lighttext/70 dark:text-darktext/70">No hay notificaciones</div>
            ) : (
              notifications.map((notification) => {
                const config = getConfig(notification.type);
                const avatarUrl = resolveActorAvatar(notification.data);
                const verticalLabel = resolveVerticalLabel(notification.data);

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-lightborder/5 dark:border-darkborder/5 ${!notification.read ? config.bgColor : ""}`.trim()}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {avatarUrl ? (
                          <UserAvatar src={avatarUrl} size="sm" className="flex-shrink-0" />
                        ) : (
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full bg-[var(--field-bg)] border border-[var(--field-border)] flex-shrink-0 ${config.color}`.trim()}
                          >
                            {config.icon}
                          </span>
                        )}
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${config.color}`}>
                            {notification.title || "Notificación"}
                          </p>
                          {notification.body && (
                            <p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">{notification.body}</p>
                          )}
                          <p className="text-xs text-lighttext/60 dark:text-darktext/60 mt-1">
                            {verticalLabel ? `${verticalLabel} · ` : ""}
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {!notification.read && (
                        <button onClick={() => handleMarkOne(notification.id)} className="ml-2 text-primary text-xs hover:underline">
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
