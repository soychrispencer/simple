"use client";
import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useOptionalSupabase } from "../supabase";

const AVATAR_BUCKET = "avatars";

function buildPublicUrl(client: SupabaseClient, path: string) {
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function getAvatarUrl(client: SupabaseClient, path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return buildPublicUrl(client, path);
}

type AvatarLike =
  | string
  | null
  | undefined
  | {
      avatar_url?: string | null;
      avatar?: string | null;
      profile?: { avatar_url?: string | null } | null;
    };

/**
 * Returns a memoized function that can resolve Supabase avatar URLs from either
 * a direct path or from a user/profile object.
 */
export function useAvatarUrl() {
  const supabase = useOptionalSupabase();

  return useCallback(
    (input?: AvatarLike) => {
      if (!input) return "";
      const raw =
        typeof input === "string"
          ? input
          : input.avatar_url || input.profile?.avatar_url || input.avatar || "";
      if (!raw) return "";

      // Si el valor ya es URL absoluta, úsala siempre.
      if (/^https?:\/\//i.test(raw)) {
        return raw;
      }

      // Si no tenemos Supabase (p.ej. app sin <AuthProvider>), no podemos resolver paths del bucket.
      if (!supabase) {
        return "";
      }

      return getAvatarUrl(supabase, raw);
    },
    [supabase]
  );
}
