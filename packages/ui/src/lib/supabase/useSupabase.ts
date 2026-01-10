"use client";
import { useAuth, useOptionalAuth } from "@simple/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lightweight wrapper to access the Supabase client exposed by @simple/auth.
 * Keeps UI components decoupled from app-specific hooks like @/lib/supabase/useSupabase.
 */
export function useSupabase(): SupabaseClient {
  const { supabase } = useAuth();
  return supabase as SupabaseClient;
}

/**
 * Variante segura: retorna `null` si no hay <AuthProvider>.
 * Útil en apps como SimpleAdmin que no usan @simple/auth, pero reutilizan componentes UI.
 */
export function useOptionalSupabase(): SupabaseClient | null {
  const ctx = useOptionalAuth();
  return (ctx?.supabase as SupabaseClient | undefined) ?? null;
}
