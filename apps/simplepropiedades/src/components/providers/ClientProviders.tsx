'use client';
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@simple/auth";
import { ToastProvider, NotificationsProvider } from "@simple/ui";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import type { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <AuthProvider supabaseClient={getSupabaseClient()}>
        <ToastProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
