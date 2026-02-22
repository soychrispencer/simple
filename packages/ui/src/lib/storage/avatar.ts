"use client";
import { useCallback } from "react";
type DatabaseClient = any;

export function getAvatarUrl(_client: DatabaseClient, path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
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
 * Returns a memoized function that can resolve backend legado avatar URLs from either
 * a direct path or from a user/profile object.
 */
export function useAvatarUrl() {
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
      return getAvatarUrl(null, raw);
    },
    []
  );
}

