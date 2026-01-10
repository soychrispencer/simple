"use client";

import React from "react";
import { useToast } from "@simple/ui";

type CompareContextValue = {
  maxItems: number;
  items: string[];
  has: (listingId: string) => boolean;
  toggle: (listingId: string) => void;
  remove: (listingId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "simpleautos_compare";
const MAX_ITEMS = 3;

const CompareContext = React.createContext<CompareContextValue | null>(null);

function safeParseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return [];
  }
}

function uniq(ids: string[]) {
  return Array.from(new Set(ids.map((x) => String(x)).filter(Boolean)));
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  const [items, setItems] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return uniq(safeParseIds(window.localStorage.getItem(STORAGE_KEY)));
  });

  const persist = React.useCallback((next: string[]) => {
    const cleaned = uniq(next).slice(0, MAX_ITEMS);
    setItems(cleaned);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
  }, []);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      persist(safeParseIds(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [persist]);

  const has = React.useCallback(
    (listingId: string) => items.includes(String(listingId || "")),
    [items]
  );

  const remove = React.useCallback(
    (listingId: string) => {
      const id = String(listingId || "");
      if (!id) return;
      persist(items.filter((x) => x !== id));
    },
    [items, persist]
  );

  const clear = React.useCallback(() => {
    persist([]);
    addToast("Comparación limpia", { type: "info" });
  }, [addToast, persist]);

  const toggle = React.useCallback(
    (listingId: string) => {
      const id = String(listingId || "");
      if (!id) return;

      if (items.includes(id)) {
        const next = items.filter((x) => x !== id);
        persist(next);
        addToast(`Quitado de comparar (${next.length}/${MAX_ITEMS})`, { type: "info" });
        return;
      }

      if (items.length >= MAX_ITEMS) {
        addToast(`Puedes comparar hasta ${MAX_ITEMS} vehículos.`, { type: "error" });
        return;
      }

      const next = [...items, id];
      persist(next);
      addToast(`Agregado a comparar (${next.length}/${MAX_ITEMS})`, { type: "success" });
    },
    [addToast, items, persist]
  );

  const value = React.useMemo<CompareContextValue>(
    () => ({
      maxItems: MAX_ITEMS,
      items,
      has,
      toggle,
      remove,
      clear,
    }),
    [clear, has, items, remove, toggle]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = React.useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
