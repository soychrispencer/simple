import { logWarn } from "@/lib/logger";

const PREFIX = "simpleautos:";

export function setJSON<T>(key: string, value: T) {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    if (typeof window !== "undefined") logWarn("storage setJSON", { error: (e as any)?.message || e, key });
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return fallback;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    if (typeof window !== "undefined") logWarn("storage getJSON", { error: (e as any)?.message || e, key });
    return fallback;
  }
}

export function remove(key: string) {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    localStorage.removeItem(PREFIX + key);
  } catch (e) {
    if (typeof window !== "undefined") logWarn("storage remove", { error: (e as any)?.message || e, key });
  }
}

export function clearAll() {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch (e) {
    if (typeof window !== "undefined") logWarn("storage clearAll", { error: (e as any)?.message || e });
  }
}


