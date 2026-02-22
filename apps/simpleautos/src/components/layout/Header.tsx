"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header as SharedHeader, NotificationsBell } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";
import { getAvatarUrl } from "@/lib/storageMedia";
import { autosPanelManifest } from "@simple/panel";
import { AUTOS_BRANDING } from "@/config/branding";

const headerFeatures = {
  showNotifications: true,
};

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [publicAvatar, setPublicAvatar] = useState<{ userId: string; path: string }>({
    userId: "",
    path: "",
  });

  const userProfileAvatar = (user as any)?.profile?.avatar_url as string | undefined;
  const userDirectAvatar = (user as any)?.avatar_url as string | undefined;
  const userLegacyAvatar = (user as any)?.avatar as string | undefined;

  const userHasAnyAvatar = useMemo(() => {
    return Boolean(userDirectAvatar || userProfileAvatar || userLegacyAvatar);
  }, [userDirectAvatar, userProfileAvatar, userLegacyAvatar]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      return;
    }

    // Si ya tenemos avatar en `profiles` (o shape equivalente), no consultamos `public_profiles`.
    if (userHasAnyAvatar) return;

    (async () => {
      const response = await fetch("/api/profile/avatar", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));

      if (cancelled) return;
      if (!response.ok) {
        setPublicAvatar({ userId: user.id, path: "" });
        return;
      }
      const avatarPath = String((payload as { avatar_url?: unknown }).avatar_url || "");
      setPublicAvatar({ userId: user.id, path: avatarPath });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userHasAnyAvatar]);

  const resolveAvatarUrl = (currentUser: any) => {
    const fallbackPublicPath =
      currentUser?.id && publicAvatar.userId === currentUser.id ? publicAvatar.path : undefined;

    const raw: string | undefined =
      currentUser?.avatar_url ||
      currentUser?.profile?.avatar_url ||
      currentUser?.avatar ||
      fallbackPublicPath;

    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return getAvatarUrl(null, raw);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SharedHeader
      vertical="autos"
      user={user}
      loading={loading}
      onLogout={handleLogout}
      NotificationComponent={NotificationsBell}
      getAvatarUrl={resolveAvatarUrl}
      brandLogo={{
        light: AUTOS_BRANDING.logos.light,
        dark: AUTOS_BRANDING.logos.dark,
        color: AUTOS_BRANDING.logos.color,
        alt: AUTOS_BRANDING.appName,
      }}
      showNotifications={headerFeatures.showNotifications}
      panelManifest={autosPanelManifest}
    />
  );
}
