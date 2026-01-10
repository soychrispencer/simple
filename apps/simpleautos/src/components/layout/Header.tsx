"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Header as SharedHeader, NotificationsBell } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { getAvatarUrl } from "@/lib/supabaseStorage";
import { autosPanelManifest } from "@simple/panel";

const headerFeatures = {
  showNotifications: true,
};

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const supabase = useSupabase();
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

    if (!user?.id || !supabase) {
      return;
    }

    // Si ya tenemos avatar en `profiles` (o shape equivalente), no consultamos `public_profiles`.
    if (userHasAnyAvatar) return;

    (async () => {
      const { data, error } = await (supabase as any)
        .from("public_profiles")
        .select("avatar_url")
        .eq("owner_profile_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setPublicAvatar({ userId: user.id, path: "" });
        return;
      }
      setPublicAvatar({ userId: user.id, path: data?.avatar_url || "" });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase, userHasAnyAvatar]);

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
    if (!supabase) return "";
    return getAvatarUrl(supabase, raw);
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
      showNotifications={headerFeatures.showNotifications}
      panelManifest={autosPanelManifest}
    />
  );
}
