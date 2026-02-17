"use client";

import React from "react";
import { useToast } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";

type FavoritesContextValue = {
  loading: boolean;
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [favoritesSet, setFavoritesSet] = React.useState<Set<string>>(() => new Set());

  const refresh = React.useCallback(async () => {
    if (!supabase) {
      setFavoritesSet(new Set());
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setFavoritesSet(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const next = new Set<string>();
      for (const row of data || []) {
        const id = (row as any)?.listing_id;
        if (id) next.add(String(id));
      }
      setFavoritesSet(next);
    } catch {
      // Fallback silencioso: no rompemos UI si falta tabla o permisos.
      setFavoritesSet(new Set());
      addToast(
        "No se pudieron cargar tus favoritos.",
        { type: "error" }
      );
    } finally {
      setLoading(false);
    }
  }, [addToast, supabase, user?.id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFavorite = React.useCallback(
    (listingId: string) => {
      if (!listingId) return false;
      return favoritesSet.has(String(listingId));
    },
    [favoritesSet]
  );

  const toggleFavorite = React.useCallback(
    async (listingId: string) => {
      const id = String(listingId || "");
      if (!id) return;

      if (!user?.id) {
        addToast("Inicia sesión para guardar en favoritos.", { type: "info" });
        return;
      }
      if (!supabase) {
        addToast("No se pudo guardar (sin conexión).", { type: "error" });
        return;
      }

      const currently = favoritesSet.has(id);

      // Optimista
      setFavoritesSet((prev) => {
        const next = new Set(prev);
        if (currently) next.delete(id);
        else next.add(id);
        return next;
      });

      try {
        if (currently) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("listing_id", id);
          if (error) throw error;
          addToast("Eliminado de favoritos", { type: "info" });
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, listing_id: id });

          // Si hay unique constraint, ignoramos el duplicado.
          if (error && (error as any).code !== "23505") throw error;
          addToast("Guardado en favoritos", { type: "success" });
        }
      } catch {
        // Revertir
        setFavoritesSet((prev) => {
          const next = new Set(prev);
          if (currently) next.add(id);
          else next.delete(id);
          return next;
        });
        addToast("No se pudo actualizar favoritos.", { type: "error" });
      }
    },
    [addToast, favoritesSet, supabase, user?.id]
  );

  const value = React.useMemo<FavoritesContextValue>(
    () => ({
      loading,
      isFavorite,
      toggleFavorite,
      refresh,
    }),
    [isFavorite, loading, refresh, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = React.useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
